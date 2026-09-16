// Shared visual language for the profile SVGs.
export const C = {
  bg0: '#0C0A13', bg1: '#16122A', bg2: '#1B1728', panel: '#100D19',
  line: '#2C2642', lineSoft: '#221D34',
  text: '#F5F3FB', text2: '#C4BDD8', muted: '#8C85A6', dim: '#625C7E',
  brand: '#6C4CFF', brand2: '#8F74FF', brand3: '#B9A8FF',
  pink: '#EA77FF', blue: '#31A8FF', orange: '#FF9A00', green: '#3DDC97', key: '#FFD166',
};

export const BASE_CSS = `
    .fu{animation:fu .9s cubic-bezier(.2,.8,.2,1) both}
    .d1{animation-delay:.05s}.d2{animation-delay:.2s}.d3{animation-delay:.35s}.d4{animation-delay:.5s}
    @keyframes fu{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
    @media (prefers-reduced-motion:reduce){*{animation:none!important}}`;

export function frame(W, H, { radius = 28, glows = [] } = {}) {
  const defs = `
    <clipPath id="clip"><rect width="${W}" height="${H}" rx="${radius}"/></clipPath>
    <linearGradient id="bg" x1="0" y1="0" x2="${W}" y2="${H}" gradientUnits="userSpaceOnUse"><stop stop-color="${C.bg1}"/><stop offset="1" stop-color="${C.bg0}"/></linearGradient>
    <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="14" cy="14" r="1.1" fill="#fff" fill-opacity=".05"/></pattern>
    ${glows.map(([x, y, r, color, op], i) => `<radialGradient id="glow${i}" cx="${x}" cy="${y}" r="${r}" gradientUnits="userSpaceOnUse"><stop stop-color="${color}" stop-opacity="${op}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`).join('')}`;
  const body = `<g clip-path="url(#clip)">
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    ${glows.map((_, i) => `<rect width="${W}" height="${H}" fill="url(#glow${i})"/>`).join('')}
    <rect width="${W}" height="${H}" fill="url(#dots)"/>
  </g>`;
  const border = `<rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" rx="${radius - 0.75}" stroke="${C.line}" stroke-width="1.5"/>`;
  return { defs, body, border };
}

const GLYPHS = {
  crown: '<path d="M3.5 17.5 2.6 7.6l5.6 4.1L12 5l3.8 6.7 5.6-4.1-.9 9.9z"/><rect x="3.5" y="19" width="17" height="2.2" rx="1.1"/>',
  bolt: '<path d="M13.4 2 4.6 13.6h6.2L9.8 22l9.6-12.2h-6.3z"/>',
  sparkle: '<path d="M10 4c.7 4.4 3.3 7 7.7 7.7-4.4.7-7 3.3-7.7 7.7-.7-4.4-3.3-7-7.7-7.7C6.7 11 9.3 8.4 10 4z"/><path d="M18.4 2c.3 1.8 1.4 2.9 3.2 3.2-1.8.3-2.9 1.4-3.2 3.2-.3-1.8-1.4-2.9-3.2-3.2 1.8-.3 2.9-1.4 3.2-3.2z"/>',
  clipboard: '<rect x="5" y="4.5" width="14" height="17.5" rx="3" fill="none" stroke="#fff" stroke-width="2.2"/><rect x="8.5" y="2" width="7" height="5" rx="1.6"/><path d="M8.8 12.5h6.4M8.8 16.5h4" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>',
  speaker: '<path d="M3 9.2h3.9L11.8 5v14l-4.9-4.2H3z"/><path d="M15.3 9.2a4 4 0 0 1 0 5.6M18.2 6.4a8 8 0 0 1 0 11.2" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>',
};

export function glyph(name, cx, cy, size) {
  const s = size / 24;
  return `<g transform="translate(${cx - size / 2} ${cy - size / 2}) scale(${s})" fill="#fff">${GLYPHS[name]}</g>`;
}

const ADOBE = {
  ae: { bg: '#00005B', fg: '#9999FF', label: 'Ae' },
  pr: { bg: '#1E0633', fg: '#EA77FF', label: 'Pr' },
  ps: { bg: '#001E36', fg: '#31A8FF', label: 'Ps' },
  ai: { bg: '#330000', fg: '#FF9A00', label: 'Ai' },
};
const SI_COLOR = { JavaScript: '#F7DF1E', 'Node.js': '#6CC24A', PHP: '#B3B7F2', WordPress: '#4FA9DA', Git: '#F05032' };

export function tile(T, { x, y, size, kind, grad, icon, si }) {
  const cx = x + size / 2, cy = y + size / 2;
  const rx = Math.round(size * 0.24);
  if (kind === 'icon') {
    return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${rx}" fill="url(#${grad})"/>
    <rect x="${x + 1}" y="${y + 1}" width="${size - 2}" height="${size - 2}" rx="${rx - 1}" stroke="#fff" stroke-opacity=".18"/>
    ${glyph(icon, cx, cy, size * 0.5)}`;
  }
  if (ADOBE[kind]) {
    const a = ADOBE[kind], sw = Math.max(1.5, size / 30), fs = size * 0.4;
    return `<rect x="${x + sw / 2}" y="${y + sw / 2}" width="${size - sw}" height="${size - sw}" rx="${rx}" fill="${a.bg}" stroke="${a.fg}" stroke-width="${sw}"/>
    ${T.text({ text: a.label, font: 'bold', size: fs, x: cx, y: cy + fs * 0.364, anchor: 'middle', fill: a.fg })}`;
  }
  const base = `<rect x="${x + 0.75}" y="${y + 0.75}" width="${size - 1.5}" height="${size - 1.5}" rx="${rx}" fill="#1D1830" stroke="${C.line}" stroke-width="1.5"/>`;
  if (kind === 'figma') {
    const u = size * 0.52 / 3, ox = cx - u, oy = cy - 1.5 * u;
    return `${base}<g transform="translate(${ox} ${oy}) scale(${u})">
      <path d="M.5 0H1V1H.5A.5 .5 0 0 1 .5 0Z" fill="#F24E1E"/>
      <path d="M1 0H1.5A.5 .5 0 0 1 1.5 1H1Z" fill="#FF7262"/>
      <path d="M.5 1H1V2H.5A.5 .5 0 0 1 .5 1Z" fill="#A259FF"/>
      <circle cx="1.5" cy="1.5" r=".5" fill="#1ABCFE"/>
      <path d="M1 2V2.5A.5 .5 0 1 1 .5 2Z" fill="#0ACF83"/>
    </g>`;
  }
  if (kind === 'cep') {
    const fs = size * 0.27;
    return `${base}${T.text({ text: '{ }', font: 'bold', size: size * 0.3, x: cx, y: cy - size * 0.02, anchor: 'middle', fill: '#4FA3FF' })}
    ${T.text({ text: 'CEP', font: 'bold', size: fs * 0.62, ls: 1, x: cx, y: cy + size * 0.28, anchor: 'middle', fill: '#8FC3FF' })}`;
  }
  if (kind === 'si') {
    const s = (size * 0.5) / 24;
    return `${base}<path transform="translate(${cx - 12 * s} ${cy - 12 * s}) scale(${s})" d="${si.path}" fill="${SI_COLOR[si.title] || '#' + si.hex}"/>`;
  }
  throw new Error(`unknown tile kind ${kind}`);
}

export function chip(T, { x, y, label, color, upper = true }) {
  const size = upper ? 12.5 : 14, ls = upper ? 1.4 : 0, font = upper ? 'semibold' : 'medium';
  const pad = 13, h = 30;
  const w = T.measure(label, font, size, ls) + pad * 2;
  const svg = `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="${h / 2}" fill="${color}" fill-opacity=".1" stroke="${color}" stroke-opacity=".42"/>
    ${T.text({ text: label, font, size, ls, x: x + pad, y: y + h / 2 + size * 0.364, fill: upper ? color : C.text2 })}`;
  return { svg, width: w };
}
