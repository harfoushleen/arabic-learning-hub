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
