import type { ReactNode } from 'react';
import { cn } from '@/utils/format';

type Variant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface BadgeProps {
  variant?: Variant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<Variant, string> = {
  default: 'bg-primary-100 text-primary-800',
  success: 'bg-success-100 text-success-800',
  warning: 'bg-warning-100 text-warning-800',
  error: 'bg-error-100 text-error-800',
  info: 'bg-accent-100 text-accent-800',
  neutral: 'bg-gray-100 text-gray-700',
};

export function Badge({ variant = 'default', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
