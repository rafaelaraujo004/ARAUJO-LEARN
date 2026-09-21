import { describe, expect, it } from 'vitest';
import { hashPassword, passwordIssues, verifyPassword } from '@/server/auth/password';
import { signLocalUrl, verifyLocalUrl } from '@/server/storage/local';
import { keys } from '@/server/storage/keys';
import {
  isValidCertificateCode,
  normalizeCertificateCode,
  CERTIFICATE_ALPHABET,
} from '@/lib/certificate-code';
import { createUploadSchema, passwordSchema, registerSchema } from '@/lib/validation';
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from '@/lib/constants';
import { rateLimit } from '@/server/api';

describe('senhas', () => {
  it('verifica a senha certa e recusa a errada', async () => {
    const hash = await hashPassword('Senha-Forte-123');
    expect(await verifyPassword('Senha-Forte-123', hash)).toBe(true);
    expect(await verifyPassword('senha-forte-123', hash)).toBe(false);
  });

  it('gera hashes diferentes para a mesma senha (salt por usuário)', async () => {
    const [a, b] = await Promise.all([hashPassword('igual12345'), hashPassword('igual12345')]);
    expect(a).not.toBe(b);
  });

  it('nunca guarda a senha em texto', async () => {
    const hash = await hashPassword('segredo12345');
    expect(hash).not.toContain('segredo12345');
    expect(hash.startsWith('scrypt$')).toBe(true);
  });

  it('hash corrompido é recusado sem lançar erro', async () => {
    expect(await verifyPassword('x', 'lixo')).toBe(false);
    expect(await verifyPassword('x', 'scrypt$a$b$c$d$e')).toBe(false);
    expect(await verifyPassword('x', '')).toBe(false);
  });

  it('política mínima de senha', () => {
    expect(passwordIssues('curta1')).toHaveLength(1);
    expect(passwordIssues('somenteletras')).toContain('Inclua ao menos um número.');
    expect(passwordIssues('12345678')).toContain('Inclua ao menos uma letra.');
    expect(passwordIssues('Valida1234')).toHaveLength(0);
    expect(passwordSchema.safeParse('curta1').success).toBe(false);
    expect(passwordSchema.safeParse('Valida1234').success).toBe(true);
  });

  it('cadastro normaliza o e-mail para minúsculas', () => {
    const parsed = registerSchema.parse({
      name: 'Maria Souza',
      email: '  MARIA@Exemplo.COM ',
      password: 'Valida1234',
    });
    expect(parsed.email).toBe('maria@exemplo.com');
  });
});

describe('URLs assinadas do storage local', () => {
  const params = (url: string) => new URL(url, 'http://localhost').searchParams;

  it('aceita uma URL recém-assinada', () => {
    const url = signLocalUrl({ mode: 'get', key: 'videos/a/b.mp4' }, 60);
    expect(verifyLocalUrl(params(url))).toBe(true);
  });

  it('recusa quando a chave é adulterada', () => {
    const url = signLocalUrl({ mode: 'get', key: 'videos/a/b.mp4' }, 60);
    const tampered = url.replace('b.mp4', 'segredo.mp4');
    expect(verifyLocalUrl(params(tampered))).toBe(false);
  });

  it('recusa quando o modo é trocado (ler -> escrever)', () => {
    const url = signLocalUrl({ mode: 'get', key: 'x/y.pdf' }, 60);
    expect(verifyLocalUrl(params(url.replace('mode=get', 'mode=put')))).toBe(false);
  });

  it('recusa URL expirada', () => {
    const url = signLocalUrl({ mode: 'get', key: 'x/y.pdf' }, -10);
    expect(verifyLocalUrl(params(url))).toBe(false);
  });

  it('recusa quando a assinatura é removida', () => {
    const url = signLocalUrl({ mode: 'get', key: 'x/y.pdf' }, 60);
    const search = params(url);
    search.delete('sig');
    expect(verifyLocalUrl(search)).toBe(false);
  });
});

describe('chaves do bucket', () => {
  it('nunca carregam o nome bruto do arquivo enviado', () => {
    const key = keys.video('../../etc/passwd  Aula Final!!.MP4');
    expect(key.startsWith('videos/')).toBe(true);
    expect(key).not.toContain('..');
    expect(key).not.toContain(' ');
    expect(key.endsWith('.mp4')).toBe(true);
  });

  it('duas chaves para o mesmo nome nunca colidem', () => {
    expect(keys.video('aula.mp4')).not.toBe(keys.video('aula.mp4'));
  });

  it('nome só com símbolos vira um nome seguro', () => {
    const key = keys.document('!!!.pdf');
    expect(key).toMatch(/^materiais\/[a-z0-9]+\/arquivo\.pdf$/);
  });
});

describe('código do certificado', () => {
  it('o alfabeto exclui caracteres ambíguos', () => {
    for (const char of ['I', 'O', '0', '1']) {
      expect(CERTIFICATE_ALPHABET).not.toContain(char);
    }
  });

  it('valida o formato AL-XXXX-XXXX', () => {
    expect(isValidCertificateCode('AL-7F3K-9QX2')).toBe(true);
    expect(isValidCertificateCode('AL-7F3K-9QX')).toBe(false);
    expect(isValidCertificateCode('AL-7F3K-9QXO')).toBe(false); // O não existe no alfabeto
    expect(isValidCertificateCode('XX-7F3K-9QX2')).toBe(false);
    expect(isValidCertificateCode('"\r\nX-Injected: 1')).toBe(false);
  });

  it('normaliza o que o usuário digitou ou colou', () => {
    expect(normalizeCertificateCode('  al-7f3k-9qx2 ')).toBe('AL-7F3K-9QX2');
    expect(normalizeCertificateCode('AL - 7F3K - 9QX2')).toBe('AL-7F3K-9QX2');
  });
});

describe('upload: validação no servidor', () => {
  const base = { kind: 'VIDEO' as const, fileName: 'aula.mp4', contentType: 'video/mp4', sizeBytes: 1000 };

  it('aceita vídeo dentro dos limites', () => {
    expect(createUploadSchema.safeParse(base).success).toBe(true);
  });

  it('recusa tipo de arquivo que não pertence à categoria', () => {
    expect(createUploadSchema.safeParse({ ...base, contentType: 'text/html' }).success).toBe(false);
    expect(
      createUploadSchema.safeParse({ ...base, kind: 'IMAGE', contentType: 'image/svg+xml' }).success,
    ).toBe(false);
    expect(
      createUploadSchema.safeParse({ ...base, kind: 'DOCUMENT', contentType: 'application/x-msdownload' })
        .success,
    ).toBe(false);
  });

  it('recusa arquivos acima do limite da categoria', () => {
    expect(createUploadSchema.safeParse({ ...base, sizeBytes: MAX_VIDEO_BYTES + 1 }).success).toBe(false);
    expect(
      createUploadSchema.safeParse({
        ...base,
        kind: 'IMAGE',
        contentType: 'image/png',
        sizeBytes: MAX_IMAGE_BYTES + 1,
      }).success,
    ).toBe(false);
  });

  it('recusa arquivo vazio ou tamanho inválido', () => {
    expect(createUploadSchema.safeParse({ ...base, sizeBytes: 0 }).success).toBe(false);
    expect(createUploadSchema.safeParse({ ...base, sizeBytes: -5 }).success).toBe(false);
  });
});

describe('limite de tentativas', () => {
  it('bloqueia depois do limite e libera em janelas separadas por chave', () => {
    const key = `teste-${Math.random()}`;
    const options = { limit: 3, windowMs: 60_000 };
    expect(rateLimit(key, options).allowed).toBe(true);
    expect(rateLimit(key, options).allowed).toBe(true);
    expect(rateLimit(key, options).allowed).toBe(true);
    const blocked = rateLimit(key, options);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    // Outra chave (outro IP/e-mail) não é afetada.
    expect(rateLimit(`${key}-outro`, options).allowed).toBe(true);
  });
});
