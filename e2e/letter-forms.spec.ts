import { expect, test, type Locator, type Page } from '@playwright/test';
import { units, type LetterForm } from '../src/data/units';
import { VIEWPORTS, expectFits, expectPictureShare } from './fit';

const ZWJ = '‍';
const TILE_FOR_ANSWER: Record<LetterForm, string> = { 'بـ': 'initial', 'ـبـ': 'medial', 'ـب': 'final', 'ب': 'isolated' };
const ITEMS = new Map(units[0]!.letterForms.map((item) => [item.id, item]));

const tile = (page: Page, id: string) => page.locator(`[data-tile="${id}"]`);
const activeBlank = (page: Page) => page.locator('[data-blank][data-active="true"]');

async function center(l: Locator) {
  const box = (await l.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Drags with pointer events (Playwright's mouse drives the same pointer code as a finger).
 * `midDrag` runs while the tile is held over the halfway point.
 */
async function drag(page: Page, from: Locator, to: Locator | { x: number; y: number }, midDrag?: () => Promise<void>) {
  const a = await center(from);
  const b = 'x' in to ? to : await center(to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x + 12, a.y + 12, { steps: 2 });
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 5 });
  if (midDrag) await midDrag();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
}

/** Waits for a dragged tile to be back in place (the floating copy is gone). */
async function expectReturned(t: Locator) {
  await expect(t).not.toHaveClass(/opacity-30/);
}

async function openGame(page: Page, press: (l: Locator) => Promise<void>) {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await press(page.locator('[data-unit-card="unit-1"]'));
  await press(page.locator('[data-game-card="letter-forms"]'));
  await expect(page.locator('#active-game-container[data-game="letter-forms"]')).toBeVisible();
  await expect(page.locator('[data-word]')).toBeVisible();
}

/**
 * Plays every word by dragging the right tiles. Calls `onState` at the checked states, verifies each
 * completed word's text, and returns the word order.
 */
async function playAll(page: Page, onState: (state: string) => Promise<void> = async () => {}) {
  const word = page.locator('[data-word]');
  const next = page.getByRole('button', { name: 'التَّالِي' });
  const restart = page.getByRole('button', { name: 'أَعِدِ اللُّعْبَةَ' });
  const order: string[] = [];

  for (;;) {
    await expect(word.or(restart)).toBeVisible();
    if (await restart.isVisible()) break;

    const id = (await word.getAttribute('data-word'))!;
    const item = ITEMS.get(id)!;
    order.push(id);
    const first = order.length === 1;
    if (first) await onState('word start');

    const blanks = item.parts.filter((p) => p.type === 'blank');
    for (const [i, blank] of blanks.entries()) {
      await drag(page, tile(page, TILE_FOR_ANSWER[blank.answer]), activeBlank(page), first && i === 0 ? () => onState('mid-drag') : undefined);
      await expect(page.locator('[data-blank]')).toHaveCount(blanks.length - i - 1);
      if (id === 'dabdoob' && i === 0) {
        await expect(activeBlank(page)).toHaveCount(1);
        await onState('dabdoob second blank');
      }
    }

    await expect(word).toHaveAttribute('data-complete', 'true');
    const text = (await word.textContent())!.replaceAll(ZWJ, '');
    expect(text.normalize('NFC'), `${id} text`).toBe(item.target.normalize('NFC'));

    await expect(next.or(restart)).toBeVisible();
    if (await restart.isVisible()) break;
    if (first) await onState('completed word');
    await next.click();
  }
  await onState('final screen');
  return order;
}

for (const vp of VIEWPORTS) {
  const browser = vp.kind === 'desktop' ? 'chromium' : 'webkit';
  const touch = vp.kind !== 'desktop';
  const phone = vp.kind === 'phone';

  test.describe(`letter-forms ${vp.name} ${vp.width}x${vp.height} @${browser}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: touch });

    test('Game 3 fits without scrolling and joins each completed word', async ({ page }) => {
      await openGame(page, (l) => (touch ? l.tap() : l.click()));
      await playAll(page, async (state) => {
        if (state !== 'mid-drag') await page.waitForTimeout(700); // let pop animations finish
        if (state !== 'final screen') await expect(page.locator('[data-picture]')).toBeVisible();
        await expectFits(page, state, phone);
        if (vp.kind === 'ipad' && state !== 'final screen') await expectPictureShare(page, state, 0.35);
      });
    });
  });
}

for (const [label, browser, viewport, touch] of [
  ['laptop', 'chromium', { width: 1280, height: 620 }, false],
  ['ipad', 'webkit', { width: 1024, height: 690 }, true],
] as const) {
  test.describe(`letter-forms drag rules ${label} @${browser}`, () => {
    test.use({ viewport, hasTouch: touch });

    test('tap, miss, wrong and correct drops', async ({ page }) => {
      await openGame(page, (l) => (touch ? l.tap() : l.click()));
      const item = ITEMS.get((await page.locator('[data-word]').getAttribute('data-word'))!)!;
      const blanksBefore = await page.locator('[data-blank]').count();
      const answer = item.parts.find((p) => p.type === 'blank')!;
      if (answer.type !== 'blank') throw new Error('no blank');
      const correctId = TILE_FOR_ANSWER[answer.answer];
      const wrongId = Object.values(TILE_FOR_ANSWER).find((t) => t !== correctId)!;
      const correct = tile(page, correctId);
      const wrong = tile(page, wrongId);
      const home = await wrong.boundingBox();

      // A tap never places a tile; it wiggles instead.
      await wrong.click();
      await expect(wrong).toHaveAttribute('data-wiggle', 'true');
      await expect(page.locator('[data-blank]')).toHaveCount(blanksBefore);

      // Dropping somewhere else returns the tile and doesn't count as a wrong try
      // (once on an empty corner, once on the word's picture, which is display-only).
      const corner = { x: 12, y: viewport.height - 12 };
      for (const target of [corner, page.locator('[data-picture]')]) {
        await drag(page, wrong, target);
        await expectReturned(wrong);
      }
      await expect(correct).toHaveAttribute('data-hint', 'false');

      // First wrong drop: tile returns and shakes, blank stays empty, no hint yet.
      await drag(page, wrong, activeBlank(page));
      await expectReturned(wrong);
      await expect(wrong).toHaveClass(/animate-shake/);
      await expect(page.locator('[data-blank]')).toHaveCount(blanksBefore);
      await expect(correct).toHaveAttribute('data-hint', 'false');
      await expect(wrong).not.toHaveClass(/animate-shake/);
      expect(await wrong.boundingBox()).toEqual(home); // back exactly where it started

      // Second wrong drop on the same blank: the correct tile pulses.
      await drag(page, wrong, activeBlank(page));
      await expect(correct).toHaveAttribute('data-hint', 'true');
      await expect(page.locator('[data-blank]')).toHaveCount(blanksBefore);

      // Correct drop fills the blank.
      await expectReturned(wrong);
      await expect(wrong).not.toHaveClass(/animate-shake/);
      await drag(page, correct, activeBlank(page));
      await expect(page.locator('[data-blank]')).toHaveCount(blanksBefore - 1);
    });
  });
}

test.describe('letter-forms replay @chromium', () => {
  test.use({ viewport: { width: 1280, height: 620 } });

  test('word order differs between two plays', async ({ page }) => {
    await openGame(page, (l) => l.click());
    const first = await playAll(page);
    await page.getByRole('button', { name: 'أَعِدِ اللُّعْبَةَ' }).click();
    await expect(page.locator('[data-word]')).toBeVisible();
    const second = await playAll(page);
    expect(first).toHaveLength(ITEMS.size);
    expect(second).not.toEqual(first);
  });
});
