// Converts public/images/unit-3/*.gif to animated WebP (<id>.webp) + a static still (<id>-still.webp), ≤ 400 KB each.
// Original GIFs are deleted after a successful conversion. Run: node scripts/convert-unit3.mjs
import { readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
sharp.cache(false);

const DIR = 'public/images/unit-3';
const MAX = 400 * 1024;
const STILL_FRAME = { rawat: 4, mawja: 15, dhahab: 5 }; // everything else: frame 0

const ATTEMPTS = [
  { scale: 1, step: 1, q: 75 }, { scale: 1, step: 1, q: 55 },
  { scale: 1, step: 2, q: 60 }, { scale: 0.8, step: 2, q: 55 },
  { scale: 0.7, step: 3, q: 50 }, { scale: 0.55, step: 3, q: 45 },
  { scale: 0.45, step: 4, q: 40 }, { scale: 0.35, step: 5, q: 35 }, { scale: 0.3, step: 8, q: 30 },
];

for (const file of readdirSync(DIR).filter((f) => f.endsWith('.gif'))) {
  const id = file.slice(0, -4);
  const path = join(DIR, file);
  const src = readFileSync(path); // a buffer, so Windows doesn't keep the GIF locked
  const meta = await sharp(src, { animated: true }).metadata();
  const frames = meta.pages ?? 1;
  const delays = meta.delay ?? Array(frames).fill(100);
  const w0 = meta.width, h0 = meta.pageHeight ?? meta.height;

  const still = Math.min(STILL_FRAME[id] ?? 0, frames - 1);
  writeFileSync(join(DIR, `${id}-still.webp`), await sharp(src, { page: still }).webp({ quality: 80 }).toBuffer());

  let done = null;
  for (const a of ATTEMPTS) {
    const w = Math.round(w0 * a.scale), h = Math.round(h0 * a.scale);
    const keep = []; // frame indices, with merged delays
    for (let i = 0; i < frames; i += a.step) keep.push(i);
    const bufs = [], outDelay = [];
    for (const i of keep) {
      bufs.push(await sharp(src, { page: i }).resize(w, h).ensureAlpha().raw().toBuffer());
      let d = 0;
      for (let j = i; j < Math.min(i + a.step, frames); j++) d += Math.max(delays[j] ?? 100, 20);
      outDelay.push(d);
    }
    const out = await sharp(Buffer.concat(bufs), { raw: { width: w, height: h * keep.length, channels: 4, pageHeight: h } })
      .webp({ quality: a.q, effort: 4, loop: 0, delay: outDelay }).toBuffer();
    if (out.length <= MAX || a === ATTEMPTS.at(-1)) { done = { out, a, kept: keep.length, w, h }; break; }
  }
  writeFileSync(join(DIR, `${id}.webp`), done.out);
  unlinkSync(path);
  const changed = done.a.scale !== 1 || done.a.step !== 1;
  console.log(`${id}: ${frames}f ${w0}x${h0} -> ${done.kept}f ${done.w}x${done.h} ${Math.round(done.out.length / 1024)}KB${changed ? '  ** REDUCED' : ''}${done.out.length > MAX ? '  ** OVER 400KB' : ''}`);
}
