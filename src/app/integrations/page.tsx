import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { Header } from '@/components/dashboard/Header';
import { IntegrationsManager } from '@/components/integrations/IntegrationsManager';

export default async function IntegrationsPage() {
  const session = await auth();

  if (!session?.user) redirect('/login');
  if (!['owner', 'admin'].includes(session.user.role)) redirect('/');

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <main className="max-w-3xl mx-auto py-8">
        <div className="px-6 mb-6">
          <h1 className="text-2xl font-semibold text-text">Integrations</h1>
          <p className="text-sm text-muted mt-1">Connect PermitIQ to your existing project management tools.</p>
        </div>
        <IntegrationsManager />
      </main>
    </div>
  );
}
