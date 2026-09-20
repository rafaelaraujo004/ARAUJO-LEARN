'use client';

import * as React from 'react';
import Link from 'next/link';
import { Check, CirclePlay, FileText, X } from 'lucide-react';
import { cn, formatDuration, pluralize } from '@/lib/utils';
import type { OutlineModule } from '@/server/lessons';

/**
 * Sumário do curso ao lado da aula.
 *
 * Responde, sem o aluno precisar procurar: onde estou, o que já concluí e
 * qual é a próxima aula.
 */
export function CourseOutline({
  courseSlug,
  modules,
  currentLessonId,
  progressPercent,
  onNavigate,
}: {
  courseSlug: string;
  modules: OutlineModule[];
  currentLessonId: string;
  progressPercent: number;
  onNavigate?: () => void;
}) {
  const currentRef = React.useRef<HTMLAnchorElement>(null);

  // Leva a aula atual para dentro da área visível ao abrir o sumário.
  React.useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' });
  }, [currentLessonId]);

  const total = modules.reduce((count, module) => count + module.lessons.length, 0);
  const done = modules.reduce(
    (count, module) => count + module.lessons.filter((lesson) => lesson.status === 'COMPLETED').length,
    0,
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-5 py-4">
        <p className="text-xs font-semibold tracking-[0.14em] text-accent-300 uppercase">
          Conteúdo do curso
        </p>
        <p className="mt-2 text-sm text-brand-200">
          {done} de {pluralize(total, 'aula concluída', 'aulas concluídas')}
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-white/15">
          <div
            className="h-full rounded-pill bg-progress-500 transition-[width] duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <nav aria-label="Aulas do curso" className="scroll-slim min-h-0 flex-1 overflow-y-auto py-2">
        {modules.map((module, moduleIndex) => (
          <section key={module.id} className="py-1">
            <h3 className="px-5 py-2 text-xs font-semibold tracking-wide text-brand-300 uppercase">
              {moduleIndex + 1}. {module.title}
            </h3>
            <ul>
              {module.lessons.map((lesson) => {
                const active = lesson.id === currentLessonId;
                return (
                  <li key={lesson.id}>
                    <Link
                      ref={active ? currentRef : undefined}
                      href={`/aula/${courseSlug}/${lesson.id}`}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-start gap-3 px-5 py-2.5 transition-colors',
                        active
                          ? 'border-l-2 border-accent-400 bg-white/10 pl-[1.125rem]'
                          : 'hover:bg-white/5',
                      )}
                    >
                      <span className="mt-0.5 shrink-0">
                        {lesson.status === 'COMPLETED' ? (
                          <span className="grid size-5 place-items-center rounded-full bg-progress-500 text-white">
                            <Check aria-hidden className="size-3" strokeWidth={3} />
                          </span>
                        ) : lesson.hasVideo ? (
                          <CirclePlay
                            aria-hidden
                            className={cn('size-5', active ? 'text-accent-300' : 'text-brand-300')}
                          />
                        ) : (
                          <FileText
                            aria-hidden
                            className={cn('size-5', active ? 'text-accent-300' : 'text-brand-300')}
                          />
                        )}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            'block text-sm leading-snug',
                            active ? 'font-medium text-white' : 'text-brand-100',
                          )}
                        >
                          {lesson.title}
                        </span>
                        <span className="mt-0.5 flex items-center gap-2 text-xs text-brand-400">
                          {lesson.durationSeconds > 0 && formatDuration(lesson.durationSeconds)}
                          {lesson.status === 'IN_PROGRESS' && lesson.percent > 0 && (
                            <span className="text-accent-300">{lesson.percent}% assistido</span>
                          )}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>
    </div>
  );
}

/** Sumário em painel deslizante, para telas pequenas. */
export function OutlineDrawer({
  open,
  onClose,
  ...props
}: React.ComponentProps<typeof CourseOutline> & { open: boolean; onClose: () => void }) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Fechar sumário"
        onClick={onClose}
        className="absolute inset-0 bg-brand-950/70 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-label="Conteúdo do curso"
        className="animate-fade absolute inset-y-0 right-0 flex w-[min(22rem,88vw)] flex-col bg-brand-950 shadow-lift"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar sumário"
          className="absolute top-3 right-3 z-10 rounded-lg p-2 text-brand-200 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X aria-hidden className="size-5" />
        </button>
        <CourseOutline {...props} onNavigate={onClose} />
      </div>
    </div>
  );
}
