import { Header } from '@/components/dashboard/Header';
import { RuleEngine } from '@/components/rules/RuleEngine';

export default function RulesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <RuleEngine />
      </main>
    </div>
  );
}
