import { expect, test, type Locator, type Page } from '@playwright/test';
import { units } from '../src/data/units';
import { VIEWPORTS, expectFits } from './fit';

const ITEMS = units[0]!.sentencePictures;

const sentence = (page: Page, id: string) => page.locator(`[data-sentence="${id}"]`);
const picture = (page: Page, id: string) => page.locator(`[data-picture="${id}"]`);

async function center(l: Locator) {
  const box = (await l.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Drags with pointer events. `synthetic` dispatches them straight to the source card, for phones
 * where the matching card can be scrolled out of view (the game logic is the same either way).
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
    const steps = [
      { type: 'pointerdown', ...a },
      { type: 'pointermove', x: a.x - 12, y: a.y + 12 },
      { type: 'pointermove', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    ];
    await from.evaluate((el, s) => {
      for (const e of s) {
        el.dispatchEvent(new PointerEvent(e.type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'mouse', isPrimary: true, button: 0, clientX: e.x, clientY: e.y }));
      }
    }, steps);
    if (midDrag) await midDrag();
    await from.evaluate((el, p) => {
      for (const type of ['pointermove', 'pointerup']) {
        el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'mouse', isPrimary: true, button: 0, clientX: p.x, clientY: p.y }));
      }
    }, b);
    return;
  }
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x - 12, a.y + 12, { steps: 2 });
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 5 });
  if (midDrag) await midDrag();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
}

async function openGame(page: Page, press: (l: Locator) => Promise<void>) {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await press(page.locator('[data-unit-card="unit-1"]'));
  await press(page.locator('[data-game-card="sentence-picture"]'));
  await expect(page.locator('#active-game-container[data-game="sentence-picture"]')).toBeVisible();
  await expect(page.locator('[data-sentence]')).toHaveCount(ITEMS.length);
  await expect(page.locator('[data-lines]')).toBeAttached(); // dots measured
}

/** Row by row: [sentence id, picture id] as laid out. */
async function rows(page: Page) {
  return page.locator('[data-row]').evaluateAll((els) =>
    els.map((el) => [(el as HTMLElement).dataset.rowSentence!, (el as HTMLElement).dataset.rowPicture!]),
  );
}

for (const vp of VIEWPORTS) {
  const browser = vp.kind === 'desktop' ? 'chromium' : 'webkit';
  const touch = vp.kind !== 'desktop';
  const phone = vp.kind === 'phone';

  test.describe(`sentence-picture ${vp.name} ${vp.width}x${vp.height} @${browser}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: touch });

    test('Game 2 fits without scrolling in every state', async ({ page }) => {
      await openGame(page, (l) => (touch ? l.tap() : l.click()));
      const check = async (state: string) => {
        await page.waitForTimeout(700); // let pop animations finish
        await expectFits(page, state, phone);
      };

      await check('start');
      const [first, ...rest] = ITEMS.map((it) => it.id);

      // Mid-drag with a live line, then complete the first match.
      await drag(page, sentence(page, first!), picture(page, first!), {
        synthetic: phone,
        midDrag: async () => {
          await expect(page.locator('[data-live-line="live"]')).toBeAttached();
          await expectFits(page, 'mid-drag', phone);
        },
      });
      await expect(page.locator(`[data-line="${first}"]`)).toBeAttached();
      await check('1 matched');

      for (const id of rest) {
        await drag(page, sentence(page, id), picture(page, id), { synthetic: phone });
        await expect(page.locator(`[data-line="${id}"]`)).toBeAttached();
      }
      await expect(page.getByRole('button', { name: 'أَعِدِ اللُّعْبَةَ' })).toBeVisible();
      await expect(page.locator('[data-lines], [data-line]')).toHaveCount(0); // no lines over the end screen
      await check('final screen');
    });
  });
}

for (const [label, browser, viewport, touch] of [
  ['laptop', 'chromium', { width: 1280, height: 620 }, false],
  ['ipad', 'webkit', { width: 1024, height: 690 }, true],
] as const) {
  test.describe(`sentence-picture drag rules ${label} @${browser}`, () => {
    test.use({ viewport, hasTouch: touch });

    test('correct, wrong, elsewhere and tap', async ({ page }) => {
      await openGame(page, (l) => (touch ? l.tap() : l.click()));
      const [a, b, c] = ITEMS.map((it) => it.id) as [string, string, string];

      // A tap never connects anything; the card wiggles.
      await sentence(page, a).click();
      await expect(sentence(page, a)).toHaveAttribute('data-wiggle', 'true');
      await expect(page.locator('[data-line]')).toHaveCount(0);

      // Dropping elsewhere (the header strip, far from every card) retracts the line and doesn't
      // count as a wrong try.
      const elsewhere = { x: viewport.width / 2, y: 60 };
      for (let i = 0; i < 2; i++) {
        await drag(page, sentence(page, a), elsewhere);
        await expect(page.locator('[data-live-line]')).toHaveCount(0);
      }
      await expect(picture(page, a)).toHaveAttribute('data-hint', 'false');

      // Wrong drop: the line retracts, the target card shakes, nothing locks, no hint yet.
      await drag(page, sentence(page, a), picture(page, b));
      await expect(picture(page, b)).toHaveAttribute('data-shake', 'true');
      await expect(page.locator('[data-live-line]')).toHaveCount(0);
      await expect(page.locator('[data-line]')).toHaveCount(0);
      await expect(picture(page, a)).toHaveAttribute('data-hint', 'false');
      await expect(picture(page, b)).toHaveAttribute('data-shake', 'false');

      // Second wrong try for the same sentence pulses its correct picture.
      await drag(page, sentence(page, a), picture(page, c));
      await expect(picture(page, a)).toHaveAttribute('data-hint', 'true');
      await expect(page.locator('[data-line]')).toHaveCount(0);
      await expect(picture(page, c)).toHaveAttribute('data-shake', 'true');
      await expect(picture(page, c)).toHaveAttribute('data-shake', 'false');

      // Correct drop locks a line and both cards.
      await drag(page, sentence(page, a), picture(page, a));
      await expect(page.locator(`[data-line="${a}"]`)).toBeAttached();
      await expect(sentence(page, a)).toHaveAttribute('data-matched', 'true');
      await expect(picture(page, a)).toHaveAttribute('data-matched', 'true');

      // Picture → sentence works too.
      await drag(page, picture(page, b), sentence(page, b));
      await expect(page.locator(`[data-line="${b}"]`)).toBeAttached();
      await expect(sentence(page, b)).toHaveAttribute('data-matched', 'true');
      await expect(picture(page, b)).toHaveAttribute('data-matched', 'true');
    });
  });
}

test.describe('sentence-picture order @chromium', () => {
  test.use({ viewport: { width: 1280, height: 620 } });

  test('no row is aligned with its match, across several opens', async ({ page }) => {
    await openGame(page, (l) => l.click());
    for (let open = 0; open < 6; open++) {
      if (open > 0) {
        await page.getByRole('button', { name: 'إِغْلَاق' }).click();
        await page.locator('[data-game-card="sentence-picture"]').click();
        await expect(page.locator('[data-sentence]')).toHaveCount(ITEMS.length);
      }
      for (const [s, p] of await rows(page)) expect(s, `open ${open}`).not.toBe(p);
    }
  });
});

test.describe('sentence-picture rotation @chromium', () => {
  test.use({ viewport: { width: 768, height: 954 } });

  test('locked lines stay attached to their dots after a resize', async ({ page }) => {
    await openGame(page, (l) => l.click());
    const id = ITEMS[0]!.id;
    await drag(page, sentence(page, id), picture(page, id));
    await expect(page.locator(`[data-line="${id}"]`)).toBeAttached();

    await page.setViewportSize({ width: 1024, height: 690 }); // portrait → landscape
    await expect(async () => {
      const gap = await page.evaluate((lineId) => {
        const line = document.querySelector<SVGPathElement>(`[data-line="${lineId}"]`)!;
        const svg = document.querySelector('[data-lines]')!.getBoundingClientRect();
        const dot = (key: string) => {
          const r = document.querySelector(`[data-dot="${key}"]`)!.getBoundingClientRect();
          return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        };
        const ends = [
          [Number(line.dataset.x1) + svg.left, Number(line.dataset.y1) + svg.top, dot(`s:${lineId}`)],
          [Number(line.dataset.x2) + svg.left, Number(line.dataset.y2) + svg.top, dot(`p:${lineId}`)],
        ] as const;
        return Math.max(...ends.map(([x, y, d]) => Math.hypot(x - d.x, y - d.y)));
      }, id);
      expect(gap).toBeLessThanOrEqual(3);
    }).toPass();
  });
});
