import { Header } from '@/components/dashboard/Header';
import { AuditLog, AuditStatCards } from '@/components/audit';

export default function AuditPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-text">Audit Trail</h1>
          <p className="text-sm text-muted mt-1">
            Complete activity log across all permits — every change, every actor, timestamped
          </p>
        </div>

        <AuditStatCards />

        <div className="panel p-5">
          <div className="mb-4 pb-4 border-b border-border">
            <h2 className="text-sm font-semibold text-text">Activity Log</h2>
            <p className="text-xs text-muted mt-0.5">
              Retained indefinitely for compliance and litigation documentation
            </p>
          </div>
          <AuditLog showFilters={true} />
        </div>
      </main>
    </div>
  );
}
