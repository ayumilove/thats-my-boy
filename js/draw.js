/**
 * 可视化绘图模块
 * 主题 0（集合维恩图）、6（正方体线面角）、7（路程位移时间轴）、9（受力分析）使用原生 SVG
 * 主题 1-3（函数图像）、4（圆与圆周角）、5（直线与圆）、8（运动学双图）使用 JSXGraph 绘图 + HTML 滑块控制
 */

let storeValues = [];

/* ── JSXGraph 暖色调默认配置 ─────────────────────────── */
const JXG_COLORS = {
  blue: '#166534',
  teal: '#b45309',
  grid: '#d4d4d8',
  axis: '#a1a1aa',
  text: '#71717a',
  muted: '#9ca3af'
};

function jxgOpts(bb) {
  return {
    boundingbox: bb || [-5.5, 8.5, 5.5, -4.5],
    keepaspectratio: true,
    axis: true,
    grid: true,
    showCopyright: false,
    showNavigation: false,
    pan: { enabled: false },
    zoom: { wheel: false, needShift: false, min: 0.5, max: 4 },
    defaultAxes: {
      x: {
        strokeColor: JXG_COLORS.axis,
        ticks: { strokeColor: JXG_COLORS.grid, insertTicks: false, ticksDistance: 2,
          label: { fontSize: 12, cssStyle: 'fill:' + JXG_COLORS.text + ';' } }
      },
      y: {
        strokeColor: JXG_COLORS.axis,
        ticks: { strokeColor: JXG_COLORS.grid, insertTicks: false, ticksDistance: 2,
          label: { fontSize: 12, cssStyle: 'fill:' + JXG_COLORS.text + ';' } }
      }
    }
  };
}

/* ── JSXGraph 主题状态（原地更新用）──────────────────── */
var _jxg = { board: null, objs: {} };

/* ── 主绘图调度 ─────────────────────────────────────── */
function draw() {
  let s = '', values = [];

  if (idx === 0) {
    /* ── 集合与集合运算（维恩图 · 保留 SVG）──────────── */
    destroyJxg();
    const groups = [0, 1, 2, 3].map(i => setList(v => v === i));
    const result = setList(v =>
      op === 'intersection' ? v === 3 :
      op === 'union' ? v !== 0 :
      !(v & 1)
    );

    s = `<defs><clipPath id="A"><ellipse cx="260" cy="161" rx="145" ry="113"/></clipPath></defs>`;
    s += `<rect x="24" y="16" width="592" height="291" rx="10" fill="${op === 'complement' ? '#e6f6f3' : '#fafcff'}" stroke="#d9e4ef"/>`;
    s += `<ellipse cx="260" cy="161" rx="145" ry="113" fill="${op === 'union' ? '#dbeaff' : op === 'complement' ? '#fafcff' : '#f0f5ff'}"/>`;
    s += `<ellipse cx="390" cy="161" rx="145" ry="113" fill="${op === 'union' ? '#dbeaff' : '#009c9610'}"/>`;
    if (op === 'intersection') s += '<ellipse cx="390" cy="161" rx="145" ry="113" fill="#9cdcd5" clip-path="url(#A)"/>';
    if (op === 'complement') s += '<ellipse cx="260" cy="161" rx="145" ry="113" fill="#fafcff"/>';
    s += `<ellipse cx="260" cy="161" rx="145" ry="113" fill="none" stroke="${JXG_COLORS.blue}" stroke-width="2"/>`;
    s += `<ellipse cx="390" cy="161" rx="145" ry="113" fill="none" stroke="${JXG_COLORS.teal}" stroke-width="2"/>`;
    s += txt(43, 42, 'U') + txt(153, 83, 'A', blue, 20) + txt(470, 83, 'B', teal, 20);

    [[0, 58, 70, 1], [1, 174, 115, 2], [2, 440, 115, 2], [3, 308, 115, 2]].forEach(([g, x, y, cols]) =>
      groups[g].forEach((k, j) => {
        const xx = x + j % cols * 30;
        const yy = y + Math.floor(j / cols) * 32;
        s += `<g data-svgnum="${k}" style="cursor:${stage ? 'grab' : 'default'};touch-action:none">`;
        s += `<circle cx="${xx}" cy="${yy}" r="13" fill="${result.includes(k) ? blue : '#fff'}" stroke="#cad9ec"/>`;
        s += `${txt(xx - 4, yy + 5, k, result.includes(k) ? '#fff' : '#425c77')}`;
        s += '</g>';
      })
    );

    values = [
      ['当前运算结果', formatSet(result)],
      ['集合 A', formatSet(setList(v => v & 1))],
      ['集合 B', formatSet(setList(v => v & 2))]
    ];
  }

  if (idx === 1) {
    /* ── 二次函数的参数（JSXGraph 绘图 + HTML 滑块）─── */
    drawQuad();
    return;
  }

  if (idx === 2) {
    /* ── 方程与不等式（JSXGraph 绘图 + HTML 滑块）───── */
    drawEq();
    return;
  }

  if (idx === 3) {
    /* ── 单调性与奇偶性（JSXGraph 绘图 + HTML 滑块）─── */
    drawProp();
    return;
  }

  if (idx === 4) {
    /* ── 圆与圆周角（JSXGraph 绘图 + HTML 滑块）─────── */
    drawCircle();
    return;
  }

  if (idx === 5) {
    /* ── 直线与圆的位置关系（JSXGraph + HTML 滑块）──── */
    drawLineCircle();
    return;
  }

  if (idx === 6) {
    /* ── 正方体与线面角（斜二测 SVG）───────────────── */
    destroyJxg();
    const sc = 100, ox = 150, oy = 252;
    const prj = (x, y, z) => [ox + (x + .5 * y) * sc, oy - (z + .5 * y) * sc];
    const [ax, ay] = prj(0, 0, 0), [bx, by] = prj(1, 0, 0),
      [cx, cy] = prj(1, 1, 0), [dx, dy] = prj(0, 1, 0),
      [a1x, a1y] = prj(0, 0, 1), [b1x, b1y] = prj(1, 0, 1),
      [c1x, c1y] = prj(1, 1, 1), [d1x, d1y] = prj(0, 1, 1);
    const t = p.cuT;
    const [px, py] = prj(t, t, t), [qpx, qpy] = prj(t, t, 0);

    s = txt(24, 28, '正方体 ABCD-A₁B₁C₁D₁ · 斜二测画法');
    /* 后方三条棱画虚线 */
    s += line(dx, dy, cx, cy, '#b8c4d0', 1.5, '6 4') + line(ax, ay, dx, dy, '#b8c4d0', 1.5, '6 4') + line(dx, dy, d1x, d1y, '#b8c4d0', 1.5, '6 4');
    s += line(ax, ay, bx, by, '#8a97a5', 2) + line(bx, by, cx, cy, '#8a97a5', 2)
      + line(cx, cy, c1x, c1y, '#8a97a5', 2) + line(ax, ay, a1x, a1y, '#8a97a5', 2)
      + line(bx, by, b1x, b1y, '#8a97a5', 2) + line(a1x, a1y, b1x, b1y, '#8a97a5', 2)
      + line(b1x, b1y, c1x, c1y, '#8a97a5', 2) + line(c1x, c1y, d1x, d1y, '#8a97a5', 2)
      + line(d1x, d1y, a1x, a1y, '#8a97a5', 2);
    /* AP′ 投影与体对角线 */
    s += line(ax, ay, qpx, qpy, JXG_COLORS.muted, 2);
    s += line(qpx, qpy, cx, cy, JXG_COLORS.muted, 1, '5 4');
    s += line(ax, ay, c1x, c1y, '#c9d4e0', 1.5);
    s += line(ax, ay, px, py, JXG_COLORS.blue, 3.5);
    s += line(px, py, qpx, qpy, JXG_COLORS.teal, 3);
    /* 线面角 θ 标注 */
    const r0 = 34, a1 = Math.atan2(py - ay, px - ax), a2 = Math.atan2(qpy - ay, qpx - ax);
    s += `<path d="M${ax + r0 * Math.cos(a1)},${ay + r0 * Math.sin(a1)} A${r0},${r0} 0 0 1 ${ax + r0 * Math.cos(a2)},${ay + r0 * Math.sin(a2)}" fill="none" stroke="#71717a" stroke-width="1.5"/>`;
    s += txt(ax + 40, ay - 25, 'θ', '#71717a', 14);
    s += dot(px, py, JXG_COLORS.blue) + dot(qpx, qpy, JXG_COLORS.teal);
    s += txt(px - 24, py + 2, 'P', JXG_COLORS.blue, 15) + txt(qpx + 10, qpy + 22, 'P′', JXG_COLORS.teal, 15);
    s += txt(ax - 18, ay + 16, 'A') + txt(bx - 4, by + 22, 'B') + txt(cx + 10, cy + 4, 'C') + txt(dx + 8, dy - 6, 'D')
      + txt(a1x - 20, a1y + 2, 'A₁') + txt(b1x + 6, b1y + 4, 'B₁') + txt(c1x + 10, c1y, 'C₁') + txt(d1x + 4, d1y - 10, 'D₁');
    s += txt(415, 44, 'PP′ 垂直于底面 ABCD', JXG_COLORS.teal, 13);
    s += txt(415, 66, 'AP′ 是 AP 在底面内的投影', '#71717a', 13);

    values = [
      ['AP（棱长 a=1）', n(t * Math.sqrt(3))],
      ['PP′ 高度', n(t)],
      ['PP′ / AP', n(1 / Math.sqrt(3)) + '（不变）']
    ];
  }

  if (idx === 7) {
    /* ── 路程与位移（保留 SVG）──────────────────────── */
    destroyJxg();
    const X = x => 320 + x * 26;
    const end = p.right - p.left;

    s += txt(24, 28, '一维轨迹 · 右为正方向');
    for (let i = -10; i <= 10; i += 2)
      s += line(X(i), 205, X(i), 215, '#acbac8') + txt(X(i) - 9, 239, i);
    s += line(45, 210, 595, 210, '#a9b9c9', 2);
    s += line(X(0), 115, X(p.right), 115, blue, 5) + dot(X(p.right), 115) + txt(50, 91, `① 向右 ${p.right} m`, blue);
    s += line(X(p.right), 163, X(end), 163, teal, 5) + dot(X(end), 163, teal) + txt(50, 154, `② 向左 ${p.left} m`, teal);
    s += dot(X(0), 210, '#6e7f92') + dot(X(end), 210, blue, 7) + txt(X(end) - 18, 270, '终点', blue) + txt(X(0) - 15, 295, '起点');

    values = [
      ['位移 Δx', `${n(end)} m`],
      ['路程', `${n(p.right + p.left)} m`],
      ['位移大小', `${n(Math.abs(end))} m`]
    ];
  }

  if (idx === 8) {
    /* ── 匀变速直线运动 · x–t + v–t 双图（JSXGraph）── */
    drawMotion();
    return;
  }

  if (idx === 9) {
    /* ── 力、质量与加速度（保留 SVG）────────────────── */
    destroyJxg();
    const net = p.fr - p.fl;
    const a = net / p.m;

    s = txt(25, 30, '受力示意 · 水平无摩擦');
    s += line(70, 227, 570, 227, '#b6c6d5', 2);
    s += `<rect x="267" y="122" width="106" height="105" rx="7" fill="#edf3ff" stroke="${blue}" stroke-width="2"/>`;
    s += txt(291, 177, `${n(p.m)} kg`, blue, 20);

    const arrow = (start, end, y, color, label) => {
      if (start === end) return '';
      return line(start, y, end, y, color, 3)
        + `<path d="M${end - (end > start ? 9 : -9)},${y - 6} L${end},${y} L${end - (end > start ? 9 : -9)},${y + 6}" fill="none" stroke="${color}" stroke-width="3"/>`
        + txt(Math.min(start, end), y - 15, label, color);
    };
    s += arrow(375, 375 + p.fr * 9, 169, blue, `${p.fr} N`);
    s += arrow(265, 265 - p.fl * 9, 169, teal, `${p.fl} N`);
    s += txt(203, 281, 'F合 = F右 − F左；a = F合 / m');

    values = [
      ['加速度', `${n(a)} m/s²`],
      ['合外力', `${n(net)} N`],
      ['加速度方向', net > 0 ? '向右' : net < 0 ? '向左' : '无加速度']
    ];
  }

  /* ── 输出（SVG 主题）────────────────────────────── */
  $('#visual').innerHTML = wrap(s, 320);
  stats(values);
  storeValues = values;

  /* ── 集合元素拖放交互 ─────────────────────────────── */
  document.querySelectorAll('[data-svgnum]').forEach(g =>
    g.onpointerdown = e => {
      if (stage === 0) return;
      const k = +g.dataset.svgnum;
      const svg = g.ownerSVGElement;
      g.setPointerCapture(e.pointerId);

      g.onpointerup = ev => {
        const pt = svg.createSVGPoint();
        pt.x = ev.clientX;
        pt.y = ev.clientY;
        const loc = pt.matrixTransform(svg.getScreenCTM().inverse());
        if (loc.x < 24 || loc.x > 616 || loc.y < 16 || loc.y > 307) return;
        const ina = ((loc.x - 260) / 145) ** 2 + ((loc.y - 161) / 113) ** 2 <= 1;
        const inb = ((loc.x - 390) / 145) ** 2 + ((loc.y - 161) / 113) ** 2 <= 1;
        move(k, (ina ? 1 : 0) + (inb ? 2 : 0));
      };

      g.onpointermove = ev => {
        if (ev.buttons) {
          const pt = svg.createSVGPoint();
          pt.x = ev.clientX;
          pt.y = ev.clientY;
          const loc = pt.matrixTransform(svg.getScreenCTM().inverse());
          const c = g.querySelector('circle');
          const x = +c.getAttribute('cx');
          const y = +c.getAttribute('cy');
          g.setAttribute('transform', `translate(${loc.x - x} ${loc.y - y})`);
        }
      };
    }
  );
}

/* ── JSXGraph 销毁 ─────────────────────────────────── */
function destroyJxg() {
  if (_jxg.board) {
    try { JXG.JSXGraph.freeBoard(_jxg.board); } catch (_) {}
    _jxg = { board: null, objs: {} };
  }
  destroyBoards();
}

/* ── 主题 1：二次函数 ──────────────────────────────── */
function drawQuad() {
  const divId = 'jxg-quad';
  if (!_jxg.board || $('#visual').querySelector('#' + divId) === null) {
    destroyJxg();
    $('#visual').innerHTML = '<div id="' + divId + '" style="width:100%;height:340px"></div>';
    _jxg.board = createBoard(divId, jxgOpts());
    if (!_jxg.board) return;

    const fns = {
      curve: _jxg.board.create('functiongraph',
        [x => p.a * x * x + p.b * x + p.c],
        { strokeColor: JXG_COLORS.blue, strokeWidth: 2 }),
      vx: _jxg.board.create('point',
        [() => p.a ? -p.b / (2 * p.a) : 0, () => p.a ? p.c - p.b * p.b / (4 * p.a) : 0],
        { color: JXG_COLORS.teal, size: 4, name: '', fixed: true, withLabel: false })
    };
    _jxg.objs = fns;
  }

  /* 更新对比曲线 */
  if (_jxg.objs.overlay) {
    _jxg.board.removeObject(_jxg.objs.overlay);
    _jxg.objs.overlay = null;
  }
  if (saved && saved.p) {
    const old = saved.p;
    _jxg.objs.overlay = _jxg.board.create('functiongraph',
      [x => old.a * x * x + old.b * x + old.c],
      { strokeColor: JXG_COLORS.muted, dash: 2, strokeWidth: 2 });
  }

  _jxg.board.update();
  showValuesQuad();
}

/* ── 主题 2：方程与不等式 ───────────────────────────── */
function drawEq() {
  const divId = 'jxg-eq';
  if (!_jxg.board || $('#visual').querySelector('#' + divId) === null) {
    destroyJxg();
    $('#visual').innerHTML = '<div id="' + divId + '" style="width:100%;height:340px"></div>';
    _jxg.board = createBoard(divId, jxgOpts());
    if (!_jxg.board) return;

    _jxg.objs = {
      parabola: _jxg.board.create('functiongraph', [x => x * x],
        { strokeColor: JXG_COLORS.blue, strokeWidth: 2 }),
      hline: _jxg.board.create('line',
        [[-6, () => p.k], [6, () => p.k]],
        { strokeColor: JXG_COLORS.teal, strokeWidth: 2 }),
      pt1: _jxg.board.create('point',
        [() => p.k >= 0 ? -Math.sqrt(p.k) : 0, () => p.k >= 0 ? p.k : 0],
        { color: JXG_COLORS.teal, size: 4, name: '', fixed: true, visible: () => p.k >= 0 }),
      pt2: _jxg.board.create('point',
        [() => p.k >= 0 ? Math.sqrt(p.k) : 0, () => p.k >= 0 ? p.k : 0],
        { color: JXG_COLORS.teal, size: 4, name: '', fixed: true, visible: () => p.k >= 0 })
    };
  }

  _jxg.board.update();
  showValuesEq();
}

/* ── 主题 3：单调性与奇偶性 ────────────────────────── */
function drawProp() {
  const divId = 'jxg-prop';
  const fns = [x => x * x, x => x * x + 2, x => (x - 1) ** 2, x => x * x * x];

  if (!_jxg.board || $('#visual').querySelector('#' + divId) === null || _jxg.objs._kind !== p.kind) {
    destroyJxg();
    $('#visual').innerHTML = '<div id="' + divId + '" style="width:100%;height:340px"></div>';
    _jxg.board = createBoard(divId, jxgOpts());
    if (!_jxg.board) return;

    _jxg.objs = {
      _kind: p.kind,
      curve: _jxg.board.create('functiongraph', [fns[p.kind]],
        { strokeColor: JXG_COLORS.blue, strokeWidth: 2 }),
      pBlue: _jxg.board.create('point',
        [() => p.x, () => fns[p.kind](p.x)],
        { color: JXG_COLORS.blue, size: 5, name: '', fixed: true }),
      pTeal: _jxg.board.create('point',
        [() => -p.x, () => fns[p.kind](-p.x)],
        { color: JXG_COLORS.teal, size: 5, name: '', fixed: true })
    };
  }

  _jxg.board.update();
  showValuesProp();
}

/* ── 主题 4：圆与圆周角 ────────────────────────────── */
function drawCircle() {
  const divId = 'jxg-circle';
  const R = 3;
  const rad = d => d * Math.PI / 180;
  const angA = () => 90 + p.cirArc / 2;
  const angB = () => 90 - p.cirArc / 2;
  const angC = () => angA() + 12 + (p.cirPos / 100) * (336 - p.cirArc);

  if (!_jxg.board || $('#visual').querySelector('#' + divId) === null) {
    destroyJxg();
    $('#visual').innerHTML = '<div id="' + divId + '" style="width:100%;height:340px"></div>';
    _jxg.board = createBoard(divId, jxgOpts([-4.2, 4.6, 4.2, -4.6]));
    if (!_jxg.board) return;

    const o = _jxg.board.create('point', [0, 0],
      { color: JXG_COLORS.muted, size: 3, name: 'O', fixed: true });
    const pt = (ang, name, color) => _jxg.board.create('point',
      [() => R * Math.cos(rad(ang())), () => R * Math.sin(rad(ang()))],
      { color, size: 4, name, fixed: true });

    const a = pt(angA, 'A', JXG_COLORS.teal),
      b = pt(angB, 'B', JXG_COLORS.teal),
      c = pt(angC, 'C', JXG_COLORS.blue);

    _jxg.objs = {
      circle: _jxg.board.create('circle', [[0, 0], R],
        { strokeColor: JXG_COLORS.axis, strokeWidth: 2, highlight: false }),
      o, a, b, c,
      oa: _jxg.board.create('segment', [o, a],
        { strokeColor: JXG_COLORS.teal, strokeWidth: 1.5, highlight: false }),
      ob: _jxg.board.create('segment', [o, b],
        { strokeColor: JXG_COLORS.teal, strokeWidth: 1.5, highlight: false }),
      ca: _jxg.board.create('segment', [c, a],
        { strokeColor: JXG_COLORS.blue, strokeWidth: 2.5, highlight: false }),
      cb: _jxg.board.create('segment', [c, b],
        { strokeColor: JXG_COLORS.blue, strokeWidth: 2.5, highlight: false })
    };
  }

  _jxg.board.update();
  showValuesCircle();
}

/* ── 主题 5：直线与圆的位置关系 ─────────────────────── */
function drawLineCircle() {
  const divId = 'jxg-lc';

  if (!_jxg.board || $('#visual').querySelector('#' + divId) === null) {
    destroyJxg();
    $('#visual').innerHTML = '<div id="' + divId + '" style="width:100%;height:340px"></div>';
    _jxg.board = createBoard(divId, jxgOpts([-6.5, 6.8, 6.5, -6.8]));
    if (!_jxg.board) return;

    const o = _jxg.board.create('point', [0, 0],
      { color: JXG_COLORS.muted, size: 3, name: 'O', fixed: true });
    const f = _jxg.board.create('point',
      [() => -3 * p.lcC / 25, () => -4 * p.lcC / 25],
      { color: JXG_COLORS.teal, size: 3, name: 'F', fixed: true });

    _jxg.objs = {
      o, f,
      circle: _jxg.board.create('circle', [[0, 0], () => p.lcR],
        { strokeColor: JXG_COLORS.blue, strokeWidth: 2 }),
      line: _jxg.board.create('functiongraph',
        [x => (-p.lcC - 3 * x) / 4],
        { strokeColor: JXG_COLORS.teal, strokeWidth: 2 }),
      of: _jxg.board.create('segment', [o, f],
        { strokeColor: JXG_COLORS.teal, strokeWidth: 1.5, dash: 2 }),
      dlabel: _jxg.board.create('text',
        [() => -3 * p.lcC / 50 + .4, () => -4 * p.lcC / 50, () => 'd = ' + n(Math.abs(p.lcC) / 5)],
        { color: JXG_COLORS.teal, fontSize: 13 })
    };
  }

  _jxg.board.update();
  showValuesLineCircle();
}

/* ── 主题 8：匀变速直线运动 ────────────────────────── */
function drawMotion() {
  const f = t => p.v * t + .5 * p.acc * t * t;
  const v = t => p.v + p.acc * t;
  const samples = [0, 6].map(t => f(t));
  if (p.acc && -p.v / p.acc > 0 && -p.v / p.acc < 6) samples.push(f(-p.v / p.acc));
  const bound = Math.max(5, ...samples.map(Math.abs));
  const vb = Math.max(5, Math.abs(v(0)), Math.abs(v(6)));

  const divId1 = 'jxg-xt', divId2 = 'jxg-vt';
  const needRebuild = !_jxg.board || !_jxg.objs.board2 ||
    $('#visual').querySelector('#' + divId1) === null;

  if (needRebuild) {
    destroyJxg();
    $('#visual').innerHTML =
      '<div id="' + divId1 + '" style="width:100%;height:250px"></div>' +
      '<div id="' + divId2 + '" style="width:100%;height:250px;margin-top:8px"></div>';

    const board1 = createBoard(divId1, jxgOpts([-0.5, bound + 1, 6.5, -(bound + 1)]));
    const board2 = createBoard(divId2, jxgOpts([-0.5, vb + 1, 6.5, -(vb + 1)]));
    if (!board1 || !board2) return;

    _jxg.board = board1;
    _jxg.objs = {
      board2: board2,
      curveXt: board1.create('functiongraph', [f],
        { strokeColor: JXG_COLORS.blue, strokeWidth: 2 }),
      ptXt: board1.create('point', [() => p.t, () => f(p.t)],
        { color: JXG_COLORS.blue, size: 5, name: '', fixed: true }),
      curveVt: board2.create('functiongraph', [v],
        { strokeColor: JXG_COLORS.teal, strokeWidth: 2 }),
      ptVt: board2.create('point', [() => p.t, () => v(p.t)],
        { color: JXG_COLORS.teal, size: 5, name: '', fixed: true })
    };
  }

  _jxg.board.update();
  if (_jxg.objs.board2) _jxg.objs.board2.update();
  showValuesMotion();
}

/* ── JSXGraph 主题的值显示辅助函数 ──────────────────── */
function showValuesQuad() {
  const values = [
    ['当前函数', tex(`$y=${n(p.a)}x^2${p.b < 0 ? '' : '+'}${n(p.b)}x${p.c < 0 ? '' : '+'}${n(p.c)}$`)],
    ['顶点', p.a ? tex(`$(${n(-p.b / (2 * p.a))},\\,${n(p.c - p.b * p.b / (4 * p.a))})$`) : '不适用'],
    ['开口方向', p.a > 0 ? '向上' : p.a < 0 ? '向下' : '非二次函数']
  ];
  stats(values);
  storeValues = values;
  renderMath($('#readout'));
}

function showValuesEq() {
  const root = Math.sqrt(Math.max(0, p.k));
  const sol = p.kind === 0
    ? (p.k < 0 ? '∅' : p.k === 0 ? '{0}' : tex(`$x=\\pm${n(root)}$`))
    : (p.k < 0 || p.k === 0 && p.kind === 1 ? '∅'
      : p.k === 0 ? '{0}'
      : tex(`${p.kind === 1 ? '(' : '['}-${n(root)},\\,${n(root)}${p.kind === 1 ? ')' : ']'}$`));
  const values = [
    ['实数解集（近似值）', sol],
    ['交点数量', p.k > 0 ? '2' : p.k === 0 ? '1' : '0'],
    ['比较关系', tex(['$x^2=k$', '$x^2<k$', '$x^2\\le k$'][p.kind])]
  ];
  stats(values);
  storeValues = values;
  renderMath($('#readout'));
}

function showValuesProp() {
  const f = [x => x * x, x => x * x + 2, x => (x - 1) ** 2, x => x * x * x][p.kind];
  const values = [
    [tex('$f(x)$') + ' · 蓝点', n(f(p.x))],
    [tex('$f(-x)$') + ' · 绿点', n(f(-p.x))],
    ['函数性质', ['偶函数', '偶函数', '非奇非偶', '奇函数'][p.kind]]
  ];
  stats(values);
  storeValues = values;
  renderMath($('#readout'));
}

function showValuesCircle() {
  const R = 3;
  const rad = d => d * Math.PI / 180;
  const ac = [R * Math.cos(rad(90 + p.cirArc / 2)), R * Math.sin(rad(90 + p.cirArc / 2))];
  const bc = [R * Math.cos(rad(90 - p.cirArc / 2)), R * Math.sin(rad(90 - p.cirArc / 2))];
  const cd = 90 + p.cirArc / 2 + 12 + (p.cirPos / 100) * (336 - p.cirArc);
  const cc = [R * Math.cos(rad(cd)), R * Math.sin(rad(cd))];
  const v1 = [ac[0] - cc[0], ac[1] - cc[1]], v2 = [bc[0] - cc[0], bc[1] - cc[1]];
  const cosv = (v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(v1[0], v1[1]) * Math.hypot(v2[0], v2[1]));
  const inscribed = Math.acos(Math.max(-1, Math.min(1, cosv))) * 180 / Math.PI;
  const values = [
    ['圆心角 ∠AOB', n(p.cirArc) + '°'],
    ['圆周角 ∠ACB（测量）', n(inscribed) + '°'],
    ['比值 ∠AOB : ∠ACB', n(p.cirArc / inscribed) + ' : 1']
  ];
  stats(values);
  storeValues = values;
}

function showValuesLineCircle() {
  const d = Math.abs(p.lcC) / 5;
  const eps = 1e-9;
  const values = [
    ['圆心距 d = |C| / 5', n(d)],
    ['位置关系', d < p.lcR - eps ? '相交 · 2 个公共点' : Math.abs(d - p.lcR) <= eps ? '相切 · 1 个公共点' : '相离 · 无公共点'],
    ['弦长', d < p.lcR - eps ? n(2 * Math.sqrt(p.lcR * p.lcR - d * d)) : Math.abs(d - p.lcR) <= eps ? '0' : '—']
  ];
  stats(values);
  storeValues = values;
}

function showValuesMotion() {
  const f = t => p.v * t + .5 * p.acc * t * t;
  const v = t => p.v + p.acc * t;
  const turn = p.acc ? -p.v / p.acc : -1;
  const dist = turn > 0 && turn < p.t
    ? Math.abs(f(turn)) + Math.abs(f(p.t) - f(turn))
    : Math.abs(f(p.t));

  const values = [
    ['当前速度', `${n(v(p.t))} m/s`],
    ['位移', `${n(f(p.t))} m`],
    ['路程', `${n(dist)} m`]
  ];
  stats(values);
  storeValues = values;
}
