/**
 * Formato do código de validação: AL-XXXX-XXXX.
 *
 * O alfabeto exclui I, O, 0 e 1 (fáceis de confundir ao digitar). Mantido aqui,
 * sem dependências de servidor, para que geração, validação e testes usem a
 * mesma definição.
 */
export const CERTIFICATE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const PATTERN = /^AL-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

/** Maiúsculas, sem espaços — aceita o que o usuário digitou ou colou. */
export function normalizeCertificateCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '');
}

export function isValidCertificateCode(code: string): boolean {
  return PATTERN.test(code);
}
