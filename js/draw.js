/**
 * 可视化绘图模块
 * 主题 0（集合维恩图）和 4（路程位移时间轴）使用原生 SVG
 * 主题 1-3（函数图像）和 5（运动学双图）使用 JSXGraph
 * 主题 6（受力分析）使用原生 SVG
 */

let storeValues = [];

/* ── JSXGraph 暖色调默认配置 ─────────────────────────── */
const JXG_COLORS = {
  blue: '#c85a3a',
  teal: '#2a8f7e',
  grid: '#e8e0d4',
  axis: '#9aaebf',
  text: '#8a7e6b',
  muted: '#97a8be'
};

function jxgOpts(h, bb) {
  return {
    boundingbox: bb || [-5.5, 8.5, 5.5, -4.5],
    keepaspectratio: true,
    axis: false,
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

/* ── 主绘图调度 ─────────────────────────────────────── */
function draw() {
  destroyBoards();
  let s = '', values = [];

  if (idx === 0) {
    /* ── 集合与集合运算（维恩图 · 保留 SVG）──────────── */
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
      ['当前运算结果', fmt(result)],
      ['集合 A', fmt(setList(v => v & 1))],
      ['集合 B', fmt(setList(v => v & 2))]
    ];
  }

  if (idx === 1) {
    /* ── 二次函数的参数（JSXGraph）──────────────────── */
    $('#visual').innerHTML = '<div id="jxg-quad" style="width:100%;height:340px"></div>';
    const board = createBoard('jxg-quad', jxgOpts(340));
    if (board) {
      const sa = board.create('slider', [[-4, -3.5], [2, -3.5], [-3, 1, 3]], { name: 'a', color: JXG_COLORS.blue });
      const sb = board.create('slider', [[-4, -4], [2, -4], [-5, 0, 5]], { name: 'b', color: JXG_COLORS.blue });
      const sc = board.create('slider', [[-4, -4.5], [2, -4.5], [-5, 0, 5]], { name: 'c', color: JXG_COLORS.blue });
      sa.Value = () => p.a; sb.Value = () => p.b; sc.Value = () => p.c;

      const f = board.create('functiongraph', [x => sa.Value() * x * x + sb.Value() * x + sc.Value()],
        { strokeColor: JXG_COLORS.blue, strokeWidth: 2 });

      const old = saved?.p;
      if (old) {
        board.create('functiongraph', [x => old.a * x * x + old.b * x + old.c],
          { strokeColor: JXG_COLORS.muted, dash: 2, strokeWidth: 2 });
      }

      const vx = board.create('point', [() => p.a ? -p.b / (2 * p.a) : 0, () => p.a ? p.c - p.b * p.b / (4 * p.a) : 0],
        { color: JXG_COLORS.teal, size: 4, name: '', fixed: true, withLabel: false });

      const update = () => {
        p.a = sa.Value(); p.b = sb.Value(); p.c = sc.Value();
        vx.moveTo(p.a ? [-p.b / (2 * p.a), p.c - p.b * p.b / (4 * p.a)] : [0, 0]);
        showValuesQuad();
      };
      sa.on('drag', update); sb.on('drag', update); sc.on('drag', update);
      showValuesQuad();
    }
    return;
  }

  if (idx === 2) {
    /* ── 方程与不等式（JSXGraph）────────────────────── */
    $('#visual').innerHTML = '<div id="jxg-eq" style="width:100%;height:340px"></div>';
    const board = createBoard('jxg-eq', jxgOpts(340));
    if (board) {
      const parabola = board.create('functiongraph', [x => x * x],
        { strokeColor: JXG_COLORS.blue, strokeWidth: 2 });

      const hline = board.create('line', [[-6, () => p.k], [6, () => p.k]],
        { strokeColor: JXG_COLORS.teal, strokeWidth: 2 });

      const pts = board.create('point', [
        () => p.k >= 0 ? -Math.sqrt(p.k) : 0,
        () => p.k >= 0 ? p.k : 0
      ], { color: JXG_COLORS.teal, size: 4, name: '', fixed: true, visible: () => p.k >= 0 });
      const pts2 = board.create('point', [
        () => p.k >= 0 ? Math.sqrt(p.k) : 0,
        () => p.k >= 0 ? p.k : 0
      ], { color: JXG_COLORS.teal, size: 4, name: '', fixed: true, visible: () => p.k >= 0 });

      const sc = board.create('slider', [[-4, -4], [3, -4], [-3, 1, 6]], { name: 'k', color: JXG_COLORS.teal });
      sc.Value = () => p.k;
      sc.on('drag', () => { p.k = sc.Value(); showValuesEq(); });

      showValuesEq();
    }
    return;
  }

  if (idx === 3) {
    /* ── 单调性与奇偶性（JSXGraph）──────────────────── */
    $('#visual').innerHTML = '<div id="jxg-prop" style="width:100%;height:340px"></div>';
    const board = createBoard('jxg-prop', jxgOpts(340));
    if (board) {
      const fns = [x => x * x, x => x * x + 2, x => (x - 1) ** 2, x => x * x * x];
      const f = board.create('functiongraph', [fns[p.kind]],
        { strokeColor: JXG_COLORS.blue, strokeWidth: 2 });

      const pBlue = board.create('point', [() => p.x, () => fns[p.kind](p.x)],
        { color: JXG_COLORS.blue, size: 5, name: '', fixed: true });
      const pTeal = board.create('point', [() => -p.x, () => fns[p.kind](-p.x)],
        { color: JXG_COLORS.teal, size: 5, name: '', fixed: true });

      const sx = board.create('slider', [[-4, -4], [3, -4], [-3, 2, 3]], { name: 'x', color: JXG_COLORS.blue });
      sx.Value = () => p.x;
      sx.on('drag', () => { p.x = sx.Value(); showValuesProp(); });

      showValuesProp();
    }
    return;
  }

  if (idx === 4) {
    /* ── 路程与位移（保留 SVG）──────────────────────── */
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

  if (idx === 5) {
    /* ── 匀变速直线运动 · x–t + v–t 双图（JSXGraph）── */
    $('#visual').innerHTML =
      '<div id="jxg-xt" style="width:100%;height:250px"></div>' +
      '<div id="jxg-vt" style="width:100%;height:250px;margin-top:8px"></div>';

    const board1 = createBoard('jxg-xt', jxgOpts(250, [-0.5, null, 6.5, null]));
    const board2 = createBoard('jxg-vt', jxgOpts(250, [-0.5, null, 6.5, null]));
    if (board1 && board2) {
      const samples = [0, 6].map(t => p.v * t + .5 * p.acc * t * t);
      if (p.acc && -p.v / p.acc > 0 && -p.v / p.acc < 6) samples.push(p.v * (-p.v / p.acc) + .5 * p.acc * (-p.v / p.acc) ** 2);
      const bound = Math.max(5, ...samples.map(Math.abs));
      const vb = Math.max(5, Math.abs(p.v), Math.abs(p.v + p.acc * 6));
      board1.setBoundingBox([-0.5, bound + 1, 6.5, -(bound + 1)], true);
      board2.setBoundingBox([-0.5, vb + 1, 6.5, -(vb + 1)], true);

      const f = t => p.v * t + .5 * p.acc * t * t;
      const v = t => p.v + p.acc * t;

      const curveXt = board1.create('functiongraph', [f],
        { strokeColor: JXG_COLORS.blue, strokeWidth: 2 });
      const ptXt = board1.create('point', [() => p.t, () => f(p.t)],
        { color: JXG_COLORS.blue, size: 5, name: '', fixed: true });

      const curveVt = board2.create('functiongraph', [v],
        { strokeColor: JXG_COLORS.teal, strokeWidth: 2 });
      const ptVt = board2.create('point', [() => p.t, () => v(p.t)],
        { color: JXG_COLORS.teal, size: 5, name: '', fixed: true });

      const st = board1.create('slider', [[0.5, -(bound + 0.3)], [5, -(bound + 0.3)], [0, 0, 6]],
        { name: 't', color: JXG_COLORS.blue });
      st.Value = () => p.t;

      const syncTime = () => {
        p.t = st.Value();
        ptXt.moveTo([p.t, f(p.t)]);
        ptVt.moveTo([p.t, v(p.t)]);
        showValuesMotion();
      };
      st.on('drag', syncTime);
      board2.on('update', () => { ptVt.moveTo([p.t, v(p.t)]); });

      showValuesMotion();
    }
    return;
  }

  if (idx === 6) {
    /* ── 力、质量与加速度（保留 SVG）────────────────── */
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

/* ── JSXGraph 主题的值显示辅助函数 ──────────────────── */
function showValuesQuad() {
  const values = [
    ['当前函数', tex(`$y=${n(p.a)}x^2${p.b < 0 ? '' : '+'}${n(p.b)}x${p.c < 0 ? '' : '+'}${n(p.c)}$`)],
    ['顶点', p.a ? tex `$(${n(-p.b / (2 * p.a))}),\\,${n(p.c - p.b * p.b / (4 * p.a))})$` : '不适用'],
    ['开口方向', p.a > 0 ? '向上' : p.a < 0 ? '向下' : '非二次函数']
  ];
  stats(values);
  storeValues = values;
  renderMath($('#readout'));
}

function showValuesEq() {
  const root = Math.sqrt(Math.max(0, p.k));
  const sol = p.kind === 0
    ? (p.k < 0 ? '∅' : p.k === 0 ? '{0}' : tex `$x=\\pm${n(root)}$`)
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
