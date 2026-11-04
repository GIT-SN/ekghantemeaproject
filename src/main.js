/* ResumeJudge - rule-based ATS engine + Puter AI judge. Backend = Puter.js (loaded globally in index.html). */
import './style.css';
import { analyze } from './rules.js';
import { predictStars } from './nb.js';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
const $ = id => document.getElementById(id);
const status = m => $('status').textContent = m;
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- Text extraction ---------- */
async function pdfToText(buf) {
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let out = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    let line = '', y = null;
    for (const it of tc.items) {            // keep line breaks using y-position
      const ny = it.transform[5];
      if (y !== null && Math.abs(ny - y) > 3) line += '\n';
      line += it.str + ' '; y = ny;
    }
    out += line + '\n';
  }
  if (out.replace(/\s/g, '').length < 80) {  // scanned PDF -> OCR via Puter
    status('Scanned PDF detected, running OCR...'); out = '';
    for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
      const page = await pdf.getPage(i), vp = page.getViewport({ scale: 2 });
      const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height;
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
      out += (await puter.ai.img2txt(c.toDataURL('image/png'))) + '\n';
    }
  }
  return out;
}
async function fileToText(f) {
  return f.name.toLowerCase().endsWith('.pdf') ? pdfToText(await f.arrayBuffer()) : f.text();
}
async function urlToText(url) {            // puter.net.fetch bypasses CORS
  const r = await puter.net.fetch(url);
  const type = r.headers.get('content-type') || '';
  if (type.includes('pdf') || url.toLowerCase().endsWith('.pdf')) return pdfToText(await r.arrayBuffer());
  const raw = await r.text();
  return type.includes('html') ? (new DOMParser().parseFromString(raw, 'text/html').body.innerText) : raw;
}

/* ---------- AI judge (Puter) ---------- */
async function aiJudge(text, jd, rules, model, bench) {
  const prompt = `You are a strict ATS + recruiter. Judge this resume.
Rule-engine score: ${rules.score}/100 (${rules.verdict}).${jd ? '\nJOB DESCRIPTION:\n' + jd.slice(0, 2500) : ''}${bench ? '\nBENCHMARK RESUME (learn what a strong one does):\n' + bench.slice(0, 3500) : ''}
RESUME:\n${text.slice(0, 6000)}
Reply ONLY with JSON: {"verdict":"PASS|FAIL","why_pass":["..."],"why_fail":["..."],"top_fixes":["..."],"rewrites":[{"before":"...","after":"..."}],"vs_benchmark":["..."]}`;
  const r = await puter.ai.chat(prompt, { model });
  const s = typeof r === 'string' ? r : (r?.message?.content?.[0]?.text ?? r?.message?.content ?? String(r));
  const m = s.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : null;
}

/* ---------- Render ---------- */
const list = a => (a?.length ? '<ul>' + a.map(x => `<li>${esc(x)}</li>`).join('') + '</ul>' : '<p>-</p>');
const stars = n => '★'.repeat(n) + '☆'.repeat(5 - n);
function render(r, ai, br, nb) {
  const rows = r.checks.map(c => `<tr><td>${c.cat}</td><td>${esc(c.name)}</td><td class="${c.pts < c.max ? 'low' : 'good'}">${c.pts}/${c.max}</td><td>${c.pts < c.max ? esc(c.tip) : '✓'}</td></tr>`).join('');
  $('out').hidden = false;
  $('out').innerHTML = `<div style="text-align:center"><span class="badge ${r.verdict}">${r.verdict}</span><span class="score">${r.score}/100</span>${br ? `<div>Benchmark resume scored <b>${br.score}</b> (${br.verdict})</div>` : ''}</div>
  ${nb ? `<div style="text-align:center;margin:12px 0"><div style="font-size:2.2rem;color:#f59e0b">${stars(nb.stars)}</div><b>${nb.stars} / 5</b> <small>(expected ${nb.expected.toFixed(1)})</small><br><small>Algorithm: Multinomial Naive Bayes (Laplace smoothing; bag-of-words + ATS feature tokens)</small><div class="bars">${nb.probs.map((p, i) => `<div class="bar"><span>${i + 1}★</span><i style="width:${Math.round(p * 100)}%"></i><em>${Math.round(p * 100)}%</em></div>`).join('')}</div></div>` : ''}
  ${r.hard.length ? `<h3 class="low">Auto-fail triggers</h3>${list(r.hard)}` : ''}
  <h3>Score breakdown</h3><table><tr><th>Area</th><th>Check</th><th>Pts</th><th>Fix</th></tr>${rows}</table>
  ${r.missing.length ? `<h3>Missing JD keywords</h3><p>${r.missing.map(esc).join(', ')}</p>` : ''}
  ${ai ? `<h3 class="good">Why it can pass</h3>${list(ai.why_pass)}<h3 class="low">Why it can fail</h3>${list(ai.why_fail)}<h3>Top fixes</h3>${list(ai.top_fixes)}
  <h3>Suggested rewrites</h3>${(ai.rewrites || []).map(x => `<p><s>${esc(x.before)}</s><br>➜ ${esc(x.after)}</p>`).join('') || '-'}
  ${ai.vs_benchmark?.length ? `<h3>Learned from benchmark</h3>${list(ai.vs_benchmark)}` : ''}` : '<p>(AI feedback unavailable - rule-based result shown)</p>'}
  <button onclick="dl()">Download report</button>`;
  window._report = { rules: r, ai, naiveBayes: nb };
}
window.dl = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(window._report, null, 2)], { type: 'application/json' })); a.download = 'resume-report.json'; a.click(); };

/* ---------- History (puter.kv) + file save (puter.fs) ---------- */
async function loadHist() {
  try {
    const items = (await puter.kv.list('rj:*', true)).map(i => JSON.parse(i.value)).sort((a, b) => b.t - a.t).slice(0, 10);
    if (items.length) $('hist').innerHTML = items.map(i => `<li>${new Date(i.t).toLocaleString()} - ${esc(i.name)} - <b>${i.verdict}</b> (${i.score})</li>`).join('');
  } catch (e) { /* not signed in yet */ }
}

/* ---------- Wire up ---------- */
let currentFile = null;
$('file').onchange = async e => { currentFile = e.target.files[0]; if (!currentFile) return; status('Reading file...'); try { $('text').value = await fileToText(currentFile); status('Loaded ' + currentFile.name); } catch (x) { status('Could not read file: ' + x.message); } };
const drop = $('drop');
['dragover', 'dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.toggle('over', ev === 'dragover'); if (ev === 'drop') { $('file').files = e.dataTransfer.files; $('file').onchange({ target: $('file') }); } }));
$('go').onclick = async () => {
  const text = $('text').value.trim(); if (!text) return status('Upload or paste a resume first.');
  $('go').disabled = true;
  try {
    status('Running ATS checks...'); const jd = $('jd').value;
    const rules = analyze(text, jd); let bench = '', br = null;
    if ($('bench').value.trim()) { status('Fetching benchmark resume...'); try { bench = await urlToText($('bench').value.trim()); br = analyze(bench, jd); } catch (e) { status('Benchmark failed: ' + e.message); } }
    status('Asking AI judge...'); let ai = null;
    try { ai = await aiJudge(text, jd, rules, $('model').value, bench); } catch (e) { console.warn(e); }
    let nb = null; try { nb = await predictStars(text, rules); } catch (e) { console.warn(e); }
    render(rules, ai, br, nb); status('Done.');
    const name = currentFile?.name || 'pasted-resume';
    try {
      if (currentFile) await puter.fs.write('ResumeJudge/' + Date.now() + '-' + name, currentFile, { createMissingParents: true });
      await puter.kv.set('rj:' + Date.now(), JSON.stringify({ t: Date.now(), name, score: rules.score, verdict: rules.verdict })); loadHist();
    } catch (e) { console.warn('save skipped', e); }
  } catch (e) { status('Error: ' + e.message); }
  $('go').disabled = false;
};
loadHist();
