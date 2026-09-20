/**
 * Dados iniciais da ARAÚJO LEARN.
 *
 * Cria o tutor (Eng. Civil Amilton Araújo) e os cursos reais da plataforma,
 * com a estrutura de módulos e aulas já montada. Os textos de aula são uma
 * base de partida — tudo é editável pelo painel, sem tocar em código.
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

const TUTOR_EMAIL = process.env.SEED_TUTOR_EMAIL ?? 'amilton@araujolearn.com';
const TUTOR_PASSWORD = process.env.SEED_TUTOR_PASSWORD ?? 'araujo2024';
const STUDENT_EMAIL = process.env.SEED_STUDENT_EMAIL ?? 'aluno@araujolearn.com';
const STUDENT_PASSWORD = process.env.SEED_STUDENT_PASSWORD ?? 'aluno2024';

/** Slugs do conteúdo de demonstração da primeira versão — removidos se existirem. */
const LEGACY_SLUGS = [
  'excel-do-zero-ao-profissional',
  'power-bi-na-pratica',
  'apresentacoes-que-convencem',
];

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
  durationMinutes: number;
  priceCents: number | null;
  includes: string[];
  isBonus?: boolean;
  unlocksWith?: string[];
  modules: ModuleSeed[];
}

const COURSES: CourseSeed[] = [
  {
    slug: 'leitura-e-interpretacao-de-projetos-de-engenharia',
    title: 'Leitura e Interpretação de Projetos de Engenharia',
    shortDescription:
      'Aprenda a ler qualquer prancha com segurança: arquitetura, estrutura e complementares, da escala ao canteiro de obras.',
    description:
      'Projeto mal lido vira retrabalho, prejuízo e discussão no canteiro. Este curso ataca exatamente isso: você aprende a percorrer um projeto completo — arquitetônico, estrutural e complementares — entendendo o que cada linha, cota e símbolo está comunicando.\n\nO curso é conduzido diretamente pelo Eng. Amilton Araújo, com acompanhamento durante toda a formação. Você pode tirar dúvidas sobre os projetos que estiver enfrentando no seu trabalho, e não apenas sobre os exemplos das aulas.\n\nAo final, você não sai "sabendo um pouco": sai capaz de pegar um projeto que nunca viu, entender a intenção do projetista, identificar incompatibilidades e extrair o que precisa para orçar e executar.',
    objective:
      'Ler e interpretar, com autonomia, projetos arquitetônicos, estruturais e complementares — identificando escalas, cotas, simbologia, incompatibilidades e as informações necessárias para executar e orçar a obra.',
    audience:
      'Engenheiros e arquitetos em início de carreira, técnicos em edificações, estudantes, mestres de obra, encarregados e profissionais de orçamento que precisam entender projeto sem depender de terceiros.',
    level: 'BEGINNER',
    durationMinutes: 480,
    priceCents: 19_900,
    includes: [
      'Apostila completa',
      'Certificado de conclusão',
      'Interação direta com o tutor',
      'Acesso permanente ao conteúdo',
    ],
    modules: [
      {
        title: 'Fundamentos do desenho técnico',
        description: 'A linguagem antes do projeto: normas, escalas e simbologia.',
        lessons: [
          {
            title: 'Como um projeto se comunica',
            description: 'O que o desenho técnico é — e o que ele nunca diz explicitamente.',
            minutes: 25,
            preview: true,
            content:
              '## Projeto é linguagem, não desenho\n\nUm projeto de engenharia não é uma ilustração da obra: é um **documento técnico** que comunica decisões. Toda linha tem intenção, e quase nada está ali por estética.\n\nTrês perguntas guiam a leitura de qualquer prancha:\n\n1. **O que estou vendo?** — planta, corte, vista, detalhe.\n2. **De onde estou olhando?** — o plano de corte e o sentido de observação mudam tudo.\n3. **Em que escala?** — a mesma parede pode ser um traço ou um detalhe construtivo completo.\n\n> Quem pula a pergunta 2 interpreta corte como fachada. É o erro mais comum de quem está começando — e o mais caro.\n\n### O que o projeto NÃO diz\n\nO projeto entrega geometria e especificação. Ele não entrega **sequência executiva**, **produtividade** nem **custo**. Essas informações você constrói a partir da leitura — e é isso que este curso ensina.',
          },
          {
            title: 'Normas e convenções: NBR 6492 e NBR 8196',
            description: 'Espessuras de linha, tipos de traço e o que cada convenção significa.',
            minutes: 30,
          },
          {
            title: 'Escalas: ler, converter e desconfiar',
            description: 'Escala gráfica, escala numérica e o cuidado com pranchas impressas.',
            minutes: 28,
            content:
              '## A escala é um contrato\n\nQuando a prancha informa **1:50**, cada centímetro no papel representa 50 cm na obra. Parece óbvio, mas dois detalhes derrubam muita gente:\n\n- **Impressão fora de escala.** Uma prancha A1 impressa em A3 mantém a proporção, mas não a medida absoluta. Por isso existe a **escala gráfica**: ela encolhe junto com o desenho.\n- **Escalas diferentes na mesma prancha.** É normal a planta estar em 1:50 e o detalhe de fundação em 1:20. Confira o selo de cada desenho, não o da prancha.\n\n### Regra prática\n\n**Nunca meça com régua para tomar decisão de obra.** Use a cota. A régua serve para conferir se a cota faz sentido — não para substituí-la.',
          },
          {
            title: 'Cotas, níveis e amarrações',
            description: 'Cota acumulada, cota parcial, referência de nível e eixos.',
            minutes: 32,
          },
        ],
      },
      {
        title: 'Projeto arquitetônico',
        description: 'Percorrendo o projeto do todo ao detalhe.',
        lessons: [
          {
            title: 'Planta baixa: leitura ambiente por ambiente',
            description: 'Paredes, vãos, esquadrias, e o que cada hachura representa.',
            minutes: 35,
          },
          {
            title: 'Cortes e fachadas',
            description: 'Pés-direitos, escadas, forros e a relação entre os desenhos.',
            minutes: 30,
          },
          {
            title: 'Implantação, locação e planta de cobertura',
            description: 'Situar a obra no terreno sem erro de locação.',
            minutes: 28,
          },
          {
            title: 'Quadro de esquadrias e de áreas',
            description: 'As tabelas que resumem o projeto — e que quase ninguém lê.',
            minutes: 22,
          },
        ],
      },
      {
        title: 'Projetos complementares',
        description: 'Estrutura, elétrica e hidrossanitário: lendo o conjunto.',
        lessons: [
          {
            title: 'Estrutural: fôrmas, armação e locação de pilares',
            description: 'Da planta de fôrmas ao detalhamento das armaduras.',
            minutes: 38,
          },
          {
            title: 'Elétrico: pontos, circuitos e quadro de cargas',
            description: 'Leitura da simbologia elétrica aplicada à execução.',
            minutes: 30,
          },
          {
            title: 'Hidrossanitário: água fria, esgoto e pluvial',
            description: 'Prumadas, isométricos e caimentos.',
            minutes: 32,
          },
          {
            title: 'Compatibilização: achar o conflito antes do concreto',
            description: 'Sobrepondo projetos para encontrar interferências.',
            minutes: 35,
          },
        ],
      },
      {
        title: 'Da prancha para o canteiro',
        description: 'Transformar leitura em decisão de execução.',
        lessons: [
          {
            title: 'Extraindo quantitativos do projeto',
            description: 'O primeiro passo de todo orçamento nasce aqui.',
            minutes: 33,
          },
          {
            title: 'Checklist de leitura de um projeto completo',
            description: 'Um roteiro para não deixar nada passar.',
            minutes: 24,
            content:
              '## Roteiro de leitura\n\nUse esta ordem sempre que receber um projeto novo. Ela evita que você tome decisões com informação pela metade.\n\n1. **Selo e revisão** — você está com a versão mais recente?\n2. **Lista de pranchas** — o conjunto está completo?\n3. **Implantação e locação** — onde a obra fica no terreno.\n4. **Plantas baixas** — organização e fluxos.\n5. **Cortes** — alturas, níveis e escadas.\n6. **Estrutural** — pilares, vigas e fundação.\n7. **Complementares** — elétrica e hidrossanitário.\n8. **Compatibilização** — o que conflita entre as disciplinas.\n9. **Quadros e memoriais** — especificações e acabamentos.\n\n> Anote toda dúvida enquanto lê. Dúvida anotada vira pergunta ao projetista; dúvida esquecida vira retrabalho na obra.',
          },
        ],
      },
    ],
  },
  {
    slug: 'orcamento-preliminar-de-obras-civis',
    title: 'Orçamento Preliminar de Obras Civis',
    shortDescription:
      'Monte orçamentos confiáveis do zero: quantitativos, composições, BDI, curva ABC e cronograma físico-financeiro.',
    description:
      'Orçamento errado não aparece no dia em que é feito — aparece seis meses depois, quando o dinheiro acaba. Este curso ensina o método completo do orçamento preliminar de obras civis, do levantamento de quantitativos à planilha final apresentada ao cliente.\n\nVocê aprende a usar as fontes oficiais de preço (SINAPI e similares), a montar composições de custo, a calcular o BDI sem inventar percentual e a construir a curva ABC para saber onde o orçamento realmente se decide.\n\nO acompanhamento é direto com o Eng. Amilton Araújo, que atua com perícia e avaliação de engenharia — ou seja, com quem vê na prática o que acontece quando um orçamento é feito sem critério.',
    objective:
      'Elaborar um orçamento preliminar completo de uma obra civil: levantar quantitativos a partir do projeto, compor custos unitários, aplicar BDI, montar a planilha orçamentária, a curva ABC e o cronograma físico-financeiro.',
    audience:
      'Engenheiros, arquitetos, técnicos em edificações, orçamentistas iniciantes e profissionais que precisam apresentar propostas de obra com segurança técnica.',
    level: 'INTERMEDIATE',
    durationMinutes: 720,
    priceCents: 24_900,
    includes: [
      'Material complementar',
      'Certificado de conclusão',
      'Interação direta com o tutor',
      'Acesso permanente ao conteúdo',
    ],
    modules: [
      {
        title: 'Fundamentos do orçamento',
        description: 'O que é, para que serve e até onde vai um orçamento preliminar.',
        lessons: [
          {
            title: 'Estimativo, preliminar e analítico: qual usar quando',
            description: 'Precisão exigida, tempo disponível e risco assumido.',
            minutes: 30,
            preview: true,
            content:
              '## Três níveis, três finalidades\n\n| Tipo | Base | Margem típica | Quando usar |\n|---|---|---|---|\n| Estimativo | Custo por m² (CUB) | ±30% | Viabilidade inicial |\n| Preliminar | Quantitativos principais + composições | ±15% | Proposta e planejamento |\n| Analítico | Todos os serviços detalhados | ±5% | Contratação e execução |\n\nO erro mais comum é **vender precisão que o método não entrega**. Um orçamento preliminar apresentado como se fosse analítico é um problema esperando para acontecer.\n\n> Deixe sempre explícito na sua proposta qual é o nível do orçamento e qual a margem esperada. Isso protege você e informa o cliente.',
          },
          {
            title: 'Fontes de preço: SINAPI, SICRO e cotação de mercado',
            description: 'Como consultar, quando confiar e como ajustar à sua região.',
            minutes: 35,
          },
          {
            title: 'Custo x preço: a diferença que define o lucro',
            description: 'Onde termina o custo e começa a sua margem.',
            minutes: 25,
          },
        ],
      },
      {
        title: 'Levantamento de quantitativos',
        description: 'Do projeto para a planilha, serviço por serviço.',
        lessons: [
          {
            title: 'Serviços preliminares e movimento de terra',
            description: 'Canteiro, limpeza, escavação, aterro e transporte.',
            minutes: 32,
          },
          {
            title: 'Fundações e estrutura',
            description: 'Concreto, fôrma e aço: as três contas que sustentam o orçamento.',
            minutes: 40,
          },
          {
            title: 'Alvenaria, revestimentos e cobertura',
            description: 'Áreas, descontos de vãos e perdas.',
            minutes: 38,
          },
          {
            title: 'Instalações e acabamentos',
            description: 'Pontos, metragens e o peso dos acabamentos no total.',
            minutes: 35,
          },
        ],
      },
      {
        title: 'Composição de custos',
        description: 'O que forma o preço de cada serviço.',
        lessons: [
          {
            title: 'Custos diretos: material, mão de obra e equipamento',
            description: 'Montando uma composição do zero.',
            minutes: 40,
          },
          {
            title: 'Encargos sociais e complementares',
            description: 'Desonerado x não desonerado, e o impacto real na planilha.',
            minutes: 35,
          },
          {
            title: 'BDI: o que entra, o que não entra e como calcular',
            description: 'Administração central, risco, lucro e tributos.',
            minutes: 45,
            content:
              '## BDI não é "um número que se usa"\n\nBDI (Benefícios e Despesas Indiretas) é **calculado**, não escolhido. A fórmula consolidada pelo Acórdão TCU 2622/2013 é a referência mais usada:\n\n```\nBDI = [ (1+AC+S+R+G) × (1+DF) × (1+L) ] / (1 - I) - 1\n```\n\nOnde:\n\n- **AC** — administração central\n- **S** — seguros\n- **R** — riscos\n- **G** — garantias\n- **DF** — despesas financeiras\n- **L** — lucro\n- **I** — tributos sobre o faturamento\n\n### O erro clássico\n\nIncluir no BDI um custo que já está na composição — ou o contrário. **Administração local de obra é custo direto**, não BDI. Contar duas vezes infla o preço e derruba a proposta; não contar nenhuma vez come o lucro.',
          },
        ],
      },
      {
        title: 'Montando e apresentando o orçamento',
        description: 'A planilha, a curva ABC e o cronograma.',
        lessons: [
          {
            title: 'Planilha orçamentária: estrutura e organização',
            description: 'Itens, subitens, unidades e totalizações.',
            minutes: 35,
          },
          {
            title: 'Curva ABC: onde o orçamento realmente se decide',
            description: 'Os 20% de serviços que representam 80% do custo.',
            minutes: 32,
          },
          {
            title: 'Cronograma físico-financeiro',
            description: 'Distribuindo o orçamento no tempo.',
            minutes: 38,
          },
          {
            title: 'Apresentando o orçamento ao cliente',
            description: 'Como defender cada número da sua planilha.',
            minutes: 30,
          },
        ],
      },
    ],
  },
  {
    slug: 'legislacao-de-obra-e-sistema-crea',
    title: 'Legislação de Obra e Sistema CREA',
    shortDescription:
      'Responsabilidade técnica, ART, atribuições profissionais e licenciamento — o que todo profissional de obra precisa saber para não se expor.',
    description:
      'Curso bônus, liberado automaticamente para quem adquire os dois cursos da formação.\n\nBoa parte dos problemas graves em obra não é técnica: é de responsabilidade. Quem assina o quê, qual atribuição cada profissional tem, quando a ART é obrigatória e o que acontece quando ela não existe.\n\nConteúdo conduzido pelo Eng. Amilton Araújo, com a perspectiva de quem atua em perícia e avaliação de engenharia.',
    objective:
      'Entender o Sistema CONFEA/CREA, emitir e interpretar ART corretamente, conhecer as atribuições profissionais e as obrigações legais que cercam uma obra.',
    audience:
      'Todo profissional que assina, executa, fiscaliza ou orça obra — e precisa saber exatamente o tamanho da responsabilidade que está assumindo.',
    level: 'BEGINNER',
    durationMinutes: 240,
    priceCents: null,
    isBonus: true,
    unlocksWith: [
      'leitura-e-interpretacao-de-projetos-de-engenharia',
      'orcamento-preliminar-de-obras-civis',
    ],
    includes: ['Certificado de conclusão', 'Interação direta com o tutor'],
    modules: [
      {
        title: 'Responsabilidade técnica',
        description: 'O Sistema CONFEA/CREA e o que ele cobra de você.',
        lessons: [
          {
            title: 'Sistema CONFEA/CREA: como funciona na prática',
            description: 'Registro, anuidade, fiscalização e o papel de cada instância.',
            minutes: 30,
          },
          {
            title: 'ART: quando, como e por quê',
            description: 'Tipos de ART, prazo de registro e consequências da ausência.',
            minutes: 35,
            content:
              '## A ART não é burocracia\n\nA Anotação de Responsabilidade Técnica é o documento que **vincula um profissional a um serviço técnico**. Sem ela, do ponto de vista do CREA, o serviço não tem responsável — e quem executou está em exercício irregular.\n\n### Pontos que geram mais dúvida\n\n- **Prazo:** a ART deve ser registrada **antes** do início da atividade.\n- **Alteração x baixa:** mudou escopo, registra aditivo; terminou, dá baixa.\n- **Obra com vários profissionais:** cada um registra a ART da sua parte. Não existe "ART que cobre todo mundo".\n\n> A ART também é o que alimenta o seu **acervo técnico**. Profissional que não registra ART chega na hora de provar experiência sem nada na mão.',
          },
          {
            title: 'Atribuições profissionais: o que você pode assinar',
            description: 'Resolução 218 e o limite de cada formação.',
            minutes: 32,
          },
          {
            title: 'Acervo técnico e CAT',
            description: 'Construindo a prova da sua experiência ao longo da carreira.',
            minutes: 25,
          },
        ],
      },
      {
        title: 'Licenciamento e obrigações da obra',
        description: 'Do alvará ao habite-se.',
        lessons: [
          {
            title: 'Alvarás, licenças e habite-se',
            description: 'A sequência de documentos de uma obra regular.',
            minutes: 30,
          },
          {
            title: 'Responsabilidade civil e criminal na obra',
            description: 'Prazos de responsabilidade e o que diz o Código Civil.',
            minutes: 32,
          },
          {
            title: 'Fiscalização: como se preparar',
            description: 'Documentos no canteiro e postura na visita do fiscal.',
            minutes: 26,
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

  // Remove o conteúdo de demonstração da primeira versão, se ainda existir.
  const removed = await db.course.deleteMany({ where: { slug: { in: LEGACY_SLUGS } } });
  if (removed.count > 0) {
    console.log(`[seed] ${removed.count} curso(s) de demonstração removido(s).`);
  }
  await db.user.deleteMany({ where: { email: 'tutor@araujolearn.com' } });

  // ------------------------------------------------------------- Tutor
  const bio =
    'Engenheiro Civil, mestre em Perícia e Avaliação de Engenharia e MBA em Gestão de Projetos. ' +
    'Ensino a partir do que a prática cobra: leitura de projeto, orçamento e responsabilidade técnica. ' +
    'Minha régua é simples — a aula só presta se você conseguir aplicar na sua obra no dia seguinte.';

  const tutor = await db.user.upsert({
    where: { email: TUTOR_EMAIL },
    update: { role: 'ADMIN', name: 'Eng. Amilton Araújo', headline: 'Engenheiro Civil · MSc em Perícia e Avaliação de Engenharia · MBA em Gestão de Projetos', bio },
    create: {
      name: 'Eng. Amilton Araújo',
      email: TUTOR_EMAIL,
      passwordHash: await hashPassword(TUTOR_PASSWORD),
      role: 'ADMIN',
      headline:
        'Engenheiro Civil · MSc em Perícia e Avaliação de Engenharia · MBA em Gestão de Projetos',
      bio,
    },
  });

  const tutorProfile = {
    isPrimary: true,
    headline:
      'Engenheiro Civil · MSc em Perícia e Avaliação de Engenharia · MBA em Gestão de Projetos',
    bio,
    experience:
      'Mestre (MSc) em Perícia e Avaliação de Engenharia e MBA em Gestão de Projetos. ' +
      'Atuação em projetos, orçamento, perícia e avaliação de obras civis, além de formação de ' +
      'profissionais e equipes técnicas.',
    methodology:
      'Aula direta, exemplo real de obra e aplicação imediata. Cada módulo termina com uma tarefa ' +
      'prática, e o aluno tem canal aberto com o tutor durante toda a formação — inclusive para ' +
      'levar dúvidas dos próprios projetos e orçamentos que está enfrentando no trabalho.',
    specialties: [
      'Leitura de projetos',
      'Orçamento de obras',
      'Perícia e avaliação',
      'Gestão de projetos',
      'Legislação e CREA',
    ],
    socials: { whatsapp: '(94) 99190-6608', instagram: '', linkedin: '', site: '' },
  };

  await db.tutorProfile.upsert({
    where: { userId: tutor.id },
    update: tutorProfile,
    create: { userId: tutor.id, ...tutorProfile },
  });

  // ------------------------------------------------------------ Cursos
  const bySlug = new Map<string, string>();

  for (const [courseIndex, seed] of COURSES.entries()) {
    const data = {
      title: seed.title,
      shortDescription: seed.shortDescription,
      description: seed.description,
      objective: seed.objective,
      audience: seed.audience,
      level: seed.level,
      durationMinutes: seed.durationMinutes,
      priceCents: seed.priceCents,
      includes: seed.includes,
      isBonus: seed.isBonus ?? false,
      // Cursos pagos: acesso liberado pelo tutor após a confirmação do pagamento.
      accessType: 'RESTRICTED' as const,
      certificateEnabled: true,
      position: courseIndex,
      tutorId: tutor.id,
    };

    const course = await db.course.upsert({
      where: { slug: seed.slug },
      update: data,
      create: {
        ...data,
        slug: seed.slug,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
      select: { id: true, title: true },
    });
    bySlug.set(seed.slug, course.id);

    const existingModules = await db.module.count({ where: { courseId: course.id } });
    if (existingModules > 0) {
      console.log(`[seed] "${seed.title}" já tem módulos — estrutura preservada.`);
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

    const lessonTotal = seed.modules.reduce((total, m) => total + m.lessons.length, 0);
    console.log(
      `[seed] "${seed.title}" — ${seed.modules.length} módulos, ${lessonTotal} aulas.`,
    );
  }

  // Liga o curso bônus aos cursos que o desbloqueiam.
  for (const seed of COURSES) {
    if (!seed.unlocksWith?.length) continue;
    const courseId = bySlug.get(seed.slug);
    const requiredIds = seed.unlocksWith
      .map((slug) => bySlug.get(slug))
      .filter((value): value is string => Boolean(value));
    if (courseId && requiredIds.length > 0) {
      await db.course.update({
        where: { id: courseId },
        data: { unlocksWithCourseIds: requiredIds },
      });
      console.log(`[seed] bônus "${seed.title}" ligado a ${requiredIds.length} cursos.`);
    }
  }

  // -------------------------------------------------------- Atividade
  const leituraId = bySlug.get('leitura-e-interpretacao-de-projetos-de-engenharia');
  if (leituraId && (await db.activity.count({ where: { courseId: leituraId } })) === 0) {
    const firstModule = await db.module.findFirst({
      where: { courseId: leituraId },
      orderBy: { position: 'asc' },
      select: { id: true },
    });

    const activity = await db.activity.create({
      data: {
        courseId: leituraId,
        moduleId: firstModule?.id ?? null,
        title: 'Checkpoint: fundamentos do desenho técnico',
        description:
          'Três perguntas rápidas para confirmar que a base está firme antes de entrar no projeto arquitetônico.',
        type: 'QUIZ',
        isRequired: true,
        passingScore: 70,
        position: 0,
      },
    });

    const questions = [
      {
        prompt:
          'Uma prancha originalmente em A1 na escala 1:50 foi impressa em A3. O que acontece com as medidas?',
        type: 'SINGLE_CHOICE' as const,
        explanation:
          'A proporção se mantém, mas a escala numérica impressa deixa de valer. Por isso a escala gráfica existe: ela reduz junto com o desenho.',
        options: [
          { text: 'Nada muda: a escala 1:50 continua válida com régua', isCorrect: false },
          {
            text: 'A proporção se mantém, mas a escala numérica não vale mais — use a escala gráfica ou a cota',
            isCorrect: true,
          },
          { text: 'O desenho fica distorcido e não pode ser usado', isCorrect: false },
        ],
      },
      {
        prompt: 'Qual informação deve prevalecer para uma decisão de execução em obra?',
        type: 'SINGLE_CHOICE' as const,
        explanation:
          'A cota é a informação oficial do projeto. A medição com régua serve apenas para conferência de coerência.',
        options: [
          { text: 'A medida obtida com régua sobre a prancha', isCorrect: false },
          { text: 'A cota indicada no desenho', isCorrect: true },
          { text: 'A estimativa do encarregado no canteiro', isCorrect: false },
        ],
      },
      {
        prompt: 'Selecione tudo o que o projeto NÃO informa diretamente.',
        type: 'MULTIPLE_CHOICE' as const,
        explanation:
          'O projeto entrega geometria e especificação. Sequência executiva, produtividade e custo são construídos a partir da leitura.',
        options: [
          { text: 'A sequência executiva dos serviços', isCorrect: true },
          { text: 'A produtividade das equipes', isCorrect: true },
          { text: 'O custo da obra', isCorrect: true },
          { text: 'As dimensões dos ambientes', isCorrect: false },
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
    console.log('[seed] atividade do módulo 1 criada.');
  }

  // ------------------------------------------------------ Aluno de teste
  await db.user.upsert({
    where: { email: STUDENT_EMAIL },
    update: {},
    create: {
      name: 'Maria Souza',
      email: STUDENT_EMAIL,
      passwordHash: await hashPassword(STUDENT_PASSWORD),
      role: 'STUDENT',
    },
  });

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
