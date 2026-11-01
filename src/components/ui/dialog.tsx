import type { ComponentPropsWithoutRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTitle = DialogPrimitive.Title;

/**
 * Full screen on every device, exactly the visible height (--app-h), with no inset or padding.
 * The close button lives in GameStage's header.
 */
export function DialogContent({ className, children, ...props }: ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-cream" />
      <DialogPrimitive.Content
        className={cn(
          'h-app fixed inset-x-0 top-0 z-50 animate-fade-in overflow-hidden overscroll-none bg-cream outline-none',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/** A small centred card over a dimmed page (the teacher code popup); games use the full-screen DialogContent. */
export function DialogCard({ className, children, ...props }: ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-fade-in bg-ink/40" />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-0 z-50 m-auto h-fit max-h-[calc(var(--app-h,100dvh)-16px)] w-[min(92vw,340px)] animate-rise-in overflow-y-auto rounded-card-lg bg-cream p-5 shadow-card outline-none',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
