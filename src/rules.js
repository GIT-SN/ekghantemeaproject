/* ---------- Rule-based ATS engine ---------- */
const VERBS = 'led built developed designed implemented created optimized improved automated analyzed deployed managed reduced increased launched delivered engineered migrated trained predicted achieved streamlined collaborated architected integrated tested'.split(' ');
const STOP = new Set('with that this have will your from they their about would there which what when where who are and the for you our not can all any has was were been into than then also able must should such more most other some work team role join'.split(' '));
const SECTIONS = { Education: /^\s*(education|academics?)\b/im, Experience: /^\s*(work )?(experience|internships?|employment)\b/im, Skills: /^\s*(technical )?(skills|technologies|tech stack)\b/im, Projects: /^\s*(academic )?projects?\b/im, Summary: /^\s*(summary|objective|profile|about)\b/im };
const FLUFF = /hard.?working|team player|go-getter|results.?oriented|detail.?oriented|self.?motivated|passionate|responsible for/gi;

export function analyze(text, jd = '') {
  const checks = [], lower = text.toLowerCase();
  const add = (cat, name, pts, max, tip) => checks.push({ cat, name, pts, max, tip });
  const sc = (v, target, max) => Math.round(Math.min(v / target, 1) * max);
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const words = (text.match(/\b[\w+#.]+\b/g) || []).length;

  // Contact (15)
  add('Contact', 'Email', /[\w.+-]+@[\w-]+\.[\w.]+/.test(text) ? 5 : 0, 5, 'Add a professional email address.');
  add('Contact', 'Phone', /(\+?\d[\d\s-]{8,}\d)/.test(text) ? 5 : 0, 5, 'Add a phone number.');
  add('Contact', 'LinkedIn/GitHub', /linkedin\.com|github\.com/i.test(text) ? 5 : 0, 5, 'Add LinkedIn and/or GitHub links.');
  // Sections (20)
  for (const [k, re] of Object.entries(SECTIONS)) add('Sections', k + ' section', re.test(text) ? 4 : 0, 4, `Add a clear "${k}" heading (ATS parses by heading).`);
  // Impact (25)
  const bullets = lines.filter(l => /^[-•●▪*·]/.test(l) || l.length > 40);
  const quant = bullets.filter(l => /\d+\s*(%|x|k|\+|users|rows|ms|records|models?|projects?)|\b\d{2,}\b/i.test(l)).length;
  const verbHits = lines.filter(l => VERBS.includes(l.replace(/^[-•●▪*·\s]+/, '').split(/\s+/)[0]?.toLowerCase())).length;
  add('Impact', `Quantified achievements (${quant})`, sc(quant, 5, 15), 15, 'Add numbers: "Improved accuracy by 12%", "processed 200k rows".');
  add('Impact', `Action-verb bullets (${verbHits})`, sc(verbHits, 6, 10), 10, 'Start bullets with verbs like Built, Designed, Optimized.');
  // Format (15)
  const wp = words >= 250 && words <= 900 ? 10 : words < 250 ? sc(words, 250, 8) : 6;
  add('Format', `Length (${words} words)`, wp, 10, 'Aim for 250-900 words (1 page for freshers, 2 max).');
  add('Format', 'Bullet points used', lines.filter(l => /^[-•●▪*·]/.test(l)).length >= 5 ? 5 : 1, 5, 'Use bullet points for scannability.');
  // Language (10)
  const fl = (lower.match(FLUFF) || []).length, fp = (lower.match(/\b(i|my|me)\b/g) || []).length;
  add('Language', `Buzzwords/fluff (${fl})`, fl <= 2 ? 5 : fl <= 4 ? 3 : 0, 5, 'Replace clichés with proof (projects, metrics).');
  add('Language', `First-person pronouns (${fp})`, fp <= 2 ? 5 : fp <= 6 ? 3 : 0, 5, 'Avoid "I/my"; write in implied first person.');
  // Keywords (15)
  let missing = [];
  if (jd.trim().length > 40) {
    const freq = {};
    (jd.toLowerCase().match(/[a-z+#.]{3,}/g) || []).filter(w => !STOP.has(w)).forEach(w => freq[w] = (freq[w] || 0) + 1);
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 25).map(e => e[0]);
    const hit = top.filter(w => lower.includes(w)); missing = top.filter(w => !lower.includes(w));
    add('Keywords', `Job-description match (${hit.length}/${top.length})`, sc(hit.length, top.length * 0.7, 15), 15, 'Add missing JD keywords where truthful.');
  } else {
    const tech = 'python sql java javascript react pandas numpy scikit-learn tensorflow pytorch git docker aws tableau power bi excel statistics machine learning fastapi mongodb'.split(' ').filter(w => lower.includes(w)).length;
    add('Keywords', `Technical keywords (${tech})`, sc(tech, 8, 15), 15, 'List more relevant tools/technologies in Skills.');
  }
  const score = checks.reduce((s, c) => s + c.pts, 0);
  const hard = [];
  if (!checks[0].pts) hard.push('No email found');
  if (words < 120) hard.push('Resume is too short / text not readable by ATS');
  const verdict = hard.length ? 'FAIL' : score >= 75 ? 'PASS' : score >= 55 ? 'BORDERLINE' : 'FAIL';
  return { score, verdict, checks, hard, missing, words };
}

