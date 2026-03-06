import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { BrandingSettings } from '@/components/settings/BrandingSettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { AccountSettings } from '@/components/settings/AccountSettings';
import { AgentScheduleSettings } from '@/components/settings/AgentScheduleSettings';

export const metadata = { title: 'Settings — PermitIQ' };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const isOwner = session.user.role === 'owner';
  const divider = <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0 2rem' }} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <AccountSettings />
      {divider}
      <NotificationSettings />
      {(isOwner || session.user.role === 'admin') && (
        <>
          {divider}
          <AgentScheduleSettings />
        </>
      )}
      {isOwner && (
        <>
          {divider}
          <BrandingSettings />
        </>
      )}
    </div>
  );
}
