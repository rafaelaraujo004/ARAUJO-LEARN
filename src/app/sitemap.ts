import type { MetadataRoute } from 'next';
import { siteOrigin } from '@/lib/site-url';
import { db } from '@/server/db';

const base = siteOrigin();

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const courses = await db.course.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true, updatedAt: true },
  });

  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/cursos`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/tutor`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/validar`, changeFrequency: 'yearly', priority: 0.3 },
    ...courses.map((course) => ({
      url: `${base}/cursos/${course.slug}`,
      lastModified: course.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
