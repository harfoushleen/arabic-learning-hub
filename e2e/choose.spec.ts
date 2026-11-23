import { expect, test } from '@playwright/test';
import { getUnit } from '../src/data/units';
import { VIEWPORTS, expectFits } from './fit';
import { gotoAsTeacher } from './teacher';

const QUESTIONS = getUnit('unit-3')!.choose!;

test.describe('unit 3 @chromium @webkit', () => {
test('choose: a wrong tap shakes and disables, the right one fills the blank, and the game reaches the final screen', async ({ page }) => {
  await gotoAsTeacher(page, '#/unit/unit-3/choose');

  for (const [i, q] of QUESTIONS.entries()) {
    await expect(page.locator(`[data-question="${q.id}"]`)).toBeVisible();
    const wrongId = q.options.find((o) => o.id !== q.answerId)!.id;
    if (i === 0) {
      await page.locator(`[data-option="${wrongId}"]`).click();
      await expect(page.locator(`[data-option="${wrongId}"]`)).toBeDisabled();
      await expect(page.locator(`[data-option="${wrongId}"]`)).toHaveAttribute('data-state', 'wrong');
    }
    await page.locator(`[data-option="${q.answerId}"]`).click();
    await expect(page.locator(`[data-option="${q.answerId}"]`)).toHaveAttribute('data-state', 'correct');
    if (q.stem) await expect(page.locator('[data-filled]')).toBeVisible();
  }
  await expect(page.getByRole('button', { name: 'أَعِدِ اللُّعْبَةَ' })).toBeVisible();
});

test('word-picture offers the two letter sets and plays only the chosen one', async ({ page }) => {
  await gotoAsTeacher(page, '#/unit/unit-3/word-picture');
  await expect(page.locator('[data-letter-set]')).toHaveCount(2);
  await page.locator('[data-letter-set="ha"]').click();
  await expect(page).toHaveURL(/#\/unit\/unit-3\/word-picture\/ha$/);
  await expect(page.locator('[data-letter-set]')).toHaveCount(0);
  await expect(page.locator('[data-picture], [data-card]').first()).toBeVisible();
});

for (const vp of VIEWPORTS.filter((v) => v.kind !== 'phone')) {
  test(`choose fits without scrolling on ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await gotoAsTeacher(page, '#/unit/unit-3/choose');
    for (const q of QUESTIONS) {
      await expect(page.locator(`[data-question="${q.id}"]`)).toBeVisible();
      await expectFits(page, `choose ${q.id} @ ${vp.name}`, false);
      await page.locator(`[data-option="${q.answerId}"]`).click();
    }
  });
}
});
