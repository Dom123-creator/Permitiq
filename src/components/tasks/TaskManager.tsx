'use client';

import { useState, useEffect, useCallback } from 'react';
import { CreateTaskModal } from './CreateTaskModal';
import { EditTaskModal } from './EditTaskModal';

interface Task {
  id: string;
  title: string;
  type: 'manual' | 'auto';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in-progress' | 'completed';
  projectName: string | null;
  permitName?: string | null;
  assigneeName?: string | null;
  dueDate?: string | null;
  ruleName?: string | null;
  notes?: string | null;
}

const priorityConfig = {
  low: { label: 'Low', class: 'badge-info' },
  medium: { label: 'Medium', class: 'bg-muted/20 text-muted' },
  high: { label: 'High', class: 'badge-warn' },
  urgent: { label: 'Urgent', class: 'badge-danger' },
};

const statusConfig = {
  pending: { label: 'Pending', class: 'badge-warn' },
  'in-progress': { label: 'In Progress', class: 'badge-info' },
  completed: { label: 'Completed', class: 'badge-success' },
};

export function TaskManager() {
  const [activeTab, setActiveTab] = useState('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (Array.isArray(data)) {
        setTasks(
          data.map((t) => ({
            ...t,
            dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : null,
          }))
        );
      }
    } catch {
      // keep empty state on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const filteredTasks = tasks.filter((task) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'manual') return task.type === 'manual';
    if (activeTab === 'auto') return task.type === 'auto';
    if (activeTab === 'urgent') return task.priority === 'urgent';
    if (activeTab === 'completed') return task.status === 'completed';
    return true;
  });

  const filterTabs = [
    { id: 'all', label: 'All', count: tasks.length },
    { id: 'manual', label: 'Manual', count: tasks.filter((t) => t.type === 'manual').length },
    { id: 'auto', label: 'Auto-Generated', count: tasks.filter((t) => t.type === 'auto').length },
    { id: 'urgent', label: 'Urgent', count: tasks.filter((t) => t.priority === 'urgent').length },
    { id: 'completed', label: 'Completed', count: tasks.filter((t) => t.status === 'completed').length },
  ];

  const toggleTaskComplete = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';

    // Optimistic update
    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: newStatus } : t));
    if (selectedTask?.id === taskId) setSelectedTask({ ...selectedTask, status: newStatus });

    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      // Revert on failure
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: task.status } : t));
    }
  };

  const deleteTask = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setSelectedTask(null);
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    } catch {
      loadTasks(); // Reload on failure
    }
  };

  return (
    <div className="flex gap-6">
      {/* Task List */}
      <div className="flex-1">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2 className="text-lg font-semibold text-text">Task Manager</h2>
              <p className="text-sm text-muted">Manage manual and auto-generated tasks</p>
            </div>
            <button onClick={() => setIsCreateModalOpen(true)} className="btn btn-primary">+ Create Task</button>
          </div>

          {isLoading && (
            <div className="px-4 py-8 text-center text-sm text-muted animate-pulse">Loading tasks...</div>
          )}

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 px-4 py-3 border-b border-border overflow-x-auto">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-accent text-bg'
                    : 'text-muted hover:text-text hover:bg-surface2'
                }`}
              >
                {tab.label}
                <span className="ml-1.5 text-xs opacity-75">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* Task List */}
          <div className="divide-y divide-border">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className={`flex items-start gap-3 p-4 cursor-pointer transition-colors ${
                  selectedTask?.id === task.id ? 'bg-surface2' : 'hover:bg-surface2/50'
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTaskComplete(task.id);
                  }}
                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    task.status === 'completed'
                      ? 'bg-success border-success text-bg'
                      : 'border-border hover:border-muted'
                  }`}
                >
                  {task.status === 'completed' && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>

                {/* Task Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-sm font-medium ${
                        task.status === 'completed' ? 'text-muted line-through' : 'text-text'
                      }`}
                    >
                      {task.title}
                    </span>
                    {task.type === 'auto' && (
                      <span className="text-xs text-purple">⚡ Auto</span>
                    )}
                    {task.type === 'manual' && (
                      <span className="text-xs text-muted">✏️ Manual</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <span>{task.projectName}</span>
                    {task.permitName && (
                      <>
                        <span>•</span>
                        <span>{task.permitName}</span>
                      </>
                    )}
                    {task.dueDate && (
                      <>
                        <span>•</span>
                        <span>Due: {task.dueDate}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Priority & Status */}
                <div className="flex items-center gap-2">
                  <span className={`badge ${priorityConfig[task.priority].class}`}>
                    {priorityConfig[task.priority].label}
                  </span>
                  <span className={`badge ${statusConfig[task.status].class}`}>
                    {statusConfig[task.status].label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <CreateTaskModal
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => { setIsCreateModalOpen(false); loadTasks(); }}
        />
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSuccess={() => {
            setEditingTask(null);
            // Sync the detail panel if the edited task is open
            setSelectedTask(null);
            loadTasks();
          }}
        />
      )}

      {/* Task Detail Panel */}
      {selectedTask && (
        <div className="w-96">
          <div className="panel sticky top-24">
            <div className="panel-header">
              <h3 className="text-sm font-semibold text-text">Task Details</h3>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-muted hover:text-text"
              >
                ✕
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <h4 className="text-lg font-medium text-text">{selectedTask.title}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`badge ${priorityConfig[selectedTask.priority].class}`}>
                    {priorityConfig[selectedTask.priority].label}
                  </span>
                  <span className={`badge ${statusConfig[selectedTask.status].class}`}>
                    {statusConfig[selectedTask.status].label}
                  </span>
                  {selectedTask.type === 'auto' && (
                    <span className="badge badge-purple">⚡ Auto-generated</span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="text-xs text-muted uppercase tracking-wide">Project</span>
                  <p className="text-sm text-text">{selectedTask.projectName}</p>
                </div>
                {selectedTask.permitName && (
                  <div>
                    <span className="text-xs text-muted uppercase tracking-wide">Permit</span>
                    <p className="text-sm text-text">{selectedTask.permitName}</p>
                  </div>
                )}
                {selectedTask.assigneeName && (
                  <div>
                    <span className="text-xs text-muted uppercase tracking-wide">Assignee</span>
                    <p className="text-sm text-text">{selectedTask.assigneeName}</p>
                  </div>
                )}
                {selectedTask.dueDate && (
                  <div>
                    <span className="text-xs text-muted uppercase tracking-wide">Due Date</span>
                    <p className="text-sm text-text">{selectedTask.dueDate}</p>
                  </div>
                )}
                {selectedTask.ruleName && (
                  <div>
                    <span className="text-xs text-muted uppercase tracking-wide">Created by Rule</span>
                    <p className="text-sm text-purple">{selectedTask.ruleName}</p>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-border space-y-2">
                <button
                  onClick={() => toggleTaskComplete(selectedTask.id)}
                  className="btn btn-primary w-full"
                >
                  {selectedTask.status === 'completed' ? 'Mark as Pending' : 'Mark as Complete'}
                </button>
                <button
                  onClick={() => setEditingTask(selectedTask)}
                  className="btn btn-secondary w-full"
                >
                  Edit Task
                </button>
                <button
                  onClick={() => deleteTask(selectedTask.id)}
                  className="btn btn-ghost w-full text-danger"
                >
                  Delete Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
