import { useEffect, useRef, useState } from 'react';
import type { AnimationItem } from 'lottie-web';
import { emojiAssets } from '@/lib/emoji';
import { cn, prefersReducedMotion } from '@/lib/utils';

interface EmojiArtProps {
  emoji: string;
  /** Size of the art: px, or any CSS length (it is square). */
  size: number | string;
  /** Animate now. With `loop` it keeps going; without, it plays once each time `play` turns on or `replay` changes. */
  play?: boolean;
  loop?: boolean;
  /** Change this to play a one-shot again (e.g. a counter). */
  replay?: unknown;
  /** Wait this long before a one-shot starts, ms (to stagger a row of pictures). */
  delay?: number;
  className?: string;
}

/**
 * Google Noto emoji art: the animated Lottie when Noto has one (lottie-web's light SVG player,
 * loaded lazily), else the static Noto SVG with a gentle CSS sway/bob, else the native emoji.
 * The static SVG shows until the animation is ready. Reduced motion: always static.
 */
export function EmojiArt({ emoji, size, play = false, loop = false, replay, delay = 0, className }: EmojiArtProps) {
  const assets = emojiAssets(emoji);
  const reduced = prefersReducedMotion();
  const box = useRef<HTMLSpanElement>(null);
  const anim = useRef<AnimationItem | null>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const lottieUrl = !reduced ? (assets?.lottie ?? null) : null;

  // Load the Lottie player and file lazily.
  useEffect(() => {
    if (!lottieUrl || !box.current) return;
    let cancelled = false;
    const container = box.current;
    Promise.all([import('lottie-web/build/player/lottie_light'), fetch(lottieUrl).then((r) => r.json())])
      .then(([{ default: lottie }, animationData]) => {
        if (cancelled) return;
        const item = lottie.loadAnimation({ container, renderer: 'svg', loop: false, autoplay: false, animationData });
        item.addEventListener('DOMLoaded', () => !cancelled && setReady(true));
        anim.current = item;
      })
      .catch(() => undefined); // keep the static SVG
    return () => {
      cancelled = true;
      anim.current?.destroy();
      anim.current = null;
      setReady(false);
    };
  }, [lottieUrl]);

  // Pause while off-screen.
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(e?.isIntersecting ?? true));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Drive the animation.
  useEffect(() => {
    const item = anim.current;
    if (!item || !ready) return;
    if (!play || !visible) {
      // A loop finishes its current cycle and rests; off-screen it stops at once.
      item.loop = false;
      if (!visible) item.pause();
      return;
    }
    item.loop = loop;
    const timer = window.setTimeout(() => item.goToAndPlay(0, true), loop ? 0 : delay);
    return () => window.clearTimeout(timer);
  }, [ready, play, loop, visible, replay, delay]);

  if (!assets) {
    return (
      <span aria-hidden className={cn('font-emoji leading-none', className)} style={{ fontSize: typeof size === 'number' ? Math.round(size * 0.9) : `calc(${size} * 0.9)` }}>
        {emoji}
      </span>
    );
  }

  // No animation file: a CSS sway (loop) or bob (one-shot) on the static SVG.
  const cssMotion = !lottieUrl && !reduced && play ? (loop ? 'animate-sway' : 'animate-bob') : undefined;
  return (
    <span aria-hidden className={cn('relative inline-block shrink-0', className)} style={{ width: size, height: size }}>
      <img
        key={cssMotion === 'animate-bob' ? String(replay) : undefined}
        src={assets.svg}
        alt=""
        draggable={false}
        className={cn('pointer-events-none absolute inset-0 h-full w-full', ready && 'invisible', cssMotion)}
        style={cssMotion === 'animate-bob' && delay ? { animationDelay: `${delay}ms` } : undefined}
      />
      {lottieUrl && <span ref={box} data-lottie className="pointer-events-none absolute inset-0 [&>svg]:!h-full [&>svg]:!w-full" />}
    </span>
  );
}
