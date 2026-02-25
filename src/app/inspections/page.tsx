import { Header } from '@/components/dashboard/Header';
import { InspectionCalendar, InspectionStatCards } from '@/components/inspections';

export default function InspectionsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 overflow-auto p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-text">Inspections</h1>
          <p className="text-sm text-muted mt-1">Track and schedule permit inspections across all projects</p>
        </div>
        <InspectionStatCards />
        <InspectionCalendar />
      </main>
    </div>
  );
}
