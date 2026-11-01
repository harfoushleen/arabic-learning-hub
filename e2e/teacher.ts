import { expect, type Page } from '@playwright/test';

/** Types the teacher code on the home screen's code pad (state is in memory, so every page load starts locked). */
export async function unlockTeacher(page: Page, code = '123456') {
  await page.locator('[data-teacher-lock="locked"]').click();
  for (const digit of code) await page.getByRole('button', { name: digit, exact: true }).click();
}

/** Opens `hash` (e.g. '#/unit/unit-2/unscramble') as a teacher: unlock on home, then follow the link in-page. */
export async function gotoAsTeacher(page: Page, hash = '#/') {
  await page.goto('/');
  await unlockTeacher(page);
  await expect(page.locator('[data-teacher-lock="unlocked"]')).toBeVisible();
  await page.evaluate((h) => { location.hash = h; }, hash);
}
