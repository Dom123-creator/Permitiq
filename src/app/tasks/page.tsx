import { Header } from '@/components/dashboard/Header';
import { TaskManager } from '@/components/tasks/TaskManager';

export default function TasksPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <TaskManager />
      </main>
    </div>
  );
}
