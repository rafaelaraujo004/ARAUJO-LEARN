import { describe, expect, it } from 'vitest';
import { formatPrice, installmentPrice, pixPrice, whatsappDigits } from '@/lib/utils';

/**
 * Dinheiro é sempre em centavos (inteiro). Arredondar em ponto flutuante é
 * como se perde R$ 0,01 por venda até alguém reclamar.
 */

describe('formatPrice', () => {
  it('formata centavos no padrão brasileiro', () => {
    expect(formatPrice(19_900).replace(/ /g, ' ')).toBe('R$ 199,00');
    expect(formatPrice(24_900).replace(/ /g, ' ')).toBe('R$ 249,00');
    expect(formatPrice(0).replace(/ /g, ' ')).toBe('R$ 0,00');
  });
});

describe('pixPrice', () => {
  it('aplica o desconto do PIX', () => {
    expect(pixPrice(19_900, 10)).toBe(17_910);
    expect(pixPrice(24_900, 10)).toBe(22_410);
  });

  it('sem desconto devolve o valor cheio', () => {
    expect(pixPrice(19_900, 0)).toBe(19_900);
  });

  it('arredonda para o centavo mais próximo', () => {
    // 19.999 * 0,9 = 17.999,1 -> 17.999
    expect(pixPrice(19_999, 10)).toBe(17_999);
  });
});

describe('installmentPrice', () => {
  it('arredonda a parcela para cima, para nunca faltar centavo', () => {
    // 19.900 / 12 = 1.658,33… -> 1.659 centavos por parcela
    expect(installmentPrice(19_900, 12)).toBe(1_659);
    expect(installmentPrice(19_900, 12) * 12).toBeGreaterThanOrEqual(19_900);
  });

  it('trata parcelamento inválido como à vista', () => {
    expect(installmentPrice(19_900, 0)).toBe(19_900);
  });
});

describe('whatsappDigits', () => {
  it('normaliza o telefone para o formato do wa.me', () => {
    expect(whatsappDigits('(94) 99190-6608')).toBe('5594991906608');
  });

  it('não duplica o código do país', () => {
    expect(whatsappDigits('+55 (94) 99190-6608')).toBe('5594991906608');
  });
});
