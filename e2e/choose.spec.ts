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

test.describe('unit 3 letter-forms ت set @chromium @webkit', () => {
  test('shows 6 tiles and solves one word by dragging the right tile', async ({ page }) => {
    await gotoAsTeacher(page, '#/unit/unit-3/letter-forms/ta');
    const set = getUnit('unit-3')!.letterForms.find((s) => s.id === 'ta')!;
    await expect(page.locator('[data-tile]')).toHaveCount(6);
    const wordId = (await page.locator('[data-word]').getAttribute('data-word'))!;
    const blank = set.items.find((i) => i.id === wordId)!.parts.find((p) => p.type === 'blank')!;
    const letter = blank.answer.replaceAll('ـ', '');
    const form = blank.answer.startsWith('ـ') ? (blank.answer.endsWith('ـ') ? 'medial' : 'final') : blank.answer.endsWith('ـ') ? 'initial' : 'isolated';
    const from = (await page.locator(`[data-tile="${letter}:${form}"]`).boundingBox())!;
    const to = (await page.locator('[data-blank][data-active="true"]').boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2 + 12, from.y + 12, { steps: 2 });
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(page.locator('[data-word]')).toHaveAttribute('data-complete', 'true');
  });
});

test.describe('unit 3 demonstratives @chromium @webkit', () => {
  const ITEMS = getUnit('unit-3')!.demonstratives!;

  test('one picture per screen: a wrong tap is disabled, the right one moves on, all 12 reach the final screen', async ({ page }) => {
    await gotoAsTeacher(page, '#/unit/unit-3/demonstratives');
    for (const [i, q] of ITEMS.entries()) {
      await expect(page.locator(`[data-question="${q.id}"]`)).toBeVisible();
      await expect(page.locator('[data-picture]')).toBeVisible();
      if (i === 0) {
        const wrong = q.options.find((o) => o.id !== q.answerId)!.id;
        await page.locator(`[data-option="${wrong}"]`).click();
        await expect(page.locator(`[data-option="${wrong}"]`)).toBeDisabled();
      }
      await page.locator(`[data-option="${q.answerId}"]`).click();
      await expect(page.locator('[data-filled]')).toBeVisible();
    }
    await expect(page.getByRole('button', { name: 'أَعِدِ اللُّعْبَةَ' })).toBeVisible();
  });

  for (const vp of VIEWPORTS.filter((v) => v.kind !== 'phone')) {
    test(`fits without scrolling on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await gotoAsTeacher(page, '#/unit/unit-3/demonstratives');
      await expect(page.locator('[data-picture]')).toBeVisible();
      await expectFits(page, `demonstratives @ ${vp.name}`, false);
    });
  }
});
