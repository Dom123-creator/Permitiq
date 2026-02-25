import { ReactNode } from 'react';

interface PanelProps {
  children: ReactNode;
  className?: string;
}

export function Panel({ children, className = '' }: PanelProps) {
  return (
    <div className={`bg-surface border border-border rounded-lg ${className}`}>
      {children}
    </div>
  );
}

interface PanelHeaderProps {
  children: ReactNode;
  className?: string;
}

export function PanelHeader({ children, className = '' }: PanelHeaderProps) {
  return (
    <div className={`flex items-center justify-between p-4 border-b border-border ${className}`}>
      {children}
    </div>
  );
}
