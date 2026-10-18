import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function BigButton({
  variant = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }) {
  return (
    <button
      type="button"
      className={cn(
        'game-piece min-h-[64px] min-w-[160px] rounded-2xl px-8 font-cairo text-[28px] font-bold leading-[1.6] shadow-md transition-transform active:scale-95 md:text-[32px]',
        variant === 'primary' ? 'bg-emerald-300 text-emerald-950' : 'bg-pastel-lilac text-ink',
        className,
      )}
      {...props}
    />
  );
}
