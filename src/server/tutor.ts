import 'server-only';
import { cache } from 'react';
import { db } from '@/server/db';
import { storage } from '@/server/storage';

/**
 * O tutor é o centro da marca: uma plataforma, um tutor em destaque.
 * A modelagem já aceita vários (Course.tutorId), mas a área pública apresenta
 * o tutor principal.
 */

export interface TutorPresentation {
  id: string;
  name: string;
  headline: string | null;
  bio: string | null;
  experience: string | null;
  methodology: string | null;
  specialties: string[];
  socials: Record<string, string>;
  photoUrl: string | null;
  courseCount: number;
  studentCount: number;
}

export const getPrimaryTutor = cache(async (): Promise<TutorPresentation | null> => {
  const profile = await db.tutorProfile.findFirst({
    where: { isPrimary: true },
    select: {
      headline: true,
      bio: true,
      experience: true,
      methodology: true,
      specialties: true,
      socials: true,
      photoKey: true,
      user: { select: { id: true, name: true, headline: true, bio: true, avatarKey: true } },
    },
  });

  const user =
    profile?.user ??
    (await db.user.findFirst({
      where: { role: { in: ['TUTOR', 'ADMIN'] } },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, headline: true, bio: true, avatarKey: true },
    }));

  if (!user) return null;

  const [courseCount, studentCount] = await Promise.all([
    db.course.count({ where: { tutorId: user.id, status: 'PUBLISHED' } }),
    db.enrollment.count({ where: { course: { tutorId: user.id } } }),
  ]);

  const photoKey = profile?.photoKey ?? user.avatarKey;

  return {
    id: user.id,
    name: user.name,
    headline: profile?.headline ?? user.headline,
    bio: profile?.bio ?? user.bio,
    experience: profile?.experience ?? null,
    methodology: profile?.methodology ?? null,
    specialties: profile?.specialties ?? [],
    socials: normalizeSocials(profile?.socials),
    photoUrl: photoKey ? await safeUrl(photoKey) : null,
    courseCount,
    studentCount,
  };
});

async function safeUrl(key: string): Promise<string | null> {
  try {
    return await storage().getSignedUrl(key, { expiresIn: 60 * 60 * 6 });
  } catch {
    return null;
  }
}

function normalizeSocials(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object') return {};
  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === 'string' && item.trim()) result[key] = item.trim();
  }
  return result;
}
