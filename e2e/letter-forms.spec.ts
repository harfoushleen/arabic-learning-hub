import { expect, test, type Locator, type Page } from '@playwright/test';
import { units, type LetterForm } from '../src/data/units';
import { VIEWPORTS, expectFits } from './fit';

const ZWJ = '‍';
const TILE_FOR_ANSWER: Record<LetterForm, string> = { 'بـ': 'initial', 'ـبـ': 'medial', 'ـب': 'final', 'ب': 'isolated' };
const ITEMS = new Map(units[0]!.letterForms.map((item) => [item.id, item]));

async function openGame(page: Page, press: (l: Locator) => Promise<void>) {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await press(page.locator('[data-unit-card="unit-1"]'));
  await press(page.locator('[data-game-card="letter-forms"]'));
  await expect(page.locator('#active-game-container[data-game="letter-forms"]')).toBeVisible();
  await expect(page.locator('[data-word]')).toBeVisible();
}

/**
 * Plays every word correctly. Calls `onState` at the states we check, verifies each completed word's
 * text, and returns the word order.
 */
async function playAll(
  page: Page,
  press: (l: Locator) => Promise<void>,
  onState: (state: string) => Promise<void> = async () => {},
) {
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
    if (order.length === 1) await onState('word start');

    const blanks = item.parts.filter((p) => p.type === 'blank');
    for (const [i, blank] of blanks.entries()) {
      await press(page.locator(`[data-tile="${TILE_FOR_ANSWER[blank.answer]}"]`));
      await expect(page.locator('[data-blank]')).toHaveCount(blanks.length - i - 1);
      if (id === 'dabdoob' && i === 0) {
        await expect(page.locator('[data-blank][data-active="true"]')).toHaveCount(1);
        await onState('dabdoob second blank');
      }
    }

    await expect(word).toHaveAttribute('data-complete', 'true');
    const text = (await word.textContent())!.replaceAll(ZWJ, '');
    expect(text.normalize('NFC'), `${id} text`).toBe(item.target.normalize('NFC'));

    await expect(next.or(restart)).toBeVisible();
    if (await restart.isVisible()) break;
    if (order.length === 1) await onState('completed word');
    await press(next);
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
      const press = (l: Locator) => (touch ? l.tap() : l.click());
      await openGame(page, press);
      await playAll(page, press, async (state) => {
        await page.waitForTimeout(700); // let pop/shake animations finish
        await expectFits(page, state, phone);
      });
    });
  });
}

test.describe('letter-forms replay @chromium', () => {
  test.use({ viewport: { width: 1280, height: 620 } });

  test('word order differs between two plays', async ({ page }) => {
    const press = (l: Locator) => l.click();
    await openGame(page, press);
    const first = await playAll(page, press);
    await press(page.getByRole('button', { name: 'أَعِدِ اللُّعْبَةَ' }));
    await expect(page.locator('[data-word]')).toBeVisible();
    const second = await playAll(page, press);
    expect(first).toHaveLength(ITEMS.size);
    expect(second).not.toEqual(first);
  });
});
