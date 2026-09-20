#!/usr/bin/env node
/**
 * Gera os arquivos da marca a partir do "A" original enviado pelo Rafael.
 *
 * O arquivo de origem vem com fundo branco. Aqui o fundo é removido (pixels
 * quase brancos viram transparentes), a marca é recortada no seu limite real e
 * exportada nos tamanhos que a plataforma usa:
 *
 *   public/marca/a.png          marca isolada, transparente (uso geral e PDF)
 *   src/app/icon.png            favicon (Next serve automaticamente)
 *   src/app/apple-icon.png      ícone do iOS (fundo sólido: iOS ignora alfa)
 *
 * Rodar de novo é seguro — os arquivos são sobrescritos:
 *   node tools/build-brand-assets.mjs <caminho-do-png-original>
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SOURCE = process.argv[2] ?? 'brand/a-original.png';
const ROOT = process.cwd();

/** Acima deste valor em todos os canais, o pixel é considerado fundo. */
const WHITE_THRESHOLD = 238;

async function removeWhiteBackground(input) {
  const image = sharp(input).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD) {
      data[i + 3] = 0;
      continue;
    }

    // Borda: suaviza o recorte para o traço não ficar serrilhado.
    const lightest = Math.max(r, g, b);
    if (lightest > 200) {
      const ratio = (WHITE_THRESHOLD - lightest) / (WHITE_THRESHOLD - 200);
      data[i + 3] = Math.round(Math.max(0, Math.min(1, ratio)) * data[i + 3]);
    }
  }

  return sharp(data, { raw: { width, height, channels } }).png();
}

async function main() {
  const source = path.resolve(ROOT, SOURCE);
  await fs.access(source).catch(() => {
    throw new Error(`Arquivo de origem não encontrado: ${source}`);
  });

  const cleaned = await (await removeWhiteBackground(source)).toBuffer();

  // Recorta no limite real do traço e deixa uma folga proporcional.
  const trimmed = await sharp(cleaned).trim({ threshold: 1 }).toBuffer();
  const { width = 1, height = 1 } = await sharp(trimmed).metadata();
  const side = Math.max(width, height);
  const canvas = Math.round(side * 1.16);

  const square = await sharp({
    create: {
      width: canvas,
      height: canvas,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: trimmed, gravity: 'center' }])
    .png()
    .toBuffer();

  await fs.mkdir(path.join(ROOT, 'public/marca'), { recursive: true });

  await sharp(square)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(ROOT, 'public/marca/a.png'));

  await sharp(square)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(ROOT, 'src/app/icon.png'));

  // iOS compõe o ícone sobre preto quando há transparência — daí o fundo claro.
  await sharp(square)
    .resize(160, 160, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: 10,
      bottom: 10,
      left: 10,
      right: 10,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(ROOT, 'src/app/apple-icon.png'));

  console.log('[marca] gerados: public/marca/a.png, src/app/icon.png, src/app/apple-icon.png');
}

main().catch((error) => {
  console.error('[marca] falhou:', error.message);
  process.exit(1);
});
