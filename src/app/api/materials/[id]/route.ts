import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { db } from '@/server/db';
import { getCurrentUser, isStaff } from '@/server/auth/session';
import { courseAccess } from '@/server/access';
import { HttpError } from '@/server/auth/guards';
import { route } from '@/server/api';
import { storage } from '@/server/storage';

/**
 * Download de material.
 *
 * Confere o acesso ao curso dono do material (seja ele do curso, do módulo ou
 * da aula) e redireciona para uma URL assinada de curta duração.
 */
export const dynamic = 'force-dynamic';

export const GET = route(
  'materials.download',
  async (_request: NextRequest, context: { params: Promise<{ id: string }> }) => {
    const { id } = await context.params;
    const user = await getCurrentUser();

    const material = await db.material.findUnique({
      where: { id },
      select: {
        type: true,
        url: true,
        courseId: true,
        module: { select: { courseId: true } },
        lesson: {
          select: {
            isPreview: true,
            module: { select: { courseId: true } },
          },
        },
        media: { select: { storageKey: true, originalName: true, status: true } },
      },
    });
    if (!material) throw new HttpError(404, 'Material não encontrado.');

    const courseId =
      material.courseId ?? material.module?.courseId ?? material.lesson?.module.courseId ?? null;
    if (!courseId) throw new HttpError(404, 'Material sem curso associado.');

    // Material de uma aula de amostra acompanha a amostra.
    const isPreviewMaterial = material.lesson?.isPreview === true;
    if (!isPreviewMaterial && !isStaff(user?.role)) {
      const access = await courseAccess(user, courseId);
      if (!access.allowed) {
        throw new HttpError(403, 'Você precisa ter acesso a este curso para baixar o material.');
      }
    }

    if (material.type === 'LINK') {
      if (!material.url) throw new HttpError(404, 'Link indisponível.');
      return NextResponse.redirect(material.url, { status: 302 });
    }

    if (!material.media || material.media.status !== 'READY') {
      throw new HttpError(404, 'Arquivo indisponível.');
    }

    const url = await storage().getSignedUrl(material.media.storageKey, {
      downloadName: material.media.originalName,
    });

    // URL relativa no driver local; absoluta no S3. `redirect` aceita as duas.
    const target = url.startsWith('http') ? url : new URL(url, _request.nextUrl.origin).toString();
    return NextResponse.redirect(target, { status: 302 });
  },
);
