import { expect, test, type Locator, type Page } from '@playwright/test';

// Visible areas (browser bars already subtracted), not device sizes.
const VIEWPORTS = [
  { name: 'ipad-10.2-portrait', width: 768, height: 954, kind: 'ipad' },
  { name: 'ipad-10.2-landscape', width: 1024, height: 690, kind: 'ipad' },
  { name: 'ipad-air-portrait', width: 820, height: 1106, kind: 'ipad' },
  { name: 'ipad-air-landscape', width: 1180, height: 740, kind: 'ipad' },
  { name: 'ipad-pro-12.9-portrait', width: 1024, height: 1292, kind: 'ipad' },
  { name: 'ipad-pro-12.9-landscape', width: 1366, height: 950, kind: 'ipad' },
  { name: 'laptop-1280', width: 1280, height: 620, kind: 'desktop' },
  { name: 'laptop-1366', width: 1366, height: 650, kind: 'desktop' },
  { name: 'laptop-1920', width: 1920, height: 950, kind: 'desktop' },
  { name: 'projector', width: 1024, height: 630, kind: 'desktop' },
  { name: 'phone-portrait', width: 390, height: 750, kind: 'phone' },
  { name: 'phone-landscape', width: 750, height: 340, kind: 'phone' },
] as const;

const SCREENSHOTS = new Set(['ipad-10.2-portrait', 'ipad-10.2-landscape']);

interface Measure {
  vw: number;
  vh: number;
  docScrollH: number;
  docScrollW: number;
  gameScrollH: number;
  gameClientH: number;
  gameScrollW: number;
  gameClientW: number;
  playScrollH: number;
  playClientH: number;
  outside: string[];
}

async function center(l: Locator) {
  const box = (await l.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/**
 * Drags with pointer events. `synthetic` dispatches them straight to the chip, for phones where the
 * card can be scrolled out of view (the game logic is the same either way).
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
      from.evaluate((el, st) => {
        for (const e of st) {
          el.dispatchEvent(new PointerEvent(e.type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'mouse', isPrimary: true, button: 0, clientX: e.x, clientY: e.y }));
        }
      }, steps);
    await fire([{ type: 'pointerdown', ...a }, { type: 'pointermove', x: a.x + 12, y: a.y - 12 }, { type: 'pointermove', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }]);
    if (midDrag) await midDrag();
    await fire([{ type: 'pointermove', ...b }, { type: 'pointerup', ...b }]);
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

function measure(page: Page): Promise<Measure> {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const doc = document.scrollingElement ?? document.documentElement;
    const game = document.getElementById('active-game-container')!;
    const play = game.querySelector<HTMLElement>('[data-play-area]');
    const outside = [...document.querySelectorAll<HTMLElement>('[data-card], [data-chip], #active-game-container button')]
      .filter((el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden')
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.top < -0.5 || r.left < -0.5 || r.bottom > vh + 0.5 || r.right > vw + 0.5)
      .map(({ el, r }) => {
        const id = el.dataset.card ?? el.dataset.chip ?? el.getAttribute('aria-label') ?? el.textContent;
        return `${id} [${Math.round(r.left)},${Math.round(r.top)} → ${Math.round(r.right)},${Math.round(r.bottom)}]`;
      });
    // A card's picture and slot must stay inside the card itself.
    for (const card of document.querySelectorAll<HTMLElement>('[data-card]')) {
      const c = card.getBoundingClientRect();
      for (const part of card.children) {
        const r = part.getBoundingClientRect();
        if (r.top < c.top - 0.5 || r.bottom > c.bottom + 0.5 || r.left < c.left - 0.5 || r.right > c.right + 0.5) {
          outside.push(`${card.dataset.card} content overflows its card`);
        }
      }
    }
    return {
      vw,
      vh,
      docScrollH: doc.scrollHeight,
      docScrollW: doc.scrollWidth,
      gameScrollH: game.scrollHeight,
      gameClientH: game.clientHeight,
      gameScrollW: game.scrollWidth,
      gameClientW: game.clientWidth,
      playScrollH: play?.scrollHeight ?? 0,
      playClientH: play?.clientHeight ?? 0,
      outside,
    };
  });
}

async function expectFits(page: Page, state: string, phone: boolean) {
  const m = await measure(page);
  if (phone) {
    expect(m.docScrollW, `${state}: page scrolls horizontally`).toBeLessThanOrEqual(m.vw);
    expect(m.gameScrollW, `${state}: game scrolls horizontally`).toBeLessThanOrEqual(m.gameClientW);
    return;
  }
  expect(m.docScrollH, `${state}: page scrolls`).toBeLessThanOrEqual(m.vh);
  expect(m.gameScrollH, `${state}: game container scrolls`).toBeLessThanOrEqual(m.gameClientH);
  expect(m.playScrollH, `${state}: play area overflows`).toBeLessThanOrEqual(m.playClientH);
  expect(m.outside, `${state}: pieces outside the viewport`).toEqual([]);
}

for (const vp of VIEWPORTS) {
  const browser = vp.kind === 'desktop' ? 'chromium' : 'webkit';
  const touch = vp.kind !== 'desktop';
  const phone = vp.kind === 'phone';

  test.describe(`${vp.name} ${vp.width}x${vp.height} @${browser}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: touch });

    test('Game 1 fits without scrolling in every state', async ({ page }) => {
      const press = (l: Locator) => (touch ? l.tap() : l.click());
      const settle = () => page.waitForTimeout(700); // let pop/lift animations finish

      const cards = page.locator('[data-card]');
      const chip = (id: string) => page.locator(`[data-chip="${id}"]`);
      const nextButton = page.getByRole('button', { name: 'التَّالِي' });

      async function place(cardIndex: number, midDrag?: () => Promise<void>) {
        const card = cards.nth(cardIndex);
        const id = (await card.getAttribute('data-card'))!;
        await drag(page, chip(id), card, { synthetic: phone, midDrag });
        await expect(card).toHaveAttribute('data-placed', 'true');
      }
      async function placeAll() {
        const n = await cards.count();
        for (let i = 0; i < n; i++) if ((await cards.nth(i).getAttribute('data-placed')) !== 'true') await place(i);
      }

      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      await press(page.locator('[data-unit-card="unit-1"]'));
      await press(page.locator('[data-game-card="word-picture"]'));
      await expect(page.locator('#active-game-container[data-game="word-picture"]')).toBeVisible();

      // 1. Start of a round.
      await expect(cards.first()).toBeVisible();
      await settle();
      await expectFits(page, 'round start', phone);
      const cardIds = await cards.evaluateAll((els) => els.map((el) => el.dataset.card));
      const chipIds = await page.locator('[data-chip]').evaluateAll((els) => els.map((el) => el.dataset.chip));
      expect(chipIds.filter((id, i) => id === cardIds[i]), 'chips lined up with their pictures').toEqual([]);

      // 2. Mid-drag (the first word held over its card), then 3. after placing 2 words.
      await place(0, () => expectFits(page, 'mid-drag', phone));
      await place(1);
      await settle();
      await expectFits(page, 'two placed', phone);
      if (SCREENSHOTS.has(vp.name)) {
        await page.screenshot({ path: `e2e/screenshots/${vp.name}.png` });
      } else if (process.env.E2E_SCREENSHOT_ALL) {
        await page.screenshot({ path: `test-results/screens/${vp.name}.png` });
      }

      // 4. Round-complete panel.
      await placeAll();
      await expect(nextButton).toBeVisible();
      await settle();
      await expectFits(page, 'round complete', phone);

      // 5. Final screen: play every remaining round.
      // A round shows only after its images decode, so wait for cards OR the final screen.
      const restart = page.getByRole('button', { name: 'أَعِدِ اللُّعْبَةَ' });
      await press(nextButton);
      for (;;) {
        await expect(cards.first().or(restart)).toBeVisible();
        if (await restart.isVisible()) break;
        await placeAll();
        await expect(nextButton).toBeVisible();
        await press(nextButton);
      }
      await settle();
      await expectFits(page, 'final screen', phone);
    });
  });
}

for (const [label, browser, viewport, touch] of [
  ['laptop', 'chromium', { width: 1280, height: 620 }, false],
  ['ipad', 'webkit', { width: 1024, height: 690 }, true],
] as const) {
  test.describe(`word-picture drag rules ${label} @${browser}`, () => {
    test.use({ viewport, hasTouch: touch });

    test('tap, elsewhere, wrong and correct drops', async ({ page }) => {
      await page.goto('/#/unit/unit-1/word-picture');
      const cards = page.locator('[data-card]');
      await expect(cards.first()).toBeVisible();
      const [a, b] = (await cards.evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.card!))) as [string, string];
      const chipA = page.locator(`[data-chip="${a}"]`);
      const card = (id: string) => page.locator(`[data-card="${id}"]`);

      // A tap never places a word; it wiggles.
      await chipA.click();
      await expect(chipA).toHaveAttribute('data-wiggle', 'true');
      await expect(page.locator('[data-placed="true"]')).toHaveCount(0);

      // Dropping elsewhere (the header strip) returns the chip and doesn't count.
      await drag(page, chipA, { x: viewport.width / 2, y: 40 });
      await expect(chipA).not.toHaveClass(/opacity-30/);
      await expect(chipA).toHaveAttribute('data-shake', 'false');

      // Wrong card: it glides back and shakes, nothing is placed.
      await drag(page, chipA, card(b));
      await expect(chipA).toHaveAttribute('data-shake', 'true');
      await expect(chipA).toHaveAttribute('data-shake', 'false');
      await expect(card(a)).toHaveAttribute('data-hint', 'false');

      // Second wrong drop for the same word pulses its picture.
      await drag(page, chipA, card(b));
      await expect(card(a)).toHaveAttribute('data-hint', 'true');
      await expect(chipA).toHaveAttribute('data-shake', 'true');
      await expect(chipA).toHaveAttribute('data-shake', 'false');

      // The right card takes the word.
      await drag(page, chipA, card(a));
      await expect(card(a)).toHaveAttribute('data-placed', 'true');
      await expect(chipA).toHaveCount(0);
    });
  });
}
