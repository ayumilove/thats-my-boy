/* 定理交互图定义 · theorem-labs.js
   为 TheoremData 中每个定理提供 interactive 定义：
     params  滑块参数（key/label/min/max/step/value）
     defaults 不出滑块的隐藏参数初值（如拖拽点坐标）
     render(p, uid)  按参数实时生成 SVG 内容（几何位置全部由计算得出，
                     标注点永远落在正确的几何位置上）
     onDrag(p, name, x, y)  图上手柄（data-h）拖拽 → 修改参数
     clamp(p, key, prev)    参数合法性修正（如 a≠0、c<a）
     readout(p)  实时结论读数 [{label, value, tone}]，tone: good/warn/bad */
(function(root) {
  "use strict";

  /* ── 配色与 SVG 生成 helper ─────────────────────────────────── */
  const C = {
    blue: '#166534', teal: '#b45309', muted: '#9ca3af', axis: '#a1a1aa',
    faint: '#d6d3d1', red: '#b91c1c'
  };
  const FONT = "font-family:'Noto Serif SC',serif";
  const DEG = 180 / Math.PI;

  const f1 = v => (Math.round(v * 10) / 10).toString();
  const f2 = v => (Math.round(v * 100) / 100).toString();
  const clamp = (v, lo, hi) => v < lo ? lo : (v > hi ? hi : v);
  const mod = (a, n) => ((a % n) + n) % n;
  const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

  const L = (x1, y1, x2, y2, c, w, d) =>
    `<line x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}" stroke="${c}" stroke-width="${w || 1.5}"${d ? ` stroke-dasharray="${d}"` : ''}/>`;
  const T = (x, y, t, c, s, anchor) =>
    `<text x="${f2(x)}" y="${f2(y)}" style="fill:${c};font-size:${s || 13}px;${FONT}"${anchor ? ` text-anchor="${anchor}"` : ''}>${t}</text>`;
  const Do = (x, y, r, c) => `<circle cx="${f2(x)}" cy="${f2(y)}" r="${r || 4}" fill="${c || C.blue}"/>`;
  const Pa = (d, c, w, f, fo) => `<path d="${d}" fill="${f || 'none'}"${fo ? ` fill-opacity="${fo}"` : ''} stroke="${c}" stroke-width="${w || 2}"/>`;
  const Ci = (cx, cy, r, c, w, d) =>
    `<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r)}" fill="none" stroke="${c}" stroke-width="${w || 1.5}"${d ? ` stroke-dasharray="${d}"` : ''}/>`;
  const Sq = (x, y, w2, h2, c, fo) =>
    `<rect x="${f2(x)}" y="${f2(y)}" width="${f2(w2)}" height="${f2(h2)}" fill="${c}" fill-opacity="${fo == null ? 0.1 : fo}" stroke="${c}" stroke-width="1"/>`;
  const handle = (id, x, y, color) =>
    `<g class="th-handle" data-h="${id}" transform="translate(${f2(x)},${f2(y)})"><circle class="th-handle-hit" r="13"/><circle class="th-handle-dot" r="6"${color ? ` style="fill:${color}"` : ''}/></g>`;
  const clipDef = uid => `<defs><clipPath id="labclip-${uid}"><rect x="56" y="22" width="528" height="278"/></clipPath></defs>`;
  const clipped = (uid, inner) => `<g clip-path="url(#labclip-${uid})">${inner}</g>`;

  const polyPath = pts => 'M ' + pts.map(p => `${f2(p[0])} ${f2(p[1])}`).join(' L ');
  /* 采样参数函数 → 屏幕坐标折线 */
  function sample(fn, t0, t1, n) {
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push(fn(t0 + (t1 - t0) * i / n));
    return pts;
  }
  /* 顶点 v 处沿 p1→p2 方向之间的角弧（短弧） */
  function arcBetween(vx, vy, ax, ay, bx, by, r, c, w) {
    const a1 = Math.atan2(ay - vy, ax - vx);
    let d = Math.atan2(by - vy, bx - vx) - a1;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return Pa(polyPath(sample(t => {
      const a = a1 + d * t;
      return [vx + r * Math.cos(a), vy + r * Math.sin(a)];
    }, 0, 1, 16)), c, w);
  }
  /* 角平分线方向上的点（放置角度数值） */
  function bisectorPoint(vx, vy, ax, ay, bx, by, off) {
    const a1 = Math.atan2(ay - vy, ax - vx);
    let d = Math.atan2(by - vy, bx - vx) - a1;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    const a = a1 + d / 2;
    return [vx + off * Math.cos(a), vy + off * Math.sin(a)];
  }
  /* 数学角（逆时针、y 向上）从 t1 到 t2 的圆弧采样（屏幕坐标） */
  function arcRad(cx, cy, r, t1, t2, c, w) {
    return Pa(polyPath(sample(t => {
      const a = (t1 + (t2 - t1) * t) * Math.PI / 180;
      return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
    }, 0, 1, 28)), c, w);
  }
  const angleAt = (vx, vy, ax, ay, bx, by) => {
    const d1 = [ax - vx, ay - vy], d2 = [bx - vx, by - vy];
    const m = Math.hypot(d1[0], d1[1]) * Math.hypot(d2[0], d2[1]);
    return m < 1e-9 ? 0 : Math.acos(clamp((d1[0] * d2[0] + d1[1] * d2[1]) / m, -1, 1)) * DEG;
  };
  function circumcenter(ax, ay, bx, by, cx, cy) {
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(d) < 1e-6) return null;
    const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy;
    return [
      (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d,
      (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d
    ];
  }
  /* 直角小标记：在 v 处沿两个方向画小折角 */
  function rightAngle(vx, vy, dx1, dy1, dx2, dy2, size, c) {
    const m1 = Math.hypot(dx1, dy1) || 1, m2 = Math.hypot(dx2, dy2) || 1;
    const u1 = [dx1 / m1 * size, dy1 / m1 * size], u2 = [dx2 / m2 * size, dy2 / m2 * size];
    return Pa(`M ${f2(vx + u1[0])} ${f2(vy + u1[1])} L ${f2(vx + u1[0] + u2[0])} ${f2(vy + u1[1] + u2[1])} L ${f2(vx + u2[0])} ${f2(vy + u2[1])}`, c, 1.5);
  }
  /* 边标签：边中点沿“远离对顶点”方向偏移 */
  function edgeLabel(ax, ay, bx, by, ox, oy, txt, c) {
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    let nx = mx - ox, ny = my - oy;
    const m = Math.hypot(nx, ny) || 1;
    return T(mx + nx / m * 14, my + ny / m * 14 + 4, txt, c, 13, 'middle');
  }

  /* ═══════════════════════════════════════════════════════════════
     1 & 2 · 二次函数场景（求根公式 / 韦达定理 共享）
     坐标系：x∈[-6.5,6.5]（40px/单位），x 轴在 y=260
     ═══════════════════════════════════════════════════════════════ */
  const q2s = (x, y) => [320 + x * 40, 260 - y * 40];
  const s2qx = sx => (sx - 320) / 40;
  const s2qy = sy => (260 - sy) / 40;

  function quadRoots(p) {
    const D = p.b * p.b - 4 * p.a * p.c;
    if (D < -1e-9) return { D, roots: null };
    const sq = Math.sqrt(Math.max(D, 0));
    const r1 = (-p.b - sq) / (2 * p.a), r2 = (-p.b + sq) / (2 * p.a);
    return { D, roots: r1 <= r2 ? [r1, r2] : [r2, r1] };
  }

  function quadScene(p, uid) {
    const { a, b, c } = p;
    const { D, roots } = quadRoots(p);
    const vx = -b / (2 * a), vy = a * vx * vx + b * vx + c;
    const [svx, svy] = q2s(vx, vy);

    let g = clipDef(uid);
    /* 坐标轴与刻度 */
    g += L(60, 260, 580, 260, C.axis, 1.5);
    g += L(320, 24, 320, 306, C.faint, 1);
    for (let i = -6; i <= 6; i++) {
      if (!i) continue;
      const tx = 320 + i * 40;
      g += L(tx, 257, tx, 263, C.axis, 1) + T(tx, 277, i, C.muted, 10, 'middle');
    }
    /* 抛物线（clip 裁剪出界部分） */
    g += clipped(uid, Pa(polyPath(sample(t => q2s(t, a * t * t + b * t + c), -6.6, 6.6, 130)), C.blue, 2.5));
    /* 对称轴（真正的对称轴 x=-b/2a，而不是把 y 轴当对称轴） */
    if (Math.abs(vx) < 6.5 && Math.abs(vx) > 0.05) {
      g += L(svx, 24, svx, 306, C.muted, 1, '4 4') + T(svx + 6, 36, '对称轴', C.muted, 11);
    }
    /* y 轴截距 (0, c) */
    const cyy = 260 - c * 40;
    if (cyy > 24 && cyy < 306) g += Do(320, cyy, 3.5, C.teal) + T(330, cyy - 7, `c=${f2(c)}`, C.teal, 11);
    /* 根标记 + 可拖拽手柄（拖动根 → b、c 联动，Δ 实时变化） */
    if (roots) {
      const [xl, xr] = roots;
      const close = xr - xl < 1.4;
      [[xl, 'rootL'], [xr, 'rootR']].forEach(([r, id], i) => {
        if (Math.abs(r) > 6.45) return;
        const [rx] = q2s(r, 0);
        const lbl = i === 0 ? `x₁=${f2(r)}` : `x₂=${f2(r)}`;
        if (close && roots[0] !== roots[1]) {
          g += Do(rx, 260, 4.5, C.blue) + T(rx + (i === 0 ? -8 : 8), 284, lbl, C.blue, 12, i === 0 ? 'end' : 'start');
        } else if (roots[0] === roots[1]) {
          if (i === 0) g += Do(rx, 260, 4.5, C.blue) + T(rx, 284, `x₁=x₂=${f2(r)}`, C.blue, 12, 'middle');
        } else {
          g += Do(rx, 260, 4.5, C.blue) + T(rx, 286, lbl, C.blue, 12, 'middle');
        }
        if (!(roots[0] === roots[1] && i === 0)) g += handle(id, rx, 260);
      });
    }
    /* 顶点手柄（拖动顶点 → b、c 联动） */
    if (svy > 26 && svy < 304 && Math.abs(vx) < 6.4) g += handle('vertex', svx, svy);
    /* Δ 状态（右上角实时读数） */
    const tone = D > 1e-9 ? C.blue : (D >= -1e-9 ? C.teal : C.red);
    const line2 = D > 1e-9 ? 'Δ > 0：两个不相等实根' : (D >= -1e-9 ? 'Δ = 0：一个重根' : 'Δ < 0：无实根');
    g += T(630, 42, `Δ = b²−4ac = ${f2(D)}`, tone, 14, 'end');
    g += T(630, 64, line2, tone, 12, 'end');
    return g;
  }

  function quadDrag(p, name, x, y) {
    const a = p.a;
    if (name === 'vertex') {
      const h = clamp(s2qx(x), -6.3, 6.3);
      const k = clamp(s2qy(y), -1.05, 5.8);
      p.b = clamp(-2 * a * h, -6, 6);
      p.c = clamp(a * h * h + k, -4, 4);
    } else if (name === 'rootL' || name === 'rootR') {
      const { roots } = quadRoots(p);
      if (!roots) return;
      const moved = clamp(s2qx(x), -6.3, 6.3);
      const other = name === 'rootL' ? roots[1] : roots[0];
      /* 保持 a 与另一根不变：y = a(x−moved)(x−other) */
      p.b = clamp(-a * (moved + other), -6, 6);
      p.c = clamp(a * moved * other, -4, 4);
    }
  }

  function quadClamp(p, key, prev) {
    if (key === 'a' && Math.abs(p.a) < 0.2) p.a = (prev == null ? p.a : prev) >= 0 ? 0.2 : -0.2;
  }

  function quadReadout(p) {
    const { D, roots } = quadRoots(p);
    const tone = D > 1e-9 ? 'good' : (D >= -1e-9 ? 'warn' : 'bad');
    const items = [{ label: 'Δ = b²−4ac', value: f2(D), tone }];
    if (roots) {
      items.push({ label: 'x₁', value: f2(roots[0]) }, { label: 'x₂', value: f2(roots[1]) });
    } else {
      items.push({ label: '实数根', value: '无（抛物线与 x 轴不相交）', tone: 'bad' });
    }
    const vx = -p.b / (2 * p.a);
    items.push({ label: '顶点', value: `(${f2(vx)}, ${f2(p.a * vx * vx + p.b * vx + p.c)})` });
    return items;
  }

  const quadraticLab = {
    params: [
      { key: 'a', label: '系数 a', min: -3, max: 3, step: 0.1, value: 0.6 },
      { key: 'b', label: '系数 b', min: -6, max: 6, step: 0.1, value: -1 },
      { key: 'c', label: '系数 c', min: -4, max: 4, step: 0.1, value: -0.5 }
    ],
    clamp: quadClamp,
    render: quadScene,
    onDrag: quadDrag,
    readout: quadReadout
  };

  const vietaLab = {
    params: quadraticLab.params.map(pr => ({ ...pr })),
    clamp: quadClamp,
    render: quadScene,
    onDrag: quadDrag,
    readout(p) {
      const { D, roots } = quadRoots(p);
      if (!roots) {
        return [{ label: 'Δ = b²−4ac', value: f2(D), tone: 'bad' },
                { label: '两根关系', value: 'Δ < 0 无实根，拖动顶点让抛物线穿过 x 轴', tone: 'warn' }];
      }
      const sum = roots[0] + roots[1], prod = roots[0] * roots[1];
      const okS = Math.abs(sum - (-p.b / p.a)) < 0.02, okP = Math.abs(prod - (p.c / p.a)) < 0.02;
      return [
        { label: 'x₁ + x₂', value: `${f2(sum)}＝−b/a＝${f2(-p.b / p.a)}`, tone: okS ? 'good' : 'bad' },
        { label: 'x₁ · x₂', value: `${f2(prod)}＝c/a＝${f2(p.c / p.a)}`, tone: okP ? 'good' : 'bad' }
      ];
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     3 · 均值不等式：半圆模型（直径 a+b，CD=√(ab)，半径=(a+b)/2）
     ═══════════════════════════════════════════════════════════════ */
  const AM = { x0: 80, y: 292, s: 60, total: 8 };

  function amgmScene(p) {
    const a = p.a, b = AM.total - a;
    const xC = AM.x0 + a * AM.s;
    const gm = Math.sqrt(a * b);
    const yD = AM.y - gm * AM.s;
    const r = AM.total * AM.s / 2;
    let g = Pa(`M ${AM.x0} ${AM.y} A ${r} ${r} 0 0 1 ${AM.x0 + AM.total * AM.s} ${AM.y}`, C.blue, 2.5);
    g += L(AM.x0 - 16, AM.y, AM.x0 + AM.total * AM.s + 16, AM.y, C.axis, 1.5);
    g += T(60, 36, `a + b = ${f2(a + b)}（拖动分界点，总和不变）`, C.muted, 12);
    /* 半径 OE = (a+b)/2 */
    g += L(320, AM.y, 320, AM.y - r, C.blue, 2) + Do(320, AM.y - r, 4, C.blue);
    g += T(320, AM.y - r - 10, `(a+b)/2 = ${f2((a + b) / 2)}`, C.blue, 12, 'middle');
    /* CD = √(ab) */
    g += L(xC, AM.y, xC, yD, C.teal, 3) + Do(xC, yD, 4.5, C.teal);
    g += T(xC + (xC <= 320 ? 9 : -9), yD + gm * AM.s / 2 + 4, `√(ab) = ${f2(gm)}`, C.teal, 12, xC <= 320 ? 'start' : 'end');
    /* a、b 分段标签 */
    g += T((AM.x0 + xC) / 2, AM.y + 20, `a=${f2(a)}`, C.blue, 12, 'middle');
    g += T((xC + AM.x0 + AM.total * AM.s) / 2, AM.y + 20, `b=${f2(b)}`, C.blue, 12, 'middle');
    g += T(308, AM.y + 20, 'O', C.muted, 11, 'end');
    g += handle('split', xC, AM.y);
    return g;
  }

  const amgmLab = {
    params: [{ key: 'a', label: 'a（b = 8 − a）', min: 0.2, max: 7.8, step: 0.05, value: 2 }],
    render: amgmScene,
    onDrag(p, name, x) {
      if (name === 'split') p.a = clamp((x - AM.x0) / AM.s, 0.2, 7.8);
    },
    readout(p) {
      const b = AM.total - p.a, am = (p.a + b) / 2, gm = Math.sqrt(p.a * b);
      const eq = Math.abs(p.a - b) < 0.03;
      return [
        { label: '(a+b)/2', value: f2(am) },
        { label: '√(ab)', value: f2(gm) },
        { label: '(a+b)/2 − √(ab)', value: f2(am - gm) },
        { label: eq ? 'a = b，等号成立 ✓' : '等号成立条件', value: eq ? '(a+b)/2 = √(ab)' : '当且仅当 a = b', tone: eq ? 'good' : 'info' }
      ];
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     4 · 勾股定理：可拖直角三角形 + 三边正方形（面积可视化）
     ═══════════════════════════════════════════════════════════════ */
  const PY = { vx: 190, vy: 218, s: 16 };

  function pythScene(p) {
    const { a, b } = p;
    const A = [PY.vx, PY.vy - a * PY.s], B = [PY.vx + b * PY.s, PY.vy];
    const cLen = dist(A[0], A[1], B[0], B[1]);
    let g = Pa(`M ${A[0]} ${A[1]} L ${PY.vx} ${PY.vy} L ${B[0]} ${B[1]} Z`, C.blue, 2.5);
    g += rightAngle(PY.vx, PY.vy, A[0] - PY.vx, A[1] - PY.vy, B[0] - PY.vx, B[1] - PY.vy, 9, C.axis);
    /* a² 正方形（贴竖直边左侧） */
    const as = a * PY.s, bs = b * PY.s;
    g += Sq(PY.vx - as, PY.vy - as, as, as, C.blue) + T(PY.vx - as / 2, PY.vy - as / 2 + 5, 'a²', C.blue, 14, 'middle');
    /* b² 正方形（贴水平边下方） */
    g += Sq(PY.vx, PY.vy, bs, bs, C.teal) + T(PY.vx + bs / 2, PY.vy + bs / 2 + 5, 'b²', C.teal, 14, 'middle');
    /* c² 正方形（斜边外侧） */
    const dx = (B[0] - A[0]) / cLen, dy = (B[1] - A[1]) / cLen;
    const nx = dy, ny = -dx;
    g += Pa(polyPath([A, B, [B[0] + nx * cLen, B[1] + ny * cLen], [A[0] + nx * cLen, A[1] + ny * cLen]]) + ' Z', C.axis, 1, C.blue, 0.06);
    const cmx = (A[0] + B[0]) / 2 + nx * cLen / 2, cmy = (A[1] + B[1]) / 2 + ny * cLen / 2;
    g += T(cmx, cmy + 5, 'c²', C.blue, 14, 'middle');
    g += handle('aTop', A[0], A[1]) + handle('bRight', B[0], B[1]);
    return g;
  }

  const pythLab = {
    params: [
      { key: 'a', label: '直角边 a', min: 1, max: 6, step: 0.1, value: 3 },
      { key: 'b', label: '直角边 b', min: 1, max: 6, step: 0.1, value: 4 }
    ],
    render: pythScene,
    onDrag(p, name, x, y) {
      if (name === 'aTop') p.a = clamp((PY.vy - y) / PY.s, 1, 6);
      if (name === 'bRight') p.b = clamp((x - PY.vx) / PY.s, 1, 6);
    },
    readout(p) {
      const s = p.a * p.a + p.b * p.b, c = Math.sqrt(s);
      return [
        { label: 'a² + b²', value: f2(s) },
        { label: 'c²', value: f2(c * c) },
        { label: 'c', value: f2(c) },
        { label: '验证', value: Math.abs(s - c * c) < 0.02 ? 'a² + b² = c² ✓' : '不相等', tone: 'good' }
      ];
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     5 · 三角形内角和：拖动顶点 B，三内角实时测量，和恒为 180°
     ═══════════════════════════════════════════════════════════════ */
  const TS = { A: [150, 258], C: [490, 258] };

  function triSumScene(p) {
    const B = [p.bx, p.by];
    const A = TS.A, Cp = TS.C;
    let g = Pa(polyPath([A, B, Cp]) + ' Z', C.blue, 2.5);
    g += arcBetween(A[0], A[1], B[0], B[1], Cp[0], Cp[1], 28, C.teal, 2);
    g += arcBetween(B[0], B[1], Cp[0], Cp[1], A[0], A[1], 28, C.teal, 2);
    g += arcBetween(Cp[0], Cp[1], A[0], A[1], B[0], B[1], 28, C.teal, 2);
    const angA = angleAt(A[0], A[1], B[0], B[1], Cp[0], Cp[1]);
    const angB = angleAt(B[0], B[1], Cp[0], Cp[1], A[0], A[1]);
    const angC = angleAt(Cp[0], Cp[1], A[0], A[1], B[0], B[1]);
    [[A, [B, Cp], 'α', angA, -14], [B, [Cp, A], 'β', angB, 0], [Cp, [A, B], 'γ', angC, 14]].forEach(([v, pair, sym, val, dx]) => {
      const pt = bisectorPoint(v[0], v[1], pair[0][0], pair[0][1], pair[1][0], pair[1][1], 48);
      g += T(pt[0] + dx, pt[1] + 4, `${sym}=${f1(val)}°`, C.teal, 12, 'middle');
    });
    g += Do(A[0], A[1], 3.5, C.muted) + Do(Cp[0], Cp[1], 3.5, C.muted);
    g += T(A[0] - 10, A[1] + 18, 'A', C.blue, 13, 'middle') + T(Cp[0] + 10, Cp[1] + 18, 'C', C.blue, 13, 'middle') + T(B[0], B[1] - 12, 'B', C.blue, 13, 'middle');
    g += handle('B', B[0], B[1]);
    return g;
  }

  const triSumLab = {
    params: [],
    defaults: { bx: 320, by: 88 },
    render: triSumScene,
    onDrag(p, name, x, y) {
      if (name === 'B') { p.bx = clamp(x, 130, 510); p.by = clamp(y, 42, 238); }
    },
    readout(p) {
      const B = [p.bx, p.by], A = TS.A, Cp = TS.C;
      const angA = angleAt(A[0], A[1], B[0], B[1], Cp[0], Cp[1]);
      const angB = angleAt(B[0], B[1], Cp[0], Cp[1], A[0], A[1]);
      const angC = angleAt(Cp[0], Cp[1], A[0], A[1], B[0], B[1]);
      return [
        { label: '∠A', value: `${f1(angA)}°` },
        { label: '∠B', value: `${f1(angB)}°` },
        { label: '∠C', value: `${f1(angC)}°` },
        { label: '∠A + ∠B + ∠C', value: `${f1(angA + angB + angC)}°（恒定）`, tone: 'good' }
      ];
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     6 · 平行线截比例：三条不等距平行线（80 / 100），拖动两条截线
     ═══════════════════════════════════════════════════════════════ */
  const PR = { ys: [70, 150, 250], x0: 90, x1: 550, m1t: [200, 42], m2t: [360, 42], by: 292 };

  const prX = (top, bx, y) => top[0] + (y - top[1]) / (PR.by - top[1]) * (bx - top[0]);

  function prScene(p) {
    let g = '';
    PR.ys.forEach((y, i) => {
      g += L(PR.x0, y, PR.x1, y, C.blue, 2);
      g += T(PR.x1 + 10, y + 4, `l${'₁₂₃'[i]}`, C.blue, 12);
    });
    const b1 = [p.m1b, PR.by], b2 = [p.m2b, PR.by];
    g += L(PR.m1t[0], PR.m1t[1], b1[0], b1[1], C.teal, 2);
    g += L(PR.m2t[0], PR.m2t[1], b2[0], b2[1], C.teal, 2);
    const xs1 = PR.ys.map(y => prX(PR.m1t, p.m1b, y));
    const xs2 = PR.ys.map(y => prX(PR.m2t, p.m2b, y));
    ['A', 'B', 'C'].forEach((n, i) => { g += Do(xs1[i], PR.ys[i], 4, C.blue) + T(xs1[i] - 8, PR.ys[i] - 7, n, C.blue, 12, 'end'); });
    ['D', 'E', 'F'].forEach((n, i) => { g += Do(xs2[i], PR.ys[i], 4, C.teal) + T(xs2[i] + 8, PR.ys[i] + 15, n, C.teal, 12); });
    g += handle('m1', b1[0], b1[1]) + handle('m2', b2[0], b2[1]);
    g += T(60, 30, '三条平行线间距固定（80 / 100），无论截线怎么拖', C.muted, 12);
    g += T(60, 48, '对应线段的比始终相等', C.muted, 12);
    return g;
  }

  function prSegs(p) {
    const xs1 = PR.ys.map(y => prX(PR.m1t, p.m1b, y));
    const xs2 = PR.ys.map(y => prX(PR.m2t, p.m2b, y));
    const AB = dist(xs1[0], PR.ys[0], xs1[1], PR.ys[1]), BC = dist(xs1[1], PR.ys[1], xs1[2], PR.ys[2]);
    const DE = dist(xs2[0], PR.ys[0], xs2[1], PR.ys[1]), EF = dist(xs2[1], PR.ys[1], xs2[2], PR.ys[2]);
    return { AB, BC, DE, EF };
  }

  const prLab = {
    params: [
      { key: 'm1b', label: '截线 1 下端', min: 300, max: 470, step: 1, value: 352, hidden: true },
      { key: 'm2b', label: '截线 2 下端', min: 460, max: 615, step: 1, value: 520, hidden: true }
    ],
    render: prScene,
    onDrag(p, name, x) {
      if (name === 'm1') p.m1b = clamp(x, 300, 470);
      if (name === 'm2') p.m2b = clamp(x, 460, 615);
    },
    readout(p) {
      const { AB, BC, DE, EF } = prSegs(p);
      const eq = Math.abs(AB / BC - DE / EF) < 0.01;
      return [
        { label: 'AB / BC', value: `${f1(AB)} / ${f1(BC)} = ${f2(AB / BC)}` },
        { label: 'DE / EF', value: `${f1(DE)} / ${f1(EF)} = ${f2(DE / EF)}` },
        { label: '结论', value: eq ? 'AB/BC = DE/EF ✓' : '不相等', tone: eq ? 'good' : 'bad' }
      ];
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     7 · 相似三角形：拖动 B′ 沿 AB 缩放，三组对应边比恒为 k
     ═══════════════════════════════════════════════════════════════ */
  const ST3 = { A: [130, 252], B: [255, 102], C: [390, 252] };

  function simTriScene(p) {
    const k = p.k, A = ST3.A;
    const Bp = [A[0] + k * (ST3.B[0] - A[0]), A[1] + k * (ST3.B[1] - A[1])];
    const Cp = [A[0] + k * (ST3.C[0] - A[0]), A[1] + k * (ST3.C[1] - A[1])];
    let g = Pa(polyPath([A, ST3.B, ST3.C]) + ' Z', C.blue, 2.5);
    g += Pa(polyPath([A, Bp, Cp]) + ' Z', C.teal, 2.5);
    g += T(A[0] - 4, A[1] + 18, 'A(A′)', C.blue, 12, 'middle');
    g += T(ST3.B[0] - 4, ST3.B[1] - 10, 'B', C.blue, 12, 'middle');
    g += T(ST3.C[0] + 10, ST3.C[1] + 18, 'C', C.blue, 12, 'middle');
    g += T(Bp[0] + 14, Bp[1] - 2, 'B′', C.teal, 12, 'middle');
    g += T(Cp[0] + 2, Cp[1] + 18, 'C′', C.teal, 12, 'middle');
    g += handle('bp', Bp[0], Bp[1]);
    return g;
  }

  function st3Ratio(p) {
    const k = p.k, A = ST3.A;
    const Bp = [A[0] + k * (ST3.B[0] - A[0]), A[1] + k * (ST3.B[1] - A[1])];
    const Cp = [A[0] + k * (ST3.C[0] - A[0]), A[1] + k * (ST3.C[1] - A[1])];
    return {
      r1: dist(Bp[0], Bp[1], A[0], A[1]) / dist(ST3.B[0], ST3.B[1], A[0], A[1]),
      r2: dist(Cp[0], Cp[1], A[0], A[1]) / dist(ST3.C[0], ST3.C[1], A[0], A[1]),
      r3: dist(Bp[0], Bp[1], Cp[0], Cp[1]) / dist(ST3.B[0], ST3.B[1], ST3.C[0], ST3.C[1])
    };
  }

  const simTriLab = {
    params: [{ key: 'k', label: '相似比 k', min: 0.3, max: 1, step: 0.01, value: 0.6 }],
    render: simTriScene,
    onDrag(p, name, x, y) {
      if (name !== 'bp') return;
      const vx = x - ST3.A[0], vy = y - ST3.A[1];
      const wx = ST3.B[0] - ST3.A[0], wy = ST3.B[1] - ST3.A[1];
      p.k = clamp((vx * wx + vy * wy) / (wx * wx + wy * wy), 0.3, 1);
    },
    readout(p) {
      const { r1, r2, r3 } = st3Ratio(p);
      return [
        { label: 'A′B′ / AB', value: f2(r1) },
        { label: 'A′C′ / AC', value: f2(r2) },
        { label: 'B′C′ / BC', value: f2(r3) },
        { label: '面积比', value: `k² = ${f2(p.k * p.k)}` },
        { label: '结论', value: '三组对应边比恒相等 ✓', tone: 'good' }
      ];
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     8 · 圆周角定理：拖动 A、B、C 三点，∠ACB 恒为 ∠AOB 的一半
     ═══════════════════════════════════════════════════════════════ */
  const IA = { cx: 320, cy: 168, r: 122 };
  const iaPt = th => [IA.cx + IA.r * Math.cos(th * Math.PI / 180), IA.cy - IA.r * Math.sin(th * Math.PI / 180)];

  function iaScene(p) {
    const A = iaPt(p.tA), B = iaPt(p.tB), Ct = iaPt(p.tC);
    let g = Ci(IA.cx, IA.cy, IA.r, C.muted, 1.5);
    g += L(IA.cx, IA.cy, A[0], A[1], C.axis, 1.5) + L(IA.cx, IA.cy, B[0], B[1], C.axis, 1.5);
    g += L(Ct[0], Ct[1], A[0], A[1], C.blue, 2.5) + L(Ct[0], Ct[1], B[0], B[1], C.blue, 2.5);
    /* 圆心角弧：走不含 C 的那段弧 */
    const ccw = mod(p.tB - p.tA, 360);
    const cInMinor = mod(p.tC - p.tA, 360) < ccw;
    const span = cInMinor ? 360 - ccw : ccw;
    const sa = cInMinor ? p.tB : p.tA;
    g += arcRad(IA.cx, IA.cy, 32, sa, sa + span, C.teal, 2);
    /* 圆周角弧（C 处） */
    g += arcBetween(Ct[0], Ct[1], A[0], A[1], B[0], B[1], 30, C.blue, 2);
    g += Do(IA.cx, IA.cy, 3, C.muted) + T(IA.cx + 10, IA.cy + 20, 'O', C.muted, 12);
    g += T(A[0] - 13, A[1] + 4, 'A', C.blue, 12, 'middle') + T(B[0] + 13, B[1] + 4, 'B', C.blue, 12, 'middle') + T(Ct[0], Ct[1] + (p.tC > 180 ? 22 : -14), 'C', C.blue, 12, 'middle');
    const acb = angleAt(Ct[0], Ct[1], A[0], A[1], B[0], B[1]);
    g += T(630, 42, `∠AOB = ${f1(span)}°`, C.teal, 13, 'end');
    g += T(630, 64, `∠ACB = ${f1(acb)}°`, C.blue, 13, 'end');
    g += T(630, 86, `∠AOB = 2∠ACB ✓`, C.teal, 12, 'end');
    g += handle('A', A[0], A[1]) + handle('B', B[0], B[1]) + handle('C', Ct[0], Ct[1]);
    return g;
  }

  function iaSpan(p) {
    const ccw = mod(p.tB - p.tA, 360);
    return mod(p.tC - p.tA, 360) < ccw ? 360 - ccw : ccw;
  }

  const inscribedLab = {
    params: [],
    defaults: { tA: 148, tB: 32, tC: 262 },
    render: iaScene,
    onDrag(p, name, x, y) {
      if (!'ABC'.includes(name)) return;
      const t = Math.atan2(IA.cy - y, x - IA.cx) * DEG;
      const others = ['A', 'B', 'C'].filter(n => n !== name).map(n => p['t' + n]);
      if (others.some(o => mod(Math.abs(t - o), 360) < 14)) return;
      p['t' + name] = mod(t, 360);
    },
    readout(p) {
      const A = iaPt(p.tA), B = iaPt(p.tB), Ct = iaPt(p.tC);
      return [
        { label: '∠AOB', value: `${f1(iaSpan(p))}°` },
        { label: '∠ACB', value: `${f1(angleAt(Ct[0], Ct[1], A[0], A[1], B[0], B[1]))}°` },
        { label: '结论', value: '同弧所对圆周角 = 圆心角的一半 ✓', tone: 'good' }
      ];
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     9 · 三垂线定理：l 的方向始终构造为 ⊥ AB（前提），拖动 B 在平面内
         滑动、拖动 P 改高度，验证结论 l ⊥ PB 恒成立
     ═══════════════════════════════════════════════════════════════ */
  const TP = { A: [320, 238], half: 110 };

  function tpScene(p, uid) {
    const P = [TP.A[0], TP.A[1] - p.h], B = [p.bx, p.by];
    const dx = B[0] - TP.A[0], dy = B[1] - TP.A[1];
    const m = Math.hypot(dx, dy) || 1;
    const ux = -dy / m, uy = dx / m;
    const key = uid || 'tp';
    let inner = Pa('M 120 238 L 520 238 L 478 278 L 78 278 Z', C.axis, 1.5, C.axis, 0.08);
    inner += L(B[0] - ux * TP.half, B[1] - uy * TP.half, B[0] + ux * TP.half, B[1] + uy * TP.half, C.blue, 2);
    inner += L(P[0], P[1], TP.A[0], TP.A[1], C.teal, 2.5);
    inner += L(TP.A[0], TP.A[1], B[0], B[1], C.axis, 1.5);
    inner += L(P[0], P[1], B[0], B[1], C.blue, 2.5);
    inner += rightAngle(TP.A[0], TP.A[1], P[0] - TP.A[0], P[1] - TP.A[1], dx, dy, 9, C.teal);
    inner += rightAngle(B[0], B[1], dx, dy, ux, uy, 9, C.teal);
    inner += Do(P[0], P[1], 4, C.blue) + T(P[0] + 10, P[1] + 4, 'P', C.blue, 12);
    inner += T(TP.A[0] + 10, TP.A[1] + 20, 'A', C.teal, 12) + T(B[0] - 9, B[1] - 4, 'B', C.blue, 12, 'end');
    inner += T(B[0] + ux * TP.half + 8, B[1] + uy * TP.half + 4, 'l', C.blue, 13);
    inner += T(410, 30, 'PA ⊥ 平面 α，AB 是射影', C.muted, 12);
    inner += T(410, 48, 'l ⊥ AB，PA ⊥ α ⇒ l ⊥ PB', C.muted, 12);
    let g = clipDef(key) + clipped(key, inner);
    g += handle('P', P[0], P[1]) + handle('B', B[0], B[1]);
    return g;
  }

  const threePerpLab = {
    params: [
      { key: 'h', label: 'P 的高度', min: 50, max: 150, step: 1, value: 95 }
    ],
    defaults: { bx: 262, by: 258 },
    render: tpScene,
    onDrag(p, name, x, y) {
      if (name === 'P') { p.h = clamp(TP.A[1] - y, 50, 150); return; }
      if (name !== 'B') return;
      const nx = clamp(x, 170, 470), ny = clamp(y, 242, 274);
      const d = dist(nx, ny, TP.A[0], TP.A[1]);
      if (d < 45 || d > 150) return;
      p.bx = nx; p.by = ny;
    },
    readout(p) {
      /* 读数基于 3D 模型：平面 α 即 (x,y) 面，P 的高度为 z 分量。
         屏幕上的夹角是仿射投影，不保角，故不能直接量屏幕角。 */
      const P = [TP.A[0], TP.A[1] - p.h], B = [p.bx, p.by];
      const dx = B[0] - TP.A[0], dy = B[1] - TP.A[1], dz = -p.h;
      const m = Math.hypot(dx, dy) || 1;
      const ux = -dy / m, uy = dx / m;
      const dot3d = dx * ux + dy * uy;
      const cosPB = Math.abs(dot3d) / (Math.hypot(dx, dy, dz) || 1);
      const angPB = Math.acos(clamp(cosPB, 0, 1)) * DEG;
      return [
        { label: 'l 与 AB（前提）', value: '90°', tone: 'good' },
        { label: 'l 与 PB（结论）', value: `${f1(angPB)}°（空间夹角）`, tone: Math.abs(angPB - 90) < 0.5 ? 'good' : 'bad' },
        { label: '结论', value: 'l ⊥ AB ⇒ l ⊥ PB ✓', tone: 'good' }
      ];
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     10 · 棱锥体积：拖动顶点改高 h，拖动底面角改底边，V = Sh/3
     ═══════════════════════════════════════════════════════════════ */
  const PV = { cx: 310, cy: 256, s: 30, sy: 24, shape: [[-1, -0.16], [1, -0.16], [0.6, 0.18], [-0.4, 0.18]] };

  function pvScene(p) {
    const k = p.base * PV.s;
    const base4 = PV.shape.map(u => [PV.cx + u[0] * k, PV.cy + u[1] * k]);
    const apex = [PV.cx, PV.cy - p.h * PV.sy];
    let g = '';
    base4.forEach(pt => { g += L(apex[0], apex[1], pt[0], pt[1], C.blue, 1.8); });
    g += Pa(polyPath(base4) + ' Z', C.teal, 2);
    g += L(apex[0], apex[1], PV.cx, PV.cy, C.muted, 1.2, '4 4');
    g += Do(apex[0], apex[1], 4, C.blue);
    g += T(apex[0] + 12, apex[1] - 4, '顶点', C.blue, 12);
    g += T(PV.cx + 8, (apex[1] + PV.cy) / 2 + 4, `h=${f1(p.h)}`, C.muted, 12);
    g += T(PV.cx - 10, PV.cy + 0.18 * k + 18, `S=${f1(p.base * p.base)}`, C.teal, 12, 'end');
    g += handle('apex', apex[0], apex[1]) + handle('bcorner', base4[1][0], base4[1][1]);
    return g;
  }

  const pyramidLab = {
    params: [
      { key: 'base', label: '底边长', min: 2, max: 8, step: 0.1, value: 4 },
      { key: 'h', label: '高 h', min: 2, max: 9, step: 0.1, value: 5 }
    ],
    render: pvScene,
    onDrag(p, name, x, y) {
      if (name === 'apex') p.h = clamp((PV.cy - y) / PV.sy, 2, 9);
      if (name === 'bcorner') p.base = clamp((x - PV.cx) / PV.s, 2, 8);
    },
    readout(p) {
      const S = p.base * p.base, V = S * p.h / 3;
      return [
        { label: '底面积 S', value: f2(S) },
        { label: 'h', value: f2(p.h) },
        { label: 'V = Sh/3', value: f2(V), tone: 'good' }
      ];
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     11 · 正弦定理：拖动 B、C，外接圆与 a/sinA = b/sinB = c/sinC = 2R 实时重算
     ═══════════════════════════════════════════════════════════════ */
  const SR = { A: [190, 258], sc: 60 };

  function srScene(p) {
    const A = SR.A, B = [p.bx, p.by], Ct = [p.cx, p.cy];
    const O = circumcenter(A[0], A[1], B[0], B[1], Ct[0], Ct[1]);
    let g = '';
    if (O) g += Ci(O[0], O[1], dist(O[0], O[1], A[0], A[1]), C.muted, 1.3) + Do(O[0], O[1], 3, C.muted) + T(O[0] + 8, O[1] - 6, 'O', C.muted, 11);
    g += Pa(polyPath([A, B, Ct]) + ' Z', C.blue, 2.5);
    g += edgeLabel(B[0], B[1], Ct[0], Ct[1], A[0], A[1], 'a', C.teal);
    g += edgeLabel(Ct[0], Ct[1], A[0], A[1], B[0], B[1], 'b', C.teal);
    g += edgeLabel(A[0], A[1], B[0], B[1], Ct[0], Ct[1], 'c', C.teal);
    g += T(A[0] - 12, A[1] + 16, 'A', C.blue, 12, 'middle') + T(B[0], B[1] - 12, 'B', C.blue, 12, 'middle') + T(Ct[0] + 12, Ct[1] + 14, 'C', C.blue, 12, 'middle');
    g += Do(A[0], A[1], 3.5, C.muted);
    g += handle('B', B[0], B[1]) + handle('C', Ct[0], Ct[1]);
    return g;
  }

  function srClampPos(p, key, x, y) {
    const A = SR.A;
    const nx = clamp(x, 250, 590), ny = clamp(y, 45, 235);
    if (dist(nx, ny, A[0], A[1]) < 70) return;
    const other = key === 'bx' ? [p.cx, p.cy] : [p.bx, p.by];
    if (dist(nx, ny, other[0], other[1]) < 70) return;
    p[key] = nx;
    p[key === 'bx' ? 'by' : 'cy'] = ny;
  }

  const sineLab = {
    params: [],
    defaults: { bx: 430, by: 86, cx: 465, cy: 238 },
    render: srScene,
    onDrag(p, name, x, y) {
      if (name === 'B') srClampPos(p, 'bx', x, y);
      if (name === 'C') srClampPos(p, 'cx', x, y);
    },
    readout(p) {
      const A = SR.A, B = [p.bx, p.by], Ct = [p.cx, p.cy];
      const s = SR.sc;
      const a = dist(B[0], B[1], Ct[0], Ct[1]) / s, b = dist(Ct[0], Ct[1], A[0], A[1]) / s, c = dist(A[0], A[1], B[0], B[1]) / s;
      const angA = angleAt(A[0], A[1], B[0], B[1], Ct[0], Ct[1]) * Math.PI / 180;
      const angB = angleAt(B[0], B[1], Ct[0], Ct[1], A[0], A[1]) * Math.PI / 180;
      const angC = angleAt(Ct[0], Ct[1], A[0], A[1], B[0], B[1]) * Math.PI / 180;
      const O = circumcenter(A[0], A[1], B[0], B[1], Ct[0], Ct[1]);
      const R = O ? dist(O[0], O[1], A[0], A[1]) / s : 0;
      return [
        { label: 'a / sin A', value: f2(a / Math.sin(angA)) },
        { label: 'b / sin B', value: f2(b / Math.sin(angB)) },
        { label: 'c / sin C', value: f2(c / Math.sin(angC)) },
        { label: '2R', value: f2(2 * R) },
        { label: '结论', value: '四值恒相等 ✓', tone: 'good' }
      ];
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     12 · 余弦定理：拖动顶点 C，c² = a² + b² − 2ab·cosC 实时验证
     ═══════════════════════════════════════════════════════════════ */
  const CR2 = { A: [150, 254], B: [470, 254], sc: 60 };

  function crScene(p) {
    const A = CR2.A, B = CR2.B, Ct = [p.cx, p.cy];
    let g = Pa(polyPath([A, B, Ct]) + ' Z', C.blue, 2.5);
    g += arcBetween(Ct[0], Ct[1], A[0], A[1], B[0], B[1], 30, C.teal, 2);
    const angC = angleAt(Ct[0], Ct[1], A[0], A[1], B[0], B[1]);
    const bl = bisectorPoint(Ct[0], Ct[1], A[0], A[1], B[0], B[1], 48);
    g += T(bl[0], bl[1] + 4, `∠C=${f1(angC)}°`, C.teal, 12, 'middle');
    g += edgeLabel(B[0], B[1], Ct[0], Ct[1], A[0], A[1], 'a', C.teal);
    g += edgeLabel(Ct[0], Ct[1], A[0], A[1], B[0], B[1], 'b', C.teal);
    g += edgeLabel(A[0], A[1], B[0], B[1], Ct[0], Ct[1], 'c', C.teal);
    g += T(A[0] - 12, A[1] + 16, 'A', C.blue, 12, 'middle') + T(B[0] + 12, B[1] + 16, 'B', C.blue, 12, 'middle') + T(Ct[0], Ct[1] - 12, 'C', C.blue, 12, 'middle');
    g += Do(A[0], A[1], 3.5, C.muted) + Do(B[0], B[1], 3.5, C.muted);
    g += handle('C', Ct[0], Ct[1]);
    return g;
  }

  const cosineLab = {
    params: [],
    defaults: { cx: 310, cy: 92 },
    render: crScene,
    onDrag(p, name, x, y) {
      if (name !== 'C') return;
      const nx = clamp(x, 190, 430), ny = clamp(y, 45, 232);
      if (dist(nx, ny, CR2.A[0], CR2.A[1]) < 70 || dist(nx, ny, CR2.B[0], CR2.B[1]) < 70) return;
      p.cx = nx; p.cy = ny;
    },
    readout(p) {
      const A = CR2.A, B = CR2.B, Ct = [p.cx, p.cy], s = CR2.sc;
      const a = dist(B[0], B[1], Ct[0], Ct[1]) / s, b = dist(Ct[0], Ct[1], A[0], A[1]) / s, c = dist(A[0], A[1], B[0], B[1]) / s;
      const angC = angleAt(Ct[0], Ct[1], A[0], A[1], B[0], B[1]) * Math.PI / 180;
      const lhs = c * c, rhs = a * a + b * b - 2 * a * b * Math.cos(angC);
      return [
        { label: 'c²', value: f2(lhs) },
        { label: 'a² + b² − 2ab·cosC', value: f2(rhs) },
        { label: 'c', value: f2(c) },
        { label: '验证', value: Math.abs(lhs - rhs) < 0.03 ? 'c² = a² + b² − 2ab·cosC ✓' : '不相等', tone: 'good' }
      ];
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     13 · 椭圆：拖动焦点改 c，拖动 P 沿椭圆，|PF₁|+|PF₂| = 2a 恒定
          （纵向比例尺与横向不同，仅作示意拉伸；读数用真实数学单位）
     ═══════════════════════════════════════════════════════════════ */
  const EL = { cx: 320, cy: 168, sx: 62, sy: 34 };

  function elScene(p) {
    const { a, c } = p, b = Math.sqrt(a * a - c * c);
    const rx = a * EL.sx, ry = b * EL.sy;
    let g = `<ellipse cx="${EL.cx}" cy="${EL.cy}" rx="${f2(rx)}" ry="${f2(ry)}" fill="none" stroke="${C.blue}" stroke-width="2.5"/>`;
    g += L(EL.cx - rx, EL.cy, EL.cx + rx, EL.cy, C.faint, 1, '4 4');
    const f1x = EL.cx - c * EL.sx, f2x = EL.cx + c * EL.sx;
    const t = p.t;
    const P = [EL.cx + rx * Math.cos(t), EL.cy - ry * Math.sin(t)];
    g += L(f1x, EL.cy, P[0], P[1], C.teal, 1.8) + L(f2x, EL.cy, P[0], P[1], C.teal, 1.8);
    const px = (P[0] - EL.cx) / EL.sx, py = (EL.cy - P[1]) / EL.sy;
    const d1 = Math.hypot(px + c, py), d2 = Math.hypot(px - c, py);
    g += T((f1x + P[0]) / 2, (EL.cy + P[1]) / 2 - 8, f1(d1), C.teal, 11, 'middle');
    g += T((f2x + P[0]) / 2, (EL.cy + P[1]) / 2 - 8, f1(d2), C.teal, 11, 'middle');
    g += Do(f1x, EL.cy, 4.5, C.teal) + Do(f2x, EL.cy, 4.5, C.teal);
    g += T(f1x - 4, EL.cy + 18, `F₁(${f2(-c)},0)`, C.teal, 11, 'middle') + T(f2x + 4, EL.cy + 18, `F₂(${f2(c)},0)`, C.teal, 11, 'middle');
    g += T(P[0], P[1] - 12, 'P', C.blue, 12, 'middle');
    g += handle('P', P[0], P[1], C.blue) + handle('F1', f1x, EL.cy) + handle('F2', f2x, EL.cy);
    return g;
  }

  const ellipseLab = {
    params: [
      { key: 'a', label: '长半轴 a', min: 1.6, max: 4.4, step: 0.02, value: 3 },
      { key: 'c', label: '焦距 c', min: 0.3, max: 4.2, step: 0.02, value: 1.7 }
    ],
    defaults: { t: 0.9 },
    clamp(p) {
      p.c = clamp(p.c, 0.3, p.a - 0.12);
    },
    render: elScene,
    onDrag(p, name, x, y) {
      if (name === 'P') {
        const b = Math.sqrt(p.a * p.a - p.c * p.c);
        p.t = Math.atan2((EL.cy - y) / (b * EL.sy), (x - EL.cx) / (p.a * EL.sx));
      } else if (name === 'F1' || name === 'F2') {
        p.c = clamp(Math.abs(x - EL.cx) / EL.sx, 0.3, p.a - 0.12);
      }
    },
    readout(p) {
      const { a, c } = p, b = Math.sqrt(a * a - c * c);
      const t = p.t;
      const px = a * Math.cos(t), py = b * Math.sin(t);
      const d1 = Math.hypot(px + c, py), d2 = Math.hypot(px - c, py);
      return [
        { label: '|PF₁|', value: f2(d1) },
        { label: '|PF₂|', value: f2(d2) },
        { label: '|PF₁| + |PF₂|', value: `${f2(d1 + d2)} = 2a = ${f2(2 * a)}`, tone: 'good' },
        { label: 'b² = a² − c²', value: f2(b * b) }
      ];
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     14 · 双曲线：拖动焦点改 c，拖动 P 沿两支移动，||PF₁|−|PF₂|| = 2a
     ═══════════════════════════════════════════════════════════════ */
  const HB = { cx: 320, cy: 160, sx: 62, sy: 34 };

  function hbScene(p) {
    const { a, c } = p, b = Math.sqrt(c * c - a * a);
    const pyMax = (HB.cy - 24) / HB.sy;
    const u0 = Math.asinh(Math.min(pyMax / b, 5));
    let g = clipDef('hyperbola');
    const branch = side => Pa(polyPath(sample(u => [HB.cx + side * a * Math.cosh(u) * HB.sx, HB.cy - b * Math.sinh(u) * HB.sy], -u0, u0, 64)), C.blue, 2.5);
    g += clipped('hyperbola', branch(1) + branch(-1));
    /* 渐近线 y = ±(b/a)x */
    g += L(HB.cx - 6 * a * HB.sx, HB.cy + 6 * b * HB.sy, HB.cx + 6 * a * HB.sx, HB.cy - 6 * b * HB.sy, C.faint, 1, '5 4');
    g += L(HB.cx - 6 * a * HB.sx, HB.cy - 6 * b * HB.sy, HB.cx + 6 * a * HB.sx, HB.cy + 6 * b * HB.sy, C.faint, 1, '5 4');
    const f1x = HB.cx - c * HB.sx, f2x = HB.cx + c * HB.sx;
    const u = p.u, side = p.side;
    const P = [HB.cx + side * a * Math.cosh(u) * HB.sx, HB.cy - b * Math.sinh(u) * HB.sy];
    g += L(f1x, HB.cy, P[0], P[1], C.teal, 1.8) + L(f2x, HB.cy, P[0], P[1], C.teal, 1.8);
    const px = (P[0] - HB.cx) / HB.sx, py = (HB.cy - P[1]) / HB.sy;
    const d1 = Math.hypot(px + c, py), d2 = Math.hypot(px - c, py);
    g += T((f1x + P[0]) / 2, (HB.cy + P[1]) / 2 - 8, f1(d1), C.teal, 11, 'middle');
    g += T((f2x + P[0]) / 2, (HB.cy + P[1]) / 2 - 8, f1(d2), C.teal, 11, 'middle');
    g += Do(f1x, HB.cy, 4.5, C.teal) + Do(f2x, HB.cy, 4.5, C.teal);
    g += T(f1x - 4, HB.cy + 18, `F₁(${f2(-c)},0)`, C.teal, 11, 'middle') + T(f2x + 4, HB.cy + 18, `F₂(${f2(c)},0)`, C.teal, 11, 'middle');
    g += T(P[0] + (side > 0 ? 12 : -12), P[1] - 8, 'P', C.blue, 12, side > 0 ? 'start' : 'end');
    g += handle('P', P[0], P[1], C.blue) + handle('F1', f1x, HB.cy) + handle('F2', f2x, HB.cy);
    return g;
  }

  const hyperbolaLab = {
    params: [
      { key: 'a', label: '实半轴 a', min: 0.8, max: 2.2, step: 0.02, value: 1.2 },
      { key: 'c', label: '焦距 c', min: 1.3, max: 3.4, step: 0.02, value: 2 }
    ],
    defaults: { u: 0.5, side: 1 },
    clamp(p) {
      p.c = clamp(p.c, p.a + 0.35, 3.4);
    },
    render: hbScene,
    onDrag(p, name, x, y) {
      if (name === 'P') {
        const b = Math.sqrt(p.c * p.c - p.a * p.a);
        const pyMax = (HB.cy - 24) / HB.sy;
        const py = clamp((HB.cy - y) / HB.sy, -pyMax, pyMax);
        p.u = Math.asinh(py / b);
        p.side = x >= HB.cx ? 1 : -1;
      } else if (name === 'F1' || name === 'F2') {
        p.c = clamp(Math.abs(x - HB.cx) / HB.sx, p.a + 0.35, 3.4);
      }
    },
    readout(p) {
      const { a, c } = p, b = Math.sqrt(c * c - a * a);
      const px = p.side * a * Math.cosh(p.u), py = b * Math.sinh(p.u);
      const d1 = Math.hypot(px + c, py), d2 = Math.hypot(px - c, py);
      return [
        { label: '|PF₁|', value: f2(d1) },
        { label: '|PF₂|', value: f2(d2) },
        { label: '||PF₁| − |PF₂||', value: `${f2(Math.abs(d1 - d2))} = 2a = ${f2(2 * a)}`, tone: 'good' },
        { label: '渐近线', value: `y = ±${f2(b / a)}x` }
      ];
    }
  };

  const theorems = {
    'quadratic-formula': quadraticLab,
    'vieta': vietaLab,
    'amgm': amgmLab,
    'pythagorean': pythLab,
    'triangle-sum': triSumLab,
    'parallel-ratio': prLab,
    'similar-triangle': simTriLab,
    'inscribed-angle': inscribedLab,
    'three-perpendicular': threePerpLab,
    'pyramid-volume': pyramidLab,
    'sine-rule': sineLab,
    'cosine-rule': cosineLab,
    'ellipse': ellipseLab,
    'hyperbola': hyperbolaLab
  };

  /* 把交互定义挂到定理数据上（theorem-data.js 先于本文件加载） */
  const data = root.TheoremData;
  if (data && data.theorems) {
    data.theorems.forEach(t => {
      if (theorems[t.id]) t.interactive = theorems[t.id];
    });
  }

  root.TheoremLabs = theorems;
})(typeof window === 'undefined' ? globalThis : window);
