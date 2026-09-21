/**
 * Desenho do certificado em PDF.
 *
 * Módulo puro de propósito: não toca no banco, não lê variáveis de ambiente e
 * não importa 'server-only'. Assim dá para gerar uma prévia por linha de
 * comando (`npx tsx scripts/preview-certificate.ts`) sem subir a aplicação.
 */

export interface CertificateData {
  code: string;
  studentName: string;
  courseTitle: string;
  tutorName: string;
  hours: number;
  issuedAt: Date;
  /** Endereço público usado na linha de validação. */
  appUrl: string;
}

/** Desenho do certificado — A4 paisagem, na identidade da plataforma. */
export async function renderCertificatePdf(data: CertificateData): Promise<Buffer> {
  const { PDFDocument, StandardFonts, rgb, degrees } = await import('pdf-lib');

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Certificado ${data.code} — ${data.courseTitle}`);
  pdf.setAuthor('ARAÚJO LEARN');
  pdf.setSubject(`Certificado de conclusão: ${data.courseTitle}`);
  pdf.setProducer('ARAÚJO LEARN');

  const page = pdf.addPage([842, 595]); // A4 paisagem
  const { width, height } = page.getSize();

  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // O azul exato do "A" da marca.
  const night = rgb(0.047, 0.141, 0.337);
  const gold = rgb(0.878, 0.604, 0.243);
  const ink = rgb(0.145, 0.173, 0.208);
  const muted = rgb(0.42, 0.47, 0.54);

  // O "A" da marca, usado no topo e na assinatura do tutor.
  const mark = await embedBrandMark(pdf);

  // Moldura: faixa superior escura + filete dourado.
  page.drawRectangle({ x: 0, y: height - 96, width, height: 96, color: night });
  page.drawRectangle({ x: 0, y: height - 102, width, height: 6, color: gold });
  page.drawRectangle({ x: 0, y: 0, width, height: 26, color: night });

  // Marca
  const brandX = mark ? 56 + 46 : 56;
  if (mark) {
    // Em fundo escuro o "A" navy sumiria: entra dentro de um selo claro.
    page.drawRectangle({
      x: 52,
      y: height - 74,
      width: 40,
      height: 40,
      color: rgb(1, 1, 1),
      opacity: 0.96,
      borderColor: gold,
      borderWidth: 0.8,
    });
    page.drawImage(mark, { x: 57, y: height - 69, width: 30, height: 30 });
  }

  page.drawText('ARAÚJO LEARN', {
    x: brandX,
    y: height - 56,
    size: 22,
    font: serifBold,
    color: rgb(1, 1, 1),
  });
  page.drawText('Aprenda. Evolua. Conquiste.', {
    x: brandX,
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

  // Assinatura do tutor: o "A" da marca pessoal sobre a linha, e o nome abaixo.
  const signY = 150;
  const signWidth = 240;
  const signX = width / 2 - signWidth / 2;

  if (mark) {
    page.drawImage(mark, { x: width / 2 - 21, y: signY + 10, width: 42, height: 42 });
  }

  page.drawRectangle({ x: signX, y: signY, width: signWidth, height: 1, color: rgb(0.7, 0.74, 0.8) });
  const tutorName = fit(data.tutorName, 34).toUpperCase();
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
  page.drawText(`Confira a autenticidade em ${data.appUrl}/validar/${data.code}`, {
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
  const seal = 'CONCLUÍDO';
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

/**
 * Carrega o "A" da marca para dentro do PDF.
 *
 * O arquivo vive em `public/`, então acompanha o deploy. Se por algum motivo
 * não estiver lá, o certificado continua sendo gerado — só sem o símbolo.
 */
async function embedBrandMark(pdf: import('pdf-lib').PDFDocument) {
  try {
    const { readFile } = await import('node:fs/promises');
    const path = await import('node:path');
    const bytes = await readFile(path.join(process.cwd(), 'public', 'marca', 'a.png'));
    return await pdf.embedPng(bytes);
  } catch {
    return null;
  }
}

function fit(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

function formatPtDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(date);
}
