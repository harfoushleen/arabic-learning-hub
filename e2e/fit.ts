import { expect, type Page } from '@playwright/test';

// Visible areas (browser bars already subtracted), not device sizes.
export const VIEWPORTS = [
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

/** Asserts nothing scrolls and every game piece is fully on screen (phones: no horizontal scroll only). */
export async function expectFits(page: Page, state: string, phone: boolean) {
  const m = await page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const doc = document.scrollingElement ?? document.documentElement;
    const game = document.getElementById('active-game-container')!;
    const play = game.querySelector<HTMLElement>('[data-play-area]');
    const outside = [...document.querySelectorAll<HTMLElement>('[data-sentence], [data-picture], [data-word], [data-tile], [data-blank], [data-strip], #active-game-container button')]
      .filter((el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden')
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.top < -0.5 || r.left < -0.5 || r.bottom > vh + 0.5 || r.right > vw + 0.5)
      .map(({ el, r }) => {
        const id = el.dataset.word ?? el.dataset.tile ?? el.getAttribute('aria-label') ?? el.textContent;
        return `${id} [${Math.round(r.left)},${Math.round(r.top)} → ${Math.round(r.right)},${Math.round(r.bottom)}]`;
      });
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

/** Asserts the game's picture is at least `share` of the play area height. */
export async function expectPictureShare(page: Page, state: string, share: number) {
  const { picture, play } = await page.evaluate(() => ({
    picture: document.querySelector('#active-game-container [data-picture]')!.getBoundingClientRect().height,
    play: document.querySelector<HTMLElement>('#active-game-container [data-play-area]')!.clientHeight,
  }));
  expect(picture / play, `${state}: picture ${Math.round(picture)}px of ${play}px play area`).toBeGreaterThanOrEqual(share);
}
