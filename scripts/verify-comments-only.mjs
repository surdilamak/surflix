// Verify that the working copy of every modified tracked file differs from HEAD in COMMENTS ONLY.
// Use it after a bulk comment edit (e.g. translating comments) to prove no code changed.
//   ts/tsx/js/mjs : the AST is re-printed WITHOUT comments (TypeScript printer) and compared
//   css           : compared after stripping /* ... */
//   prisma        : compared after stripping // comments
//   sh/yml/Docker : compared after stripping # comments
//   scripts/curated/*.txt|list : compared after dropping full-line # comments
// Usage (from the repo root):  node scripts/verify-comments-only.mjs      exit code 1 = code changed
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const repo = process.cwd();
const require = createRequire(path.join(repo, 'package.json'));
const ts = require('typescript');

const sh = (c) => execSync(c, { cwd: repo, encoding: 'utf8', maxBuffer: 1 << 28 });
const files = sh('git -c core.fileMode=false diff --name-only').split('\n').filter(Boolean);

const printNoComments = (name, text) => {
  const kind = name.endsWith('x') ? ts.ScriptKind.TSX : name.endsWith('.ts') ? ts.ScriptKind.TS : ts.ScriptKind.JS;
  const sf = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, kind);
  return ts.createPrinter({ removeComments: true }).printFile(sf);
};
const strip = {
  css: (t) => t.replace(/\/\*[\s\S]*?\*\//g, ''),
  prisma: (t) => t.split('\n').map((l) => l.replace(/\s*\/\/.*$/, '')).join('\n'),
  hash: (t) => t.split('\n').filter((l) => !/^\s*#/.test(l)).map((l) => l.replace(/\s+#\s.*$/, '')).join('\n'),
  hashFull: (t) => t.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n'),
};
const norm = (t) => t.replace(/\s+/g, ' ').trim();

let bad = 0, checked = 0, skipped = [];
for (const f of files) {
  const ext = path.extname(f);
  let before;
  try { before = sh(`git show HEAD:"${f}"`); } catch { skipped.push(f + ' (new)'); continue; }
  const after = fs.readFileSync(path.join(repo, f), 'utf8');
  let a, b;
  if (['.ts', '.tsx', '.js', '.mjs'].includes(ext)) { a = printNoComments(f, before); b = printNoComments(f, after); }
  else if (ext === '.css') { a = strip.css(before); b = strip.css(after); }
  else if (ext === '.prisma') { a = strip.prisma(before); b = strip.prisma(after); }
  else if (['.sh', '.yml', '.yaml'].includes(ext) || path.basename(f) === 'Dockerfile') { a = strip.hash(before); b = strip.hash(after); }
  else if (['.txt', '.list'].includes(ext) && f.startsWith('scripts/curated/')) { a = strip.hashFull(before); b = strip.hashFull(after); }
  else { skipped.push(f + ' (not checked: ' + ext + ')'); continue; }
  checked++;
  if (norm(a) !== norm(b)) {
    bad++;
    // locate the first differing region to help debugging
    const x = norm(a), y = norm(b); let i = 0; while (i < x.length && x[i] === y[i]) i++;
    console.log(`CODE CHANGED  ${f}\n   before: ...${x.slice(Math.max(0, i - 40), i + 80)}\n   after : ...${y.slice(Math.max(0, i - 40), i + 80)}`);
  }
}
console.log(`checked ${checked} file(s): ${checked - bad} comment-only, ${bad} with CODE changes. skipped: ${skipped.length}`);
for (const s of skipped) console.log('  skipped', s);
process.exit(bad ? 1 : 0);
