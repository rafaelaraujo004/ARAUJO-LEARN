import { describe, expect, it } from 'vitest';
import { siteOrigin, siteUrl } from '@/lib/site-url';

describe('siteUrl (APP_URL nunca derruba o build)', () => {
  it('aceita um endereço normal e remove barra/caminho', () => {
    expect(siteOrigin('https://araujolearn.up.railway.app/')).toBe('https://araujolearn.up.railway.app');
  });
  it('"https://" (referência de domínio ainda vazia) cai no endereço local', () => {
    expect(siteOrigin('https://')).toBe('http://localhost:3000');
  });
  it('vazio ou ausente cai no endereço local', () => {
    expect(siteOrigin('')).toBe('http://localhost:3000');
    expect(siteOrigin(undefined)).toBe('http://localhost:3000');
    expect(siteUrl('   ').hostname).toBe('localhost');
  });
  it('sem protocolo assume https', () => {
    expect(siteOrigin('meusite.com.br')).toBe('https://meusite.com.br');
  });
  it('lixo nunca lança', () => {
    expect(() => siteUrl('::::')).not.toThrow();
  });
});
