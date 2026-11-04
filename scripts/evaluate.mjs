import { readFileSync } from 'node:fs';
import { evaluate, train, predict } from '../src/nb.js';
import { buildCorpus } from '../src/corpus.js';
import { analyze } from '../src/rules.js';
const ev = evaluate(); console.log(`Hold-out accuracy: exact ${(ev.exact * 100).toFixed(1)}%, within ±1 star ${(ev.within1 * 100).toFixed(1)}% (n=${ev.n})`);
const t = readFileSync(new URL('../sample/sample_resume.txt', import.meta.url), 'utf8');
const p = predict(train(buildCorpus(7, 80)), t); console.log('sample_resume.txt ->', p.stars, 'stars | expected', p.expected.toFixed(2), '| rule score', analyze(t).score);
