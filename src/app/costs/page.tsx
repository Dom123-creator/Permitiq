import { Header } from '@/components/dashboard/Header';
import { CostImpactDashboard, FeeStatCards } from '@/components/costs';

export default function CostsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-text">Cost Impact</h1>
          <p className="text-sm text-muted mt-1">
            Delay costs, permit fees, and schedule risk across your portfolio
          </p>
        </div>
        <FeeStatCards />
        <CostImpactDashboard />
      </main>
    </div>
  );
}
