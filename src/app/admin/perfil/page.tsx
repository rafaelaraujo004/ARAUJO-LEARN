import { ExternalLink } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';
import { TutorProfileForm } from '@/components/admin/tutor-profile-form';
import { PageHeader } from '@/components/admin/shell';
import { db } from '@/server/db';
import { requireStaff } from '@/server/auth/guards';
import { getPrimaryTutor } from '@/server/tutor';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Perfil do tutor' };

export default async function TutorProfilePage() {
  const staff = await requireStaff();

  const [user, profile, presentation] = await Promise.all([
    db.user.findUnique({
      where: { id: staff.id },
      select: { name: true, headline: true, bio: true, avatarKey: true },
    }),
    db.tutorProfile.findUnique({
      where: { userId: staff.id },
      select: {
        headline: true,
        bio: true,
        experience: true,
        methodology: true,
        specialties: true,
        socials: true,
        photoKey: true,
      },
    }),
    getPrimaryTutor(),
  ]);

  const socials = (profile?.socials ?? {}) as Record<string, unknown>;
  const social = (key: string) => (typeof socials[key] === 'string' ? (socials[key] as string) : '');

  return (
    <>
      <PageHeader
        title="Perfil do tutor"
        description="A sua apresentação pública: aparece na home, em “Quem ensina” e nos cursos."
        action={
          <ButtonLink href="/tutor" variant="secondary" target="_blank">
            <ExternalLink aria-hidden className="size-4" />
            Ver no site
          </ButtonLink>
        }
      />
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
        <TutorProfileForm
          photoUrl={presentation?.photoUrl ?? '/tutor/terno.webp'}
          hasCustomPhoto={Boolean(profile?.photoKey ?? user?.avatarKey)}
          values={{
            name: user?.name ?? staff.name,
            headline: profile?.headline ?? user?.headline ?? '',
            bio: profile?.bio ?? user?.bio ?? '',
            experience: profile?.experience ?? '',
            methodology: profile?.methodology ?? '',
            specialties: (profile?.specialties ?? []).join(', '),
            whatsapp: social('whatsapp'),
            instagram: social('instagram'),
            linkedin: social('linkedin'),
            youtube: social('youtube'),
            site: social('site'),
          }}
        />
      </div>
    </>
  );
}
