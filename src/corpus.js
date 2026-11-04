/* Builds a labelled training corpus (1-5 stars). Seeded => reproducible.
   Real labelled resumes can be added in public/training.json: [{"text":"...","stars":4}] */
import { analyze } from './rules.js';
const GOOD = ['Built a churn prediction model with scikit-learn reaching 87% accuracy on 12000 records', 'Developed 15 FastAPI endpoints with JWT auth, reducing manual effort by 40%', 'Optimized SQL queries cutting report time by 60%', 'Deployed Streamlit dashboard used by 200+ users', 'Automated ETL pipeline processing 50k rows daily with pandas', 'Designed REST APIs and migrated 3 services to Docker', 'Analyzed 100k+ sales records and improved forecast accuracy by 12%', 'Implemented role-based access control for 4 user roles', 'Reduced model training time by 35% using feature selection', 'Engineered 20 features that increased recall by 9%'];
const WEAK = ['Responsible for working on various tasks', 'Worked on a project in college', 'Helped the team with different things', 'Did coding and testing', 'Involved in learning new technologies', 'Hard working team player, passionate about learning', 'I am a self-motivated and detail-oriented person', 'My responsibilities included many things', 'I worked on some projects'];
const SKILLS = ['Python', 'SQL', 'pandas', 'NumPy', 'scikit-learn', 'TensorFlow', 'Git', 'Docker', 'React', 'FastAPI', 'MongoDB', 'Tableau', 'Excel', 'statistics', 'machine learning', 'PyTorch', 'AWS'];
const HEADS = ['SUMMARY', 'EDUCATION', 'EXPERIENCE', 'SKILLS', 'PROJECTS'];
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const pick = (r, a) => a[Math.floor(r() * a.length)];

export function synth(stars, r) {
  const p = (stars - 1) / 4, L = ['Candidate Name'];
  if (r() < 0.15 + 0.85 * p) L.push('person@example.com');
  if (r() < 0.15 + 0.85 * p) L.push('+91 98765 43210');
  if (r() < p * 1.1) L.push('linkedin.com/in/person | github.com/person');
  for (const h of HEADS) {
    if (r() > 0.15 + 0.8 * p) continue;
    L.push(h);
    if (h === 'SKILLS') L.push(Array.from({ length: Math.round(1 + p * 11 * (0.7 + r() * 0.5)) }, () => pick(r, SKILLS)).join(', '));
    else if (h === 'EDUCATION') L.push('B.Tech Computer Science, Engineering College');
    else {
      const g = Math.round(p * 3 * (0.6 + r() * 0.8)), w = Math.round((1 - p) * 2 * (0.5 + r()));
      for (let i = 0; i < g; i++) L.push('- ' + pick(r, GOOD));
      for (let i = 0; i < w; i++) L.push('- ' + pick(r, WEAK));
    }
  }
  return L.join('\n');
}
export function buildCorpus(seed = 7, perClass = 80) {
  const r = rng(seed), docs = [];
  for (let s = 1; s <= 5; s++) for (let i = 0; i < perClass; i++) { const text = synth(s, r); docs.push({ text, stars: s, rules: analyze(text) }); }
  return docs;
}
