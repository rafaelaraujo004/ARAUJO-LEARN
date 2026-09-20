import 'server-only';
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

function scryptAsync(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}

/**
 * Hash de senha com scrypt (node:crypto).
 *
 * Escolhido no lugar de bcrypt/argon2 por não exigir binário nativo — o build
 * no Railway fica previsível — mantendo um KDF com custo de memória, como a
 * OWASP recomenda. Formato guardado: `scrypt$N$r$p$salt$hash` (base64url),
 * o que permite aumentar o custo no futuro sem invalidar senhas antigas.
 */

const PARAMS = { N: 16384, r: 8, p: 1, keyLength: 64 } as const;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password.normalize('NFKC'), salt, PARAMS.keyLength, {
    N: PARAMS.N,
    r: PARAMS.r,
    p: PARAMS.p,
    maxmem: 256 * 1024 * 1024,
  });

  return [
    'scrypt',
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString('base64url'),
    derived.toString('base64url'),
  ].join('$');
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const salt = Buffer.from(parts[4] ?? '', 'base64url');
  const expected = Buffer.from(parts[5] ?? '', 'base64url');
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p) || expected.length === 0) {
    return false;
  }

  try {
    const derived = await scryptAsync(password.normalize('NFKC'), salt, expected.length, {
      N,
      r,
      p,
      maxmem: 256 * 1024 * 1024,
    });
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** Política mínima: 8 caracteres, com letra e número. */
export function passwordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 8) issues.push('Use ao menos 8 caracteres.');
  if (!/[a-zA-Z]/.test(password)) issues.push('Inclua ao menos uma letra.');
  if (!/[0-9]/.test(password)) issues.push('Inclua ao menos um número.');
  return issues;
}
