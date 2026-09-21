import 'server-only';
import { randomInt } from 'node:crypto';
import { db } from '@/server/db';
import { storage } from '@/server/storage';
import { keys } from '@/server/storage/keys';
import { env } from '@/lib/env';
import { renderCertificatePdf } from '@/server/certificate-pdf';
import { CERTIFICATE_ALPHABET } from '@/lib/certificate-code';

/**
 * Certificados.
 *
 * Os dados são congelados na emissão (nome do aluno, título do curso, tutor e
 * carga horária): se o curso for renomeado depois, o certificado já emitido
 * continua contando a história correta.
 *
 * O PDF é gerado sob demanda e guardado no bucket na primeira vez — não ocupa
 * espaço enquanto ninguém baixar.
 */


function randomBlock(size: number): string {
  let out = '';
  for (let i = 0; i < size; i += 1) out += CERTIFICATE_ALPHABET[randomInt(CERTIFICATE_ALPHABET.length)];
  return out;
}

export function generateCertificateCode(): string {
  return `AL-${randomBlock(4)}-${randomBlock(4)}`;
}

/** Carga horária exibida: a declarada pelo tutor, ou a soma das aulas. */
export function certificateHours(
  declaredMinutes: number | null,
  lessonSeconds: number,
): number {
  const minutes = declaredMinutes ?? Math.round(lessonSeconds / 60);
  return Math.max(1, Math.round(minutes / 60));
}

/**
 * Emite o certificado se o aluno concluiu o curso e o curso tem certificado
 * habilitado. Idempotente: chamar duas vezes devolve o mesmo código.
 */
export async function issueCertificateIfEligible(
  userId: string,
  courseId: string,
): Promise<string | null> {
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true, completedAt: true, certificate: { select: { code: true } } },
  });
  if (!enrollment?.completedAt) return null;
  if (enrollment.certificate) return enrollment.certificate.code;

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      title: true,
      certificateEnabled: true,
      durationMinutes: true,
      tutor: { select: { name: true } },
      modules: {
        select: { lessons: { where: { isPublished: true }, select: { durationSeconds: true } } },
      },
    },
  });
  if (!course?.certificateEnabled) return null;

  const user = await db.user.findUnique({ where: { id: userId }, select: { name: true } });
  if (!user) return null;

  const lessonSeconds = course.modules.reduce(
    (total, module) =>
      total + module.lessons.reduce((sum, lesson) => sum + lesson.durationSeconds, 0),
    0,
  );

  // `code` é único: se duas requisições concorrerem, a segunda falha e relê.
  try {
    const certificate = await db.certificate.create({
      data: {
        code: generateCertificateCode(),
        userId,
        courseId,
        enrollmentId: enrollment.id,
        studentName: user.name,
        courseTitle: course.title,
        tutorName: course.tutor.name,
        hours: certificateHours(course.durationMinutes, lessonSeconds),
      },
      select: { code: true },
    });
    await db.notification.create({
      data: {
        userId,
        type: 'certificate',
        title: 'Certificado disponível',
        body: `Você concluiu "${course.title}". Seu certificado já pode ser baixado.`,
        link: '/certificados',
      },
    });
    return certificate.code;
  } catch {
    const existing = await db.certificate.findUnique({
      where: { enrollmentId: enrollment.id },
      select: { code: true },
    });
    return existing?.code ?? null;
  }
}

/** Gera (ou reaproveita) o PDF do certificado e devolve os bytes. */
export async function certificatePdf(code: string): Promise<Buffer | null> {
  const certificate = await db.certificate.findUnique({
    where: { code },
    select: {
      code: true,
      studentName: true,
      courseTitle: true,
      tutorName: true,
      hours: true,
      issuedAt: true,
      revokedAt: true,
      pdfKey: true,
    },
  });
  if (!certificate || certificate.revokedAt) return null;

  const store = storage();

  if (certificate.pdfKey) {
    try {
      return await store.get(certificate.pdfKey);
    } catch {
      // Arquivo sumiu do bucket: regenera abaixo.
    }
  }

  const bytes = await renderCertificatePdf({ ...certificate, appUrl: env.appUrl });
  const key = keys.certificate(certificate.code);
  await store.put(key, bytes, 'application/pdf');
  await db.certificate.update({ where: { code }, data: { pdfKey: key } });
  return Buffer.from(bytes);
}
