import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { BrandingSettings } from '@/components/settings/BrandingSettings';

export const metadata = { title: 'Settings — PermitIQ' };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'owner') redirect('/');

  return <BrandingSettings />;
}
