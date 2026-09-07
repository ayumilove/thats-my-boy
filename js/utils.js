/**
 * 工具函数 + SVG 绘图原语
 * 提供 DOM 选择器、数值格式化、基础 SVG 元素生成、通用函数绘图引擎
 */

/* ── 颜色常量 ──────────────────────────────────────────── */
const blue = '#c85a3a';
const teal = '#2a8f7e';

/* ── DOM 快捷 ──────────────────────────────────────────── */
const $ = s => document.querySelector(s);

/* ── 数值格式化 ────────────────────────────────────────── */
const n = v => Number(v.toFixed(2)).toString();

/* ── SVG 基础元素 ──────────────────────────────────────── */
const line = (x1, y1, x2, y2, color = '#dfe7f0', width = 1, dash = '') =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${dash ? `stroke-dasharray="${dash}"` : ''}/>`;

const txt = (x, y, t, color = '', size = 14) =>
  `<text x="${x}" y="${y}" ${color ? `style="fill:${color};font-size:${size}px"` : ''}>${t}</text>`;

const dot = (x, y, color = blue, r = 5) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" stroke="white" stroke-width="2"/>`;

/* ── 通用函数绘图引擎 ─────────────────────────────────── */
function plot(fn, {
  xmin = -5, xmax = 5, ymin = -4, ymax = 8,
  w = 640, h = 320, xlabel = 'x', ylabel = 'y',
  overlay = null, points = [], level = null, shade = null
} = {}) {
  const l = 44, r = w - 20, t = 28, b = h - 35;
  const X = x => l + (x - xmin) / (xmax - xmin) * (r - l);
  const Y = y => b - (y - ymin) / (ymax - ymin) * (b - t);
  let s = '';

  /* 网格 */
  for (let i = 0; i <= 10; i++) {
    const xx = xmin + (xmax - xmin) * i / 10;
    s += line(X(xx), t, X(xx), b);
    if (i % 2 === 0) s += txt(X(xx) - 6, b + 22, n(xx));
  }
  for (let i = 0; i <= 6; i++) {
    const yy = ymin + (ymax - ymin) * i / 6;
    s += line(l, Y(yy), r, Y(yy));
    s += txt(4, Y(yy) + 5, n(yy));
  }

  /* 坐标轴 */
  if (ymin <= 0 && ymax >= 0) s += line(l, Y(0), r, Y(0), '#9aaebf', 1.5);
  if (xmin <= 0 && xmax >= 0) s += line(X(0), t, X(0), b, '#9aaebf', 1.5);

  /* 路径生成器 */
  const path = f => Array.from({ length: 301 }, (_, i) => {
    const x = xmin + (xmax - xmin) * i / 300;
    return `${i ? 'L' : 'M'}${X(x)},${Y(f(x))}`;
  }).join(' ');

  /* 裁剪区域 */
  s += `<svg x="${l}" y="${t}" width="${r - l}" height="${b - t}" viewBox="${l} ${t} ${r - l} ${b - t}">`;

  /* 阴影区域 */
  if (shade) {
    const [a, c] = shade;
    s += `<path d="M${X(a)},${Y(0)} L${X(c)},${Y(0)}" stroke="${teal}" stroke-width="7" opacity=".55"/>`;
  }

  /* 对比曲线 */
  if (overlay) s += `<path d="${path(overlay)}" fill="none" stroke="#97a8be" stroke-width="2" stroke-dasharray="6 5"/>`;

  /* 水平线 */
  if (level !== null) s += line(l, Y(level), r, Y(level), teal, 2);

  /* 主曲线 */
  s += `<path d="${path(fn)}" fill="none" stroke="${blue}" stroke-width="3"/>`;

  /* 标记点 */
  points.forEach(([x, y, c]) => s += dot(X(x), Y(y), c));

  s += '</svg>';
  s += txt(r - 6, b + 23, xlabel) + txt(l + 7, 17, ylabel);
  return s;
}

/* ── SVG 包装 ──────────────────────────────────────────── */
function wrap(s, h = 320) {
  return `<svg role="img" aria-label="${topics[idx].name}交互示意图" viewBox="0 0 640 ${h}">${s}</svg>`;
}

/* ── 统计面板 ──────────────────────────────────────────── */
function stats(items) {
  $('#readout').innerHTML = items
    .map(([k, v], i) => `<div class="stat">${k}<strong class="${i === 0 ? 'blue' : ''}">${v}</strong></div>`)
    .join('');
}

/* ── 集合工具 ──────────────────────────────────────────── */
function setList(mask) {
  return Object.keys(members).filter(k => mask(members[k]));
}

function fmtSet(a) {
  return a.length ? '{' + a.join(', ') + '}' : '∅';
}

/* ── 训练系统共享工具 ─────────────────────────────────── */
var el = id => document.getElementById(id);
var fmtNum = value => Number(value.toFixed(3)).toString();
var svgText = (x, y, t, color = '#8a7e6b') => `<text x="${x}" y="${y}" style="fill:${color}">${t}</text>`;
var svgLine = (x1, y1, x2, y2, color = '#d4c8b8', w = 2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${w}"/>`;
var svgDot = (x, y, color = blue) => `<circle cx="${x}" cy="${y}" r="6" fill="${color}"/>`;
var svgWrap = (content, h = 260, title = '实验图') => `<svg role="img" aria-label="${title}" viewBox="0 0 600 ${h}">${content}</svg>`;

/* ── KaTeX 公式渲染 ────────────────────────────────────── */
function tex(s) {
  return s.replace(/\$([^$]+)\$/g, '<span class="katex-tex">$1</span>');
}

function renderMath(container) {
  if (typeof katex === 'undefined' || !container) return;
  container.querySelectorAll('.katex-tex').forEach(el => {
    try { katex.render(el.textContent, el, { throwOnError: false }); } catch (_) {}
  });
}

/* ── JSXGraph 管理 ─────────────────────────────────────── */
let _jxgBoards = [];

function createBoard(divId, opts) {
  if (typeof JXG === 'undefined') return null;
  const board = JXG.JSXGraph.initBoard(divId, opts);
  _jxgBoards.push(board);
  return board;
}

function destroyBoards() {
  _jxgBoards.forEach(b => { try { JXG.JSXGraph.freeBoard(b); } catch (_) {} });
  _jxgBoards = [];
}
