/**
 * Dados iniciais.
 *
 * Cria o tutor/administrador e um conjunto de CONTEÚDO DE DEMONSTRAÇÃO,
 * claramente identificável, para que a plataforma possa ser vista funcionando
 * antes de existir conteúdo real. Tudo pode ser editado ou apagado pelo painel.
 *
 * É idempotente: rodar de novo não duplica nada.
 *
 *   npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomBytes, scrypt } from 'node:crypto';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL ausente. Veja .env.example.');

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/** Mesmo formato de `src/server/auth/password.ts`. */
function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else
        resolve(
          ['scrypt', 16384, 8, 1, salt.toString('base64url'), key.toString('base64url')].join('$'),
        );
    });
  });
}

const TUTOR_EMAIL = process.env.SEED_TUTOR_EMAIL ?? 'tutor@araujolearn.com';
const TUTOR_PASSWORD = process.env.SEED_TUTOR_PASSWORD ?? 'araujo2024';
const STUDENT_EMAIL = process.env.SEED_STUDENT_EMAIL ?? 'aluno@araujolearn.com';
const STUDENT_PASSWORD = process.env.SEED_STUDENT_PASSWORD ?? 'aluno2024';

interface LessonSeed {
  title: string;
  description: string;
  content?: string;
  minutes: number;
  preview?: boolean;
}

interface ModuleSeed {
  title: string;
  description: string;
  lessons: LessonSeed[];
}

interface CourseSeed {
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  objective: string;
  audience: string;
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  status: 'DRAFT' | 'PUBLISHED';
  modules: ModuleSeed[];
}

const COURSES: CourseSeed[] = [
  {
    slug: 'excel-do-zero-ao-profissional',
    title: 'Excel do Zero ao Profissional',
    shortDescription:
      'Saia do zero e chegue às funções que o mercado realmente cobra: organização de dados, fórmulas, tabelas dinâmicas e relatórios.',
    description:
      'Um caminho completo e sem atalhos furados. Você começa entendendo a lógica da planilha, passa pelas fórmulas que resolvem 90% dos problemas do dia a dia e termina montando um relatório que se atualiza sozinho.\n\nCada módulo termina com uma tarefa prática. Nada de decorar botão: o objetivo é você conseguir resolver um problema novo sozinho.',
    objective:
      'Ao final, você será capaz de organizar qualquer base de dados, construir fórmulas confiáveis e entregar relatórios claros com tabelas dinâmicas e gráficos.',
    audience:
      'Quem usa Excel no trabalho e sente que só arranha a superfície, e quem nunca abriu uma planilha e quer começar do jeito certo.',
    level: 'BEGINNER',
    status: 'PUBLISHED',
    modules: [
      {
        title: 'Primeiros passos',
        description: 'A lógica da planilha antes de qualquer fórmula.',
        lessons: [
          {
            title: 'Como o Excel pensa',
            description: 'Células, referências e por que tudo depende disso.',
            minutes: 9,
            preview: true,
            content:
              '## O que você vai entender aqui\n\nAntes de qualquer fórmula, é preciso entender **como o Excel enxerga uma planilha**. Tudo se resume a três ideias:\n\n1. Toda informação mora em uma **célula**.\n2. Toda célula tem um **endereço** (A1, B7, C12).\n3. Fórmulas não guardam números: elas guardam **caminhos até os números**.\n\n> Quem entende isso para de errar referência. Quem não entende passa a vida arrastando fórmula e torcendo.\n\n### Exercício rápido\n\nAbra uma planilha em branco e escreva seu nome em `A1`. Em `B1`, escreva `=A1`. Agora mude o que está em `A1` e observe o que acontece com `B1`.',
          },
          {
            title: 'Organizando dados do jeito certo',
            description: 'A regra de ouro: uma informação por coluna, um registro por linha.',
            minutes: 12,
            content:
              '## Uma informação por coluna\n\nA maior parte dos problemas com planilhas nasce aqui: misturar informações na mesma célula.\n\n- **Errado:** `João Silva - 11/03/2024 - R$ 1.200`\n- **Certo:** três colunas separadas — Nome, Data, Valor\n\nQuando os dados estão organizados assim, tudo o mais fica fácil: filtro, ordenação, tabela dinâmica e gráfico.',
          },
          {
            title: 'Formatação que comunica',
            description: 'Deixar bonito é consequência de deixar claro.',
            minutes: 11,
          },
        ],
      },
      {
        title: 'Fórmulas que resolvem',
        description: 'As funções que aparecem em praticamente todo trabalho real.',
        lessons: [
          {
            title: 'SOMA, MÉDIA, MÁXIMO e MÍNIMO',
            description: 'O básico bem feito resolve mais do que parece.',
            minutes: 14,
          },
          {
            title: 'SE: a fórmula que toma decisões',
            description: 'Condições, valores verdadeiros e falsos, e SEs encadeados.',
            minutes: 18,
            content:
              '## A estrutura do SE\n\n```\n=SE(condição; valor se verdadeiro; valor se falso)\n```\n\nLeia sempre em voz alta: *"Se isso for verdade, faça aquilo; senão, faça outra coisa."*\n\n### Cuidado com o encadeamento\n\nSEs dentro de SEs funcionam, mas depois do terceiro nível a fórmula vira um labirinto. Quando chegar nesse ponto, o problema geralmente é outro: falta uma tabela de apoio.',
          },
          {
            title: 'PROCV e PROCX na prática',
            description: 'Buscar informação em outra tabela sem errar.',
            minutes: 21,
          },
        ],
      },
      {
        title: 'Relatórios e apresentação',
        description: 'Transformar dados em decisão.',
        lessons: [
          {
            title: 'Tabelas dinâmicas do zero',
            description: 'Resumir milhares de linhas em segundos.',
            minutes: 19,
          },
          {
            title: 'Gráficos que não mentem',
            description: 'Escolher o gráfico certo para cada pergunta.',
            minutes: 15,
          },
          {
            title: 'Montando um relatório que se atualiza sozinho',
            description: 'Juntando tudo em um entregável profissional.',
            minutes: 24,
          },
        ],
      },
    ],
  },
  {
    slug: 'power-bi-na-pratica',
    title: 'Power BI na Prática',
    shortDescription:
      'Do arquivo bruto ao painel publicado: modelagem, relacionamentos, DAX essencial e visuais que respondem perguntas de negócio.',
    description:
      'Curso direto ao ponto para quem já mexe com dados e precisa entregar painéis. Começamos pela parte que ninguém gosta — e que decide tudo: o tratamento dos dados. Depois modelagem, medidas e, por fim, o painel.',
    objective:
      'Construir um painel completo, do zero, com dados tratados, modelo bem relacionado e medidas confiáveis.',
    audience: 'Analistas, administradores e qualquer pessoa que precise apresentar dados.',
    level: 'INTERMEDIATE',
    status: 'PUBLISHED',
    modules: [
      {
        title: 'Preparando os dados',
        description: 'Power Query: onde 70% do trabalho realmente acontece.',
        lessons: [
          {
            title: 'Importando e limpando',
            description: 'Tipos, colunas inúteis e erros silenciosos.',
            minutes: 16,
            preview: true,
          },
          {
            title: 'Transformações que você vai usar sempre',
            description: 'Mesclar, anexar, dividir e pivotar.',
            minutes: 20,
          },
        ],
      },
      {
        title: 'Modelo e medidas',
        description: 'Relacionamentos corretos e DAX sem mistério.',
        lessons: [
          {
            title: 'Relacionamentos e cardinalidade',
            description: 'Por que o total bate errado quando o modelo está errado.',
            minutes: 18,
          },
          {
            title: 'DAX essencial: as 8 funções que bastam no começo',
            description: 'CALCULATE, SUM, DIVIDE e companhia.',
            minutes: 25,
          },
        ],
      },
      {
        title: 'O painel',
        description: 'Visual, narrativa e publicação.',
        lessons: [
          {
            title: 'Escolhendo visuais com propósito',
            description: 'Cada gráfico responde a uma pergunta específica.',
            minutes: 17,
          },
          {
            title: 'Publicando e compartilhando',
            description: 'Do desktop ao serviço, com segurança.',
            minutes: 13,
          },
        ],
      },
    ],
  },
  {
    slug: 'apresentacoes-que-convencem',
    title: 'Apresentações que Convencem',
    shortDescription:
      'Estrutura, roteiro e slides que sustentam uma ideia — para reuniões, defesas e propostas.',
    description:
      'Curso em preparação. A estrutura está montada e as aulas serão publicadas em breve.',
    objective: 'Montar e conduzir uma apresentação que leve a uma decisão.',
    audience: 'Quem precisa defender ideias, projetos ou resultados.',
    level: 'BEGINNER',
    status: 'DRAFT',
    modules: [
      {
        title: 'Antes do slide',
        description: 'Objetivo, público e a única mensagem que importa.',
        lessons: [
          {
            title: 'Qual decisão você quer provocar?',
            description: 'A pergunta que define toda a apresentação.',
            minutes: 10,
          },
        ],
      },
    ],
  },
];

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function main() {
  console.log('[seed] iniciando…');

  // ------------------------------------------------------------- Tutor
  const tutor = await db.user.upsert({
    where: { email: TUTOR_EMAIL },
    update: { role: 'ADMIN' },
    create: {
      name: 'Rafael Araújo',
      email: TUTOR_EMAIL,
      passwordHash: await hashPassword(TUTOR_PASSWORD),
      role: 'ADMIN',
      headline: 'Tutor e criador da ARAÚJO LEARN',
      bio: 'Ensino tecnologia aplicada ao trabalho de verdade: planilhas, dados e produtividade. Minha régua é simples — a aula só presta se você conseguir aplicar no dia seguinte.',
    },
  });

  await db.tutorProfile.upsert({
    where: { userId: tutor.id },
    update: { isPrimary: true },
    create: {
      userId: tutor.id,
      isPrimary: true,
      headline: 'Tutor e criador da ARAÚJO LEARN',
      bio: 'Ensino tecnologia aplicada ao trabalho de verdade: planilhas, dados e produtividade. Minha régua é simples — a aula só presta se você conseguir aplicar no dia seguinte.',
      experience:
        'Mais de uma década trabalhando com dados e formação de equipes. Já treinei times comerciais, financeiros e operacionais, sempre com o mesmo foco: transformar ferramenta em resultado.',
      methodology:
        'Aula curta, exemplo real e tarefa prática. Nenhum módulo termina sem que você tenha feito algo com as próprias mãos.',
      specialties: ['Excel', 'Power BI', 'Análise de dados', 'Produtividade', 'Comunicação'],
      socials: { instagram: '', linkedin: '', youtube: '', site: '' },
    },
  });

  // ------------------------------------------------------------ Cursos
  for (const [courseIndex, seed] of COURSES.entries()) {
    const course = await db.course.upsert({
      where: { slug: seed.slug },
      update: {},
      create: {
        slug: seed.slug,
        title: seed.title,
        shortDescription: seed.shortDescription,
        description: seed.description,
        objective: seed.objective,
        audience: seed.audience,
        level: seed.level,
        status: seed.status,
        accessType: 'FREE',
        certificateEnabled: true,
        position: courseIndex,
        tutorId: tutor.id,
        publishedAt: seed.status === 'PUBLISHED' ? new Date() : null,
      },
    });

    const existingModules = await db.module.count({ where: { courseId: course.id } });
    if (existingModules > 0) {
      console.log(`[seed] curso "${seed.title}" já tem módulos — mantido como está.`);
      continue;
    }

    for (const [moduleIndex, moduleSeed] of seed.modules.entries()) {
      const createdModule = await db.module.create({
        data: {
          courseId: course.id,
          title: moduleSeed.title,
          description: moduleSeed.description,
          position: moduleIndex,
        },
      });

      for (const [lessonIndex, lessonSeed] of moduleSeed.lessons.entries()) {
        await db.lesson.create({
          data: {
            moduleId: createdModule.id,
            title: lessonSeed.title,
            slug: slugify(lessonSeed.title),
            description: lessonSeed.description,
            content: lessonSeed.content ?? null,
            position: lessonIndex,
            durationSeconds: lessonSeed.minutes * 60,
            isPreview: lessonSeed.preview ?? false,
            isPublished: true,
          },
        });
      }
    }

    console.log(`[seed] curso "${seed.title}" criado com ${seed.modules.length} módulos.`);
  }

  // -------------------------------------------------------- Atividade
  const excel = await db.course.findUnique({
    where: { slug: 'excel-do-zero-ao-profissional' },
    select: { id: true, modules: { orderBy: { position: 'asc' }, select: { id: true } } },
  });

  if (excel && (await db.activity.count({ where: { courseId: excel.id } })) === 0) {
    const firstModule = excel.modules[0];
    const activity = await db.activity.create({
      data: {
        courseId: excel.id,
        moduleId: firstModule?.id ?? null,
        title: 'Checkpoint: a lógica da planilha',
        description:
          'Três perguntas rápidas para confirmar que a base está firme antes de seguir para as fórmulas.',
        type: 'QUIZ',
        isRequired: true,
        passingScore: 70,
        position: 0,
      },
    });

    const questions = [
      {
        prompt: 'O que uma fórmula como `=A1` realmente guarda?',
        type: 'SINGLE_CHOICE' as const,
        explanation:
          'A fórmula guarda o endereço. Por isso, quando o conteúdo de A1 muda, o resultado muda junto.',
        options: [
          { text: 'Uma cópia do valor que estava em A1 no momento em que foi digitada', isCorrect: false },
          { text: 'O endereço da célula A1, e busca o valor sempre que a planilha recalcula', isCorrect: true },
          { text: 'Um texto fixo com o nome da célula', isCorrect: false },
        ],
      },
      {
        prompt: 'Qual destas organizações segue a regra "uma informação por coluna"?',
        type: 'SINGLE_CHOICE' as const,
        explanation:
          'Separar nome, data e valor em colunas próprias é o que permite filtrar, ordenar e resumir depois.',
        options: [
          { text: 'Uma coluna com "João Silva - 11/03/2024 - R$ 1.200"', isCorrect: false },
          { text: 'Três colunas: Nome, Data e Valor', isCorrect: true },
          { text: 'Uma coluna por cliente, com todos os dados empilhados', isCorrect: false },
        ],
      },
      {
        prompt: 'Selecione tudo o que fica mais fácil quando os dados estão bem organizados.',
        type: 'MULTIPLE_CHOICE' as const,
        explanation: 'Organização é o que destrava filtro, ordenação, tabela dinâmica e gráfico.',
        options: [
          { text: 'Criar uma tabela dinâmica', isCorrect: true },
          { text: 'Filtrar e ordenar registros', isCorrect: true },
          { text: 'Gerar gráficos confiáveis', isCorrect: true },
          { text: 'Aumentar a velocidade da internet', isCorrect: false },
        ],
      },
    ];

    for (const [index, question] of questions.entries()) {
      await db.question.create({
        data: {
          activityId: activity.id,
          prompt: question.prompt,
          type: question.type,
          explanation: question.explanation,
          points: 1,
          position: index,
          options: {
            create: question.options.map((option, optionIndex) => ({
              text: option.text,
              isCorrect: option.isCorrect,
              position: optionIndex,
            })),
          },
        },
      });
    }
    console.log('[seed] atividade de demonstração criada.');
  }

  // ------------------------------------------------------------- Aluno
  const student = await db.user.upsert({
    where: { email: STUDENT_EMAIL },
    update: {},
    create: {
      name: 'Maria Souza',
      email: STUDENT_EMAIL,
      passwordHash: await hashPassword(STUDENT_PASSWORD),
      role: 'STUDENT',
    },
  });

  if (excel) {
    await db.enrollment.upsert({
      where: { userId_courseId: { userId: student.id, courseId: excel.id } },
      update: {},
      create: { userId: student.id, courseId: excel.id, source: 'seed' },
    });
  }

  console.log('\n[seed] pronto.');
  console.log(`  tutor  → ${TUTOR_EMAIL} / ${TUTOR_PASSWORD}`);
  console.log(`  aluno  → ${STUDENT_EMAIL} / ${STUDENT_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error('[seed] falhou:', error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
