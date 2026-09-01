#!/usr/bin/env node
/* build.mjs — export the standalone page into the yard.

   Same thing the Workshop tab's "Export" button does, without a browser:
   play.html with engine.js, def.json and ui.js inlined, written to
   ../grass.html, where arcade.mjs will find it and give it a cabinet.

       node grass/build.mjs
*/
import { readFileSync, writeFileSync } from 'node:fs';
import './engine.js';
const here = (f) => new URL(f, import.meta.url);
const files = Object.fromEntries(['play.html', 'engine.js', 'ui.js'].map(f => [f, readFileSync(here(f), 'utf8')]));
const def = JSON.parse(readFileSync(here('def.json'), 'utf8'));
const html = globalThis.Tick.assemble(files, def, {
  footer: '<footer class="yard"><a href="arcade.html">← the arcade</a> · <a href="index.html">the yard</a> · <a href="grass/play.html">the workshop</a></footer>',
});
writeFileSync(here('../grass.html'), html);
console.log(`wrote grass.html (${html.length} bytes) from def.json with ${def.machines.length} things, ${def.sectors.length} chapters, ${def.research.length} sayings`);
