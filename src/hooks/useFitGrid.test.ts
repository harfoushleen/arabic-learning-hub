import { describe, expect, it } from 'vitest';
import { balancedColumns, solveFitGrid, type FitGridConfig } from './useFitGrid';

const cfg = (over: Partial<FitGridConfig> = {}): FitGridConfig => ({
  count: 4,
  gap: 16,
  minWidth: 140,
  maxWidth: 320,
  cardHeight: (w) => Math.round(w * 1.1),
  reserveHeight: () => 100,
  ...over,
});

describe('balancedColumns', () => {
  it('only offers even layouts', () => {
    expect(balancedColumns(4)).toEqual([1, 2, 4]);
    expect(balancedColumns(3)).toEqual([1, 3]);
    expect(balancedColumns(6)).toEqual([1, 2, 3, 6]);
    expect(balancedColumns(5)).toEqual([1, 3, 5]);
  });
});

describe('solveFitGrid', () => {
  it('uses 4 in a row on a wide, short area', () => {
    const l = solveFitGrid(1000, 500, cfg());
    expect(l).toMatchObject({ cols: 4, rows: 1, fits: true });
    expect(l.cardWidth).toBe(238);
  });

  it('uses 2×2 on a tall area and respects the height', () => {
    const l = solveFitGrid(736, 760, cfg());
    expect(l).toMatchObject({ cols: 2, rows: 2, fits: true });
    expect(2 * l.cardHeight + 16 + 100).toBeLessThanOrEqual(760);
    expect(2 * Math.round((l.cardWidth + 1) * 1.1) + 16 + 100).toBeGreaterThan(760);
  });

  it('keeps the inset free on every side', () => {
    expect(solveFitGrid(1016, 516, cfg({ inset: 8 })).cardWidth).toBe(238);
  });

  it('caps card width on big screens', () => {
    expect(solveFitGrid(1900, 900, cfg()).cardWidth).toBe(320);
  });

  it('reports no fit at minimum sizes and picks the shortest layout', () => {
    const l = solveFitGrid(700, 200, cfg());
    expect(l).toMatchObject({ fits: false, cardWidth: 140, cols: 4 });
  });
});
