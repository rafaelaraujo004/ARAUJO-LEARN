import { AccountForms } from '@/components/student/account-forms';
import { Card, CardHeader } from '@/components/ui/primitives';
import { db } from '@/server/db';
import { requireUser } from '@/server/auth/guards';
import { storage } from '@/server/storage';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Minha conta' };

export default async function AccountPage() {
  const user = await requireUser('/conta');

  const [profile, sessions] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true, headline: true, bio: true, avatarKey: true, createdAt: true },
    }),
    db.session.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, userAgent: true, createdAt: true, expiresAt: true },
    }),
  ]);

  if (!profile) return null;

  let avatarUrl: string | null = null;
  if (profile.avatarKey) {
    try { avatarUrl = await storage().getSignedUrl(profile.avatarKey, { expiresIn: 60 * 60 }); }
    catch { /* sem foto */ }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <header>
        <h1 className="font-display text-3xl font-semibold text-brand-900">Minha conta</h1>
        <p className="mt-1.5 text-ink-600">
          Aluno desde {formatDateTime(profile.createdAt)}.
        </p>
      </header>

      <div className="mt-6">
        <AccountForms
          profile={{
            name: profile.name,
            email: profile.email,
            headline: profile.headline ?? '',
            bio: profile.bio ?? '',
          }}
          avatarUrl={avatarUrl}
        />
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Sessões ativas"
          description="Dispositivos com acesso à sua conta. Trocar a senha encerra todos eles."
        />
        <ul className="divide-y divide-ink-100">
          {sessions.map((session) => (
            <li key={session.id} className="px-5 py-3.5">
              <p className="truncate text-sm text-ink-800">
                {describeDevice(session.userAgent)}
              </p>
              <p className="text-xs text-ink-500">
                Iniciada em {formatDateTime(session.createdAt)} · expira em{' '}
                {formatDateTime(session.expiresAt)}
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/** Descrição legível do dispositivo, sem prometer precisão que o user-agent não tem. */
function describeDevice(userAgent: string | null): string {
  if (!userAgent) return 'Dispositivo desconhecido';
  const os = /Windows/i.test(userAgent)
    ? 'Windows'
    : /Android/i.test(userAgent)
      ? 'Android'
      : /iPhone|iPad|iOS/i.test(userAgent)
        ? 'iOS'
        : /Mac OS/i.test(userAgent)
          ? 'macOS'
          : /Linux/i.test(userAgent)
            ? 'Linux'
            : 'Sistema desconhecido';

  const browser = /Edg\//i.test(userAgent)
    ? 'Edge'
    : /Chrome\//i.test(userAgent)
      ? 'Chrome'
      : /Firefox\//i.test(userAgent)
        ? 'Firefox'
        : /Safari\//i.test(userAgent)
          ? 'Safari'
          : 'Navegador';

  return `${browser} · ${os}`;
}
