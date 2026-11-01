import { expect, type Page } from '@playwright/test';

/** The real code comes from the environment (TEACHER_CODE) so it is never written in the repo. */
export const TEACHER_CODE = process.env.TEACHER_CODE ?? '';
if (!TEACHER_CODE) throw new Error('Set TEACHER_CODE (env var or .env.local) to run the e2e tests.');

/** Types the teacher code on the home screen's code pad (state is in memory, so every page load starts locked). */
export async function unlockTeacher(page: Page, code = TEACHER_CODE) {
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
