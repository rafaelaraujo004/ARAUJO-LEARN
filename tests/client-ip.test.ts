import { describe, expect, it } from 'vitest';
import { clientIpFromHeaders } from '@/server/api';

const headers = (values: Record<string, string>) =>
  new Headers(values) as Pick<Headers, 'get'>;

describe('IP do cliente (limite de tentativas)', () => {
  it('usa a última entrada de X-Forwarded-For, acrescentada pelo proxy confiável', () => {
    expect(clientIpFromHeaders(headers({ 'x-forwarded-for': '203.0.113.7' }))).toBe('203.0.113.7');
  });

  it('ignora valores forjados pelo cliente no início da lista', () => {
    const ip = clientIpFromHeaders(headers({ 'x-forwarded-for': '1.2.3.4, 9.9.9.9, 198.51.100.20' }));
    expect(ip).toBe('198.51.100.20');
  });

  it('trocar o valor forjado a cada requisição não muda a chave do limitador', () => {
    const a = clientIpFromHeaders(headers({ 'x-forwarded-for': 'aleatorio-1, 198.51.100.20' }));
    const b = clientIpFromHeaders(headers({ 'x-forwarded-for': 'aleatorio-2, 198.51.100.20' }));
    expect(a).toBe(b);
  });

  it('cai para x-real-ip e depois para "desconhecido"', () => {
    expect(clientIpFromHeaders(headers({ 'x-real-ip': '192.0.2.5' }))).toBe('192.0.2.5');
    expect(clientIpFromHeaders(headers({}))).toBe('desconhecido');
  });
});
