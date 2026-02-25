import { ReactNode } from 'react';

type BadgeVariant = 'default' | 'success' | 'warn' | 'danger' | 'info' | 'purple';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-muted/20 text-muted',
  success: 'bg-success/20 text-success',
  warn: 'bg-warn/20 text-warn',
  danger: 'bg-danger/20 text-danger',
  info: 'bg-accent/20 text-accent',
  purple: 'bg-purple/20 text-purple',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
