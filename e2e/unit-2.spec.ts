import { expect, test, type Locator, type Page } from '@playwright/test';
import { getUnit, letterFormItems, type FillBlankPart } from '../src/data/units';
import { formName } from '../src/lib/arabicJoining';
import { VIEWPORTS, expectFits } from './fit';

type Blank = Extract<FillBlankPart, { type: 'blank' }>;

const UNIT = getUnit('unit-2')!;
const FILL = UNIT.fillBlank!;
const SENTENCES = new Map(FILL.sentences.map((s) => [s.id, s]));
const WORD_TEXT = new Map(FILL.words.map((w) => [w.id, w.text]));
const ITEMS = new Map(letterFormItems(UNIT).map((item) => [item.id, item]));
const ZWJ = '‍';

const tile = (page: Page, id: string) => page.locator(`[data-tile="${id}"]`);
const blankAt = (page: Page, i: number) => page.locator(`[data-blank="${i}"]`);
const sentenceCard = (page: Page) => page.locator('[data-sentence]');
const blankIndexes = (sentenceId: string) =>
  SENTENCES.get(sentenceId)!.parts.flatMap((p, i) => (p.type === 'blank' ? [i] : []));

async function center(l: Locator) {
  const box = (await l.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Drags with pointer events (Playwright's mouse drives the same pointer code as a finger). */
async function drag(page: Page, from: Locator, to: Locator | { x: number; y: number }, midDrag?: () => Promise<void>) {
  const a = await center(from);
  const b = 'x' in to ? to : await center(to);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x + 12, a.y - 12, { steps: 2 });
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 5 });
  if (midDrag) await midDrag();
  await page.mouse.move(b.x, b.y, { steps: 5 });
  await page.mouse.up();
}

/**
 * Wiggle, shake and hint last well under a second, so a slow run can poll right past them. Record
 * every chip that turns one on instead, and assert on the record.
 */
async function recordFlags(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __flags: Set<string> };
    w.__flags = new Set();
    new MutationObserver((records) => {
      for (const r of records) {
        const el = r.target as HTMLElement;
        if (el.getAttribute(r.attributeName!) === 'true') w.__flags.add(`${r.attributeName!.slice(5)}:${el.dataset.tile}`);
      }
    }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-wiggle', 'data-shake', 'data-hint'] });
  });
}
const clearFlags = (page: Page) => page.evaluate(() => (window as unknown as { __flags: Set<string> }).__flags.clear());
const saw = (page: Page, flag: string, id: string) =>
  page.evaluate((key) => (window as unknown as { __flags: Set<string> }).__flags.has(key), `${flag}:${id}`);
const expectSaw = (page: Page, flag: string, id: string) => expect.poll(() => saw(page, flag, id)).toBe(true);

async function openFill(page: Page) {
  await page.goto('/#/unit/unit-2/fill-blank');
  await page.evaluate(() => document.fonts.ready);
  await expect(sentenceCard(page)).toBeVisible();
  await expect(page.locator('[data-tile]')).toHaveCount(FILL.words.length);
}

/**
 * Plays every sentence by dragging the right words. `pairs: 'reversed'` fills an either-order pair the
 * other way round. Calls `onState` at the checked states, verifies each completed sentence's text, and
 * returns the sentence order.
 */
async function playAll(
  page: Page,
  { pairs = 'natural', onState = async () => {} }: { pairs?: 'natural' | 'reversed'; onState?: (state: string) => Promise<void> } = {},
) {
  const next = page.getByRole('button', { name: 'التَّالِي' });
  const restart = page.getByRole('button', { name: 'أَعِدِ اللُّعْبَةَ' });
  const card = sentenceCard(page);
  const order: string[] = [];
  let placed = 0;

  for (;;) {
    const sentenceId = (await card.getAttribute('data-sentence'))!;
    const sentence = SENTENCES.get(sentenceId)!;
    order.push(sentenceId);
    await onState(order.length === 1 ? 'start' : 'sentence start');

    const taken = new Set<string>();
    const shown: string[] = [];
    for (const [n, i] of blankIndexes(sentenceId).entries()) {
      const part = sentence.parts[i] as Blank;
      const candidates = pairs === 'reversed' ? [...part.accept].reverse() : part.accept;
      const wordId = candidates.find((id) => !taken.has(id))!;
      taken.add(wordId);
      const midDrag = order.length === 1 && n === 0 ? () => onState('mid-drag') : undefined;
      await drag(page, tile(page, wordId), blankAt(page, i), midDrag);
      placed++;
      // The cloud holds every word not placed yet, across all the sentences.
      await expect(page.locator('[data-tile]')).toHaveCount(FILL.words.length - placed);
      const text = part.fill ?? WORD_TEXT.get(wordId)!;
      await expect(page.locator(`[data-filled="${i}"]`)).toHaveText(text);
      await expect(page.locator(`[data-filled="${i}"]`)).toHaveAttribute('data-filled-word', wordId);
      shown[i] = text;
    }

    await expect(card).toHaveAttribute('data-complete', 'true');
    const expected = sentence.parts.map((p, i) => (p.type === 'text' ? p.value : shown[i])).join('');
    expect((await card.textContent())!.normalize('NFC'), `${sentenceId} sentence`).toBe(expected.normalize('NFC'));

    await expect(next.or(restart)).toBeVisible();
    if (await restart.isVisible()) break;
    if (order.length === 1) await onState('sentence done');
    await next.click();
    await expect(card).not.toHaveAttribute('data-sentence', sentenceId);
  }
  await onState('final screen');
  return order;
}

/** The sentence text stays inside its card and the chips inside the cloud (the fit estimates held). */
async function expectContained(page: Page, state: string) {
  const m = await page.evaluate(() => {
    const card = document.querySelector<HTMLElement>('[data-sentence]')!;
    const text = card.querySelector('p')!.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    const cloud = document.querySelector<HTMLElement>('[data-cloud]')!.getBoundingClientRect();
    const chipsOutside = [...document.querySelectorAll<HTMLElement>('[data-tile]')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.left < cloud.left - 0.5 || r.right > cloud.right + 0.5 || r.top < cloud.top - 0.5 || r.bottom > cloud.bottom + 0.5;
    }).length;
    return { above: text.top - c.top, below: c.bottom - text.bottom, chipsOutside };
  });
  expect(m.above, `${state}: sentence text pokes out of the top of its card`).toBeGreaterThanOrEqual(-0.5);
  expect(m.below, `${state}: sentence text pokes out of the bottom of its card`).toBeGreaterThanOrEqual(-0.5);
  expect(m.chipsOutside, `${state}: chips outside the cloud`).toBe(0);
}

test.describe('unit 2 shell @chromium', () => {
  test.use({ viewport: { width: 1280, height: 620 } });

  test('home shows 2 unit cards; Unit 2 shows its story and 4 game cards, sentence-picture "coming soon"', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-unit-card]')).toHaveCount(2);
    await page.locator('[data-unit-card="unit-2"]').click();
    await expect(page).toHaveURL(/#\/unit\/unit-2$/);
    await expect(page.locator('[data-unit-story]')).toHaveText('فِي البُسْتَانِ');
    await expect(page.locator('[data-game-card]')).toHaveCount(4);
    const ids = await page.locator('[data-game-card]').evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.gameCard));
    expect(ids).toEqual(['word-picture', 'sentence-picture', 'letter-forms', 'fill-blank']);

    // Only sentence-picture has no content yet: a soft, disabled "قَرِيبًا" card.
    const soon = page.locator('[data-game-card="sentence-picture"]');
    await expect(soon).toHaveAttribute('data-soon', 'true');
    await expect(soon).toBeDisabled();
    await expect(soon).toContainText('قَرِيبًا');
    await soon.click({ force: true });
    await expect(page).toHaveURL(/#\/unit\/unit-2$/);
    await expect(page.locator('#active-game-container')).toHaveCount(0);
    for (const id of ['word-picture', 'letter-forms', 'fill-blank']) {
      await expect(page.locator(`[data-game-card="${id}"]`)).toHaveAttribute('data-soon', 'false');
      await expect(page.locator(`[data-game-card="${id}"]`)).toBeEnabled();
    }

    // The fill-blank card previews its first sentence with a dashed blank and a floating word.
    const preview = page.locator('[data-game-card="fill-blank"] [data-fill-blank-preview]');
    await expect(preview).toBeVisible();
    await expect(preview).toContainText('سَارَ أَنِيس وَشَادْيَا');
    await expect(preview).toContainText('إِلَى البُسْتَان');
  });

  test('a deep link to the "coming soon" game goes home, like an unknown game', async ({ page }) => {
    await page.goto('/#/unit/unit-2/sentence-picture');
    await expect(page).toHaveURL(/#\/$/);
    await expect(page.locator('[data-unit-card]')).toHaveCount(2);
  });

  test('Unit 2 word-picture plays with its emoji pictures', async ({ page }) => {
    await page.goto('/#/unit/unit-2/word-picture');
    const cards = page.locator('[data-card]');
    await expect(cards.first()).toBeVisible();
    const id = (await cards.first().getAttribute('data-card'))!;
    await drag(page, page.locator(`[data-chip="${id}"]`), cards.first());
    await expect(cards.first()).toHaveAttribute('data-placed', 'true');
  });
});

for (const vp of VIEWPORTS.filter((v) => v.kind !== 'phone')) {
  const browser = vp.kind === 'desktop' ? 'chromium' : 'webkit';
  const touch = vp.kind !== 'desktop';

  test.describe(`unit 2 ${vp.name} ${vp.width}x${vp.height} @${browser}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: touch });

    test('fill-blank fits without scrolling in every state', async ({ page }) => {
      await openFill(page);
      const seen = new Set<string>();
      await playAll(page, {
        onState: async (state) => {
          seen.add(state);
          if (state !== 'mid-drag') await page.waitForTimeout(700); // let pop animations finish
          await expectFits(page, state, false);
          if (state !== 'final screen') await expectContained(page, state);
        },
      });
      expect([...seen].sort()).toEqual(['final screen', 'mid-drag', 'sentence done', 'sentence start', 'start']);
    });

    test('the Unit 2 screen fits without scrolling', async ({ page }) => {
      await page.goto('/#/unit/unit-2');
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
          // Every part of the card (picture or preview, title, short, pill) stays inside it.
          for (const part of card.children) {
            const r = part.getBoundingClientRect();
            if (r.top < c.top - 0.5 || r.bottom > c.bottom + 0.5 || r.left < c.left - 0.5 || r.right > c.right + 0.5) {
              outside.push(`${card.dataset.gameCard} content overflows`);
            }
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

for (const [label, browser, viewport, touch] of [
  ['laptop', 'chromium', { width: 1280, height: 620 }, false],
  ['ipad', 'webkit', { width: 1024, height: 690 }, true],
] as const) {
  test.describe(`fill-blank drag rules ${label} @${browser}`, () => {
    test.use({ viewport, hasTouch: touch });

    test('tap, elsewhere, wrong (returns) and correct drops', async ({ page }) => {
      await openFill(page);
      await recordFlags(page);
      const sentenceId = (await sentenceCard(page).getAttribute('data-sentence'))!;
      const at = blankIndexes(sentenceId)[0]!;
      const part = SENTENCES.get(sentenceId)!.parts[at] as Blank;
      const correctId = part.accept[0]!;
      const wrongId = FILL.words.find((w) => !part.accept.includes(w.id))!.id;
      const wrong = tile(page, wrongId);
      const blank = blankAt(page, at);
      const filled = page.locator('[data-filled]');
      const home = await wrong.boundingBox();

      // A tap never places a word; it wiggles.
      await wrong.click();
      await expectSaw(page, 'wiggle', wrongId);
      await expect(filled).toHaveCount(0);

      // Dropping elsewhere (the header strip, the story title) returns the chip and doesn't count.
      for (const target of [{ x: viewport.width / 2, y: 40 }, page.locator('[data-story]')]) {
        await drag(page, wrong, target);
        await expect(wrong).not.toHaveClass(/opacity-30/);
      }
      await page.waitForTimeout(300); // a shake would have started by now
      expect(await saw(page, 'shake', wrongId)).toBe(false);
      await expect(filled).toHaveCount(0);

      // First wrong drop: the chip glides back and shakes, the blank stays empty, no hint yet.
      await drag(page, wrong, blank);
      await expectSaw(page, 'shake', wrongId);
      await expect(wrong).toHaveAttribute('data-shake', 'false');
      await expect(wrong).not.toHaveClass(/opacity-30/);
      expect(await wrong.boundingBox()).toEqual(home); // back exactly where it started
      await expect(filled).toHaveCount(0);
      await expect(blank).toBeVisible();
      expect(await saw(page, 'hint', correctId)).toBe(false);

      // Second wrong drop on the same blank: a chip that fits it pulses.
      await clearFlags(page);
      await drag(page, wrong, blank);
      await expectSaw(page, 'hint', correctId);
      await expectSaw(page, 'shake', wrongId);
      await expect(wrong).toHaveAttribute('data-shake', 'false');
      await expect(filled).toHaveCount(0);

      // The right word snaps in and leaves the cloud.
      await drag(page, tile(page, correctId), blank);
      await expect(page.locator(`[data-filled="${at}"]`)).toHaveText(part.fill ?? WORD_TEXT.get(correctId)!);
      await expect(tile(page, correctId)).toHaveCount(0);
      await expect(page.locator('[data-tile]')).toHaveCount(FILL.words.length - 1);
    });
  });
}

test.describe('fill-blank rules @chromium', () => {
  test.use({ viewport: { width: 1280, height: 620 } });

  test('all 4 sentences complete by drag; the cloud shrinks; the final screen follows', async ({ page }) => {
    await openFill(page);
    const order = await playAll(page);
    expect([...order].sort()).toEqual(FILL.sentences.map((s) => s.id).sort());
    await expect(page.getByRole('button', { name: 'أَعِدِ اللُّعْبَةَ' })).toBeVisible();
  });

  test('the two names fill their blanks in either order (a replay plays them the other way round)', async ({ page }) => {
    await openFill(page);
    await playAll(page, { pairs: 'natural' });
    await page.getByRole('button', { name: 'أَعِدِ اللُّعْبَةَ' }).click();
    await expect(page.locator('[data-tile]')).toHaveCount(FILL.words.length);
    await playAll(page, { pairs: 'reversed' }); // checks each blank shows the word dropped on it
  });

  test('either name may take either blank of the pair, and a placed word leaves the cloud', async ({ page }) => {
    await openFill(page);
    // Play up to the pair sentence, then drop شَادْيَا on its second blank first and أَنِيس on the first.
    let sentenceId = (await sentenceCard(page).getAttribute('data-sentence'))!;
    while (sentenceId !== 's4') {
      for (const i of blankIndexes(sentenceId)) {
        const part = SENTENCES.get(sentenceId)!.parts[i] as Blank;
        await drag(page, tile(page, part.accept[0]!), blankAt(page, i));
        await expect(page.locator(`[data-filled="${i}"]`)).toBeVisible();
      }
      await page.getByRole('button', { name: 'التَّالِي' }).click();
      sentenceId = (await sentenceCard(page).getAttribute('data-sentence'))!;
    }
    const [first, second] = blankIndexes('s4') as [number, number];
    await drag(page, tile(page, 'shadia'), blankAt(page, second)); // either name may take either blank
    await expect(page.locator(`[data-filled="${second}"]`)).toHaveText(WORD_TEXT.get('shadia')!);
    await expect(tile(page, 'shadia')).toHaveCount(0); // gone from the cloud: it can't be placed twice
    await drag(page, tile(page, 'anis'), blankAt(page, first));
    await expect(page.locator(`[data-filled="${first}"]`)).toHaveText(WORD_TEXT.get('anis')!);
    await expect(sentenceCard(page)).toHaveAttribute('data-complete', 'true');
  });

  test('sentence order and chip order are shuffled on every open', async ({ page }) => {
    await openFill(page);
    const seen = new Set<string>();
    for (let open = 0; open < 6; open++) {
      if (open > 0) {
        await page.getByRole('button', { name: 'إِغْلَاق' }).click();
        await page.locator('[data-game-card="fill-blank"]').click();
        await expect(sentenceCard(page)).toBeVisible();
      }
      const first = await sentenceCard(page).getAttribute('data-sentence');
      const chips = await page.locator('[data-tile]').evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.tile));
      expect([...chips].sort()).toEqual(FILL.words.map((w) => w.id).sort());
      seen.add(`${first}|${chips.join(',')}`);
    }
    expect(seen.size, 'every open looked the same').toBeGreaterThan(1);
  });
});

test.describe('unit 2 letter-forms @chromium', () => {
  test.use({ viewport: { width: 1280, height: 620 } });

  test('the chooser shows س and ش; every ش word completes correctly', async ({ page }) => {
    await page.goto('/#/unit/unit-2/letter-forms');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('[data-letter-set]')).toHaveText([/س/, /ش/]);
    await page.locator('[data-letter-set="sheen"]').click();
    await expect(page).toHaveURL(/#\/unit\/unit-2\/letter-forms\/sheen$/);
    await expect(page.locator('[data-tile]')).toHaveCount(4);

    const word = page.locator('[data-word]');
    const next = page.getByRole('button', { name: 'التَّالِي' });
    const restart = page.getByRole('button', { name: 'أَعِدِ اللُّعْبَةَ' });
    const done: string[] = [];
    for (;;) {
      await expect(word.or(restart)).toBeVisible();
      if (await restart.isVisible()) break;
      const id = (await word.getAttribute('data-word'))!;
      const item = ITEMS.get(id)!;
      done.push(id);
      const blanks = item.parts.filter((p) => p.type === 'blank');
      for (const [i, blank] of blanks.entries()) {
        const active = page.locator('[data-blank][data-active="true"]');
        await drag(page, page.locator(`[data-tile="${formName(blank.answer)}"]`), active);
        await expect(page.locator('[data-blank]')).toHaveCount(blanks.length - i - 1);
      }
      await expect(word).toHaveAttribute('data-complete', 'true');
      expect((await word.textContent())!.replaceAll(ZWJ, '').normalize('NFC'), `${id} text`).toBe(item.target.normalize('NFC'));
      await expect(next.or(restart)).toBeVisible();
      if (await restart.isVisible()) break;
      await next.click();
    }
    const sheen = UNIT.letterForms.find((s) => s.id === 'sheen')!;
    expect([...done].sort()).toEqual(sheen.items.map((i) => i.id).sort());
  });

  test('the س set opens too', async ({ page }) => {
    await page.goto('/#/unit/unit-2/letter-forms/seen');
    await expect(page.locator('[data-word]')).toBeVisible();
    await expect(page.locator('[data-tile]')).toHaveCount(4);
  });
});
