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
        <div className="hidden md:block flex-shrink-0">
          <Sidebar />
        </div>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <PermitTracker />
        </main>
        <div className="hidden lg:block flex-shrink-0">
          <ChatPanel />
        </div>
      </div>
      <OnboardingController />
    </div>
  );
}
