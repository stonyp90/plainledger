#!/usr/bin/env node
/**
 * Generates the web app's CSS variables from design-system/tokens.json.
 *
 *   node design-system/build-tokens.mjs          write apps/web/src/styles/tokens.css
 *   node design-system/build-tokens.mjs --check  exit 1 if tokens.css is out of date
 *
 * tokens.json stores complete colours (hex, rgba() or a {token} alias) per theme.
 * The app stores colours as "R G B" channels so Tailwind can add alpha:
 * rgb(var(--color-primary-500) / 0.1). This script converts between the two.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const source = join(here, 'tokens.json');
const target = join(root, 'apps/web/src/styles/tokens.css');

const tokens = JSON.parse(readFileSync(source, 'utf8'));
const themes = tokens.color.themes.map((t) => t.id);
const [base, ...others] = themes;

function toChannels(value, name) {
  const alias = /^\{(.+)\}$/.exec(value);
  if (alias) return `var(--${alias[1]})`;
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
  }
  const rgba = /^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)$/.exec(value);
  if (rgba)
    return `${rgba[1]} ${rgba[2]} ${rgba[3]}${rgba[4] !== undefined ? ` / ${rgba[4]}` : ''}`;
  throw new Error(`${name}: cannot convert "${value}" to channels`);
}

function valueFor(token, theme) {
  const v = token.value;
  if (typeof v === 'string') return theme === base ? v : undefined;
  return v[theme];
}

// Section headings follow the token name stems, in tokens.json order.
function section(name) {
  if (/^color-(white|black|gray)/.test(name)) return 'Neutrals: corporate slate and navy';
  if (name.startsWith('color-primary')) return 'Brand: finance green (emerald)';
  if (/^color-accent-\d/.test(name)) return 'Accent: prosperity gold (premium only)';
  if (/^color-(success|warning|error|info)/.test(name)) return 'Status';
  if (/^color-accent/.test(name)) return 'Tailwind accent aliases';
  if (name.startsWith('color-')) return 'Roles: build with these, not the ramps';
  if (name.startsWith('store-')) return 'Store and marketing';
  if (name.startsWith('ibcs-')) return 'IBCS chart notation (mirrors lib/ibcs/theme.ts)';
  return 'Other';
}

function block(selector, theme) {
  const lines = [];
  let current = null;
  const push = (name, value, heading) => {
    if (heading !== current) {
      if (current !== null) lines.push('');
      lines.push(`  /* ${heading} */`);
      current = heading;
    }
    lines.push(`  --${name}: ${value};`);
  };
  for (const t of tokens.color.tokens) {
    const v = valueFor(t, theme);
    if (v === undefined) continue;
    if (theme !== base && v === valueFor(t, base)) continue;
    push(t.name, toChannels(v, t.name), section(t.name));
  }
  for (const t of tokens.shadow.tokens) {
    const v = typeof t.value === 'string' ? (theme === base ? t.value : undefined) : t.value[theme];
    if (v === undefined) continue;
    push(t.name, v, 'Shadows');
  }
  if (theme === base) {
    for (const t of tokens.radius.tokens) push(t.name, t.value, 'Radius');
    for (const t of tokens.transition.tokens) push(t.name, t.value, 'Transitions');
  }
  return `${selector} {\n${lines.join('\n')}\n}\n`;
}

const header = `/* ============================================================================
   PLAINLEDGER DESIGN TOKENS
   Generated from design-system/tokens.json by design-system/build-tokens.mjs.
   Do not edit by hand: change tokens.json, then run \`npm run tokens\`.

   Colours are "R G B" channels so Tailwind can add alpha:
     rgb(var(--color-surface))  rgb(var(--color-primary-500) / 0.1)
   Light is the base (:root); the .dark class on <html> overrides it.
   ============================================================================ */
`;

const selectors = { dark: '.dark' };
const css = [
  header,
  block(':root', base),
  ...others.map((t) => block(selectors[t] ?? `[data-theme="${t}"]`, t)),
].join('\n');

const rel = relative(root, target);
if (process.argv.includes('--check')) {
  const current = existsSync(target) ? readFileSync(target, 'utf8') : '';
  if (current !== css) {
    console.error(`${rel} is out of date with design-system/tokens.json. Run \`npm run tokens\`.`);
    process.exit(1);
  }
  console.log(`${rel} matches design-system/tokens.json.`);
} else {
  writeFileSync(target, css);
  console.log(`Wrote ${rel} (${tokens.color.tokens.length} colours, ${themes.length} themes).`);
}
