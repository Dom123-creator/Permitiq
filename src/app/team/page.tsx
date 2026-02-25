import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { TeamManager } from '@/components/users/TeamManager';
import { Header } from '@/components/dashboard/Header';

export default async function TeamPage() {
  const session = await auth();

  if (!session?.user) redirect('/login');
  if (!['owner', 'admin'].includes(session.user.role)) redirect('/');

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <main className="max-w-5xl mx-auto py-8">
        <div className="px-6 mb-6">
          <h1 className="text-2xl font-semibold text-text">Team Management</h1>
          <p className="text-sm text-muted mt-1">Invite and manage your team members and their project access.</p>
        </div>
        <TeamManager />
      </main>
    </div>
  );
}
