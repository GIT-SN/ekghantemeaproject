import { readFileSync } from 'node:fs';
import { evaluate, train, predict } from '../src/nb.js';
import { buildCorpus } from '../src/corpus.js';
import { analyze } from '../src/rules.js';
const ev = evaluate(); console.log(`Hold-out accuracy: exact ${(ev.exact * 100).toFixed(1)}%, within ±1 star ${(ev.within1 * 100).toFixed(1)}% (n=${ev.n})`);
const t = readFileSync(new URL('../sample/sample_resume.txt', import.meta.url), 'utf8');
const p = predict(train(buildCorpus(7, 80)), t); console.log('sample_resume.txt ->', p.stars, 'stars | expected', p.expected.toFixed(2), '| rule score', analyze(t).score);
import { detectAI } from '../src/aidetect.js';
const aiText = `Results-driven engineer with a proven track record of leveraging cutting-edge technologies.
- Spearheaded the development of robust data pipelines, resulting in a 30% improvement in efficiency
- Orchestrated cross-functional initiatives with stakeholders, thereby driving innovation across teams
- Leveraged machine learning to deliver actionable insights, ensuring seamless decision making for teams
- Streamlined comprehensive reporting workflows, achieving a 25% reduction in manual processing time
- Fostered collaboration — enabling pivotal results — across a dynamic environment — consistently`;
console.log('AI-style text ->', detectAI(aiText).level, detectAI(aiText).score, '| human sample ->', detectAI(t).level, detectAI(t).score);
