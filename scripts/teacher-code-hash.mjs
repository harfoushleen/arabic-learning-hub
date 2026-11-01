// Prints the salt and hash to paste into src/lib/teacher.ts when the teacher code changes.
// The code is read from the environment so it never lands in a file:
//   TEACHER_CODE=<digits> node scripts/teacher-code-hash.mjs
import { pbkdf2Sync, randomBytes } from 'node:crypto';

const ITERATIONS = 600_000; // keep equal to ITERATIONS in src/lib/teacher.ts
const code = process.env.TEACHER_CODE;
if (!/^\d{8}$/.test(code ?? '')) {
  console.error('Set TEACHER_CODE to the 8 digits.');
  process.exit(1);
}
const salt = randomBytes(16);
const hash = pbkdf2Sync(code, salt, ITERATIONS, 32, 'sha256');
console.log(`const SALT = '${salt.toString('hex')}';\nconst HASH = '${hash.toString('hex')}';`);
