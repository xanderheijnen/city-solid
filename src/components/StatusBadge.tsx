import { cn } from '@/lib/utils';
import { STATUS_CONFIG } from '@/lib/constants';
import type { TrajectStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: TrajectStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  if (!config) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        config.bgColor,
        config.color,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
