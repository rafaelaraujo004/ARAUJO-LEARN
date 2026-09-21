import Link from 'next/link';
import { Award, BookOpen, Clock, Gift, Layers, PlayCircle } from 'lucide-react';
import { Badge } from '@/components/ui/primitives';
import { LEVEL_LABEL } from '@/lib/constants';
import { formatDuration, formatPrice, pixPrice, pluralize } from '@/lib/utils';
import type { CourseCardData } from '@/server/courses';

/**
 * Cartão do curso — usado na home e no catálogo.
 * Sem imagem, cai num padrão gráfico da marca em vez de uma caixa vazia.
 */
export function CourseCard({
  course,
  progress,
  href,
  ctaLabel,
}: {
  course: CourseCardData;
  progress?: number;
  href?: string;
  ctaLabel?: string;
}) {
  // A carga horária declarada é o número oficial do curso; a soma das aulas
  // só entra quando o tutor não declarou nada.
  const duration = course.durationMinutes
    ? formatDuration(course.durationMinutes * 60)
    : course.durationSeconds > 0
      ? formatDuration(course.durationSeconds)
      : null;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-card border border-ink-200 bg-white shadow-soft transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="relative aspect-[16/9] overflow-hidden bg-brand-900">
        {course.coverUrl ? (
          // Capa vem do bucket com URL assinada; `next/image` não otimiza URL temporária.
          <img
            src={course.coverUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="bg-night bg-grid size-full" aria-hidden>
            <div className="grid size-full place-items-center">
              <PlayCircle className="size-10 text-white/25" />
            </div>
          </div>
        )}

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge tone="muted" className="backdrop-blur-sm">
            {LEVEL_LABEL[course.level] ?? course.level}
          </Badge>
          {course.certificateEnabled && (
            <Badge tone="muted" className="backdrop-blur-sm" icon={<Award className="size-3" />}>
              Certificado
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg leading-snug font-semibold text-brand-900">
          <Link href={href ?? `/cursos/${course.slug}`} className="before:absolute before:inset-0">
            {course.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-600">
          {course.shortDescription}
        </p>

        <dl className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-500">
          <div className="flex items-center gap-1.5">
            <Layers aria-hidden className="size-3.5" />
            <dt className="sr-only">Módulos</dt>
            <dd>{pluralize(course.moduleCount, 'módulo', 'módulos')}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <BookOpen aria-hidden className="size-3.5" />
            <dt className="sr-only">Aulas</dt>
            <dd>{pluralize(course.lessonCount, 'aula', 'aulas')}</dd>
          </div>
          {duration && (
            <div className="flex items-center gap-1.5">
              <Clock aria-hidden className="size-3.5" />
              <dt className="sr-only">Duração</dt>
              <dd>{duration}</dd>
            </div>
          )}
        </dl>

        {typeof progress === 'number' && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs font-medium text-ink-600">
              <span>{progress === 100 ? 'Concluído' : 'Seu progresso'}</span>
              <span className="tabular-nums">{progress}%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-pill bg-ink-200">
              <span
                className={progress === 100 ? 'block h-full bg-progress-500' : 'block h-full bg-brand-500'}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-4">
          {course.isBonus ? (
            <Badge tone="accent" icon={<Gift className="size-3" />}>
              Bônus da formação
            </Badge>
          ) : course.priceCents ? (
            <div>
              <p className="font-display text-xl font-semibold text-brand-900">
                {formatPrice(course.priceCents)}
              </p>
              {/* Duas linhas de propósito: na mesma linha, o "até 12x" parecia
                  fazer parte da condição do PIX. */}
              <p className="text-xs text-ink-500">
                {formatPrice(pixPrice(course.priceCents, course.pixDiscountPercent))} à vista no PIX
              </p>
              <p className="text-xs text-ink-500">
                ou até {course.maxInstallments}x no cartão
              </p>
            </div>
          ) : (
            <span />
          )}

          {ctaLabel && (
            <p className="text-sm font-semibold text-brand-600 transition-colors group-hover:text-brand-500">
              {ctaLabel} →
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
