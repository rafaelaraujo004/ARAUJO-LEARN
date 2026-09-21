#!/usr/bin/env node
/**
 * Diagnóstico do bucket S3 (Railway Storage Bucket, R2, MinIO, AWS).
 *
 * Roda o caminho REAL que a plataforma usa, na ordem em que ele acontece, e diz
 * exatamente onde quebra:
 *
 *   1. credenciais e acesso ao bucket (grava, lê e apaga um objeto)
 *   2. URL assinada de leitura (o que o aluno usa para ver o vídeo)
 *   3. upload direto por URL assinada, como o navegador faz
 *   4. upload multipart com leitura do ETag (vídeos grandes)
 *   5. CORS: o navegador só consegue fazer o upload se o bucket permitir
 *
 *   node --env-file=.env tools/check-storage.mjs
 *   node --env-file=.env tools/check-storage.mjs --apply-cors
 */
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetBucketCorsCommand,
  GetObjectCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const env = process.env;
const endpoint = env.S3_ENDPOINT || env.AWS_ENDPOINT_URL;
const bucket = env.S3_BUCKET || env.AWS_S3_BUCKET_NAME;
const accessKeyId = env.S3_ACCESS_KEY_ID || env.AWS_ACCESS_KEY_ID;
const secretAccessKey = env.S3_SECRET_ACCESS_KEY || env.AWS_SECRET_ACCESS_KEY;
const region = env.S3_REGION || env.AWS_DEFAULT_REGION || 'auto';
const appUrl = (env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

const applyCors = process.argv.includes('--apply-cors');

const missing = Object.entries({ endpoint, bucket, accessKeyId, secretAccessKey })
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length) {
  console.error(`Faltam variáveis do bucket: ${missing.join(', ')}.`);
  console.error('Veja .env.example (S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY).');
  process.exit(2);
}

const client = new S3Client({
  region,
  endpoint,
  forcePathStyle: env.S3_FORCE_PATH_STYLE !== 'false',
  credentials: { accessKeyId, secretAccessKey },
});

const key = `diagnostico/${Date.now()}.txt`;
let failed = 0;

async function step(name, work) {
  process.stdout.write(`  ${name} … `);
  try {
    const detail = await work();
    console.log(`ok${detail ? ` (${detail})` : ''}`);
    return true;
  } catch (error) {
    failed += 1;
    console.log(`FALHOU\n     ${error?.message ?? error}`);
    return false;
  }
}

console.log(`\nBucket "${bucket}" em ${endpoint}\n`);

await step('1. gravar, ler e apagar um objeto', async () => {
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: 'ok', ContentType: 'text/plain' }));
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const text = await res.Body.transformToString();
  if (text !== 'ok') throw new Error('conteúdo lido difere do gravado');
});

await step('2. URL assinada de leitura', async () => {
  const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 60 });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
});

await step('3. upload direto por URL assinada (PUT)', async () => {
  const url = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: `${key}.put`, ContentType: 'text/plain' }),
    { expiresIn: 60 },
  );
  const res = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'text/plain' }, body: 'direto' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: `${key}.put` }));
});

await step('4. upload multipart com ETag (vídeos grandes)', async () => {
  const multipartKey = `${key}.multipart`;
  const created = await client.send(new CreateMultipartUploadCommand({ Bucket: bucket, Key: multipartKey }));
  try {
    // A maioria dos provedores exige >= 5 MB por parte, exceto a última.
    const size = 5 * 1024 * 1024;
    const parts = [];
    for (const partNumber of [1, 2]) {
      const url = await getSignedUrl(
        client,
        new UploadPartCommand({ Bucket: bucket, Key: multipartKey, UploadId: created.UploadId, PartNumber: partNumber }),
        { expiresIn: 120 },
      );
      const res = await fetch(url, { method: 'PUT', body: Buffer.alloc(partNumber === 1 ? size : 1024, partNumber) });
      if (!res.ok) throw new Error(`parte ${partNumber}: HTTP ${res.status}`);
      const etag = res.headers.get('etag');
      if (!etag) throw new Error(`parte ${partNumber}: o bucket não devolveu ETag`);
      parts.push({ PartNumber: partNumber, ETag: etag });
    }
    await client.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: multipartKey,
        UploadId: created.UploadId,
        MultipartUpload: { Parts: parts },
      }),
    );
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: multipartKey }));
    return '2 partes';
  } catch (error) {
    await client.send(new AbortMultipartUploadCommand({ Bucket: bucket, Key: multipartKey, UploadId: created.UploadId })).catch(() => {});
    throw error;
  }
});

if (applyCors) {
  await step(`5. aplicar CORS para ${appUrl}`, async () => {
    await client.send(
      new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedOrigins: [appUrl],
              AllowedMethods: ['GET', 'PUT', 'HEAD'],
              AllowedHeaders: ['*'],
              // Sem expor o ETag, o navegador não consegue fechar o upload multipart.
              ExposeHeaders: ['ETag'],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      }),
    );
  });
} else {
  await step('5. CORS configurado para o site', async () => {
    const cors = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
    const rules = cors.CORSRules ?? [];
    const allowsOrigin = rules.some((rule) => (rule.AllowedOrigins ?? []).some((o) => o === '*' || o === appUrl));
    const allowsPut = rules.some((rule) => (rule.AllowedMethods ?? []).includes('PUT'));
    const exposesEtag = rules.some((rule) => (rule.ExposeHeaders ?? []).some((h) => h.toLowerCase() === 'etag'));
    if (!allowsOrigin) throw new Error(`nenhuma regra libera a origem ${appUrl}`);
    if (!allowsPut) throw new Error('nenhuma regra permite o método PUT');
    if (!exposesEtag) throw new Error('a regra não expõe o cabeçalho ETag');
  });
}

await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key })).catch(() => {});

console.log(
  failed === 0
    ? '\nTudo certo: o bucket está pronto para receber vídeos e materiais.\n'
    : `\n${failed} verificação(ões) falharam.${applyCors ? '' : ' Se a 5 falhou, rode de novo com --apply-cors.'}\n`,
);
process.exit(failed === 0 ? 0 : 1);
