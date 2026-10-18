import { useEffect, useRef, useState } from 'react';
import type { AnimationItem } from 'lottie-web';
import type { Art } from '@/data/units';
import { emojiAssets } from '@/lib/emoji';
import { cn, prefersReducedMotion } from '@/lib/utils';

interface EmojiArtProps {
  emoji: string;
  /** Cartoon art for the word (public/art/); preferred over the Noto emoji. */
  art?: Art;
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

/** How long an animated WebP plays for a one-shot (it can't report its own length). */
const WEBP_ONE_SHOT_MS = 2400;

/**
 * A word's picture, by preference:
 * 1. `art`: a Lottie (lottie-web's light SVG player, loaded lazily) or an animated WebP that shows
 *    its still frame when idle; a WebP without a still is static and gets the CSS sway/bob.
 * 2. Google Noto emoji: the animated Lottie when Noto has one, else the static Noto SVG with the
 *    CSS sway/bob; the static SVG shows until the animation is ready.
 * 3. The native emoji.
 * Reduced motion: always static (a Lottie shows a frame from its middle). Pauses while off-screen.
 */
export function EmojiArt({ emoji, art, size, play = false, loop = false, replay, delay = 0, className }: EmojiArtProps) {
  const assets = emojiAssets(emoji);
  const reduced = prefersReducedMotion();
  const outer = useRef<HTMLSpanElement>(null);
  const box = useRef<HTMLSpanElement>(null);
  const anim = useRef<AnimationItem | null>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const [webpPlaying, setWebpPlaying] = useState(0); // 0 = still; otherwise a run counter (remounts the image)

  const artLottie = art?.type === 'lottie' ? art.src : null;
  const lottieUrl = artLottie ?? (!reduced ? (assets?.lottie ?? null) : null);
  const animatedWebp = art?.type === 'webp' && art.still ? art : null;

  // Load the Lottie player and file lazily.
  useEffect(() => {
    if (!lottieUrl || !box.current) return;
    let cancelled = false;
    const container = box.current;
    Promise.all([import('lottie-web/build/player/lottie_light'), fetch(lottieUrl).then((r) => r.json())])
      .then(([{ default: lottie }, animationData]) => {
        if (cancelled) return;
        const item = lottie.loadAnimation({ container, renderer: 'svg', loop: false, autoplay: false, animationData });
        item.addEventListener('DOMLoaded', () => {
          if (cancelled) return;
          if (reduced) item.goToAndStop(Math.floor(item.totalFrames / 2), true); // a representative still
          setReady(true);
        });
        anim.current = item;
      })
      .catch(() => undefined); // keep the static SVG
    return () => {
      cancelled = true;
      anim.current?.destroy();
      anim.current = null;
      setReady(false);
    };
  }, [lottieUrl, reduced]);

  // Pause while off-screen.
  useEffect(() => {
    const el = outer.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(e?.isIntersecting ?? true));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Drive a Lottie.
  useEffect(() => {
    const item = anim.current;
    if (!item || !ready || reduced) return;
    if (!play || !visible) {
      // A loop finishes its current cycle and rests; off-screen it stops at once.
      item.loop = false;
      if (!visible) item.pause();
      return;
    }
    item.loop = loop;
    const timer = window.setTimeout(() => item.goToAndPlay(0, true), loop ? 0 : delay);
    return () => window.clearTimeout(timer);
  }, [ready, reduced, play, loop, visible, replay, delay]);

  // Drive an animated WebP: swap the still for the animation while it should play.
  useEffect(() => {
    if (!animatedWebp || reduced) return;
    const timers: number[] = [];
    if (play && visible) {
      timers.push(window.setTimeout(() => setWebpPlaying((n) => n + 1), loop ? 0 : delay));
      if (!loop) timers.push(window.setTimeout(() => setWebpPlaying(0), delay + WEBP_ONE_SHOT_MS));
    } else {
      timers.push(window.setTimeout(() => setWebpPlaying(0), 0));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [animatedWebp, reduced, play, loop, visible, replay, delay]);

  const boxStyle = { width: size, height: size };
  const cssMotionFor = (staticPicture: boolean) =>
    staticPicture && !reduced && play ? (loop ? 'animate-sway' : 'animate-bob') : undefined;

  if (art) {
    if (art.type === 'lottie') {
      return (
        <span ref={outer} aria-hidden data-art={art.src} className={cn('relative inline-block shrink-0', className)} style={boxStyle}>
          <span ref={box} className="pointer-events-none absolute inset-0 [&>svg]:!h-full [&>svg]:!w-full" />
        </span>
      );
    }
    const cssMotion = cssMotionFor(!animatedWebp);
    return (
      <span ref={outer} aria-hidden data-art={art.src} className={cn('relative inline-block shrink-0', className)} style={boxStyle}>
        <img
          key={animatedWebp ? webpPlaying : cssMotion === 'animate-bob' ? String(replay) : undefined}
          src={animatedWebp && webpPlaying ? art.src : (art.still ?? art.src)}
          alt=""
          draggable={false}
          className={cn('pointer-events-none absolute inset-0 h-full w-full object-contain', cssMotion)}
          style={cssMotion === 'animate-bob' && delay ? { animationDelay: `${delay}ms` } : undefined}
        />
      </span>
    );
  }

  if (!assets) {
    return (
      <span aria-hidden className={cn('font-emoji leading-none', className)} style={{ fontSize: typeof size === 'number' ? Math.round(size * 0.9) : `calc(${size} * 0.9)` }}>
        {emoji}
      </span>
    );
  }

  // No animation file: a CSS sway (loop) or bob (one-shot) on the static SVG.
  const cssMotion = cssMotionFor(!lottieUrl);
  return (
    <span ref={outer} aria-hidden className={cn('relative inline-block shrink-0', className)} style={boxStyle}>
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
