import 'server-only';
import { cache } from 'react';
import type { CourseLevel, Prisma } from '@prisma/client';
import { db } from '@/server/db';
import { storage } from '@/server/storage';
import { PAGE_SIZE } from '@/lib/constants';

/**
 * Consultas de curso usadas pelo catálogo, pela página pública e pela área do
 * aluno. Tudo que a tela precisa vem em uma consulta só — nada de N+1 por aula.
 */

export interface CourseCardData {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  level: CourseLevel;
  coverUrl: string | null;
  moduleCount: number;
  lessonCount: number;
  durationSeconds: number;
  durationMinutes: number | null;
  accessType: 'FREE' | 'RESTRICTED';
  certificateEnabled: boolean;
  studentCount: number;
  priceCents: number | null;
  pixDiscountPercent: number;
  maxInstallments: number;
  includes: string[];
  isBonus: boolean;
}

const CARD_SELECT = {
  id: true,
  slug: true,
  title: true,
  shortDescription: true,
  level: true,
  coverKey: true,
  accessType: true,
  certificateEnabled: true,
  durationMinutes: true,
  priceCents: true,
  pixDiscountPercent: true,
  maxInstallments: true,
  includes: true,
  isBonus: true,
  _count: { select: { modules: true, enrollments: true } },
  modules: {
    select: {
      _count: { select: { lessons: true } },
      lessons: { where: { isPublished: true }, select: { durationSeconds: true } },
    },
  },
} satisfies Prisma.CourseSelect;

type CourseCardRow = Prisma.CourseGetPayload<{ select: typeof CARD_SELECT }>;

async function toCard(course: CourseCardRow): Promise<CourseCardData> {
  const lessons = course.modules.flatMap((module) => module.lessons);
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    shortDescription: course.shortDescription,
    level: course.level,
    coverUrl: await coverUrl(course.coverKey),
    moduleCount: course._count.modules,
    lessonCount: lessons.length,
    durationSeconds: lessons.reduce((total, lesson) => total + lesson.durationSeconds, 0),
    durationMinutes: course.durationMinutes,
    accessType: course.accessType,
    certificateEnabled: course.certificateEnabled,
    studentCount: course._count.enrollments,
    priceCents: course.priceCents,
    pixDiscountPercent: course.pixDiscountPercent,
    maxInstallments: course.maxInstallments,
    includes: course.includes,
    isBonus: course.isBonus,
  };
}

/** URL temporária da capa; `null` quando o curso ainda não tem imagem. */
export async function coverUrl(key: string | null): Promise<string | null> {
  if (!key) return null;
  try {
    // Capas são públicas na prática — validade maior evita reassinar a cada visita.
    return await storage().getSignedUrl(key, { expiresIn: 60 * 60 * 6 });
  } catch {
    return null;
  }
}

export interface CatalogFilters {
  search?: string;
  level?: CourseLevel | 'ALL';
  page?: number;
}

export async function listPublishedCourses(filters: CatalogFilters = {}): Promise<{
  courses: CourseCardData[];
  total: number;
  page: number;
  pageCount: number;
}> {
  const page = Math.max(1, filters.page ?? 1);
  const search = filters.search?.trim();

  const where: Prisma.CourseWhereInput = {
    status: 'PUBLISHED',
    ...(filters.level && filters.level !== 'ALL' ? { level: filters.level } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { shortDescription: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
            { modules: { some: { title: { contains: search, mode: 'insensitive' } } } },
            {
              modules: {
                some: { lessons: { some: { title: { contains: search, mode: 'insensitive' } } } },
              },
            },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.course.findMany({
      where,
      select: CARD_SELECT,
      orderBy: [{ position: 'asc' }, { publishedAt: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.course.count({ where }),
  ]);

  return {
    courses: await Promise.all(rows.map(toCard)),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/** Cursos em destaque na home. */
export const featuredCourses = cache(async (limit = 3): Promise<CourseCardData[]> => {
  const rows = await db.course.findMany({
    where: { status: 'PUBLISHED' },
    select: CARD_SELECT,
    orderBy: [{ position: 'asc' }, { publishedAt: 'desc' }],
    take: limit,
  });
  return Promise.all(rows.map(toCard));
});

export const COURSE_DETAIL_SELECT = {
  id: true,
  slug: true,
  title: true,
  shortDescription: true,
  description: true,
  objective: true,
  audience: true,
  level: true,
  status: true,
  accessType: true,
  coverKey: true,
  durationMinutes: true,
  certificateEnabled: true,
  priceCents: true,
  pixDiscountPercent: true,
  maxInstallments: true,
  includes: true,
  isBonus: true,
  unlocksWithCourseIds: true,
  publishedAt: true,
  tutor: {
    select: {
      id: true,
      name: true,
      headline: true,
      bio: true,
      avatarKey: true,
      tutorProfile: {
        select: {
          headline: true,
          bio: true,
          specialties: true,
          methodology: true,
          photoKey: true,
          socials: true,
        },
      },
    },
  },
  _count: { select: { enrollments: true } },
  modules: {
    orderBy: { position: 'asc' },
    select: {
      id: true,
      title: true,
      description: true,
      position: true,
      lessons: {
        where: { isPublished: true },
        orderBy: { position: 'asc' },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          durationSeconds: true,
          isPreview: true,
          videoId: true,
          _count: { select: { materials: true, activities: true } },
        },
      },
      _count: { select: { materials: true, activities: true } },
    },
  },
  materials: {
    orderBy: { position: 'asc' },
    select: { id: true, title: true, description: true, type: true },
  },
} satisfies Prisma.CourseSelect;

export type CourseDetail = Prisma.CourseGetPayload<{ select: typeof COURSE_DETAIL_SELECT }>;

export async function getCourseBySlug(slug: string): Promise<CourseDetail | null> {
  return db.course.findUnique({ where: { slug }, select: COURSE_DETAIL_SELECT });
}

/** Totais mostrados na página do curso e no catálogo. */
export function courseTotals(course: CourseDetail) {
  const lessons = course.modules.flatMap((module) => module.lessons);
  const seconds = lessons.reduce((total, lesson) => total + lesson.durationSeconds, 0);
  return {
    moduleCount: course.modules.length,
    lessonCount: lessons.length,
    durationSeconds: seconds,
    durationMinutes: course.durationMinutes ?? Math.round(seconds / 60),
    materialCount:
      course.materials.length +
      course.modules.reduce(
        (total, module) =>
          total +
          module._count.materials +
          module.lessons.reduce((sum, lesson) => sum + lesson._count.materials, 0),
        0,
      ),
    activityCount: course.modules.reduce(
      (total, module) =>
        total +
        module._count.activities +
        module.lessons.reduce((sum, lesson) => sum + lesson._count.activities, 0),
      0,
    ),
  };
}

/** Garante slug único ao criar/renomear um curso. */
export async function uniqueCourseSlug(base: string, ignoreId?: string): Promise<string> {
  let candidate = base || 'curso';
  let suffix = 1;

  for (;;) {
    const existing = await db.course.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === ignoreId) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}

/** Garante slug único da aula dentro do módulo. */
export async function uniqueLessonSlug(
  moduleId: string,
  base: string,
  ignoreId?: string,
): Promise<string> {
  let candidate = base || 'aula';
  let suffix = 1;

  for (;;) {
    const existing = await db.lesson.findUnique({
      where: { moduleId_slug: { moduleId, slug: candidate } },
      select: { id: true },
    });
    if (!existing || existing.id === ignoreId) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
}
