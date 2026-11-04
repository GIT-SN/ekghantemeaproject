/* Heuristic detector for AI-written resumes (client-side). Signals: stock LLM phrases,
   uniform bullet length ("low burstiness"), formulaic "..., resulting in ..." bullets, em-dashes.
   NOT proof: use as a warning only. */
const PHRASES = ['spearheaded', 'leveraged', 'leveraging', 'orchestrated', 'proven track record', 'passionate about', 'results-driven', 'cutting-edge', 'seamlessly', 'robust', 'fostering', 'synergy', 'driving innovation', 'demonstrated ability', 'meticulous', 'adept at', 'thrive in', 'dynamic environment', 'innovative solutions', 'strategic initiatives', 'cross-functional', 'stakeholders', 'delve', 'testament', 'pivotal', 'holistic', 'comprehensive', 'streamlining', 'actionable insights'];
export function detectAI(text) {
  const lower = text.toLowerCase(), signals = []; let score = 0;
  const hits = PHRASES.filter(p => lower.includes(p));
  score += Math.min(hits.length / 8, 1) * 45;
  if (hits.length >= 3) signals.push(`Stock AI-style phrases (${hits.length}): ${hits.slice(0, 6).join(', ')}`);
  const bl = text.split('\n').map(l => l.trim()).filter(l => /^[-•●▪*·]/.test(l)).map(l => l.replace(/^[-•●▪*·\s]+/, ''));
  if (bl.length >= 5) {
    const w = bl.map(l => l.split(/\s+/).length), m = w.reduce((a, b) => a + b) / w.length;
    const cv = Math.sqrt(w.reduce((a, b) => a + (b - m) ** 2, 0) / w.length) / m;
    if (cv < 0.22) { score += 25; signals.push(`Bullets are unnaturally uniform in length (variation ${cv.toFixed(2)})`); }
    const pat = bl.filter(l => /\b(resulting in|leading to|thereby|ensuring|achieving|driving|enabling)\b/i.test(l)).length;
    if (pat / bl.length > 0.4) { score += 20; signals.push(`${pat}/${bl.length} bullets follow the same "action, resulting in X" formula`); }
  }
  const dashes = (text.match(/—/g) || []).length;
  if (dashes >= 3) { score += 10; signals.push(`${dashes} em-dashes (—), common in chatbot text`); }
  score = Math.min(100, Math.round(score));
  return { score, level: score >= 60 ? 'HIGH' : score >= 35 ? 'MEDIUM' : 'LOW', signals };
}
