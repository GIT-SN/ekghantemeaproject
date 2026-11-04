/* Multinomial Naive Bayes star-rating classifier (1-5), trained in the browser.
   Features: (a) bag-of-words from the resume, (b) ATS feature tokens from the rule engine (weighted x3).
   P(star | resume) ∝ P(star) * Π P(token | star), Laplace (add-1) smoothing, log-space. */
import { analyze } from './rules.js';
import { buildCorpus } from './corpus.js';
const FW = 3, K = [1, 2, 3, 4, 5];
const words = t => t.toLowerCase().match(/[a-z][a-z+#.]{2,}/g) || [];
export function tokens(text, rules) {
  const f = rules.checks.map(c => `f_${c.cat}_${c.name.replace(/\s*\(.*\)/, '').replace(/\W+/g, '')}_L${Math.round(c.pts / c.max * 4)}`);
  const out = words(text); for (let i = 0; i < FW; i++) out.push(...f); return out;
}
export function train(docs) {
  const m = { count: K.map(() => ({})), total: K.map(() => 0), docs: K.map(() => 0), vocab: new Set(), n: docs.length };
  for (const d of docs) {
    const k = d.stars - 1; m.docs[k]++;
    for (const t of tokens(d.text, d.rules || analyze(d.text))) { m.count[k][t] = (m.count[k][t] || 0) + 1; m.total[k]++; m.vocab.add(t); }
  }
  return m;
}
export function predict(m, text, rules = analyze(text)) {
  const toks = tokens(text, rules).filter(t => m.vocab.has(t)), V = m.vocab.size;
  const T = Math.max(1, toks.length / 30);            // temperature: NB is over-confident on long texts
  const lp = K.map((_, k) => (Math.log((m.docs[k] + 1) / (m.n + 5)) + toks.reduce((s, t) => s + Math.log(((m.count[k][t] || 0) + 1) / (m.total[k] + V)), 0)) / T);
  const mx = Math.max(...lp), e = lp.map(x => Math.exp(x - mx)), z = e.reduce((a, b) => a + b, 0);
  const probs = e.map(x => x / z);
  return { stars: K[probs.indexOf(Math.max(...probs))], probs, expected: probs.reduce((s, p, i) => s + p * (i + 1), 0), algorithm: 'Multinomial Naive Bayes' };
}
export function evaluate(seed = 99, perClass = 60) {   // hold-out accuracy on fresh synthetic resumes
  const m = train(buildCorpus(7, 80)), test = buildCorpus(seed, perClass);
  let exact = 0, within1 = 0;
  for (const d of test) { const s = predict(m, d.text, d.rules).stars; exact += s === d.stars; within1 += Math.abs(s - d.stars) <= 1; }
  return { exact: exact / test.length, within1: within1 / test.length, n: test.length };
}
let model;
export async function predictStars(text, rules) {
  if (!model) {
    let docs = buildCorpus(7, 80);
    try { const r = await fetch('/training.json'); if (r.ok && (r.headers.get('content-type') || '').includes('json')) docs = docs.concat((await r.json()).map(d => ({ ...d, rules: analyze(d.text) }))); } catch { /* optional */ }
    model = train(docs);
  }
  return predict(model, text, rules);
}
