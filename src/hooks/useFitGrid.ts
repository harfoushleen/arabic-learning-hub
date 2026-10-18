import { useCallback, useState } from 'react';

export interface FitGridConfig {
  count: number;
  /** Gap between cards, px. */
  gap: number;
  /** Breathing room kept free on every side (glows, lift animations), px. */
  inset?: number;
  minWidth: number;
  maxWidth: number;
  /** Full card height (picture + slot + padding) for a card `w` px wide. */
  cardHeight: (w: number) => number;
  /** Height needed below the grid (e.g. gap + word bank) for card width `w` in an area `areaWidth` wide. */
  reserveHeight?: (w: number, areaWidth: number) => number;
  /** Column counts to try; defaults to balanced layouts for `count`. */
  columns?: number[];
}

export interface FitGridLayout {
  cols: number;
  rows: number;
  cardWidth: number;
  cardHeight: number;
  /** False when even the minimum sizes overflow the area (last-resort scrolling). */
  fits: boolean;
}

/** Column counts that give even rows: divisors of n (plus ~half for primes ≥ 5). */
export function balancedColumns(n: number): number[] {
  const out: number[] = [];
  for (let c = 1; c <= n; c++) if (n % c === 0) out.push(c);
  if (n > 3 && out.length === 2) out.splice(1, 0, Math.ceil(n / 2));
  return out;
}

/** Picks the column count giving the largest card that fits both width and height. */
export function solveFitGrid(areaWidth: number, areaHeight: number, cfg: FitGridConfig): FitGridLayout {
  const { count, gap, minWidth, maxWidth, cardHeight, reserveHeight, inset = 0 } = cfg;
  const width = areaWidth - 2 * inset;
  const height = areaHeight - 2 * inset;
  if (count <= 0) return { cols: 1, rows: 0, cardWidth: 0, cardHeight: 0, fits: true };

  let best: FitGridLayout | null = null;
  let fallback: { layout: FitGridLayout; total: number } | null = null;

  for (const cols of cfg.columns ?? balancedColumns(count)) {
    const rows = Math.ceil(count / cols);
    const total = (w: number) => rows * cardHeight(w) + (rows - 1) * gap + (reserveHeight?.(w, width) ?? 0);
    const wMax = Math.floor(Math.min(maxWidth, (width - (cols - 1) * gap) / cols));
    if (wMax <= 0) continue;
    const lo = Math.min(minWidth, wMax);

    if (total(lo) > height) {
      const t = total(lo);
      if (!fallback || t < fallback.total) {
        fallback = { total: t, layout: { cols, rows, cardWidth: lo, cardHeight: cardHeight(lo), fits: false } };
      }
      continue;
    }

    // Largest integer width in [lo, wMax] whose layout fits the height.
    let a = lo;
    let b = wMax;
    while (a < b) {
      const mid = Math.ceil((a + b) / 2);
      if (total(mid) <= height) a = mid;
      else b = mid - 1;
    }
    if (!best || a > best.cardWidth) best = { cols, rows, cardWidth: a, cardHeight: cardHeight(a), fits: true };
  }

  if (best) return best;
  if (fallback) return fallback.layout;
  const w = Math.max(1, Math.floor(Math.min(width, maxWidth)));
  return { cols: 1, rows: count, cardWidth: w, cardHeight: cardHeight(w), fits: false };
}

interface Area {
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
}

/**
 * Measures the element given to `ref` (the play area) and fits `count` cards into it.
 * Recomputes on resize and rotation. `layout` is null until the first measurement.
 */
export function useFitGrid(cfg: FitGridConfig) {
  const [area, setArea] = useState<Area | null>(null);

  const ref = useCallback((el: HTMLDivElement | null) => {
    if (!el) return;
    const measure = () => {
      const next: Area = {
        // offset* includes any scrollbar, so toggling last-resort scrolling can't oscillate.
        width: el.offsetWidth,
        height: el.offsetHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };      setArea((prev) =>
        prev &&
        prev.width === next.width &&
        prev.height === next.height &&
        prev.viewportWidth === next.viewportWidth &&
        prev.viewportHeight === next.viewportHeight
          ? prev
          : next,
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('orientationchange', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  const layout = area ? solveFitGrid(area.width, area.height, cfg) : null;

  // In portrait, would turning the device make it fit? (Header overhead assumed unchanged.)
  let fitsRotated = false;
  if (area && layout && !layout.fits && area.viewportHeight > area.viewportWidth) {
    const overhead = area.viewportHeight - area.height;
    const rotatedWidth = area.width + (area.viewportHeight - area.viewportWidth);
    const rotatedHeight = area.viewportWidth - overhead;
    fitsRotated = rotatedHeight > 0 && solveFitGrid(rotatedWidth, rotatedHeight, cfg).fits;
  }

  return { ref, layout, area, fitsRotated };
}
