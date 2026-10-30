// Isolated authoring tool, not a runtime website dependency.
// node scripts/generate_practice_ipa.mjs /path/to/espeak-ng.js
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const { default: create } = await import(pathToFileURL(process.argv[2]).href);
const module = await create();
const worker = new module.eSpeakNGWorker();
worker.set_voice('en-gb');
const source = new URL('../content/practice/ipa-needed.json', import.meta.url);
const target = new URL('../content/practice/ipa-cache.json', import.meta.url);
let cache = {};
try { cache = JSON.parse(await readFile(target, 'utf8')); } catch {}
const needed = JSON.parse(await readFile(source, 'utf8'));
for (const text of needed) {
 const result = worker.synthesize_ipa(text);
 if (result.code !== 0 || !result.ipa.trim()) throw new Error(`IPA generation failed for ${text}`);
 cache[text] = '/' + result.ipa.replaceAll('_', '').replace(/\s+/g, ' ').trim() + '/';
}
await writeFile(target, JSON.stringify(cache, null, 2) + '\n');
module.destroy(worker);
console.log(`Generated ${needed.length} automatic en-GB IPA references; review before publication.`);
