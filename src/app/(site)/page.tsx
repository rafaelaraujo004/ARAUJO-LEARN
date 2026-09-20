import * as React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Compass,
  CreditCard,
  FileText,
  Gift,
  MessagesSquare,
  MonitorPlay,
  MoveUpRight,
  QrCode,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';
import { CourseCard } from '@/components/course/course-card';
import { featuredCourses } from '@/server/courses';
import { getPrimaryTutor } from '@/server/tutor';
import { getCurrentUser } from '@/server/auth/session';
import { SITE } from '@/lib/constants';
import { formatPrice, pixPrice, whatsappDigits } from '@/lib/utils';

export const revalidate = 300;

const BENEFITS = [
  {
    icon: MessagesSquare,
    title: 'Você fala com o tutor',
    text: 'Não é videoaula solta. Durante toda a formação você tem canal aberto com o Eng. Amilton Araújo — inclusive para levar os projetos e orçamentos do seu próprio trabalho.',
  },
  {
    icon: Target,
    title: 'Conteúdo que vira prática',
    text: 'Cada módulo parte de uma situação real de obra e termina com uma tarefa aplicada. O critério é um só: você conseguir usar no dia seguinte.',
  },
  {
    icon: FileText,
    title: 'Apostila e material de apoio',
    text: 'Você recebe apostila e material complementar para consultar depois, no escritório ou no canteiro. O conteúdo fica com você.',
  },
  {
    icon: Award,
    title: 'Certificação ao concluir',
    text: 'Ao terminar, o certificado é emitido automaticamente, com código único que qualquer pessoa — ou qualquer empresa — pode conferir online.',
  },
];

const METHOD = [
  {
    step: 'Aprenda',
    icon: MonitorPlay,
    text: 'Aulas diretas ao ponto, organizadas em módulos, partindo de projetos e obras reais. Nada de teoria que não chega ao canteiro.',
  },
  {
    step: 'Evolua',
    icon: TrendingUp,
    text: 'Tarefas práticas e checkpoints ao longo do curso, com o tutor disponível para revisar suas dúvidas e o seu raciocínio — não só a resposta.',
  },
  {
    step: 'Conquiste',
    icon: Award,
    text: 'Você termina dominando o assunto de ponta a ponta, com certificado de conclusão e código de validação pública para comprovar.',
  },
];

export default async function HomePage() {
  const [courses, tutor, user] = await Promise.all([
    featuredCourses(3),
    getPrimaryTutor(),
    getCurrentUser(),
  ]);

  const totalStudents = tutor?.studentCount ?? 0;
  const whatsapp = tutor?.socials.whatsapp ?? null;
  const waLink = whatsapp
    ? `https://wa.me/${whatsappDigits(whatsapp)}?text=${encodeURIComponent(
        'Olá! Quero informações sobre os cursos da ARAÚJO LEARN.',
      )}`
    : null;

  const paid = courses.filter((course) => !course.isBonus && course.priceCents);
  const bonus = courses.find((course) => course.isBonus);
  const bundleTotal = paid.reduce((total, course) => total + (course.priceCents ?? 0), 0);

  return (
    <>
      {/* ---------------------------------------------------------- Hero --- */}
      <section className="bg-night bg-grid relative overflow-hidden">
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="animate-rise">
              <Badge tone="muted" icon={<Sparkles className="size-3.5" />}>
                Formação técnica para quem vive de obra
              </Badge>

              <h1 className="mt-6 font-display text-4xl leading-[1.08] font-semibold text-white sm:text-5xl lg:text-[3.35rem]">
                Do projeto ao orçamento,{' '}
                <span className="text-gradient-brand">com segurança técnica.</span>
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-brand-200">
                Cursos de engenharia civil conduzidos diretamente pelo{' '}
                <strong className="font-semibold text-white">Eng. Amilton Araújo</strong>, com
                acompanhamento do tutor durante toda a formação. Conteúdo suficiente para você sair
                dominando o assunto — e com certificado para comprovar.
              </p>

              <p className="mt-6 font-display text-lg tracking-tight text-accent-300">
                {SITE.slogan}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/cursos" variant="accent" size="lg">
                  Ver cursos e valores
                  <ArrowRight aria-hidden className="size-4.5" />
                </ButtonLink>
                {user ? (
                  <ButtonLink
                    href={user.role === 'STUDENT' ? '/painel' : '/admin'}
                    variant="outline-light"
                    size="lg"
                  >
                    Continuar aprendendo
                  </ButtonLink>
                ) : (
                  <ButtonLink href="/criar-conta" variant="outline-light" size="lg">
                    Criar minha conta
                  </ButtonLink>
                )}
              </div>

              <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-8">
                <Metric
                  value={tutor?.courseCount ?? 0}
                  label={(tutor?.courseCount ?? 0) === 1 ? 'curso disponível' : 'cursos disponíveis'}
                />
                <Metric
                  value={totalStudents}
                  label={totalStudents === 1 ? 'aluno matriculado' : 'alunos matriculados'}
                />
                <Metric value="100%" label="online, no seu ritmo" />
              </dl>
            </div>

            {/* Cartão do tutor */}
            {tutor && (
              <div className="animate-rise lg:justify-self-end" style={{ animationDelay: '120ms' }}>
                <div className="relative mx-auto max-w-sm rounded-card border border-white/15 bg-white/[0.06] p-6 backdrop-blur-md">
                  <div className="flex items-center gap-4">
                    <TutorPhoto name={tutor.name} url={tutor.photoUrl} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold tracking-[0.14em] text-accent-300 uppercase">
                        Professor e palestrante
                      </p>
                      <p className="mt-0.5 truncate font-display text-xl font-semibold text-white">
                        {tutor.name}
                      </p>
                    </div>
                  </div>

                  {tutor.headline && (
                    <p className="mt-4 text-sm leading-relaxed text-brand-200">{tutor.headline}</p>
                  )}

                  {tutor.specialties.length > 0 && (
                    <ul className="mt-5 flex flex-wrap gap-1.5">
                      {tutor.specialties.slice(0, 5).map((item) => (
                        <li key={item}>
                          <Badge tone="muted">{item}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}

                  <Link
                    href="/tutor"
                    className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-300 transition-colors hover:text-accent-200"
                  >
                    Conhecer o tutor
                    <MoveUpRight aria-hidden className="size-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- Benefícios --- */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <header className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.14em] text-brand-500 uppercase">
            Por que estudar aqui
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
            Curso com tutor presente — não com vídeo esquecido numa pasta.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-ink-600">
            A diferença entre assistir a um curso e dominar um assunto é ter com quem falar quando a
            dúvida aparece. Aqui o tutor acompanha você do começo ao certificado.
          </p>
        </header>

        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((benefit) => (
            <li
              key={benefit.title}
              className="rounded-card border border-ink-200 bg-white p-6 shadow-soft"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <benefit.icon aria-hidden className="size-5.5" />
              </span>
              <h3 className="mt-4 font-sans text-base font-semibold text-ink-900">
                {benefit.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{benefit.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* --------------------------------------------------------- Cursos --- */}
      <section className="border-y border-ink-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <p className="text-xs font-semibold tracking-[0.14em] text-brand-500 uppercase">
                Cursos disponíveis
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
                Escolha por onde começar.
              </h2>
            </div>
            <ButtonLink href="/cursos" variant="secondary">
              Ver catálogo completo
              <ArrowRight aria-hidden className="size-4" />
            </ButtonLink>
          </header>

          {courses.length > 0 ? (
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <li key={course.id}>
                  <CourseCard course={course} ctaLabel="Ver o curso" />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-10 rounded-card border border-dashed border-ink-300 px-6 py-14 text-center">
              <p className="font-sans text-base font-semibold text-ink-800">
                Os primeiros cursos estão sendo preparados.
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
                Crie sua conta para ser avisado assim que o conteúdo for publicado.
              </p>
              <ButtonLink href="/criar-conta" className="mt-6">
                Criar conta gratuita
              </ButtonLink>
            </div>
          )}

          {/* ------------------------------------------------------- Bônus --- */}
          {bonus && paid.length >= 2 && (
            <div className="mt-10 overflow-hidden rounded-card border border-accent-200 bg-accent-50">
              <div className="flex flex-wrap items-center gap-6 p-6 sm:p-8">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-accent-400 text-brand-950">
                  <Gift aria-hidden className="size-7" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold tracking-[0.14em] text-accent-700 uppercase">
                    Bônus especial
                  </p>
                  <h3 className="mt-1.5 font-display text-2xl font-semibold text-brand-900">
                    Levou os dois cursos? O terceiro é por nossa conta.
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-700">
                    Ao adquirir{' '}
                    {paid.map((course, index) => (
                      <React.Fragment key={course.id}>
                        {index > 0 && ' e '}
                        <strong>{course.title}</strong>
                      </React.Fragment>
                    ))}
                    , você ganha o curso <strong>{bonus.title}</strong> — liberado automaticamente
                    na sua conta, sem custo adicional.
                  </p>
                </div>
                <div className="shrink-0">
                  <p className="text-xs text-ink-500">Os dois cursos</p>
                  <p className="font-display text-2xl font-semibold text-brand-900">
                    {formatPrice(bundleTotal)}
                  </p>
                  <p className="text-xs text-ink-500">
                    {formatPrice(pixPrice(bundleTotal, 10))} no PIX
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------- Pagamento --- */}
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <PayCard
              icon={QrCode}
              title="PIX com 10% de desconto"
              text="Pagamento à vista, com desconto aplicado sobre o valor do curso."
            />
            <PayCard
              icon={CreditCard}
              title="Até 12x no cartão"
              text="Parcelamento no cartão de crédito, combinado direto com o tutor."
            />
            <PayCard
              icon={MessagesSquare}
              title={whatsapp ?? 'Suporte direto'}
              text="Informações, dúvidas e suporte por WhatsApp, antes e durante o curso."
              href={waLink ?? undefined}
            />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- Metodologia --- */}
      <section id="metodologia" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <header className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.14em] text-brand-500 uppercase">
              Metodologia
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
              Três passos. Sempre nessa ordem.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-600">
              O slogan não é enfeite: é o desenho do curso. Cada módulo leva você de um degrau ao
              seguinte, com o tutor acompanhando a subida.
            </p>
          </header>

          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {METHOD.map((item, index) => (
              <li
                key={item.step}
                className="relative rounded-card border border-ink-200 bg-white p-7 shadow-soft"
              >
                <span
                  aria-hidden
                  className="font-display absolute top-6 right-6 text-5xl leading-none font-semibold text-ink-100"
                >
                  {index + 1}
                </span>
                <span className="grid size-12 place-items-center rounded-xl bg-brand-900 text-accent-300">
                  <item.icon aria-hidden className="size-6" />
                </span>
                <h3 className="mt-5 font-display text-2xl font-semibold text-brand-900">
                  {item.step}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-ink-600">{item.text}</p>
              </li>
            ))}
          </ol>

          {tutor?.methodology && (
            <div className="mt-10 rounded-card border border-ink-200 bg-white p-7 shadow-soft">
              <h3 className="flex items-center gap-2 font-sans text-sm font-semibold text-ink-900">
                <Compass aria-hidden className="size-4 text-brand-500" />
                Como o tutor conduz
              </h3>
              <p className="mt-2 leading-relaxed whitespace-pre-line text-ink-600">
                {tutor.methodology}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* --------------------------------------------------------- Tutor --- */}
      {tutor && (
        <section className="border-y border-ink-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="relative">
              <div className="overflow-hidden rounded-card bg-brand-900">
                {tutor.photoUrl ? (
                  <img
                    src={tutor.photoUrl}
                    alt={`Foto de ${tutor.name}`}
                    className="aspect-[4/5] w-full object-cover"
                  />
                ) : (
                  <div className="bg-night bg-grid grid aspect-[4/5] w-full place-items-center">
                    <span className="font-display relative text-6xl font-semibold text-white/20">
                      {tutor.name
                        .replace(/^Eng\.\s*/i, '')
                        .split(' ')
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join('')}
                    </span>
                  </div>
                )}
              </div>
              <div className="absolute -right-4 -bottom-5 hidden rounded-xl border border-ink-200 bg-white px-4 py-3 shadow-lift sm:block">
                <p className="flex items-center gap-2 text-sm font-semibold text-brand-900">
                  <Users aria-hidden className="size-4 text-brand-500" />
                  {totalStudents} {totalStudents === 1 ? 'aluno' : 'alunos'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-brand-500 uppercase">
                Quem ensina
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">{tutor.name}</h2>
              {tutor.headline && (
                <p className="mt-2 text-lg font-medium text-accent-600">{tutor.headline}</p>
              )}
              {tutor.bio && (
                <p className="mt-5 leading-relaxed whitespace-pre-line text-ink-600">{tutor.bio}</p>
              )}

              {tutor.experience && (
                <div className="mt-6">
                  <h3 className="font-sans text-sm font-semibold text-ink-900">Formação e experiência</h3>
                  <p className="mt-1.5 leading-relaxed whitespace-pre-line text-sm text-ink-600">
                    {tutor.experience}
                  </p>
                </div>
              )}

              {tutor.specialties.length > 0 && (
                <ul className="mt-6 flex flex-wrap gap-2">
                  {tutor.specialties.map((item) => (
                    <li key={item}>
                      <Badge tone="brand" icon={<CheckCircle2 className="size-3" />}>
                        {item}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}

              <ButtonLink href="/tutor" variant="secondary" className="mt-8">
                Ver apresentação completa
                <ArrowRight aria-hidden className="size-4" />
              </ButtonLink>
            </div>
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------- CTA --- */}
      <section className="bg-night">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
            Comece hoje. O primeiro passo leva dois minutos.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-brand-200">
            Crie sua conta, escolha o curso e combine o pagamento direto com o tutor. O acesso é
            liberado na sequência — e a plataforma cuida do resto, inclusive de lembrar onde você
            parou.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href={user ? '/painel' : '/criar-conta'} variant="accent" size="lg">
              {user ? 'Ir para o meu painel' : 'Criar conta gratuita'}
              <ArrowRight aria-hidden className="size-4.5" />
            </ButtonLink>
            {waLink ? (
              <ButtonLink href={waLink} variant="outline-light" size="lg" target="_blank">
                <MessagesSquare aria-hidden className="size-4.5" />
                Falar com o tutor
              </ButtonLink>
            ) : (
              <ButtonLink href="/cursos" variant="outline-light" size="lg">
                Explorar os cursos
              </ButtonLink>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function Metric({ value, label }: { value: number | string; label: string }) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd className="font-display text-3xl font-semibold text-white tabular-nums">{value}</dd>
      <p className="mt-1 text-xs leading-snug text-brand-300" aria-hidden>
        {label}
      </p>
    </div>
  );
}

function PayCard({
  icon: Icon,
  title,
  text,
  href,
}: {
  icon: React.ElementType;
  title: string;
  text: string;
  href?: string;
}) {
  const content = (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="font-sans text-sm font-semibold text-ink-900">{title}</p>
        <p className="mt-0.5 text-sm text-ink-600">{text}</p>
      </div>
    </>
  );

  const className =
    'flex items-start gap-3 rounded-card border border-ink-200 bg-ink-50 p-5 transition-colors';

  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className={`${className} hover:border-brand-300 hover:bg-white`}>
      {content}
    </a>
  ) : (
    <div className={className}>{content}</div>
  );
}

function TutorPhoto({ name, url }: { name: string; url: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt={`Foto de ${name}`}
        className="size-16 shrink-0 rounded-full object-cover ring-2 ring-accent-300/40"
      />
    );
  }
  const letters = name
    .replace(/^Eng\.\s*/i, '')
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  return (
    <span
      aria-hidden
      className="grid size-16 shrink-0 place-items-center rounded-full bg-brand-800 font-display text-xl font-semibold text-accent-300 ring-2 ring-accent-300/40"
    >
      {letters}
    </span>
  );
}
