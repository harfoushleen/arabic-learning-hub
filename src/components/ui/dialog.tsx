import type { ComponentPropsWithoutRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTitle = DialogPrimitive.Title;

/** Full-screen on touch devices (iPad), near full-screen on mouse/trackpad desktops. */
export function DialogContent({
  className,
  children,
  closeLabel = 'إِغْلَاق',
  ...props
}: ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { closeLabel?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 animate-fade-in bg-ink/40" />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-0 z-50 flex animate-fade-in flex-col overflow-hidden bg-cream outline-none',
          'pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]',
          'desktop:inset-4 desktop:rounded-[2rem] desktop:shadow-2xl',
          className,
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          aria-label={closeLabel}
          className="game-piece absolute left-3 top-3 z-20 mt-[env(safe-area-inset-top)] flex h-16 w-16 items-center justify-center rounded-full bg-white text-ink shadow-md transition-transform active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
