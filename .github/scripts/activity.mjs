// Builds assets/activity.svg from the GitHub GraphQL API.
// Runs daily in .github/workflows/profile-activity.yml. No dependencies.
//
//   GITHUB_TOKEN=... LOGIN=raisulsohan node .github/scripts/activity.mjs
//   ACTIVITY_DATA=data.json node .github/scripts/activity.mjs   (offline, saved API response)
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadAtlas, createType, svgDoc, r1 } from './svgkit.mjs';
import { C, frame, BASE_CSS } from './design.mjs';

const here = p => fileURLToPath(new URL(p, import.meta.url));
const OUT_FILE = here('../../assets/activity.svg');
const LOGIN = process.env.LOGIN || 'raisulsohan';

const QUERY = `query($login: String!) {
  user(login: $login) {
    repositories(ownerAffiliations: OWNER, isFork: false, first: 100, privacy: PUBLIC) {
      totalCount
      nodes { stargazerCount languages(first: 10, orderBy: {field: SIZE, direction: DESC}) { edges { size node { name color } } } }
    }
    contributionsCollection {
      contributionCalendar { totalContributions weeks { contributionDays { contributionCount date } } }
    }
  }
}`;

async function loadData() {
  if (process.env.ACTIVITY_DATA) return JSON.parse(fs.readFileSync(process.env.ACTIVITY_DATA, 'utf8'));
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is not set');
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'profile-activity-card' },
    body: JSON.stringify({ query: QUERY, variables: { login: LOGIN } }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(`GitHub API error: ${JSON.stringify(json.errors || json)}`);
  return json;
}

const compact = n => (n >= 10000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Monotone cubic through points (no overshoot below the baseline).
function smoothPath(pts) {
  const n = pts.length;
  if (n < 2) return '';
  const dx = [], m = [];
  for (let i = 0; i < n - 1; i++) { dx.push(pts[i + 1][0] - pts[i][0]); m.push((pts[i + 1][1] - pts[i][1]) / dx[i]); }
  const t = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], h = a * a + b * b;
    if (h > 9) { const k = 3 / Math.sqrt(h); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${r1(pts[i][0] + h)} ${r1(pts[i][1] + t[i] * h)} ${r1(pts[i + 1][0] - h)} ${r1(pts[i + 1][1] - t[i + 1] * h)} ${r1(pts[i + 1][0])} ${r1(pts[i + 1][1])}`;
  }
  return d;
}

function render(data, T, now = new Date()) {
  const user = data.data.user;
  const repos = user.repositories;
  const calendar = user.contributionsCollection.contributionCalendar;
  const stars = repos.nodes.reduce((sum, r) => sum + r.stargazerCount, 0);
  const weeks = calendar.weeks.map(w => ({
    date: w.contributionDays[0].date,
    count: w.contributionDays.reduce((sum, d) => sum + d.contributionCount, 0),
  }));
  const best = Math.max(0, ...weeks.map(w => w.count));

  const langs = {};
  for (const r of repos.nodes) for (const e of r.languages.edges) {
    langs[e.node.name] ??= { size: 0, color: e.node.color || C.muted };
    langs[e.node.name].size += e.size;
  }
  const langTotal = Object.values(langs).reduce((s, l) => s + l.size, 0);
  let langList = Object.entries(langs).sort((a, b) => b[1].size - a[1].size).map(([name, l]) => ({ name, ...l }));
  if (langList.length > 5) {
    const rest = langList.slice(4).reduce((s, l) => s + l.size, 0);
    langList = [...langList.slice(0, 4), { name: 'Other', size: rest, color: C.dim }];
  }

  const W = 1200, H = 480;
  const f = frame(W, H, { glows: [[1100, 60, 460, C.brand, 0.24], [80, 480, 380, C.pink, 0.08]] });

  // stats row
  const stats = [
    [compact(calendar.totalContributions), 'Contributions'],
    [compact(repos.totalCount), 'Public repos'],
    [compact(stars), 'Stars earned'],
    [compact(best), 'Best week'],
  ];
  const colW = (W - 112) / stats.length;
  const statSvg = stats.map(([value, label], i) => {
    const x = 56 + i * colW;
    return `${i ? `<line x1="${r1(x - 28)}" y1="96" x2="${r1(x - 28)}" y2="168" stroke="${C.lineSoft}"/>` : ''}
    ${T.text({ text: value, font: 'extrabold', size: 50, ls: -1, x, y: 142, fill: C.text })}
    ${T.text({ text: label, font: 'medium', size: 17, x, y: 170, fill: C.muted })}`;
  }).join('');

  // weekly graph
  const gx0 = 56, gx1 = 1144, gTop = 252, gBase = 346, slot = (gx1 - gx0) / weeks.length, bw = Math.min(12, slot * 0.6);
  const yOf = c => (best ? gBase - (c / best) * (gBase - gTop) : gBase);
  let bars = '', labels = '', lastMonth = -1;
  const pts = [];
  weeks.forEach((w, i) => {
    const cx = gx0 + slot * (i + 0.5);
    const h = w.count ? Math.max(4, gBase - yOf(w.count)) : 3;
    bars += `<rect x="${r1(cx - bw / 2)}" y="${r1(gBase - h)}" width="${r1(bw)}" height="${r1(h)}" rx="3" fill="${w.count ? 'url(#bar)' : C.lineSoft}"/>`;
    pts.push([cx, w.count ? yOf(w.count) : gBase - 1.5]);
    const month = new Date(`${w.date}T00:00:00Z`).getUTCMonth();
    if (month !== lastMonth && i > 0 && i < weeks.length - 2) {
      labels += `<line x1="${r1(cx - slot / 2)}" y1="${gBase + 8}" x2="${r1(cx - slot / 2)}" y2="${gBase + 14}" stroke="${C.dim}" stroke-width="1.5"/>`;
      labels += T.text({ text: MONTHS[month], font: 'semibold', size: 13, x: cx - slot / 2 + 5, y: gBase + 26, fill: C.dim });
    }
    lastMonth = month;
  });
  const line = smoothPath(pts);
  const area = best ? `${line}L${r1(pts.at(-1)[0])} ${gBase}L${r1(pts[0][0])} ${gBase}Z` : '';
  const peakIndex = weeks.findIndex(w => w.count === best);
  let peak = '';
  if (best) {
    const [px, py] = pts[peakIndex];
    const label = `${best} in one week`;
    const lw = T.measure(label, 'semibold', 14) + 24;
    const lx = Math.min(Math.max(px - lw / 2, gx0), gx1 - lw);
    peak = `<rect x="${r1(px - 7)}" y="${r1(py - 7)}" width="14" height="14" transform="rotate(45 ${r1(px)} ${r1(py)})" fill="${C.key}"/>
    <rect x="${r1(lx)}" y="${r1(py - 46)}" width="${r1(lw)}" height="28" rx="14" fill="${C.bg2}" stroke="${C.line}"/>
    ${T.text({ text: label, font: 'semibold', size: 14, x: lx + 12, y: py - 27, fill: C.text })}`;
  }

  // languages
  let lx = 56, legendX = 56, langBar = '', legend = '';
  const barW = W - 112;
  langList.forEach((l, i) => {
    const w = (l.size / langTotal) * barW;
    langBar += `<rect x="${r1(lx)}" y="410" width="${r1(Math.max(w - 3, 1))}" height="10" fill="${l.color}"/>`;
    lx += w;
    const pct = `${((l.size / langTotal) * 100).toFixed(1)}%`;
    legend += `<circle cx="${r1(legendX + 5)}" cy="449" r="5" fill="${l.color}"/>`;
    legend += T.runs({ size: 15, x: legendX + 18, y: 454, runs: [
      { text: `${l.name} `, font: 'semibold', fill: C.text2 },
      { text: pct, font: 'medium', fill: C.muted },
    ] });
    legendX += 18 + T.measure(`${l.name} ${pct}`, 'semibold', 15) + 34;
  });

  const updated = `Updated ${now.getUTCDate()} ${MONTHS[now.getUTCMonth()]} ${now.getUTCFullYear()}`;
  const body = `${f.body}
  ${T.text({ text: 'GITHUB ACTIVITY  ·  LAST 12 MONTHS', font: 'semibold', size: 14, ls: 2, x: 56, y: 60, fill: C.brand3 })}
  ${T.text({ text: updated, font: 'medium', size: 14, x: W - 56, y: 60, anchor: 'end', fill: C.dim })}
  ${statSvg}
  <rect x="32" y="196" width="${W - 64}" height="188" rx="16" fill="${C.panel}" fill-opacity=".7" stroke="${C.lineSoft}"/>
  <g clip-path="url(#clip)">
    ${best ? `<path d="${area}" fill="url(#area)"/>` : ''}
    ${bars}
    ${best ? `<path d="${line}" stroke="${C.pink}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
  </g>
  ${best ? '' : T.text({ text: 'No public contributions in the last 12 months yet', font: 'medium', size: 16, x: W / 2, y: 290, anchor: 'middle', fill: C.muted })}
  ${labels}
  ${peak}
  <g class="ph">
    <line x1="0" y1="206" x2="0" y2="${gBase + 2}" stroke="${C.pink}" stroke-width="2" stroke-opacity=".8"/>
    <path d="M-6 200h12v8l-6 6-6-6z" fill="${C.pink}"/>
  </g>
  <g clip-path="url(#lang)">${langBar}</g>
  ${legend}
  ${f.border}`;

  const defs = `${f.defs}
    <linearGradient id="bar" x1="0" y1="${gBase}" x2="0" y2="${gTop}" gradientUnits="userSpaceOnUse"><stop stop-color="${C.brand}"/><stop offset="1" stop-color="${C.pink}"/></linearGradient>
    <linearGradient id="area" x1="0" y1="${gTop}" x2="0" y2="${gBase}" gradientUnits="userSpaceOnUse"><stop stop-color="${C.pink}" stop-opacity=".22"/><stop offset="1" stop-color="${C.pink}" stop-opacity="0"/></linearGradient>
    <clipPath id="lang"><rect x="56" y="410" width="${barW}" height="10" rx="5"/></clipPath>`;
  const style = `${BASE_CSS}
    .ph{transform:translateX(${gx1}px);animation:ph 12s linear infinite}
    @keyframes ph{from{transform:translateX(${gx0}px)}to{transform:translateX(${gx1}px)}}`;
  return svgDoc({
    width: W, height: H, defs, style, body,
    title: `GitHub activity: ${calendar.totalContributions} contributions in the last 12 months, ${repos.totalCount} public repos, ${stars} stars`,
  });
}

const atlas = loadAtlas(here('./inter-glyphs.json'));
const svg = render(await loadData(), createType(atlas));
fs.mkdirSync(here('../../assets'), { recursive: true });
fs.writeFileSync(OUT_FILE, svg);
console.log(`wrote ${OUT_FILE} (${(svg.length / 1024).toFixed(1)} KB)`);
