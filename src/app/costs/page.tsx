import { Header } from '@/components/dashboard/Header';
import { CostImpactDashboard } from '@/components/costs';

export default function CostsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-text">Cost Impact</h1>
          <p className="text-sm text-muted mt-1">
            Delay costs and schedule risk across your portfolio — hover a project to edit its daily carrying cost
          </p>
        </div>
        <CostImpactDashboard />
      </main>
    </div>
  );
}
