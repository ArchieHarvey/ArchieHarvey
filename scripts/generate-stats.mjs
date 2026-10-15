// Generates assets/stats.svg from public GitHub data. No dependencies (Node 18+).
// Private repos are invisible to the API, so story numbers are curated below.
import { writeFileSync } from 'node:fs';

const USER = process.env.GH_USER || 'ArchieHarvey';
const headers = { 'User-Agent': 'profile-stats', Accept: 'application/vnd.github+json' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
const gh = async (p) => {
  const r = await fetch(`https://api.github.com${p}`, { headers });
  if (!r.ok) throw new Error(`${p} -> ${r.status}`);
  return r.json();
};

const story = [
  ['500K+', 'bot users reached'],
  ['500+', 'servers'],
  ['v4', 'TANDUL rebuild'],
];

const user = await gh(`/users/${USER}`);
const repos = (await gh(`/users/${USER}/repos?per_page=100&type=owner`)).filter((r) => !r.fork);
const stars = repos.reduce((n, r) => n + r.stargazers_count, 0);
const years = Math.max(1, Math.floor((Date.now() - new Date(user.created_at)) / 31557600000));

const langBytes = {};
for (const r of repos) {
  try {
    const l = await gh(`/repos/${USER}/${r.name}/languages`);
    for (const [k, v] of Object.entries(l)) langBytes[k] = (langBytes[k] || 0) + v;
  } catch {}
}
const total = Object.values(langBytes).reduce((a, b) => a + b, 0) || 1;
const langs = Object.entries(langBytes).sort((a, b) => b[1] - a[1]).slice(0, 5)
  .map(([k, v]) => [k, v / total]);
const palette = ['#a78bfa', '#38bdf8', '#f472b6', '#facc15', '#4ade80'];

const live = [
  [years, `years on GitHub`],
  [repos.length, 'public repos'],
  ['8', 'projects in progress'],
];

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const font = "font-family=\"'JetBrains Mono','SF Mono',Consolas,monospace\"";
const tile = (x, y, n, l, c) =>
  `<g transform="translate(${x},${y})"><rect width="150" height="78" rx="12" fill="#101018" stroke="#23233a"/>` +
  `<text x="75" y="38" text-anchor="middle" ${font} font-size="26" font-weight="800" fill="${c}">${esc(n)}</text>` +
  `<text x="75" y="60" text-anchor="middle" ${font} font-size="11" fill="#8a8aa6">${esc(l)}</text></g>`;

let bar = '', legend = '', x = 0;
langs.forEach(([k, f], i) => {
  const w = Math.max(4, f * 440);
  bar += `<rect x="${x}" y="0" width="${w}" height="10" fill="${palette[i]}"/>`;
  x += w;
  legend += `<g transform="translate(${(i % 3) * 150},${Math.floor(i / 3) * 22 + 28})"><circle cx="5" cy="-4" r="5" fill="${palette[i]}"/>` +
    `<text x="16" y="0" ${font} font-size="12" fill="#c4c4d4">${esc(k)} ${(f * 100).toFixed(0)}%</text></g>`;
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="250" viewBox="0 0 1000 250">
<rect width="1000" height="250" rx="18" fill="#0b0b12"/>
<text x="30" y="40" ${font} font-size="13" fill="#a78bfa" letter-spacing="3">THE NUMBERS</text>
${story.map(([n, l], i) => tile(30 + i * 165, 62, n, l, '#38bdf8')).join('')}
${live.map(([n, l], i) => tile(30 + i * 165, 154, n, l, '#a78bfa')).join('')}
<text x="540" y="40" ${font} font-size="13" fill="#a78bfa" letter-spacing="3">TOP LANGUAGES (PUBLIC REPOS)</text>
<g transform="translate(540,62)"><clipPath id="c"><rect width="440" height="10" rx="5"/></clipPath><g clip-path="url(#c)">${bar}</g>${legend}</g>
<text x="540" y="215" ${font} font-size="11" fill="#6b6b85">Most work lives in private repos, so this undersells it.</text>
<text x="970" y="238" text-anchor="end" ${font} font-size="10" fill="#4a4a60">updated ${new Date().toISOString().slice(0, 10)}</text>
</svg>
`;
writeFileSync(new URL('../assets/stats.svg', import.meta.url), svg);
console.log('wrote assets/stats.svg', { repos: repos.length, stars, years, langs });
