import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { certificatePdf } from '@/server/certificates';
import { HttpError } from '@/server/auth/guards';
import { route } from '@/server/api';

/**
 * PDF do certificado.
 *
 * O código é a própria credencial: quem o tem (o aluno, ou a empresa a quem ele
 * mostrou) pode baixar e conferir. É o mesmo princípio da página pública de
 * validação — e é o que torna o certificado verificável por terceiros.
 */
export const dynamic = 'force-dynamic';

export const GET = route(
  'certificates.pdf',
  async (_request: NextRequest, context: { params: Promise<{ code: string }> }) => {
    const { code } = await context.params;

    const pdf = await certificatePdf(code.toUpperCase());
    if (!pdf) throw new HttpError(404, 'Certificado não encontrado ou revogado.');

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="certificado-${code}.pdf"`,
        'Cache-Control': 'private, max-age=300',
      },
    });
  },
);
