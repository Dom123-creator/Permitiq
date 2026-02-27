import { Header } from '@/components/dashboard/Header';
import { MarketsDirectory } from '@/components/markets/MarketsDirectory';

export default function MarketsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-text">Market Intelligence</h1>
          <p className="text-sm text-muted mt-1">
            AHJ directory, permit portal links, average review times, and market activity data for
            Austin, Houston, Miami, Nashville, DFW, and 7 other high-growth markets
          </p>
        </div>
        <MarketsDirectory />
      </main>
    </div>
  );
}
