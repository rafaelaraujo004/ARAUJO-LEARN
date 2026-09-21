/**
 * Ponto de retomada da reprodução.
 *
 * Retomar de onde parou é a promessa central do player, mas a posição salva
 * nem sempre serve para o vídeo que está carregado:
 *
 *  - o tutor pode ter substituído o vídeo por um mais curto;
 *  - o aluno pode ter parado a poucos segundos do fim (aula já concluída), e
 *    retomar ali o deixaria diante de uma tela final vazia.
 *
 * Nesses casos a aula recomeça do início. Posições muito próximas do começo
 * também são ignoradas: retomar de 3 segundos só atrapalha.
 */
export function resolveResumePoint(
  savedSeconds: number,
  durationSeconds: number,
  completionThresholdPercent: number,
): number {
  if (!Number.isFinite(savedSeconds) || savedSeconds < 5) return 0;

  // Duração desconhecida (alguns arquivos não a informam): não há como conferir
  // a posição, e perder o ponto do aluno é pior do que arriscar o salto — o
  // navegador limita o salto ao fim do vídeo.
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return Math.floor(savedSeconds);

  const finishedAt = durationSeconds * (completionThresholdPercent / 100);
  if (savedSeconds >= finishedAt) return 0;
  if (savedSeconds >= durationSeconds - 2) return 0;

  return Math.floor(savedSeconds);
}
