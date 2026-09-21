import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/shell';
import { PasswordNotice } from '@/components/auth/password-notice';
import { requireStaff } from '@/server/auth/guards';

export const metadata: Metadata = {
  title: { default: 'Painel do tutor', template: '%s · Painel · ARAÚJO LEARN' },
  robots: { index: false, follow: false },
};

/** Toda a área administrativa exige perfil de tutor/administrador. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaff('/admin');
  return <AdminShell user={user}>
      {user.mustChangePassword && <PasswordNotice />}
      {children}
    </AdminShell>;
}
