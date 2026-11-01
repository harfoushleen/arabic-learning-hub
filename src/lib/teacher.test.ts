import { describe, expect, it } from 'vitest';
import { CODE_LENGTH, checkTeacherCode } from './teacher';

// The real code is not in the repo: it comes from TEACHER_CODE or the git-ignored .env.local.
try {
  process.loadEnvFile('.env.local');
} catch {
  /* no .env.local */
}
const code = process.env.TEACHER_CODE;

describe('teacher code', () => {
  it('rejects wrong, empty, short and non-numeric codes', async () => {
    for (const bad of ['', '1', '0'.repeat(CODE_LENGTH), '1'.repeat(CODE_LENGTH), 'abcdefgh']) {
      expect(await checkTeacherCode(bad)).toBe(false);
    }
  });

  it.skipIf(!code)('accepts the real code', async () => {
    expect(code).toHaveLength(CODE_LENGTH);
    expect(await checkTeacherCode(code!)).toBe(true);
  });

  it.skipIf(!code)('rejects the real code with one digit changed', async () => {
    const off = code!.slice(0, -1) + ((Number(code!.slice(-1)) + 1) % 10);
    expect(await checkTeacherCode(off)).toBe(false);
  });

  it('the repo never contains the code', async () => {
    if (!code) return;
    const { spawnSync } = await import('node:child_process');
    // git grep exits 1 when nothing matches.
    const grep = spawnSync('git', ['grep', '-I', '-l', '-e', code, '--', ':!.env.local'], { encoding: 'utf8' });
    expect(grep.status).toBe(1);
    expect(grep.stdout).toBe('');
  });
});
