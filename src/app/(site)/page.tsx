import * as React from 'react';
import {
  ArrowRight,
  Award,
  Calculator,
  CheckCircle2,
  CreditCard,
  Gift,
  MessagesSquare,
  MonitorPlay,
  QrCode,
  Ruler,
  ShieldCheck,
  TrendingUp,
  X,
} from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { Badge } from '@/components/ui/primitives';
import { CourseCard } from '@/components/course/course-card';
import { TutorSignature } from '@/components/brand/logo';
import { featuredCourses } from '@/server/courses';
import { getPrimaryTutor } from '@/server/tutor';
import { getCurrentUser } from '@/server/auth/session';
import { SITE } from '@/lib/constants';
import { formatPrice, pixPrice, whatsappDigits } from '@/lib/utils';

// Depende do banco (e do login): nunca pré-gerar no build, quando o banco ainda não está acessível.
export const dynamic = 'force-dynamic';

/** Situações que o público-alvo reconhece na própria rotina. */
const PAINS = [
  'Abre o projeto e não sabe por onde começar.',
  'Entrega o orçamento com medo de ter esquecido alguma coisa.',
  'Assina sem ter certeza do que está assumindo.',
  'Vê outros fechando as obras que você poderia fechar.',
];

const OUTCOMES = [
  {
    icon: Ruler,
    title: 'Você deixa de ter medo do projeto',
    text: 'Cada linha, cota e símbolo passa a fazer sentido. Você enxerga a obra inteira antes de ela existir.',
  },
  {
    icon: Calculator,
    title: 'Seu orçamento passa a fechar a conta',
    text: 'Quantitativos, composições e BDI, passo a passo. Menos chute, mais lucro.',
  },
  {
    icon: ShieldCheck,
    title: 'Você sabe onde está pisando',
    text: 'ART, atribuições e responsabilidade técnica explicados sem juridiquês.',
  },
  {
    icon: Award,
    title: 'Você prova o que sabe',
    text: 'Certificado com código único. Qualquer cliente ou empresa confere online, em segundos.',
  },
];

const METHOD = [
  {
    step: 'Aprenda',
    icon: MonitorPlay,
    text: 'Aulas curtas, com exemplo de obra de verdade. Sem enrolação e sem teoria que não chega ao canteiro.',
  },
  {
    step: 'Evolua',
    icon: TrendingUp,
    text: 'Tarefas e checkpoints mostram o que você já domina e o que ainda falta. Você sempre sabe onde está.',
  },
  {
    step: 'Conquiste',
    icon: Award,
    text: 'Você conclui, recebe o certificado e passa a ser quem os outros procuram quando o assunto é projeto.',
  },
];

export default async function HomePage() {
  const [courses, tutor, user] = await Promise.all([
    featuredCourses(3),
    getPrimaryTutor(),
    getCurrentUser(),
  ]);

  const whatsapp = tutor?.socials.whatsapp ?? null;
  const waLink = whatsapp
    ? `https://wa.me/${whatsappDigits(whatsapp)}?text=${encodeURIComponent(
        'Olá! Quero informações sobre os cursos da ARAÚJO LEARN.',
      )}`
    : null;

  const paid = courses.filter((course) => !course.isBonus && course.priceCents);
  const bonus = courses.find((course) => course.isBonus);
  const bundleTotal = paid.reduce((total, course) => total + (course.priceCents ?? 0), 0);

  const totalHours = Math.round(
    courses.reduce(
      (total, course) =>
        total + (course.durationMinutes ?? Math.round(course.durationSeconds / 60)),
      0,
    ) / 60,
  );

  // Exemplo de custo do erro, calculado sobre o preço real do curso de orçamento.
  const budgetCourse = paid.find((course) => /or[çc]amento/i.test(course.title)) ?? paid[0];
  const exampleWork = 300_000;
  const exampleError = Math.round(exampleWork * 0.02);

  return (
    <>
      {/* ---------------------------------------------------------- Hero --- */}
      <section className="bg-night bg-grid relative overflow-hidden">
        <div className="relative mx-auto max-w-6xl px-4 pt-16 sm:px-6 lg:pt-24">
          <div className="grid items-end gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="animate-rise pb-16 lg:pb-24">
              <Badge tone="muted" icon={<ShieldCheck className="size-3.5" />}>
                Engenharia civil na prática
              </Badge>

              <h1 className="mt-6 font-display text-4xl leading-[1.08] font-semibold text-white sm:text-5xl lg:text-[3.4rem]">
                Um erro na obra custa mais caro do que{' '}
                <span className="text-gradient-brand">aprender certo.</span>
              </h1>

              <p className="mt-5 max-w-xl text-lg leading-relaxed text-brand-100">
                Leia qualquer projeto com segurança. Faça orçamentos que fecham a conta. E tenha um
                certificado que prova que você sabe, não só que assistiu.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/cursos" variant="accent" size="lg">
                  Quero aprender agora
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

              <p className="mt-4 text-sm text-brand-300">
                PIX com 10% de desconto ou até 12x no cartão · Acesso permanente
              </p>

              <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-7">
                <Metric value={`${totalHours}h`} label="de conteúdo direto ao ponto" />
                <Metric value={String(courses.length)} label="cursos, um deles de bônus" />
                <Metric value="100%" label="online, no seu ritmo" />
              </dl>
            </div>

            {/* Retrato: o rosto por trás do curso */}
            {tutor && (
              <figure
                className="animate-rise relative mx-auto w-full max-w-md self-end lg:max-w-none"
                style={{ animationDelay: '120ms' }}
              >
                <div className="pointer-events-none absolute inset-x-8 bottom-0 h-2/3 rounded-full bg-brand-500/25 blur-3xl" />
                <img
                  src={tutor.photoUrl}
                  alt={`${tutor.name}, engenheiro civil`}
                  width={900}
                  height={966}
                  fetchPriority="high"
                  className="relative mx-auto max-h-[34rem] w-auto rounded-t-[2rem] object-cover object-top"
                />
                <figcaption className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/15 bg-brand-950/80 px-5 py-4 backdrop-blur-md sm:inset-x-8">
                  <p className="font-display text-lg font-semibold text-white">{tutor.name}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-brand-200">
                    MSc em Perícia e Avaliação de Engenharia · MBA em Gestão de Projetos
                  </p>
                </figcaption>
              </figure>
            )}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Dor --- */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <header>
            <p className="text-xs font-semibold tracking-[0.14em] text-accent-600 uppercase">
              Você se reconhece?
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
              Você já passou por isso?
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-ink-600">
              Não é falta de capacidade. É falta de método. E método se aprende, em semanas, não em
              anos de tentativa e erro.
            </p>
          </header>

          <ul className="flex flex-col gap-3">
            {PAINS.map((pain) => (
              <li
                key={pain}
                className="flex items-start gap-3.5 rounded-card border border-ink-200 bg-white p-4 shadow-soft"
              >
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-danger-50 text-danger-500">
                  <X aria-hidden className="size-3.5" strokeWidth={3} />
                </span>
                <span className="text-[0.9375rem] leading-relaxed font-medium text-ink-800">
                  {pain}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------- Resultado --- */}
      <section className="border-y border-ink-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <header className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.14em] text-brand-500 uppercase">
              O que muda
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
              Depois do curso, você trabalha diferente.
            </h2>
          </header>

          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {OUTCOMES.map((item) => (
              <li
                key={item.title}
                className="rounded-card border border-ink-200 bg-ink-50 p-6"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-brand-900 text-accent-300">
                  <item.icon aria-hidden className="size-5.5" />
                </span>
                <h3 className="mt-4 font-sans text-base font-semibold text-ink-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------------ Valor --- */}
      <section className="bg-night">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-accent-300 uppercase">
              Faça a conta
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold text-white sm:text-4xl">
              Quanto custa não saber?
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-brand-100">
              Você não está pagando por aulas. Está pagando para não cometer o erro caro, aquele
              que aparece só depois que o dinheiro já saiu.
            </p>
          </div>

          <div className="rounded-card border border-white/15 bg-white/[0.06] p-7 backdrop-blur-md">
            <p className="text-sm text-brand-200">
              Exemplo: uma obra de <strong className="text-white">{formatPrice(exampleWork * 100)}</strong>
            </p>
            <p className="mt-1 text-sm text-brand-200">Um erro de apenas 2% no orçamento é:</p>
            <p className="mt-2 font-display text-4xl font-semibold text-accent-300">
              {formatPrice(exampleError * 100)}
            </p>
            <p className="mt-1 text-sm text-brand-200">saindo do seu bolso.</p>

            {budgetCourse?.priceCents && (
              <div className="mt-6 border-t border-white/15 pt-5">
                <p className="text-sm text-brand-200">O curso de orçamento custa</p>
                <p className="mt-1 font-display text-2xl font-semibold text-white">
                  {formatPrice(budgetCourse.priceCents)}
                </p>
              </div>
            )}
            <p className="mt-4 text-xs text-brand-400">Exemplo ilustrativo, apenas para comparação.</p>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- Cursos --- */}
      <section id="cursos">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <p className="text-xs font-semibold tracking-[0.14em] text-brand-500 uppercase">
                Os cursos
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
                Comece por onde dói mais.
              </h2>
              <p className="mt-3 text-lg text-ink-600">
                Cursos diretos, feitos para aplicar na segunda-feira. Leve os dois e ganhe o
                terceiro.
              </p>
            </div>
            <ButtonLink href="/cursos" variant="secondary">
              Ver todos os cursos
              <ArrowRight aria-hidden className="size-4" />
            </ButtonLink>
          </header>

          {courses.length > 0 ? (
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <li key={course.id}>
                  <CourseCard course={course} ctaLabel="Quero este curso" />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-10 rounded-card border border-dashed border-ink-300 px-6 py-14 text-center">
              <p className="font-sans text-base font-semibold text-ink-800">
                Os primeiros cursos estão chegando.
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-ink-500">
                Crie sua conta para ser avisado assim que abrirem.
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
                    Leve os dois. O terceiro é presente.
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-700">
                    Quem leva{' '}
                    {paid.map((course, index) => (
                      <React.Fragment key={course.id}>
                        {index > 0 && ' e '}
                        <strong>{course.title}</strong>
                      </React.Fragment>
                    ))}{' '}
                    recebe, sem pagar nada a mais, o curso <strong>{bonus.title}</strong>, liberado
                    automaticamente na sua conta.
                  </p>
                </div>
                <div className="shrink-0">
                  <p className="text-xs text-ink-500">Os dois cursos</p>
                  <p className="font-display text-2xl font-semibold text-brand-900">
                    {formatPrice(bundleTotal)}
                  </p>
                  <p className="text-xs text-ink-500">
                    {formatPrice(pixPrice(bundleTotal, 10))} à vista no PIX
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------- Pagamento --- */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <PayCard
              icon={QrCode}
              title="PIX com 10% de desconto"
              text="Pagando à vista, você economiza logo de cara."
            />
            <PayCard
              icon={CreditCard}
              title="Até 12x no cartão de crédito"
              text="A parcela cabe no mês, e o curso é seu para sempre."
            />
            <PayCard
              icon={MessagesSquare}
              title={whatsapp ?? 'Tire suas dúvidas'}
              text="Fale no WhatsApp antes de decidir. Sem compromisso."
              href={waLink ?? undefined}
            />
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- Metodologia --- */}
      <section id="metodologia" className="scroll-mt-20 border-y border-ink-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <header className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.14em] text-brand-500 uppercase">
              Como funciona
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
              Três passos. Sempre nessa ordem.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-600">
              {SITE.slogan} não é enfeite: é o desenho de cada curso.
            </p>
          </header>

          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {METHOD.map((item, index) => (
              <li
                key={item.step}
                className="relative rounded-card border border-ink-200 bg-ink-50 p-7"
              >
                <span
                  aria-hidden
                  className="font-display absolute top-6 right-6 text-5xl leading-none font-semibold text-ink-200"
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
        </div>
      </section>

      {/* --------------------------------------------------------- Tutor --- */}
      {tutor && (
        <section>
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div className="relative">
              <img
                src={tutor.fieldPhotoUrl}
                alt={`${tutor.name} em obra, de capacete`}
                width={900}
                height={993}
                loading="lazy"
                className="aspect-[4/4.4] w-full rounded-card object-cover object-top shadow-lift"
              />
              <div className="absolute -right-3 -bottom-5 hidden rounded-2xl border border-ink-200 bg-white px-5 py-4 shadow-lift sm:block">
                <TutorSignature size="sm" />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-brand-500 uppercase">
                Quem vai te ensinar
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">{tutor.name}</h2>
              <p className="mt-2 text-lg font-medium text-accent-600">
                Engenheiro Civil · MSc em Perícia e Avaliação de Engenharia · MBA em Gestão de
                Projetos
              </p>

              <p className="mt-5 leading-relaxed text-ink-600">
                Perícia é o trabalho de descobrir por que uma obra deu errado. Quem estuda isso sabe
                exatamente onde os erros nascem, na leitura do projeto, no orçamento, na
                responsabilidade que ninguém percebeu que estava assumindo.
              </p>
              <p className="mt-4 leading-relaxed text-ink-600">
                É esse olhar que está em cada aula: o que realmente importa, o que quase todo mundo
                erra e como você evita. E se bater dúvida no meio do caminho, você tem a quem
                perguntar.
              </p>

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
                Conhecer a trajetória
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
            Você pode continuar dependendo dos outros para entender um projeto.{' '}
            <span className="text-gradient-brand">Ou pode aprender agora.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-brand-100">
            Crie sua conta, escolha o curso e comece hoje. Quanto antes você domina, antes esse
            conhecimento começa a se pagar.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href={user ? '/painel' : '/criar-conta'} variant="accent" size="lg">
              {user ? 'Ir para o meu painel' : 'Quero começar hoje'}
              <ArrowRight aria-hidden className="size-4.5" />
            </ButtonLink>
            {waLink ? (
              <ButtonLink href={waLink} variant="outline-light" size="lg" target="_blank">
                <MessagesSquare aria-hidden className="size-4.5" />
                Tirar uma dúvida
              </ButtonLink>
            ) : (
              <ButtonLink href="/cursos" variant="outline-light" size="lg">
                Ver os cursos
              </ButtonLink>
            )}
          </div>
          <p className="mt-5 text-sm text-brand-300">
            PIX com 10% de desconto · até 12x no cartão · certificado ao concluir
          </p>
        </div>
      </section>
    </>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
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
    'flex items-start gap-3 rounded-card border border-ink-200 bg-white p-5 transition-colors';

  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`${className} hover:border-brand-300 hover:bg-brand-50`}
    >
      {content}
    </a>
  ) : (
    <div className={className}>{content}</div>
  );
}
