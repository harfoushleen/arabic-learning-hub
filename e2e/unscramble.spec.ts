import { expect, test, type Locator, type Page } from '@playwright/test';
import { units } from '../src/data/units';
import { VIEWPORTS, expectFits } from './fit';

const SETS = new Map(units[0]!.unscramble.map((s) => [s.id, s]));
const BIG_SET = [...SETS.values()].reduce((a, b) => (b.tiles.length > a.tiles.length ? b : a));

const tile = (page: Page, id: string) => page.locator(`[data-tile="${id}"]`);
const strip = (page: Page) => page.locator('[data-strip]');

async function center(l: Locator) {
  const box = (await l.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Drags with pointer events. `synthetic` dispatches them straight to the tile, for phones where the
 * strip can be scrolled out of view (the game logic is the same either way).
 */
async function drag(
  page: Page,
  from: Locator,
  to: Locator | { x: number; y: number },
  { synthetic = false, midDrag }: { synthetic?: boolean; midDrag?: () => Promise<void> } = {},
) {
  const a = await center(from);
  const b = 'x' in to ? to : await center(to);
  if (synthetic) {
    const fire = (steps: { type: string; x: number; y: number }[]) =>
      from.evaluate((el, s) => {
        for (const e of s) {
          el.dispatchEvent(new PointerEvent(e.type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'mouse', isPrimary: true, button: 0, clientX: e.x, clientY: e.y }));
        }
      }, steps);
    await fire([
      { type: 'pointerdown', ...a },
      { type: 'pointermove', x: a.x + 12, y: a.y - 12 },
      { type: 'pointermove', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    ]);
    if (midDrag) await midDrag();
    await fire([
      { type: 'pointermove', ...b },
      { type: 'pointerup', ...b },
    ]);
    return;
  }
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x + 12, a.y - 12, { steps: 2 });
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 5 });
  if (midDrag) await midDrag();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
}

/** Waits for a dragged tile to be back in the bank (the floating copy is gone). */
async function expectReturned(t: Locator) {
  await expect(t).not.toHaveClass(/opacity-30/);
}

async function openGame(page: Page, press: (l: Locator) => Promise<void>) {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await press(page.locator('[data-unit-card="unit-1"]'));
  await press(page.locator('[data-game-card="unscramble"]'));
  await expect(page.locator('#active-game-container[data-game="unscramble"]')).toBeVisible();
  await expect(strip(page)).toBeVisible();
}

const currentSet = async (page: Page) => SETS.get((await strip(page).getAttribute('data-strip'))!)!;
const bankOrder = (page: Page) =>
  page.locator('[data-tile]').evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.tile!));

/**
 * Plays every set by dragging the first accepted answer word by word. Calls `onState` at the checked
 * states, verifies each completed sentence, and returns the set order.
 */
async function playAll(page: Page, { synthetic = false, onState = async () => {} }: { synthetic?: boolean; onState?: (state: string) => Promise<void> } = {}) {
  const next = page.getByRole('button', { name: 'التَّالِي' });
  const restart = page.getByRole('button', { name: 'أَعِدِ اللُّعْبَةَ' });
  const order: string[] = [];

  for (;;) {
    const set = await currentSet(page);
    order.push(set.id);
    if (order.length === 1) await onState('set start');
    const answer = set.answers[0]!;
    for (const [i, id] of answer.entries()) {
      const midDrag = order.length === 1 && i === 0 ? () => onState('mid-drag') : undefined;
      await drag(page, tile(page, id), strip(page), { synthetic, midDrag });
      await expect(page.locator(`[data-slot="${i}"]`)).toHaveAttribute('data-slot-tile', id);
      if (set.id === BIG_SET.id && i === 2) await onState('partly built');
    }

    await expect(strip(page)).toHaveAttribute('data-complete', 'true');
    const texts = await page.locator('[data-slot]').allTextContents();
    expect(texts, `${set.id} sentence`).toEqual(answer.map((id) => set.tiles.find((t) => t.id === id)!.text));

    await expect(next.or(restart)).toBeVisible();
    if (await restart.isVisible()) break;
    await next.click();
    await expect(page.locator('[data-tile]').first()).toBeVisible();
  }
  await onState('final screen');
  return order;
}

for (const vp of VIEWPORTS) {
  const browser = vp.kind === 'desktop' ? 'chromium' : 'webkit';
  const touch = vp.kind !== 'desktop';
  const phone = vp.kind === 'phone';

  test.describe(`unscramble ${vp.name} ${vp.width}x${vp.height} @${browser}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: touch });

    test('Game 4 fits without scrolling in every state', async ({ page }) => {
      await openGame(page, (l) => (touch ? l.tap() : l.click()));
      const seen = new Set<string>();
      await playAll(page, {
        synthetic: phone,
        onState: async (state) => {
          seen.add(state);
          if (state !== 'mid-drag') await page.waitForTimeout(700); // let pop animations finish
          await expectFits(page, state, phone);
        },
      });
      expect([...seen].sort()).toEqual(['final screen', 'mid-drag', 'partly built', 'set start']);
    });
  });
}

for (const [label, browser, viewport, touch] of [
  ['laptop', 'chromium', { width: 1280, height: 620 }, false],
  ['ipad', 'webkit', { width: 1024, height: 690 }, true],
] as const) {
  test.describe(`unscramble drag rules ${label} @${browser}`, () => {
    test.use({ viewport, hasTouch: touch });

    test('tap, elsewhere, wrong and correct drops', async ({ page }) => {
      await openGame(page, (l) => (touch ? l.tap() : l.click()));
      const set = await currentSet(page);
      const answer = set.answers[0]!;
      const correct = tile(page, answer[0]!);
      const wrong = tile(page, answer.find((id) => !set.answers.some((a) => a[0] === id))!);
      const filled = page.locator('[data-slot-tile]');

      // A tap never places a word; it wiggles instead.
      await wrong.click();
      await expect(wrong).toHaveAttribute('data-wiggle', 'true');
      await expect(filled).toHaveCount(0);

      // Dropping elsewhere (the header strip, and the picture) returns the tile and doesn't count.
      for (const target of [{ x: viewport.width / 2, y: 40 }, page.locator('[data-picture]')]) {
        await drag(page, wrong, target);
        await expectReturned(wrong);
      }
      await expect(wrong).toHaveAttribute('data-shake', 'false');
      await expect(filled).toHaveCount(0);

      // First wrong drop: it glides back and shakes, no slot fills, no hint yet.
      await drag(page, wrong, strip(page));
      await expect(wrong).toHaveAttribute('data-shake', 'true');
      await expect(filled).toHaveCount(0);
      await expect(correct).toHaveAttribute('data-hint', 'false');
      await expect(wrong).toHaveAttribute('data-shake', 'false');

      // Second wrong drop on the same slot pulses the correct tile.
      await drag(page, wrong, strip(page));
      await expect(correct).toHaveAttribute('data-hint', 'true');
      await expect(filled).toHaveCount(0);
      await expect(wrong).toHaveAttribute('data-shake', 'true');
      await expect(wrong).toHaveAttribute('data-shake', 'false');

      // The correct tile fills the next slot and leaves the bank.
      await drag(page, correct, strip(page));
      await expect(page.locator('[data-slot="0"]')).toHaveAttribute('data-slot-tile', answer[0]!);
      await expect(correct).toHaveCount(0);
      await expect(page.locator('[data-slot="1"]')).toHaveAttribute('data-next', 'true');
    });
  });
}

test.describe('unscramble order @chromium', () => {
  test.use({ viewport: { width: 1280, height: 620 } });

  test('the starting tile order never matches an accepted answer, across several opens', async ({ page }) => {
    await openGame(page, (l) => l.click());
    for (let open = 0; open < 8; open++) {
      if (open > 0) {
        await page.getByRole('button', { name: 'إِغْلَاق' }).click();
        await page.locator('[data-game-card="unscramble"]').click();
        await expect(strip(page)).toBeVisible();
      }
      const set = await currentSet(page);
      const order = await bankOrder(page);
      expect([...order].sort()).toEqual(set.tiles.map((t) => t.id).sort());
      for (const answer of set.answers) expect(order, `open ${open} ${set.id}`).not.toEqual(answer);
    }
  });
});
