import { randomBytes } from 'node:crypto';
import { slugify } from '@/lib/utils';

/**
 * Convenção de chaves no bucket.
 *
 * Prefixo por tipo para que uma migração futura (ex.: mover só os vídeos para
 * um provedor de streaming) seja uma cópia de um prefixo, não uma varredura.
 */

function unique(): string {
  return `${Date.now().toString(36)}${randomBytes(6).toString('hex')}`;
}

function safeName(originalName: string): string {
  const dot = originalName.lastIndexOf('.');
  const base = dot > 0 ? originalName.slice(0, dot) : originalName;
  const ext = dot > 0 ? originalName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const slug = slugify(base) || 'arquivo';
  return ext ? `${slug}.${ext}` : slug;
}

export const keys = {
  video: (originalName: string) => `videos/${unique()}/${safeName(originalName)}`,
  document: (originalName: string) => `materiais/${unique()}/${safeName(originalName)}`,
  image: (originalName: string) => `imagens/${unique()}/${safeName(originalName)}`,
  courseCover: (courseId: string, originalName: string) =>
    `capas/${courseId}/${unique()}-${safeName(originalName)}`,
  avatar: (userId: string, originalName: string) =>
    `avatares/${userId}/${unique()}-${safeName(originalName)}`,
  certificate: (code: string) => `certificados/${code}.pdf`,
};

export function keyForKind(kind: 'VIDEO' | 'DOCUMENT' | 'IMAGE', originalName: string): string {
  if (kind === 'VIDEO') return keys.video(originalName);
  if (kind === 'IMAGE') return keys.image(originalName);
  return keys.document(originalName);
}
