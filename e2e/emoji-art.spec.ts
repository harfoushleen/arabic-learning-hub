import { expect, test } from '@playwright/test';

// Everything else runs with reduced motion (static art). Here motion is on, so animated Noto emoji
// load through lottie-web and render an <svg>.
test.describe('emoji art @chromium', () => {
  test.use({ viewport: { width: 1280, height: 620 }, reducedMotion: 'no-preference' });

  test('a Game 1 picture with a Noto animation renders a Lottie <svg>', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-unit-card="unit-1"]').click();
    // Rounds are random; reopen until the first round has a word with an animated emoji.
    for (let open = 0; open < 15; open++) {
      await page.locator('[data-game-card="word-picture"]').click();
      await expect(page.locator('[data-card]').first()).toBeVisible();
      if ((await page.locator('[data-card] [data-lottie]').count()) > 0) break;
      await page.getByRole('button', { name: 'إِغْلَاق' }).click();
      await expect(page.locator('#active-game-container')).toHaveCount(0);
    }
    await expect(page.locator('[data-card] [data-lottie] svg').first()).toBeAttached();
    // Once the animation is ready, the static placeholder underneath is hidden.
    const card = page.locator('[data-card]', { has: page.locator('[data-lottie] svg') }).first();
    await expect(card.locator('img.invisible')).toHaveCount(1);
  });

  test('with reduced motion, the same art stays a static Noto SVG', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#/unit/unit-1/word-picture');
    await expect(page.locator('[data-card]').first()).toBeVisible();
    await expect(page.locator('[data-lottie]')).toHaveCount(0);
    await expect(page.locator('[data-card] img[src^="/emoji/"], [data-card] [data-art]').first()).toBeVisible();
    // Animated WebP art shows only its still frame.
    await expect(page.locator('[data-art$=".webp"] img:not([src$="-still.webp"]):not([src="/art/zabib.webp"])')).toHaveCount(0);
  });

  test('a Game 1 word with cartoon art renders its Lottie as an <svg>', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-unit-card="unit-1"]').click();
    // Rounds are random; reopen until the first round has a word with Lottie art.
    for (let open = 0; open < 15; open++) {
      await page.locator('[data-game-card="word-picture"]').click();
      await expect(page.locator('[data-card]').first()).toBeVisible();
      if ((await page.locator('[data-card] [data-art$=".json"]').count()) > 0) break;
      await page.getByRole('button', { name: 'إِغْلَاق' }).click();
      await expect(page.locator('#active-game-container')).toHaveCount(0);
    }
    await expect(page.locator('[data-card] [data-art$=".json"] svg').first()).toBeAttached();
  });
});
