#!/usr/bin/env node
/* toonami-all.mjs — stamps the look onto every page in the yard.

   The five loop generators drop the block in themselves; every other page,
   hand-written or generated, gets it from here, between <!--toonami--> and
   <!--/toonami--> markers, so a second run replaces rather than repeats.
   It writes into files it did not create, which makes it a STAMPER in
   yard.mjs's terms: it runs last, after every generator has emitted, so a
   regenerated page comes back wearing the look.

   The block is style and five empty elements. It adds no script, so a page
   that carried none still carries none and the arcade's count of what runs
   does not move. Pages it leaves alone: the templates (templates/*.html are
   patterns, not pages) and the wallet popup, which is an extension.
       node toonami-all.mjs */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { BLOCK } from './toonami.mjs';

const pages = [...readdirSync('.').filter(f => f.endsWith('.html')).map(f => f),
  ...(existsSync('boards') ? readdirSync('boards').filter(f => f.endsWith('.html')).map(f => 'boards/' + f) : []),
  'ledger/explorer.html', 'grass/play.html'].filter(existsSync);
let stamped = 0, refreshed = 0, charset = 0;
for (const b of pages) {
  let s = readFileSync(b, 'utf8');
  /* a page with no charset is decoded by guesswork, and the guess changes when its first kilobyte does; every deck says utf-8, after its title */
  if (!/<meta[^>]+charset/i.test(s)) { const t = s.indexOf('</title>'); if (t >= 0) { s = s.slice(0, t + 8) + '\n<meta charset="utf-8">' + s.slice(t + 8); charset++; } }
  /* the markers are found AFTER any insertion above: an index taken before an edit is an index into a file that no longer exists */
  const i = s.indexOf('<!--toonami-->'), j = s.indexOf('<!--/toonami-->');
  if (i >= 0 && j > i) { s = s.slice(0, i) + BLOCK + s.slice(j + '<!--/toonami-->'.length); refreshed++; }
  else { const k = s.lastIndexOf('</body>'); s = k >= 0 ? s.slice(0, k) + BLOCK + '\n' + s.slice(k) : s.replace(/\s*$/, '\n') + BLOCK + '\n'; stamped++; }
  writeFileSync(b, s);
}
console.log(`toonami: ${pages.length} pages · ${stamped} stamped, ${refreshed} refreshed · charset added to ${charset}`);
