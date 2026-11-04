// Exports the synthetic corpus (+ optional public/training.json) to CSV for the Python/scikit-learn pipeline.
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { buildCorpus } from '../src/corpus.js';
import { tokens } from '../src/nb.js';
import { analyze } from '../src/rules.js';
const q = s => '"' + String(s).replace(/"/g, '""') + '"';
const toCsv = docs => 'stars,text,tokens\n' + docs.map(d => [d.stars, q(d.text), q(tokens(d.text, d.rules).join(' '))].join(',')).join('\n') + '\n';
let train = buildCorpus(7, 80);
const extra = new URL('../public/training.json', import.meta.url);
if (existsSync(extra)) train = train.concat(JSON.parse(readFileSync(extra, 'utf8')).map(d => ({ ...d, rules: analyze(d.text) })));
const out = n => new URL('../ml/data/' + n, import.meta.url);
writeFileSync(out('train.csv'), toCsv(train));
writeFileSync(out('test.csv'), toCsv(buildCorpus(99, 60)));
console.log(`train.csv: ${train.length} rows, test.csv: 300 rows`);
