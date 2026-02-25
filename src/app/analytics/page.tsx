import { Header } from '@/components/dashboard/Header';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-text">Analytics</h1>
          <p className="text-sm text-muted mt-1">
            Portfolio-level performance metrics, permit velocity, and project health
          </p>
        </div>
        <AnalyticsDashboard />
      </main>
    </div>
  );
}
