// Builds the animated README header (dark + light) and the "Ask my agent" button.
// Fonts are the same Geist / Geist Mono / Instrument Serif files the portfolio ships,
// inlined as data URIs because GitHub serves README SVGs as sandboxed images.
//
//   node scripts/build-assets.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const font = (file) => readFileSync(join(root, "assets/fonts", file)).toString("base64");

const geistFace = `
@font-face{font-family:"Geist";font-weight:100 900;src:url(data:font/woff2;base64,${font("geist.woff2")}) format("woff2")}`;
const fontFaces = `${geistFace}
@font-face{font-family:"Geist Mono";font-weight:100 900;src:url(data:font/woff2;base64,${font("geist-mono.woff2")}) format("woff2")}
@font-face{font-family:"Instrument Serif";font-style:italic;src:url(data:font/woff2;base64,${font("instrument-serif-italic.woff2")}) format("woff2")}`;

// Same tokens as app/globals.css in usama-dev.
const themes = {
  dark: {
    bg: "#07080a", surface: "#121418", line: "rgba(255,255,255,0.08)", lineStrong: "rgba(255,255,255,0.16)",
    fg: "#eceef1", muted: "#8a9099", faint: "#5a606a", accent: "#c8f031", accentInk: "#0a0b0d",
    accentSoft: "rgba(200,240,49,0.12)", grid: "rgba(255,255,255,0.035)", glow: 0.16,
  },
  light: {
    bg: "#f6f6f3", surface: "#ffffff", line: "rgba(10,12,16,0.09)", lineStrong: "rgba(10,12,16,0.18)",
    fg: "#0c0e12", muted: "#5b616b", faint: "#8b9099", accent: "#5b7a00", accentInk: "#ffffff",
    accentSoft: "rgba(91,122,0,0.1)", grid: "rgba(10,12,16,0.045)", glow: 0.1,
  },
};

const W = 1200;
const H = 400;
const SANS = `"Geist",-apple-system,"Segoe UI",Helvetica,Arial,sans-serif`;
const MONO = `"Geist Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`;
const SERIF = `"Instrument Serif",Georgia,"Times New Roman",serif`;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ── Typewriter ─────────────────────────────────────────────────────────────
// Each phrase is revealed by a clip rect that grows in steps of one monospace glyph,
// so it reads as typing; phrases take turns on a shared cycle.
const phrases = [
  "AI agents with LangGraph",
  "chatbots that book meetings",
  "fine-tuned LLMs",
  "n8n & Make.com automations",
  "GoHighLevel workflows",
  "HIPAA-compliant RAG",
];
const TYPE_SIZE = 19;
const CHAR_W = TYPE_SIZE * 0.6; // Geist Mono advance width is 600/1000 em
const TYPE_X = 84;
const TYPE_Y = 322;
const SLOT = 4; // seconds per phrase
const CYCLE = SLOT * phrases.length;

function typewriter() {
  const pct = (s) => ((s / CYCLE) * 100).toFixed(3) + "%";
  let css = "";
  let defs = "";
  let body = "";
  phrases.forEach((p, i) => {
    const w = p.length * CHAR_W;
    const typeEnd = Math.min(0.055 * p.length, 1.6);
    const holdEnd = SLOT - 0.55;
    const eraseEnd = SLOT - 0.15;
    // Same timeline for the clip (reveal) and the caret (follows the last glyph).
    const kf = (anim, hidden, shown) => `
@keyframes t${i}-${anim}{0%{transform:${hidden}}${pct(typeEnd)},${pct(holdEnd)}{transform:${shown}}${pct(eraseEnd)},100%{transform:${hidden}}}`;
    css += kf("clip", "scaleX(0)", "scaleX(1)");
    css += kf("caret", "translateX(0)", `translateX(${w.toFixed(1)}px)`);
    css += `
@keyframes t${i}-vis{0%,${pct(eraseEnd)}{opacity:1}${pct(eraseEnd + 0.01)},100%{opacity:0}}`;
    // Negative delays start every phrase mid-cycle, so waiting phrases are already hidden.
    const delay = i ? i * SLOT - CYCLE : 0;
    css += `
.c${i}{animation:t${i}-clip ${CYCLE}s steps(${p.length}) ${delay}s infinite both}
.k${i}{animation:t${i}-caret ${CYCLE}s steps(${p.length}) ${delay}s infinite both}
.v${i}{animation:t${i}-vis ${CYCLE}s linear ${delay}s infinite both}`;
    defs += `<clipPath id="clip${i}"><rect class="c${i} scale" x="${TYPE_X}" y="${TYPE_Y - 22}" width="${w.toFixed(1)}" height="30"/></clipPath>`;
    body += `<g class="phrase v${i}${i ? " later" : ""}">
  <text x="${TYPE_X}" y="${TYPE_Y}" clip-path="url(#clip${i})" class="type">${esc(p)}</text>
  <g class="k${i}"><rect class="caret" x="${TYPE_X + 2}" y="${TYPE_Y - 17}" width="10" height="21" rx="1.5"/></g>
</g>`;
  });
  return { css, defs, body };
}

// ── Node graph ─────────────────────────────────────────────────────────────
const nodes = {
  agent: { x: 965, y: 196, label: "agent", hub: true },
  llm: { x: 862, y: 108, label: "LLM" },
  rag: { x: 1072, y: 96, label: "RAG" },
  n8n: { x: 838, y: 272, label: "n8n" },
  crm: { x: 1092, y: 286, label: "CRM" },
  api: { x: 968, y: 338, label: "API" },
  tools: { x: 1138, y: 188, label: "tools" },
  a: { x: 792, y: 184 },
  b: { x: 958, y: 52 },
  c: { x: 1150, y: 352 },
  d: { x: 790, y: 350 },
};
const edges = [
  ["agent", "llm"], ["agent", "rag"], ["agent", "n8n"], ["agent", "crm"], ["agent", "api"], ["agent", "tools"],
  ["llm", "a"], ["n8n", "a"], ["llm", "b"], ["b", "rag"], ["rag", "tools"], ["tools", "crm"],
  ["crm", "c"], ["api", "crm"], ["api", "d"], ["n8n", "d"],
];
// Pulses run outward from the agent (and one relay) with staggered delays.
const pulses = [
  ["agent", "llm", 0], ["agent", "crm", 0.9], ["agent", "n8n", 1.7], ["agent", "rag", 2.6],
  ["agent", "api", 3.4], ["agent", "tools", 4.3], ["llm", "b", 1.2], ["n8n", "d", 3.0], ["tools", "crm", 5.1],
];

function chip(n, t) {
  const w = n.label.length * 11 * 0.6 + 22;
  const h = 24;
  const x = n.x - w / 2;
  const y = n.y - h / 2;
  if (n.hub) {
    return `<g>
  <rect class="ring" x="${x - 6}" y="${y - 6}" width="${w + 12}" height="${h + 12}" rx="${(h + 12) / 2}" fill="none" stroke="${t.accent}" stroke-width="1.2"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${t.accent}"/>
  <text x="${n.x}" y="${n.y + 4}" text-anchor="middle" class="chip" fill="${t.accentInk}" font-weight="600">${n.label}</text>
</g>`;
  }
  return `<g>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${t.surface}" stroke="${t.lineStrong}"/>
  <text x="${n.x}" y="${n.y + 4}" text-anchor="middle" class="chip" fill="${t.muted}">${n.label}</text>
</g>`;
}

function graph(t) {
  const line = ([a, b]) => `M${nodes[a].x} ${nodes[a].y}L${nodes[b].x} ${nodes[b].y}`;
  const edgeEls = edges.map((e) => `<path d="${line(e)}" stroke="${t.lineStrong}" stroke-width="1"/>`).join("");
  const pulseEls = pulses
    .map(([a, b, delay]) =>
      `<path d="${line([a, b])}" pathLength="100" class="pulse" style="animation-delay:${delay - 6}s" stroke="${t.accent}" stroke-width="2" stroke-linecap="round"/>`)
    .join("");
  const dots = Object.values(nodes)
    .filter((n) => !n.label)
    .map((n) => `<circle cx="${n.x}" cy="${n.y}" r="3.5" fill="${t.bg}" stroke="${t.lineStrong}"/>`)
    .join("");
  const chips = Object.values(nodes).filter((n) => n.label).map((n) => chip(n, t)).join("");
  return `<g fill="none">${edgeEls}${pulseEls}</g>${dots}${chips}`;
}

// ── Header ─────────────────────────────────────────────────────────────────
function header(name) {
  const t = themes[name];
  const tw = typewriter();
  const css = `${fontFaces}
.sans{font-family:${SANS}}
.mono{font-family:${MONO}}
.serif{font-family:${SERIF};font-style:italic}
.chip{font-family:${MONO};font-size:11px;letter-spacing:.04em}
.type{font-family:${MONO};font-size:${TYPE_SIZE}px;fill:${t.fg}}
.caret{fill:${t.accent};animation:blink 1s steps(1) infinite}
.scale,.k0,.k1,.k2,.k3,.k4,.k5{transform-box:fill-box;transform-origin:0 50%}
.pulse{stroke-dasharray:9 120;stroke-dashoffset:9;animation:pulse 6s cubic-bezier(.45,0,.55,1) infinite both}
.ring{transform-box:fill-box;transform-origin:50% 50%;animation:ring 2.8s ease-out infinite}
.live{transform-box:fill-box;transform-origin:50% 50%;animation:live 2s ease-out infinite}
.rise{animation:rise .9s cubic-bezier(.2,.7,.2,1) both}
.d1{animation-delay:.08s}.d2{animation-delay:.18s}.d3{animation-delay:.3s}.d4{animation-delay:.45s}
@keyframes blink{50%{opacity:0}}
@keyframes pulse{0%{stroke-dashoffset:9;opacity:0}1%{opacity:1}28%{stroke-dashoffset:-100;opacity:1}29%,100%{stroke-dashoffset:-100;opacity:0}}
@keyframes ring{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.35);opacity:0}}
@keyframes live{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.6);opacity:0}}
@keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
${tw.css}
@media (prefers-reduced-motion:reduce){
  *{animation:none!important}
  .phrase.later,.caret,.pulse{display:none}
}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">
<title id="title">Usama Riasat builds intelligent systems.</title>
<desc id="desc">Senior Software Engineer — AI agents, fine-tuned LLMs, n8n / Make.com / GoHighLevel automation and HIPAA-compliant platforms.</desc>
<style>${css}</style>
<defs>
  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="${t.grid}"/></pattern>
  <radialGradient id="glow" cx="965" cy="196" r="330" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${t.accent}" stop-opacity="${t.glow}"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/>
  </radialGradient>
  <clipPath id="frame"><rect width="${W}" height="${H}" rx="20"/></clipPath>
  ${tw.defs}
</defs>
<g clip-path="url(#frame)">
  <rect width="${W}" height="${H}" fill="${t.bg}"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  ${graph(t)}

  <g class="rise">
    <rect x="56" y="48" width="196" height="30" rx="15" fill="${t.accentSoft}" stroke="${t.accent}" stroke-opacity=".35"/>
    <circle class="live" cx="76" cy="63" r="4" fill="${t.accent}"/>
    <circle cx="76" cy="63" r="4" fill="${t.accent}"/>
    <text x="90" y="67.5" class="mono" font-size="12" letter-spacing="1.2" fill="${t.accent}">AVAILABLE FOR WORK</text>
    <text x="270" y="67.5" class="mono" font-size="12" letter-spacing="1.2" fill="${t.faint}">SENIOR SOFTWARE ENGINEER · LAHORE · REMOTE</text>
  </g>

  <text x="52" y="176" class="sans rise d1" font-size="74" font-weight="600" letter-spacing="-3" fill="${t.fg}">Usama Riasat</text>
  <text x="54" y="250" class="rise d2" letter-spacing="-1.5"><tspan class="sans" font-size="54" font-weight="500" fill="${t.muted}">builds </tspan><tspan class="serif" font-size="64" fill="${t.accent}">intelligent</tspan><tspan class="sans" font-size="54" font-weight="500" fill="${t.fg}"> systems.</tspan></text>

  <g class="rise d3">
    <text x="56" y="${TYPE_Y}" class="mono" font-size="${TYPE_SIZE}" fill="${t.accent}">›</text>
    ${tw.body}
  </g>

  <rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="19.5" fill="none" stroke="${t.line}"/>
</g>
</svg>
`;
}

// ── Button ─────────────────────────────────────────────────────────────────
function button() {
  const t = themes.dark;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="56" viewBox="0 0 300 56" role="img" aria-label="Ask my agent">
<title>Ask my agent</title>
<style>${geistFace}
.l{font-family:${SANS};font-size:19px;font-weight:600;letter-spacing:-.2px}
.s{transform-box:fill-box;transform-origin:50% 50%;animation:twinkle 2.4s ease-in-out infinite}
.a{animation:nudge 1.6s ease-in-out infinite}
@keyframes twinkle{0%,100%{transform:scale(1)}50%{transform:scale(.7)}}
@keyframes nudge{50%{transform:translateX(4px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>
<rect x="1" y="1" width="298" height="54" rx="27" fill="${t.accent}"/>
<g transform="translate(34 28)"><path class="s" d="M0-10C1-3 3-1 10 0 3 1 1 3 0 10-1 3-3 1-10 0-3-1-1-3 0-10Z" fill="${t.accentInk}"/></g>
<text x="58" y="34.5" class="l" fill="${t.accentInk}">Ask my agent</text>
<g class="a"><path d="M232 28h26m-9-9 9 9-9 9" fill="none" stroke="${t.accentInk}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></g>
</svg>
`;
}

writeFileSync(join(root, "assets/header-dark.svg"), header("dark"));
writeFileSync(join(root, "assets/header-light.svg"), header("light"));
writeFileSync(join(root, "assets/ask-button.svg"), button());
console.log("wrote assets/header-dark.svg, assets/header-light.svg, assets/ask-button.svg");
