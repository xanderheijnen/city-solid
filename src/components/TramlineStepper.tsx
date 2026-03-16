import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TRAMLINE_STEPS } from '@/lib/constants';
import type { TrajectStatus } from '@/lib/types';

interface TramlineStepperProps {
  currentStatus: TrajectStatus;
  uitgevallen?: boolean;
  size?: 'compact' | 'full';
  dates?: Record<string, string>;
}

export function TramlineStepper({
  currentStatus,
  uitgevallen: uitgevallenProp,
  size = 'full',
  dates,
}: TramlineStepperProps) {
  const uitgevallen = uitgevallenProp ?? currentStatus === 'uitgevallen';
  const effectiveStatus = currentStatus === 'uitgevallen' ? 'aanmelding' : currentStatus;
  const currentIndex = TRAMLINE_STEPS.findIndex(
    (s) => s.key === effectiveStatus,
  );
  const isCompact = size === 'compact';

  return (
    <div className={cn('flex items-center w-full', isCompact ? 'gap-0' : 'gap-0')}>
      {TRAMLINE_STEPS.map((step, index) => {
        const isDone = index < currentIndex && !uitgevallen;
        const isActive = index === currentIndex;
        const isDropped = uitgevallen && index === currentIndex;
        const isUpcoming = index > currentIndex;
        const isAfterDrop = uitgevallen && index > currentIndex;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            {/* Stop circle + label */}
            <div className={cn('flex flex-col items-center', isCompact ? 'gap-0' : 'gap-1.5')}>
              <div
                className={cn(
                  'rounded-full flex items-center justify-center border-2 transition-all',
                  isCompact ? 'h-5 w-5' : 'h-8 w-8',
                  isDone && 'bg-tramline-done border-tramline-done text-white',
                  isActive && !isDropped && 'bg-tramline-active border-tramline-active text-white animate-pulse-soft',
                  isActive && !isDropped && !isCompact && 'h-10 w-10 ring-4 ring-tramline-active/20',
                  isDropped && 'bg-tramline-dropped border-tramline-dropped text-white',
                  isUpcoming && !isAfterDrop && 'bg-muted border-muted-foreground/30 text-muted-foreground',
                  isAfterDrop && 'bg-muted border-dashed border-muted-foreground/20 text-muted-foreground/40',
                )}
              >
                {isDone && <Check className={cn(isCompact ? 'h-3 w-3' : 'h-4 w-4')} />}
                {isDropped && <X className={cn(isCompact ? 'h-3 w-3' : 'h-4 w-4')} />}
                {isActive && !isDropped && (
                  <span className={cn('font-bold', isCompact ? 'text-[9px]' : 'text-xs')}>
                    {index + 1}
                  </span>
                )}
                {isUpcoming && !isAfterDrop && (
                  <span className={cn('font-medium', isCompact ? 'text-[9px]' : 'text-xs')}>
                    {index + 1}
                  </span>
                )}
                {isAfterDrop && (
                  <span className={cn('font-medium', isCompact ? 'text-[9px]' : 'text-xs')}>
                    {index + 1}
                  </span>
                )}
              </div>

              {/* Label */}
              {!isCompact && (
                <div className="text-center">
                  <p
                    className={cn(
                      'text-[11px] leading-tight whitespace-nowrap',
                      isActive && !isDropped && 'font-bold text-tramline-active',
                      isDone && 'font-medium text-tramline-done',
                      isDropped && 'font-bold text-tramline-dropped',
                      isUpcoming && 'text-muted-foreground',
                    )}
                  >
                    {step.label}
                  </p>
                  {dates?.[step.key] && (
                    <p className="text-[10px] text-muted-foreground">{dates[step.key]}</p>
                  )}
                </div>
              )}
            </div>

            {/* Track line between stops */}
            {index < TRAMLINE_STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 mx-1',
                  isCompact ? 'h-0.5' : 'h-1 -mt-4',
                  isDone && 'bg-tramline-done',
                  isActive && 'bg-gradient-to-r from-tramline-active to-tramline-upcoming',
                  isUpcoming && !isAfterDrop && 'bg-tramline-upcoming/40',
                  isAfterDrop && 'bg-tramline-dropped/20 border-t-2 border-dashed border-tramline-dropped/30 h-0',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
