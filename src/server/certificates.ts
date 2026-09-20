import 'server-only';
import { randomInt } from 'node:crypto';
import { db } from '@/server/db';
import { storage } from '@/server/storage';
import { keys } from '@/server/storage/keys';
import { env } from '@/lib/env';

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

// Sem I, O, 0 e 1: evita erro de digitação na validação pública.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomBlock(size: number): string {
  let out = '';
  for (let i = 0; i < size; i += 1) out += ALPHABET[randomInt(ALPHABET.length)];
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

  const bytes = await renderCertificatePdf(certificate);
  const key = keys.certificate(certificate.code);
  await store.put(key, bytes, 'application/pdf');
  await db.certificate.update({ where: { code }, data: { pdfKey: key } });
  return Buffer.from(bytes);
}

interface CertificateData {
  code: string;
  studentName: string;
  courseTitle: string;
  tutorName: string;
  hours: number;
  issuedAt: Date;
}

/** Desenho do certificado — A4 paisagem, na identidade da plataforma. */
export async function renderCertificatePdf(data: CertificateData): Promise<Buffer> {
  const { PDFDocument, StandardFonts, rgb, degrees } = await import('pdf-lib');

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Certificado ${data.code} — ${data.courseTitle}`);
  pdf.setAuthor('ARAUJO LEARN');
  pdf.setSubject(`Certificado de conclusão: ${data.courseTitle}`);
  pdf.setProducer('ARAUJO LEARN');

  const page = pdf.addPage([842, 595]); // A4 paisagem
  const { width, height } = page.getSize();

  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const night = rgb(0.047, 0.106, 0.18);
  const gold = rgb(0.878, 0.604, 0.243);
  const ink = rgb(0.145, 0.173, 0.208);
  const muted = rgb(0.42, 0.47, 0.54);

  // Moldura: faixa superior escura + filete dourado.
  page.drawRectangle({ x: 0, y: height - 96, width, height: 96, color: night });
  page.drawRectangle({ x: 0, y: height - 102, width, height: 6, color: gold });
  page.drawRectangle({ x: 0, y: 0, width, height: 26, color: night });

  // Marca
  page.drawText('ARAUJO LEARN', {
    x: 56,
    y: height - 56,
    size: 22,
    font: serifBold,
    color: rgb(1, 1, 1),
  });
  page.drawText('Aprenda. Evolua. Conquiste.', {
    x: 56,
    y: height - 76,
    size: 9.5,
    font: sans,
    color: rgb(0.74, 0.83, 0.9),
  });

  const center = (text: string, y: number, size: number, font = serif, color = ink) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, { x: (width - textWidth) / 2, y, size, font, color });
  };

  center('CERTIFICADO DE CONCLUSÃO', height - 150, 13, sansBold, muted);

  center('Certificamos que', height - 196, 13, serif, muted);
  center(fit(data.studentName, 46), height - 244, 32, serifBold, night);

  // Filete sob o nome
  const rule = Math.min(560, width - 160);
  page.drawRectangle({
    x: (width - rule) / 2,
    y: height - 258,
    width: rule,
    height: 1,
    color: rgb(0.85, 0.88, 0.92),
  });

  center('concluiu com aproveitamento o curso', height - 292, 13, serif, muted);
  center(fit(data.courseTitle, 58), height - 330, 21, serifBold, ink);
  center(
    `Carga horária: ${data.hours} ${data.hours === 1 ? 'hora' : 'horas'}  ·  Conclusão: ${formatPtDate(data.issuedAt)}`,
    height - 360,
    11.5,
    sans,
    muted,
  );

  // Assinatura do tutor
  const signY = 150;
  const signWidth = 240;
  const signX = width / 2 - signWidth / 2;
  page.drawRectangle({ x: signX, y: signY, width: signWidth, height: 1, color: rgb(0.7, 0.74, 0.8) });
  const tutorName = fit(data.tutorName, 34);
  const tutorWidth = sansBold.widthOfTextAtSize(tutorName, 12);
  page.drawText(tutorName, {
    x: width / 2 - tutorWidth / 2,
    y: signY - 18,
    size: 12,
    font: sansBold,
    color: ink,
  });
  const roleWidth = sans.widthOfTextAtSize('Tutor responsável', 9.5);
  page.drawText('Tutor responsável', {
    x: width / 2 - roleWidth / 2,
    y: signY - 32,
    size: 9.5,
    font: sans,
    color: muted,
  });

  // Validação
  page.drawText(`Código de validação: ${data.code}`, {
    x: 56,
    y: 64,
    size: 10,
    font: sansBold,
    color: ink,
  });
  page.drawText(`Confira a autenticidade em ${env.appUrl}/certificados/${data.code}`, {
    x: 56,
    y: 50,
    size: 8.5,
    font: sans,
    color: muted,
  });

  // Selo discreto
  page.drawCircle({ x: width - 108, y: 104, size: 42, borderColor: gold, borderWidth: 1.5 });
  page.drawCircle({ x: width - 108, y: 104, size: 34, borderColor: gold, borderWidth: 0.6 });
  const sealSize = 9;
  const seal = 'CONCLUIDO';
  const sealWidth = sansBold.widthOfTextAtSize(seal, sealSize);
  page.drawText(seal, {
    x: width - 108 - sealWidth / 2,
    y: 100,
    size: sealSize,
    font: sansBold,
    color: gold,
    rotate: degrees(0),
  });

  return Buffer.from(await pdf.save());
}

function fit(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

function formatPtDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(date);
}
