/**
 * 可视化绘图模块
 * 根据当前主题 idx 生成对应的 SVG 交互示意图
 * 新增专题时，在此添加对应的 draw 分支
 */

let storeValues = [];

/* ── 主绘图调度 ────────────────────────────────────────── */
function draw() {
  let s = '', values = [];

  if (idx === 0) {
    /* ── 集合与集合运算（维恩图）────────────────────────── */
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
    s += '<ellipse cx="260" cy="161" rx="145" ry="113" fill="none" stroke="#2364e7" stroke-width="2"/>';
    s += '<ellipse cx="390" cy="161" rx="145" ry="113" fill="none" stroke="#009c96" stroke-width="2"/>';
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
    /* ── 二次函数的参数 ───────────────────────────────── */
    const fn = x => p.a * x * x + p.b * x + p.c;
    const old = saved?.p;
    s = plot(fn, {
      overlay: old ? x => old.a * x * x + old.b * x + old.c : null,
      points: p.a ? [[-p.b / (2 * p.a), p.c - p.b * p.b / (4 * p.a)]] : []
    });
    values = [
      ['当前函数', `y=${n(p.a)}x²${p.b < 0 ? '' : '+'}${n(p.b)}x${p.c < 0 ? '' : '+'}${n(p.c)}`],
      ['顶点', p.a ? `(${n(-p.b / (2 * p.a))}, ${n(p.c - p.b * p.b / (4 * p.a))})` : '不适用'],
      ['开口方向', p.a > 0 ? '向上' : p.a < 0 ? '向下' : '非二次函数']
    ];
  }

  if (idx === 2) {
    /* ── 方程与不等式 ─────────────────────────────────── */
    const root = Math.sqrt(Math.max(0, p.k));
    const pts = p.k >= 0 ? [[-root, p.k, teal], [root, p.k, teal]] : [];
    s = plot(x => x * x, {
      level: p.k,
      points: pts,
      shade: p.kind && p.k > 0 ? [-root, root] : null
    });
    const sol = p.kind === 0
      ? (p.k < 0 ? '∅' : p.k === 0 ? '{0}' : `x=±${n(root)}`)
      : (p.k < 0 || p.k === 0 && p.kind === 1 ? '∅'
        : p.k === 0 ? '{0}'
        : `${p.kind === 1 ? '(' : '['}−${n(root)}, ${n(root)}${p.kind === 1 ? ')' : ']'}`);
    values = [
      ['实数解集（近似值）', sol],
      ['交点数量', p.k > 0 ? '2' : p.k === 0 ? '1' : '0'],
      ['比较关系', ['x² = k', 'x² < k', 'x² ≤ k'][p.kind]]
    ];
  }

  if (idx === 3) {
    /* ── 单调性与奇偶性 ───────────────────────────────── */
    const f = [x => x * x, x => x * x + 2, x => (x - 1) ** 2, x => x * x * x][p.kind];
    s = plot(f, {
      points: [[p.x, f(p.x), blue], [-p.x, f(-p.x), teal]]
    });
    values = [
      ['f(x) · 蓝点', n(f(p.x))],
      ['f(−x) · 绿点', n(f(-p.x))],
      ['函数性质', ['偶函数', '偶函数', '非奇非偶', '奇函数'][p.kind]]
    ];
  }

  if (idx === 4) {
    /* ── 路程与位移 ───────────────────────────────────── */
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
    /* ── 匀变速直线运动（x–t + v–t 双图）────────────── */
    const f = t => p.v * t + .5 * p.acc * t * t;
    const v = t => p.v + p.acc * t;
    const samples = [f(0), f(6)];
    if (p.acc && -p.v / p.acc > 0 && -p.v / p.acc < 6) samples.push(f(-p.v / p.acc));
    const bound = Math.max(5, ...samples.map(Math.abs));
    const vb = Math.max(5, Math.abs(v(0)), Math.abs(v(6)));

    s = '';
    s += `<svg x="0" y="0" width="640" height="240" viewBox="0 0 640 240">${plot(f, { h: 240, xmin: 0, xmax: 6, ymin: -bound, ymax: bound, points: [[p.t, f(p.t)]], xlabel: 't / s', ylabel: 'x / m' })}</svg>`;
    s += `<svg x="0" y="250" width="640" height="240" viewBox="0 0 640 240">${plot(v, { h: 240, xmin: 0, xmax: 6, ymin: -vb, ymax: vb, points: [[p.t, v(p.t), teal]], xlabel: 't / s', ylabel: 'v / m·s⁻¹' })}</svg>`;
    s += line(50, 525, 590, 525, '#b5c4d3', 2) + line(320, 517, 320, 534, '#72869c');
    s += dot(320 + f(p.t) / bound * 250, 525, blue, 9);
    s += txt(48, 551, `−${n(bound)} m`) + txt(309, 551, '0') + txt(543, 551, `+${n(bound)} m`);

    const turn = p.acc ? -p.v / p.acc : -1;
    const dist = turn > 0 && turn < p.t
      ? Math.abs(f(turn)) + Math.abs(f(p.t) - f(turn))
      : Math.abs(f(p.t));

    values = [
      ['当前速度', `${n(v(p.t))} m/s`],
      ['位移', `${n(f(p.t))} m`],
      ['路程', `${n(dist)} m`]
    ];
  }

  if (idx === 6) {
    /* ── 力、质量与加速度 ─────────────────────────────── */
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

  /* ── 输出 ────────────────────────────────────────────── */
  $('#visual').innerHTML = wrap(s, idx === 5 ? 565 : 320);
  stats(values);
  storeValues = values;

  /* ── 集合元素拖放交互 ───────────────────────────────── */
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
