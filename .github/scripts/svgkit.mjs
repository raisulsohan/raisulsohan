// Tiny SVG helpers shared by the profile card generators.
// Text is drawn as outlined paths from a glyph atlas (Inter + B612 Mono, both OFL),
// so it looks identical on every OS — SVGs shown through <img> cannot load web fonts.
import fs from 'node:fs';

export function loadAtlas(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const fmt = v => {
  const r = Math.round(v * 10) / 10;
  return Object.is(r, -0) ? '0' : String(r);
};

export function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function createType(atlas) {
  const font = key => {
    const f = atlas.fonts[key];
    if (!f) throw new Error(`font "${key}" missing from atlas`);
    return f;
  };

  function layout(text, key, size, ls = 0) {
    const f = font(key), s = size / f.upm;
    const out = [];
    let x = 0, prev = null;
    for (const ch of text) {
      const g = f.g[ch] || f.g['?'];
      if (prev) x += (f.k[prev + ch] || 0) * s + ls;
      out.push({ ch, x, g });
      x += g[0] * s;
      prev = ch;
    }
    return { glyphs: out, width: x, scale: s };
  }

  const measure = (text, key, size, ls = 0) => layout(text, key, size, ls).width;

  function pathData(text, key, size, x, y, ls = 0) {
    const { glyphs, scale } = layout(text, key, size, ls);
    let d = '';
    for (const { x: gx, g } of glyphs) {
      const ox = x + gx;
      d += g[1].replace(/([MLQCZ])([^MLQCZ]*)/g, (_, cmd, nums) => {
        if (cmd === 'Z') return 'Z';
        const n = nums.trim().split(/\s+/).map(Number);
        const pts = [];
        for (let i = 0; i < n.length; i += 2) pts.push(fmt(ox + n[i] * scale), fmt(y - n[i + 1] * scale));
        return cmd + pts.join(' ');
      });
    }
    return d;
  }

  // text({ text, font, size, x, y, anchor, ls, fill, attrs })
  function text({ text: str, font: key = 'regular', size = 16, x = 0, y = 0, anchor = 'start', ls = 0, fill = '#fff', attrs = '' }) {
    const w = measure(str, key, size, ls);
    const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
    return `<path d="${pathData(str, key, size, x0, y, ls)}" fill="${fill}"${attrs ? ' ' + attrs : ''}/>`;
  }

  // Mixed styling on one line: runs = [{ text, font, fill }]
  function runs({ runs: parts, size, x, y, anchor = 'start', ls = 0 }) {
    const widths = parts.map(p => measure(p.text, p.font, size, ls));
    const total = widths.reduce((a, b) => a + b, 0);
    let cx = anchor === 'middle' ? x - total / 2 : anchor === 'end' ? x - total : x;
    return parts.map((p, i) => {
      const el = text({ text: p.text, font: p.font, size, x: cx, y, ls, fill: p.fill });
      cx += widths[i];
      return el;
    }).join('');
  }

  function wrap(str, key, size, maxWidth, ls = 0) {
    const lines = [];
    let line = '';
    for (const word of str.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (line && measure(test, key, size, ls) > maxWidth) { lines.push(line); line = word; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  return { layout, measure, text, runs, wrap, pathData };
}

export function svgDoc({ width, height, title, defs = '', style = '', body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" role="img">
<title>${esc(title)}</title>
${style ? `<style>${style}</style>` : ''}
${defs ? `<defs>${defs}</defs>` : ''}
${body}
</svg>
`;
}

export const r1 = fmt;
