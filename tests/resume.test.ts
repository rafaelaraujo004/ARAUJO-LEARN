import { describe, expect, it } from 'vitest';
import { resolveResumePoint } from '@/lib/resume';

const THRESHOLD = 92;

describe('ponto de retomada do player', () => {
  it('retoma de onde o aluno parou', () => {
    expect(resolveResumePoint(300, 1200, THRESHOLD)).toBe(300);
    expect(resolveResumePoint(300.9, 1200, THRESHOLD)).toBe(300);
  });

  it('ignora posições nos primeiros segundos', () => {
    expect(resolveResumePoint(0, 600, THRESHOLD)).toBe(0);
    expect(resolveResumePoint(3, 600, THRESHOLD)).toBe(0);
  });

  it('aula já concluída (perto do fim) recomeça do início', () => {
    expect(resolveResumePoint(560, 600, THRESHOLD)).toBe(0); // 93%
    expect(resolveResumePoint(599, 600, THRESHOLD)).toBe(0);
  });

  it('posição salva maior que o vídeo (vídeo substituído por um mais curto) recomeça do início', () => {
    expect(resolveResumePoint(100, 4, THRESHOLD)).toBe(0);
    expect(resolveResumePoint(1800, 900, THRESHOLD)).toBe(0);
  });

  it('posição salva inválida nunca quebra o player', () => {
    expect(resolveResumePoint(Number.NaN, 600, THRESHOLD)).toBe(0);
    expect(resolveResumePoint(-10, 600, THRESHOLD)).toBe(0);
  });

  it('duração desconhecida (arquivo sem metadado) ainda retoma, em vez de perder o ponto', () => {
    expect(resolveResumePoint(100, Number.NaN, THRESHOLD)).toBe(100);
    expect(resolveResumePoint(100, Infinity, THRESHOLD)).toBe(100);
    expect(resolveResumePoint(100, 0, THRESHOLD)).toBe(100);
    expect(resolveResumePoint(3, Infinity, THRESHOLD)).toBe(0);
  });

  it('logo abaixo do limite de conclusão ainda retoma', () => {
    expect(resolveResumePoint(551, 600, THRESHOLD)).toBe(551); // 91,8%
  });
});
