import { expect, test } from '@playwright/test';
import { units } from '../src/data/units';
import { VIEWPORTS } from './fit';

const UNIT = units[0]!;

test.describe('shell navigation @chromium', () => {
  test.use({ viewport: { width: 1280, height: 620 } });

  test('home lists the units; a unit card opens its 4 games', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-unit-card]')).toHaveCount(units.length);
    await page.locator(`[data-unit-card="${UNIT.id}"]`).click();
    await expect(page).toHaveURL(new RegExp(`#/unit/${UNIT.id}$`));
    await expect(page.locator('[data-game-card]')).toHaveCount(4);

    // The back button returns home.
    await page.getByRole('button', { name: 'رُجُوع' }).click();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.locator('[data-unit-card]')).toHaveCount(units.length);
  });

  test('opening a game sets the hash; browser back closes the dialog, then goes home', async ({ page }) => {
    await page.goto('/');
    await page.locator(`[data-unit-card="${UNIT.id}"]`).click();
    await page.locator('[data-game-card="unscramble"]').click();
    await expect(page).toHaveURL(new RegExp(`#/unit/${UNIT.id}/unscramble$`));
    await expect(page.locator('#active-game-container[data-game="unscramble"]')).toBeVisible();

    await page.goBack();
    await expect(page.locator('#active-game-container')).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`#/unit/${UNIT.id}$`));
    await expect(page.locator('[data-game-card]')).toHaveCount(4);

    await page.goBack();
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.locator('[data-unit-card]')).toHaveCount(units.length);
  });

  test('the close button updates the hash', async ({ page }) => {
    await page.goto('/');
    await page.locator(`[data-unit-card="${UNIT.id}"]`).click();
    await page.locator('[data-game-card="word-picture"]').click();
    await expect(page.locator('#active-game-container')).toBeVisible();
    await page.getByRole('button', { name: 'إِغْلَاق' }).click();
    await expect(page.locator('#active-game-container')).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`#/unit/${UNIT.id}$`));
  });

  test('a deep link opens the game directly; closing it lands on the unit screen', async ({ page }) => {
    await page.goto(`/#/unit/${UNIT.id}/letter-forms`);
    await expect(page.locator('#active-game-container[data-game="letter-forms"]')).toBeVisible();
    await page.getByRole('button', { name: 'إِغْلَاق' }).click();
    await expect(page).toHaveURL(new RegExp(`#/unit/${UNIT.id}$`));
    await expect(page.locator('[data-game-card]')).toHaveCount(4);
  });

  test('unknown unit or game ids redirect home', async ({ page }) => {
    for (const hash of ['#/unit/nope', `#/unit/${UNIT.id}/nope`, '#/whatever']) {
      await page.goto(`/${hash}`);
      await expect(page).toHaveURL(/#\/$/);
      await expect(page.locator('[data-unit-card]')).toHaveCount(units.length);
    }
  });

  test('the ز tile on the unit card is rendered in Noto Naskh', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const zay = page.locator(`[data-unit-card="${UNIT.id}"] [data-letter-tile]`, { hasText: 'ز' });
    await expect(zay).toHaveCount(1);
    const family = await zay.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(family.split(',')[0]!.replace(/["']/g, '').trim()).toBe('Noto Naskh Arabic');
    expect(await page.evaluate(() => document.fonts.check('700 60px "Noto Naskh Arabic"', 'ز'))).toBe(true);
  });
});

for (const vp of VIEWPORTS.filter((v) => v.kind !== 'phone')) {
  const browser = vp.kind === 'desktop' ? 'chromium' : 'webkit';

  test.describe(`unit screen ${vp.name} ${vp.width}x${vp.height} @${browser}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.kind !== 'desktop' });

    test('the unit screen fits without scrolling', async ({ page }) => {
      await page.goto(`/#/unit/${UNIT.id}`);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('[data-game-card]')).toHaveCount(4);
      const m = await page.evaluate(() => {
        const doc = document.scrollingElement ?? document.documentElement;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const outside: string[] = [];
        for (const card of document.querySelectorAll<HTMLElement>('[data-game-card]')) {
          const c = card.getBoundingClientRect();
          if (c.top < -0.5 || c.left < -0.5 || c.bottom > vh + 0.5 || c.right > vw + 0.5) outside.push(`${card.dataset.gameCard} off screen`);
          // Every part of the card (emoji, title, short, pill) stays inside it.
          for (const part of card.children) {
            const r = part.getBoundingClientRect();
            if (r.top < c.top - 0.5 || r.bottom > c.bottom + 0.5) outside.push(`${card.dataset.gameCard} content overflows`);
          }
        }
        return { scrollH: doc.scrollHeight, scrollW: doc.scrollWidth, vw, vh, outside };
      });
      expect(m.scrollH, 'page scrolls').toBeLessThanOrEqual(m.vh);
      expect(m.scrollW, 'page scrolls sideways').toBeLessThanOrEqual(m.vw);
      expect(m.outside).toEqual([]);
    });
  });
}
