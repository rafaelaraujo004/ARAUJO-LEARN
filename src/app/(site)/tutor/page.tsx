import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
  AtSign,
  Briefcase,
  GraduationCap,
  Globe,
  HardHat,
  MessageCircle,
  PlayCircle,
  ShieldCheck,
} from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Badge, Card } from '@/components/ui/primitives';
import { TutorSignature } from '@/components/brand/logo';
import { CourseCard } from '@/components/course/course-card';
import { featuredCourses } from '@/server/courses';
import { getPrimaryTutor } from '@/server/tutor';
import { pluralize, whatsappDigits } from '@/lib/utils';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const tutor = await getPrimaryTutor();
  if (!tutor) return { title: 'O tutor' };
  return {
    title: tutor.name,
    description: tutor.headline ?? undefined,
  };
}

const SOCIAL_ICONS: Record<string, { icon: React.ElementType; label: string }> = {
  instagram: { icon: AtSign, label: 'Instagram' },
  linkedin: { icon: Briefcase, label: 'LinkedIn' },
  youtube: { icon: PlayCircle, label: 'YouTube' },
  site: { icon: Globe, label: 'Site' },
};

export default async function TutorPage() {
  const [tutor, courses] = await Promise.all([getPrimaryTutor(), featuredCourses(3)]);
  if (!tutor) notFound();

  const whatsapp = tutor.socials.whatsapp ?? null;
  const waLink = whatsapp
    ? `https://wa.me/${whatsappDigits(whatsapp)}?text=${encodeURIComponent(
        'Olá! Vim pelo site da ARAÚJO LEARN e quero falar sobre os cursos.',
      )}`
    : null;

  const links = Object.entries(tutor.socials).filter(
    ([key, value]) => key !== 'whatsapp' && value && SOCIAL_ICONS[key],
  );

  return (
    <>
      {/* -------------------------------------------------------- Abertura --- */}
      <section className="bg-night bg-grid">
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:py-20">
          <div>
            <div className="overflow-hidden rounded-card border border-white/15 bg-white/[0.06]">
              {tutor.photoUrl ? (
                <img
                  src={tutor.photoUrl}
                  alt={`${tutor.name}, engenheiro civil`}
                  width={900}
                  height={966}
                  fetchPriority="high"
                  className="aspect-[4/4.4] w-full object-cover object-top"
                />
              ) : (
                <div className="grid aspect-[4/5] w-full place-items-center p-8">
                  <TutorSignature variant="light" size="lg" />
                </div>
              )}
            </div>

            {(waLink || links.length > 0) && (
              <div className="mt-5 flex flex-wrap gap-2">
                {waLink && (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-accent-400 px-4 py-2.5 text-sm font-semibold text-brand-950 transition-colors hover:bg-accent-300"
                  >
                    <MessageCircle aria-hidden className="size-4" />
                    {whatsapp}
                  </a>
                )}
                {links.map(([key, value]) => {
                  const config = SOCIAL_ICONS[key]!;
                  const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
                  return (
                    <a
                      key={key}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={config.label}
                      title={config.label}
                      className="grid size-11 place-items-center rounded-xl border border-white/20 text-white transition-colors hover:bg-white/10"
                    >
                      <config.icon aria-hidden className="size-5" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-accent-300 uppercase">
              Quem vai te ensinar
            </p>
            <h1 className="mt-3 font-display text-4xl font-semibold text-white sm:text-5xl">
              {tutor.name}
            </h1>
            {tutor.headline && (
              <p className="mt-3 text-lg leading-relaxed text-brand-200">{tutor.headline}</p>
            )}

            {tutor.bio && (
              <p className="mt-6 leading-relaxed whitespace-pre-line text-brand-200">{tutor.bio}</p>
            )}

            {tutor.specialties.length > 0 && (
              <ul className="mt-7 flex flex-wrap gap-2">
                {tutor.specialties.map((item) => (
                  <li key={item}>
                    <Badge tone="muted" icon={<CheckCircle2 className="size-3" />}>
                      {item}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}

            <dl className="mt-10 grid max-w-md grid-cols-2 gap-6 border-t border-white/10 pt-8">
              <div>
                <dt className="sr-only">Cursos publicados</dt>
                <dd className="font-display text-3xl font-semibold text-white tabular-nums">
                  {tutor.courseCount}
                </dd>
                <p className="mt-1 text-xs text-brand-300" aria-hidden>
                  {pluralize(tutor.courseCount, 'curso publicado', 'cursos publicados').replace(
                    /^\d+\s/,
                    '',
                  )}
                </p>
              </div>
              <div>
                <dt className="sr-only">Alunos matriculados</dt>
                <dd className="font-display text-3xl font-semibold text-white tabular-nums">
                  {tutor.studentCount}
                </dd>
                <p className="mt-1 text-xs text-brand-300" aria-hidden>
                  {tutor.studentCount === 1 ? 'aluno matriculado' : 'alunos matriculados'}
                </p>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ Formação e método --- */}
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          {tutor.experience && (
            <Card className="p-6">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
                <GraduationCap aria-hidden className="size-5 text-brand-500" />
                Formação e experiência
              </h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-ink-600">
                {tutor.experience}
              </p>
            </Card>
          )}

          {tutor.methodology && (
            <Card className="p-6">
              <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
                <Compass aria-hidden className="size-5 text-brand-500" />
                Metodologia
              </h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-ink-600">
                {tutor.methodology}
              </p>
            </Card>
          )}
        </div>

        {/* Na obra */}
        <section className="mt-12 grid items-center gap-8 overflow-hidden rounded-card border border-ink-200 bg-white shadow-soft md:grid-cols-[0.8fr_1.2fr]">
          <img
            src={tutor.fieldPhotoUrl}
            alt={`${tutor.name} em obra, de capacete`}
            width={900}
            height={993}
            loading="lazy"
            className="size-full max-h-[26rem] object-cover object-top"
          />
          <div className="p-6 md:py-8 md:pr-10 md:pl-2">
            <span className="grid size-11 place-items-center rounded-xl bg-brand-900 text-accent-300">
              <HardHat aria-hidden className="size-5.5" />
            </span>
            <h2 className="mt-4 font-display text-2xl font-semibold">
              Ensina de quem já esteve na obra.
            </h2>
            <p className="mt-3 leading-relaxed text-ink-600">
              Cada aula nasce de situações reais: projeto que não bate, orçamento que estourou,
              responsabilidade assumida sem saber. O que você aprende aqui é o que funciona no
              canteiro — e não só no papel.
            </p>
          </div>
        </section>

        {/* O que o aluno leva */}
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">O que você leva</h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: 'Segurança para decidir',
                text: 'Você deixa de depender de terceiros para entender um projeto ou fechar um orçamento. E, se surgir dúvida, tem a quem perguntar.',
              },
              {
                icon: BookOpen,
                title: 'Material que fica',
                text: 'Apostila e material complementar para consultar no escritório ou no canteiro, depois do curso.',
              },
              {
                icon: Award,
                title: 'Certificado verificável',
                text: 'Emitido ao concluir, com código único que qualquer empresa pode conferir online.',
              },
            ].map((item) => (
              <li key={item.title} className="rounded-card border border-ink-200 bg-white p-5">
                <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <item.icon aria-hidden className="size-5" />
                </span>
                <h3 className="mt-3 font-sans text-sm font-semibold text-ink-900">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{item.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Cursos do tutor */}
        {courses.length > 0 && (
          <section className="mt-14">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-display text-2xl font-semibold">Escolha o seu curso</h2>
              <Link href="/cursos" className="text-sm font-semibold text-brand-600 hover:underline">
                Ver catálogo completo
              </Link>
            </div>
            <ul className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <li key={course.id}>
                  <CourseCard course={course} ctaLabel="Quero este curso" />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* ------------------------------------------------------------- CTA --- */}
      <section className="border-t border-ink-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
          <TutorSignature className="mx-auto" size="md" />
          <p className="mt-6 text-lg text-ink-600">
            Não sabe qual curso faz mais sentido para o seu momento? Me chame antes de decidir. É
            rápido e sem compromisso.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            {waLink && (
              <ButtonLink href={waLink} variant="accent" size="lg" target="_blank">
                <MessageCircle aria-hidden className="size-4.5" />
                Falar no WhatsApp
              </ButtonLink>
            )}
            <ButtonLink href="/cursos" variant="secondary" size="lg">
              Ver os cursos
              <ArrowRight aria-hidden className="size-4" />
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
