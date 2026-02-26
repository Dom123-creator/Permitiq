import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { DeveloperPortal } from '@/components/developer/DeveloperPortal';

export const metadata = { title: 'Developer Portal — PermitIQ' };

export default async function DeveloperPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const role = session.user.role;
  if (role !== 'owner' && role !== 'admin') redirect('/');

  return <DeveloperPortal />;
}
