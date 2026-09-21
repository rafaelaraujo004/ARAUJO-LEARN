import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { certificatePdf } from '@/server/certificates';
import { HttpError } from '@/server/auth/guards';
import { clientIp, rateLimit, route } from '@/server/api';
import { isValidCertificateCode, normalizeCertificateCode } from '@/lib/certificate-code';

/**
 * PDF do certificado.
 *
 * O código é a própria credencial: quem o tem (o aluno, ou a empresa a quem ele
 * mostrou) pode baixar e conferir. É o mesmo princípio da página pública de
 * validação — e é o que torna o certificado verificável por terceiros.
 *
 * Como o código é a credencial, duas defesas: o formato é validado antes de
 * qualquer uso (nada de texto arbitrário em cabeçalho ou consulta) e as
 * tentativas por IP são limitadas, para inviabilizar adivinhação.
 */
export const dynamic = 'force-dynamic';

export const GET = route(
  'certificates.pdf',
  async (request: NextRequest, context: { params: Promise<{ code: string }> }) => {
    const limit = rateLimit(`cert-pdf:${clientIp(request)}`, { limit: 30, windowMs: 60_000 });
    if (!limit.allowed) {
      throw new HttpError(429, 'Muitas tentativas. Aguarde um minuto e tente de novo.');
    }

    const { code: raw } = await context.params;
    const code = normalizeCertificateCode(raw);
    if (!isValidCertificateCode(code)) {
      throw new HttpError(404, 'Certificado não encontrado ou revogado.');
    }

    const pdf = await certificatePdf(code);
    if (!pdf) throw new HttpError(404, 'Certificado não encontrado ou revogado.');

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="certificado-${code}.pdf"`,
        'Cache-Control': 'private, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  },
);
