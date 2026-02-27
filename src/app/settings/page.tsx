import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { BrandingSettings } from '@/components/settings/BrandingSettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';

export const metadata = { title: 'Settings — PermitIQ' };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const isOwner = session.user.role === 'owner';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {isOwner && (
        <>
          <BrandingSettings />
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 2rem' }} />
        </>
      )}
      <NotificationSettings />
    </div>
  );
}
