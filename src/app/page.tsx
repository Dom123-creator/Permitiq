import { Header } from '@/components/dashboard/Header';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { PermitTracker } from '@/components/dashboard/PermitTracker';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { OnboardingController } from '@/components/onboarding/OnboardingController';

export default function DashboardPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <PermitTracker />
        </main>
        <ChatPanel />
      </div>
      <OnboardingController />
    </div>
  );
}
