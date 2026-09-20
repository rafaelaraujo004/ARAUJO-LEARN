/**
 * Gera um certificado de exemplo para conferir o layout sem precisar de um
 * aluno real concluindo um curso.
 *
 *   npx tsx scripts/preview-certificate.ts
 */
import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { renderCertificatePdf } from '../src/server/certificate-pdf';

async function main() {
  const bytes = await renderCertificatePdf({
  code: 'AL-7F3K-9QX2',
  studentName: 'Maria Souza de Oliveira',
  courseTitle: 'Leitura e Interpretação de Projetos de Engenharia',
  tutorName: 'Eng. Amilton Araújo',
  hours: 8,
  issuedAt: new Date(),
  appUrl: process.env.APP_URL ?? 'http://localhost:3000',
  });

  writeFileSync('certificado-exemplo.pdf', bytes);
  console.log(`[certificado] gerado: certificado-exemplo.pdf (${bytes.length} bytes)`);
}

main();
