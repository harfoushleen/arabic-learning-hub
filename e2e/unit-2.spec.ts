import { expect, test, type Locator, type Page } from '@playwright/test';
import { getUnit, letterFormItems } from '../src/data/units';
import { formName } from '../src/lib/arabicJoining';
import { VIEWPORTS, expectFits } from './fit';


const UNIT = getUnit('unit-2')!;
const FILL = UNIT.fillBlank!;
const WORD_TEXT = new Map(FILL.words.map((w) => [w.id, w.text]));
const ITEMS = new Map(letterFormItems(UNIT).map((item) => [item.id, item]));
const ZWJ = '‍';

// The worksheet's fixed order, written out so a change to units.ts can't silently change the test too.
const SENTENCE_ORDER = ['s1', 's2', 's3', 's4'];
const CLOUD_ORDER = ['awraquha', 'mishmish', 'ilal-bustan', 'anis', 'shadia', 'shajara', 'akhdar'];

const tile = (page: Page, id: string) => page.locator(`[data-tile="${id}"]`);
const blankAt = (page: Page, key: string) => page.locator(`[data-blank="${key}"]`);
const cloudTiles = (page: Page) => page.locator('[data-cloud] [data-tile]');
const restartButton = (page: Page) => page.getByRole('button', { name: 'أَعِدِ اللُّعْبَةَ' });

/** Every blank in worksheet order, keyed `${sentence id}:${part index}` like the game's data-blank. */
const BLANKS = FILL.sentences.flatMap((s) =>
  s.parts.flatMap((part, i) => (part.type === 'blank' ? [{ key: `${s.id}:${i}`, sentenceId: s.id, part }] : [])),
);
const keyOf = (sentenceId: string, n: number) => BLANKS.filter((b) => b.sentenceId === sentenceId)[n]!.key;

/** The right word for every blank; `reversed` fills an either-order pair the other way round. */
function solution(reversed = false) {
  const plan = new Map<string, string>();
  const taken = new Set<string>();
  for (const b of BLANKS) {
    const candidates = reversed ? [...b.part.accept].reverse() : b.part.accept;
    const id = candidates.find((c) => !taken.has(c))!;
    taken.add(id);
    plan.set(b.key, id);
  }
  return plan;
}

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
    const note = (el: HTMLElement, attr: string) => {
      if (el.getAttribute(attr) === 'true') w.__flags.add(`${attr.slice(5)}:${el.dataset.tile}`);
    };
    new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'attributes') note(r.target as HTMLElement, r.attributeName!);
        // A chip can be mounted already flagged (a wrong chip flying back into the cloud).
        for (const node of r.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          for (const el of [node, ...node.querySelectorAll<HTMLElement>('[data-tile]')]) {
            for (const attr of ['data-wiggle', 'data-shake', 'data-hint']) note(el, attr);
          }
        }
      }
    }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-wiggle', 'data-shake', 'data-hint'] });
  });
}
const clearFlags = (page: Page) => page.evaluate(() => (window as unknown as { __flags: Set<string> }).__flags.clear());
const saw = (page: Page, flag: string, id: string) =>
  page.evaluate((key) => (window as unknown as { __flags: Set<string> }).__flags.has(key), `${flag}:${id}`);
const expectSaw = (page: Page, flag: string, id: string) => expect.poll(() => saw(page, flag, id)).toBe(true);

const SENTENCE_PICTURES = UNIT.sentencePictures;

async function openSentencePicture(page: Page) {
  await page.goto('/#/unit/unit-2/sentence-picture');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[data-row]')).toHaveCount(SENTENCE_PICTURES.length);
}

async function openFill(page: Page) {
  await page.goto('/#/unit/unit-2/fill-blank');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('[data-sentence]')).toHaveCount(4);
  await expect(page.locator('[data-tile]')).toHaveCount(FILL.words.length);
}

/** Drags each word onto its blank, checking the blank shows it. `onFirstDrag` runs in the middle of the first drag. */
async function fillAll(page: Page, plan: ReadonlyMap<string, string>, onFirstDrag?: () => Promise<void>) {
  let first = true;
  for (const [key, id] of plan) {
    await drag(page, tile(page, id), blankAt(page, key), first ? onFirstDrag : undefined);
    first = false;
    await expect(blankAt(page, key)).toHaveAttribute('data-filled-word', id);
  }
}

/** Each completed sentence reads as the worksheet has it: the text plus every blank's fill. */
async function expectSentencesRead(page: Page, plan: ReadonlyMap<string, string>) {
  for (const sentence of FILL.sentences) {
    const expected = sentence.parts
      .map((p, i) => {
        if (p.type === 'text') return p.value;
        const id = plan.get(`${sentence.id}:${i}`)!;
        return p.fill ?? WORD_TEXT.get(id)!;
      })
      .join('');
    const text = await page.locator(`[data-sentence="${sentence.id}"] [data-sentence-text]`).textContent();
    expect(text!.normalize('NFC'), `${sentence.id} sentence`).toBe(expected.normalize('NFC'));
  }
}

/** Sentence text stays inside its card, every blank inside its card, and the cloud's chips inside the cloud. */
async function expectContained(page: Page, state: string) {
  const m = await page.evaluate(() => {
    const issues: string[] = [];
    for (const card of document.querySelectorAll<HTMLElement>('[data-sentence]')) {
      const c = card.getBoundingClientRect();
      const t = card.querySelector('[data-sentence-text]')!.getBoundingClientRect();
      if (t.top < c.top - 0.5 || t.bottom > c.bottom + 0.5) issues.push(`${card.dataset.sentence} text pokes out of its card`);
      for (const b of card.querySelectorAll<HTMLElement>('[data-blank]')) {
        const r = b.getBoundingClientRect();
        if (r.left < c.left - 0.5 || r.right > c.right + 0.5 || r.top < c.top - 0.5 || r.bottom > c.bottom + 0.5) {
          issues.push(`${b.dataset.blank} pokes out of its card`);
        }
      }
    }
    const cloud = document.querySelector<HTMLElement>('[data-cloud]')!.getBoundingClientRect();
    for (const el of document.querySelectorAll<HTMLElement>('[data-cloud] [data-tile]')) {
      const r = el.getBoundingClientRect();
      if (r.left < cloud.left - 0.5 || r.right > cloud.right + 0.5 || r.top < cloud.top - 0.5 || r.bottom > cloud.bottom + 0.5) {
        issues.push(`chip ${el.dataset.tile} outside the cloud`);
      }
    }
    return issues;
  });
  expect(m, `${state}: layout`).toEqual([]);
}

test.describe('unit 2 shell @chromium', () => {
  test.use({ viewport: { width: 1280, height: 620 } });

  test('home shows 2 unit cards; Unit 2 shows its story and its 4 playable game cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-unit-card]')).toHaveCount(2);
    await page.locator('[data-unit-card="unit-2"]').click();
    await expect(page).toHaveURL(/#\/unit\/unit-2$/);
    await expect(page.locator('[data-unit-story]')).toHaveText('فِي البُسْتَانِ');
    await expect(page.locator('[data-game-card]')).toHaveCount(4);
    const ids = await page.locator('[data-game-card]').evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.gameCard));
    expect(ids).toEqual(['word-picture', 'sentence-picture', 'letter-forms', 'fill-blank']);

    // Every game has content now: none is a "coming soon" card.
    for (const id of ids) {
      await expect(page.locator(`[data-game-card="${id}"]`)).toHaveAttribute('data-soon', 'false');
      await expect(page.locator(`[data-game-card="${id}"]`)).toBeEnabled();
    }

    // The fill-blank card previews its first sentence with a dashed blank and a floating word.
    const preview = page.locator('[data-game-card="fill-blank"] [data-fill-blank-preview]');
    await expect(preview).toBeVisible();
    await expect(preview).toContainText('سَارَ أَنِيس وَشَادْيَا');
    await expect(preview).toContainText('إِلَى البُسْتَان');
  });

  test('a deep link to an unknown game goes home', async ({ page }) => {
    await page.goto('/#/unit/unit-2/no-such-game');
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
      const at = async (state: string) => {
        await page.waitForTimeout(700); // let pop and shake animations finish
        await expectFits(page, state, false);
        if (state !== 'final screen') await expectContained(page, state);
      };
      await at('start');

      // A wrong drop is rejected on the spot.
      const plan = [...solution()];
      const [firstKey, firstId] = plan[0]!;
      const wrongId = CLOUD_ORDER.find((id) => id !== firstId)!;
      await drag(page, tile(page, wrongId), blankAt(page, firstKey));
      await expect(blankAt(page, firstKey)).toHaveAttribute('data-state', 'empty');
      await at('after a wrong drop');

      let n = 0;
      for (const [key, id] of plan.slice(0, -1)) {
        await drag(page, tile(page, id), blankAt(page, key), n++ === 0 ? () => expectFits(page, 'mid-drag', false) : undefined);
        await expect(blankAt(page, key)).toHaveAttribute('data-filled-word', id);
        if (n === 3) await at('half filled');
      }
      await at('one blank left');
      const [lastKey, lastId] = plan.at(-1)!;
      await drag(page, tile(page, lastId), blankAt(page, lastKey));
      await expectFits(page, 'all filled', false); // the green sentences, just before the final screen
      await expect(restartButton(page)).toBeVisible();
      await at('final screen');
    });

    test('sentence-picture fits without scrolling, before and after matching', async ({ page }) => {
      await openSentencePicture(page);
      await page.waitForTimeout(300);
      await expectFits(page, 'start', false);
      const [first, ...rest] = SENTENCE_PICTURES;
      await drag(page, page.locator(`[data-sentence="${first!.id}"]`), page.locator(`[data-picture="${first!.id}"]`), () => expectFits(page, 'mid-drag', false));
      await expect(page.locator(`[data-picture="${first!.id}"]`)).toHaveAttribute('data-matched', 'true');
      await page.waitForTimeout(700);
      await expectFits(page, 'one matched', false);
      for (const item of rest) {
        await drag(page, page.locator(`[data-sentence="${item.id}"]`), page.locator(`[data-picture="${item.id}"]`));
      }
      await expect(restartButton(page)).toBeVisible();
      await expectFits(page, 'final screen', false);
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

    test('tap, elsewhere, wrong (rejected at once, hint on the second) and right drops', async ({ page }) => {
      await openFill(page);
      await recordFlags(page);
      const [k1, k2] = [keyOf('s1', 0), keyOf('s2', 0)];
      const [right1, right2] = [solution().get(k1)!, solution().get(k2)!];
      const slot = (id: string) => page.locator(`[data-slot="${id}"]`);
      const homes = Object.fromEntries(await Promise.all(CLOUD_ORDER.map(async (id) => [id, await slot(id).boundingBox()] as const)));
      const wrong = tile(page, right2); // belongs to sentence 2, so it is wrong for sentence 1
      const blank = blankAt(page, k1);
      const filled = page.locator('[data-state="filled"]');

      // A tap never places a word; it wiggles.
      await wrong.click();
      await expectSaw(page, 'wiggle', right2);
      await expect(filled).toHaveCount(0);

      // Dropped elsewhere (the header strip): the chip returns and it doesn't count.
      await drag(page, wrong, { x: viewport.width / 2, y: 40 });
      await expect(wrong).not.toHaveClass(/opacity-30/);
      await page.waitForTimeout(300); // a shake would have started by now
      expect(await saw(page, 'shake', right2)).toBe(false);

      // A wrong word is rejected right away: it glides back, shakes, and the blank stays empty. No hint yet.
      await drag(page, wrong, blank);
      await expectSaw(page, 'shake', right2);
      await expect(wrong).toHaveAttribute('data-shake', 'false');
      await expect(wrong).not.toHaveClass(/opacity-30/);
      expect(await wrong.boundingBox()).toEqual(homes[right2]); // back exactly where it started
      await expect(blank).toHaveAttribute('data-state', 'empty');
      await expect(filled).toHaveCount(0);
      expect(await saw(page, 'hint', right1)).toBe(false);

      // The second wrong word on the same blank: the right word pulses.
      await clearFlags(page);
      await drag(page, wrong, blank);
      await expectSaw(page, 'hint', right1);
      await expectSaw(page, 'shake', right2);
      await expect(wrong).toHaveAttribute('data-shake', 'false');
      await expect(blank).toHaveAttribute('data-state', 'empty');

      // The right word snaps in and stays; its cloud slot keeps its place as an empty ghost.
      await drag(page, tile(page, right1), blank);
      await expect(blank).toHaveAttribute('data-state', 'filled');
      await expect(blank).toHaveText(shownFor(k1, right1));
      await expect(tile(page, right1)).toHaveCount(0);
      for (const id of CLOUD_ORDER) expect(await slot(id).boundingBox(), `${id} slot`).toEqual(homes[id]);

      // A filled blank takes nothing more: the word comes back and shakes.
      await clearFlags(page);
      await drag(page, wrong, blank);
      await expectSaw(page, 'shake', right2);
      await expect(wrong).toHaveAttribute('data-shake', 'false');
      await expect(blank).toHaveAttribute('data-filled-word', right1);

      // And the right word for another blank goes in there.
      await drag(page, wrong, blankAt(page, k2));
      await expect(blankAt(page, k2)).toHaveAttribute('data-filled-word', right2);
      await expect(page.locator('[data-tile]')).toHaveCount(FILL.words.length - 2);
    });
  });
}

/** The text a blank shows once filled: its `fill`, else the word's own text. */
function shownFor(key: string, wordId: string) {
  return BLANKS.find((b) => b.key === key)!.part.fill ?? WORD_TEXT.get(wordId)!;
}

test.describe('unit 2 sentence-picture @chromium', () => {
  test.use({ viewport: { width: 1280, height: 620 } });

  test('the 4 story sentences and scenes match by drag; a wrong pair is refused; rows never line up', async ({ page }) => {
    // Open it from the unit screen, like a child would.
    await page.goto('/#/unit/unit-2');
    await page.locator('[data-game-card="sentence-picture"]').click();
    await expect(page.locator('[data-row]')).toHaveCount(SENTENCE_PICTURES.length);

    const rows = await page.locator('[data-row]').evaluateAll((els) =>
      els.map((el) => [(el as HTMLElement).dataset.rowSentence, (el as HTMLElement).dataset.rowPicture]),
    );
    expect(rows.every(([s, p]) => s !== p), 'a row holds a matching pair').toBe(true);
    expect(rows.map(([s]) => s).sort()).toEqual(SENTENCE_PICTURES.map((s) => s.id));
    const shown = await page.locator('[data-sentence]').evaluateAll((els) => els.map((el) => el.textContent));
    expect(shown.map((t) => t!.normalize('NFC')).sort()).toEqual(SENTENCE_PICTURES.map((s) => s.sentence.normalize('NFC')).sort());

    // A wrong pair is refused: no line, nothing matched.
    const [a, b] = SENTENCE_PICTURES;
    await drag(page, page.locator(`[data-sentence="${a!.id}"]`), page.locator(`[data-picture="${b!.id}"]`));
    await expect(page.locator('[data-line]')).toHaveCount(0);
    await expect(page.locator(`[data-picture="${b!.id}"]`)).toHaveAttribute('data-shake', 'false'); // done shaking

    for (const item of SENTENCE_PICTURES) {
      await drag(page, page.locator(`[data-picture="${item.id}"]`), page.locator(`[data-sentence="${item.id}"]`)); // pictures drag too
    }
    await expect(restartButton(page)).toBeVisible();
    await expect(page.getByRole('img', { name: '2 / 3' })).toBeVisible(); // one of 4 wrong on the first try
  });
});

test.describe('fill-blank rules @chromium', () => {
  test.use({ viewport: { width: 1280, height: 620 } });

  test('all 4 sentences are visible at once, numbered, in the worksheet order; so are the cloud words', async ({ page }) => {
    await openFill(page);
    const attrs = (selector: string, attr: string) =>
      page.locator(selector).evaluateAll((els, a) => els.map((el) => (el as HTMLElement).getAttribute(a)), attr);
    expect(await attrs('[data-sentence]', 'data-sentence')).toEqual(SENTENCE_ORDER);
    expect(await page.locator('[data-number]').allTextContents()).toEqual(['١', '٢', '٣', '٤']);
    expect(await attrs('[data-cloud] [data-tile]', 'data-tile')).toEqual(CLOUD_ORDER);
    expect(await cloudTiles(page).allTextContents()).toEqual(CLOUD_ORDER.map((id) => WORD_TEXT.get(id)));
    for (const sentence of FILL.sentences) {
      const text = sentence.parts.map((p) => (p.type === 'text' ? p.value : '')).join('');
      const shown = await page.locator(`[data-sentence="${sentence.id}"] [data-sentence-text]`).textContent();
      expect(shown!.normalize('NFC')).toBe(text.normalize('NFC'));
    }
    await expect(page.locator('[data-blank][data-state="empty"]')).toHaveCount(7);
    for (const id of SENTENCE_ORDER) await expect(page.locator(`[data-sentence="${id}"]`)).toBeVisible();

    // Opening it again changes nothing: the order is the worksheet's.
    for (let open = 0; open < 2; open++) {
      await page.getByRole('button', { name: 'إِغْلَاق' }).click();
      await page.locator('[data-game-card="fill-blank"]').click();
      await expect(page.locator('[data-sentence]')).toHaveCount(4);
      expect(await attrs('[data-sentence]', 'data-sentence')).toEqual(SENTENCE_ORDER);
      expect(await attrs('[data-cloud] [data-tile]', 'data-tile')).toEqual(CLOUD_ORDER);
    }
  });

  test('every word is rejected on every blank it does not fit, in any sentence', async ({ page }) => {
    await openFill(page);
    await recordFlags(page);
    const right = solution();
    // Each blank gets one wrong word (the right word of the previous blank); none of them stick.
    for (const [i, b] of BLANKS.entries()) {
      const other = right.get(BLANKS[(i + 1) % BLANKS.length]!.key)!;
      if (b.part.accept.includes(other)) continue; // the two names fit each other's blanks
      await drag(page, tile(page, other), blankAt(page, b.key));
      await expect(blankAt(page, b.key)).toHaveAttribute('data-state', 'empty');
      await expectSaw(page, 'shake', other);
      await expect(tile(page, other)).toHaveAttribute('data-shake', 'false'); // done shaking: the next drag is allowed
    }
    await expect(page.locator('[data-state="filled"]')).toHaveCount(0);
    await expect(page.locator('[data-tile]')).toHaveCount(FILL.words.length);
  });

  test('finishing the last blank ends the game: 3 stars with no mistakes, 2 with a mistake; a replay starts over in the same order', async ({ page }) => {
    await openFill(page);
    const natural = solution();
    const entries = [...natural];
    await fillAll(page, new Map(entries.slice(0, -1)));
    await expect(restartButton(page)).toHaveCount(0); // not done yet
    const [lastKey, lastId] = entries.at(-1)!;
    await drag(page, tile(page, lastId), blankAt(page, lastKey));
    await expect(page.locator('[data-sentence][data-complete="true"]')).toHaveCount(4);
    await expectSentencesRead(page, natural);
    await expect(restartButton(page)).toBeVisible();
    await expect(page.getByRole('img', { name: '3 / 3' })).toBeVisible();

    await restartButton(page).click();
    await expect(page.locator('[data-sentence]')).toHaveCount(4);
    expect(await cloudTiles(page).evaluateAll((els) => els.map((el) => (el as HTMLElement).dataset.tile))).toEqual(CLOUD_ORDER);
    await expect(page.locator('[data-blank][data-state="empty"]')).toHaveCount(7);

    // One mistake on the replay costs the third star.
    await recordFlags(page);
    const [firstKey, firstId] = entries[0]!;
    const wrongId = CLOUD_ORDER.find((id) => id !== firstId)!;
    await drag(page, tile(page, wrongId), blankAt(page, firstKey));
    await expectSaw(page, 'shake', wrongId);
    await expect(tile(page, wrongId)).toHaveAttribute('data-shake', 'false');
    await expect(blankAt(page, firstKey)).toHaveAttribute('data-state', 'empty');
    await fillAll(page, natural);
    await expect(restartButton(page)).toBeVisible();
    await expect(page.getByRole('img', { name: '2 / 3' })).toBeVisible();
  });

  test('the two names fill sentence 4 in either order', async ({ page }) => {
    await openFill(page);
    const reversed = solution(true);
    const [n1, n2] = [keyOf('s4', 0), keyOf('s4', 1)];
    expect([reversed.get(n1), reversed.get(n2)]).toEqual(['shadia', 'anis']);
    await fillAll(page, reversed);
    await expect(restartButton(page)).toBeVisible();
    await expect(page.getByRole('img', { name: '3 / 3' })).toBeVisible();
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
