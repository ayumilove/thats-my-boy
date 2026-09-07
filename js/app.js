/**
 * 主应用入口
 * 状态管理、渲染调度、交互控件、事件绑定
 */

/* ── 全局状态 ──────────────────────────────────────────── */
let idx = 0, stage = 0;
let choice = null, checked = false;
let exchoice = null, exchecked = false;
let transfer = false, tchoice = null, tchecked = false;
let p = {}, members = {}, op = 'intersection';
let selected = 2, saved = null, timer = null;

/* ── 初始化 / 重置 ────────────────────────────────────── */
function init(i) {
  clearInterval(timer);
  timer = null;
  idx = i;
  stage = 0;
  choice = null;
  checked = false;
  exchoice = null;
  exchecked = false;
  transfer = false;
  tchoice = null;
  tchecked = false;
  saved = null;
  op = 'intersection';
  p = { a: 1, b: 0, c: 0, k: 1, x: 2, kind: 0, right: 6, left: 2, v: 4, acc: -2, t: 0, fr: 10, fl: 2, m: 2 };
  members = { 1: 1, 2: 1, 3: 3, 4: 3, 5: 2, 6: 2, 7: 0, 8: 0 };
  render();
}

/* ── 主渲染调度 ────────────────────────────────────────── */
function render() {
  const d = topics[idx];

  /* 导航 */
  $('#mathnav').innerHTML = topics.slice(0, 4).map((t, i) => nav(t, i)).join('');
  $('#physnav').innerHTML = topics.slice(4).map((t, i) => nav(t, i + 4)).join('');
  document.querySelectorAll('[data-topic]').forEach(b => b.onclick = () => init(+b.dataset.topic));

  /* 面包屑 & 标题 */
  $('#crumb').textContent = d.name;
  $('#category').textContent = (idx < 4 ? 'MATHEMATICS / 数学' : 'PHYSICS / 物理') + ' · ' + String(idx + 1).padStart(2, '0');
  $('#title').textContent = d.name;
  $('#subtitle').textContent = d.desc;

  /* 思考工具 */
  $('#tiptitle').textContent = d.tip;
  $('#tip').textContent = d.tool;
  $('#footnote').textContent = d.note;

  /* 实验提示 */
  $('#labhint').textContent = stage === 0 ? '先作出你的预测' : '调整变量，寻找证据';

  /* 步骤条 */
  $('#steps').innerHTML = ['预测', '实验', '解释'].map((s, i) =>
    `<div class="step ${i === stage ? 'current' : i < stage ? 'done' : ''}">`
    + `<b>${i < stage ? '✓' : i + 1}</b>${s}`
    + `<span>${['提出你的猜想', '用变化验证', '说清背后的原因'][i]}</span></div>`
  ).join('');

  renderControls();
  draw();
  task();
  showComparison();
}

/* ── 导航按钮 ──────────────────────────────────────────── */
function nav(t, i) {
  return `<button data-topic="${i}" class="${i === idx ? 'active' : ''}">`
    + `<span class="navicon">${t.icon}</span>${t.name}</button>`;
}

/* ── 选项按钮组 ────────────────────────────────────────── */
function options(arr, val, key) {
  return arr.map((a, i) =>
    `<button class="option ${val === i ? 'selected' : ''}" data-${key}="${i}" aria-pressed="${val === i}">`
    + `<span class="letter">${'ABC'[i]}</span>${a}</button>`
  ).join('');
}

/* ── 任务面板（三阶段 + 迁移挑战）────────────────────── */
function task() {
  const d = topics[idx];
  let html = '';

  if (stage === 0) {
    /* 预测阶段 */
    html = `<span class="badge">01 · 先预测</span>`
      + `<h2>你的直觉是什么？</h2>`
      + `<p class="question">${tex(d.q)}</p>`
      + options(d.opts, choice, 'predict')
      + `<button class="primary" id="start" ${choice === null ? 'disabled' : ''}>带着预测，开始实验 →</button>`
      + `<p class="notes">猜错也没关系，实验会帮助你修正理解。</p>`;
  } else if (stage === 1) {
    /* 实验阶段 */
    const hints = [
      '选中元素 2，把它拖到"A 与 B"区域，观察交集；再切换到并集比较。',
      '固定 a=1、b=0，拖动 c 到 2。然后保留一组结果，分别改变 a 和 b。',
      '把 k 从 1 慢慢拖到 −1，观察交点数量；切换不等式，留意端点。',
      '切换不同函数，拖动 x，比较 f(x) 与 f(−x)，再观察整个图像。',
      '拖动右行、左行距离，尝试让物体返回原点，再越过原点。',
      '保留默认参数，播放或拖动时间到 2 s、4 s，对比两幅图。',
      '先固定两个力，把质量从 2 kg 改为 4 kg。再让左右两个力相等。'
    ];
    html = `<span class="badge">02 · 做实验</span>`
      + `<h2>让变化给你证据</h2>`
      + `<p class="question">${tex(hints[idx])}</p>`
      + `<div class="notes">你的预测：${d.opts[choice]}</div>`
      + (checked ? `<div class="feedback ${choice !== d.answer ? 'wrong' : ''}">${choice === d.answer ? '预测得到验证。' : '试着修正最初的判断。'}${tex(d.why)}</div>` : '')
      + `<button class="primary" id="observe">${checked ? '我理解了，解释原因 →' : '查看实验结论'}</button>`
      + `<p class="notes">试试"保留对比"，检查改变前后的差异。</p>`;
  } else if (!transfer) {
    /* 解释阶段 */
    html = `<span class="badge">03 · 解释</span>`
      + `<h2>不只看到，还要说清</h2>`
      + `<p class="question">${tex(d.eq)}</p>`
      + options(d.eopts, exchoice, 'explain')
      + (exchecked ? `<div class="feedback ${exchoice !== d.ea ? 'wrong' : ''}">${exchoice === d.ea ? '解释正确。' : '再想一想。'}${tex(d.ewhy)}</div>` : '')
      + `<button class="primary" id="excheck" ${exchoice === null ? 'disabled' : ''}>${exchecked && exchoice === d.ea ? '换个情境，再试一次 →' : '检验解释'}</button>`;
  } else {
    /* 迁移挑战 */
    const trainingLinks = d.relatedTraining
      ? '<div class="training-hint"><strong>需要补基础？</strong><p>' + d.relatedTraining.map(i => {
          const names = ['时刻与中点','平均量与单位','倍数与列式','中时速度','等距离不等时间','负数与不等号','二次不等式','穿根法与重根'];
          return `<a href="training.html#module=${i}" class="training-link">${names[i]}</a>`;
        }).join(' · ') + '</p></div>'
      : '';
    html = `<span class="badge">迁移挑战</span>`
      + `<h2>换个条件，你会了吗？</h2>`
      + `<p class="question">${tex(d.transfer)}</p>`
      + options(d.topts, tchoice, 'transfer')
      + (tchecked ? `<div class="feedback ${tchoice !== d.ta ? 'wrong' : ''}">${tchoice === d.ta ? '挑战完成！' : '还差一步。'}${tex(d.twhy)}</div>` : '')
      + `<button class="primary" id="tcheck" ${tchoice === null ? 'disabled' : ''}>${tchecked && tchoice === d.ta ? '探索下一个专题 →' : '检验判断'}</button>`
      + (tchecked && tchoice === d.ta ? trainingLinks : '');
  }

  $('#task').innerHTML = html;
  renderMath($('#task'));

  /* 事件绑定 */
  document.querySelectorAll('[data-predict]').forEach(b =>
    b.onclick = () => { choice = +b.dataset.predict; task(); });
  document.querySelectorAll('[data-explain]').forEach(b =>
    b.onclick = () => { exchoice = +b.dataset.explain; exchecked = false; task(); });
  document.querySelectorAll('[data-transfer]').forEach(b =>
    b.onclick = () => { tchoice = +b.dataset.transfer; tchecked = false; task(); });

  if ($('#start'))
    $('#start').onclick = () => { stage = 1; render(); };
  if ($('#observe'))
    $('#observe').onclick = () => { if (checked) { stage = 2; render(); } else { checked = true; task(); } };
  if ($('#excheck'))
    $('#excheck').onclick = () => { if (exchecked && exchoice === d.ea) transfer = true; else exchecked = true; task(); };
  if ($('#tcheck'))
    $('#tcheck').onclick = () => { if (tchecked && tchoice === d.ta) init((idx + 1) % topics.length); else { tchecked = true; task(); } };
}

/* ── 滑块控件 ──────────────────────────────────────────── */
function slider(key, label, min, max, step = 1) {
  return `<label class="control"><span>${label}</span>`
    + `<input aria-label="${label}" type="range" data-key="${key}" min="${min}" max="${max}" step="${step}" value="${p[key]}" ${stage === 0 ? 'disabled' : ''}>`
    + `<output id="out-${key}">${n(p[key])}</output></label>`;
}

/* ── 控件面板渲染 ──────────────────────────────────────── */
function renderControls() {
  let html = stage === 0 ? '<div class="lockednote">先在右侧选择预测，再解锁实验。</div>' : '';
  $('#toolbar').innerHTML = '';

  /* 集合运算 */
  if (idx === 0) {
    $('#toolbar').innerHTML = [
      ['intersection', 'A ∩ B · 交集'],
      ['union', 'A ∪ B · 并集'],
      ['complement', '∁ᵤ A · 补集']
    ].map(([v, t]) => `<button class="pill ${op === v ? 'active' : ''}" data-op="${v}">${t}</button>`).join('');

    html += '<div class="notes">拖动圆点到区域；也可先点选数字，再点击目标区域。</div>';
    html += '<div class="tokens">' + Object.keys(members).map(k =>
      `<button aria-label="选择元素 ${k}" class="token ${+k === selected ? 'selected' : ''}" draggable="${stage > 0}" data-num="${k}" ${stage === 0 ? 'disabled' : ''}>${k}</button>`
    ).join('') + '</div>';
    html += '<div class="zones">' + ['均不属于', '仅 A', '仅 B', 'A 与 B'].map((v, i) =>
      `<button class="zone" data-zone="${i}" ${stage === 0 ? 'disabled' : ''}>${v}</button>`
    ).join('') + '</div>';
  }

  /* 二次函数 */
  if (idx === 1)
    html += slider('a', '系数 a', -3, 3, .1) + slider('b', '系数 b', -5, 5, .1) + slider('c', '系数 c', -5, 5, .1);

  /* 方程与不等式 */
  if (idx === 2) {
    $('#toolbar').innerHTML = ['x² = k', 'x² < k', 'x² ≤ k'].map((v, i) =>
      `<button data-eq="${i}" class="pill ${p.kind === i ? 'active' : ''}">${v}</button>`
    ).join('');
    html += slider('k', '水平线 k', -3, 6, .1);
  }

  /* 单调性与奇偶性 */
  if (idx === 3)
    html += `<label class="control"><span>函数</span><select aria-label="函数" id="function" ${stage === 0 ? 'disabled' : ''}>`
      + '<option value="0">x²</option><option value="1">x² + 2</option><option value="2">(x − 1)²</option><option value="3">x³</option>'
      + '</select></label>' + slider('x', '取样点 x', -3, 3, .1);

  /* 路程与位移 */
  if (idx === 4)
    html += slider('right', '向右距离 / m', 0, 10, .5) + slider('left', '向左距离 / m', 0, 10, .5);

  /* 匀变速直线运动 */
  if (idx === 5)
    html += `<div class="playrow">`
      + `<button class="quiet" id="play" ${stage === 0 ? 'disabled' : ''}>${timer ? 'Ⅱ 暂停' : '▷ 播放'}</button>`
      + `<button class="quiet" id="step" ${stage === 0 ? 'disabled' : ''}>前进 0.1 s</button>`
      + `<button class="quiet" id="rewind" ${stage === 0 ? 'disabled' : ''}>回到起点</button>`
      + '</div>'
      + slider('v', '初速度 / m·s⁻¹', -5, 5, .5)
      + slider('acc', '加速度 / m·s⁻²', -3, 3, .5)
      + '<div class="notes">拖动 x–t 图上的滑块 t 观察运动。</div>';

  /* 力、质量与加速度 */
  if (idx === 6)
    html += slider('fr', '向右力 / N', 0, 20, 1) + slider('fl', '向左力 / N', 0, 20, 1) + slider('m', '质量 / kg', 1, 10, .5);

  $('#controls').innerHTML = html;

  /* 滑块事件 */
  document.querySelectorAll('[data-key]').forEach(e =>
    e.oninput = () => {
      p[e.dataset.key] = +e.value;
      $('#out-' + e.dataset.key).textContent = n(+e.value);
      draw();
      showComparison();
    });

  /* 集合运算切换 */
  document.querySelectorAll('[data-op]').forEach(b =>
    b.onclick = () => { op = b.dataset.op; renderControls(); draw(); });

  /* 方程类型切换 */
  document.querySelectorAll('[data-eq]').forEach(b =>
    b.onclick = () => { p.kind = +b.dataset.eq; renderControls(); draw(); });

  /* 函数选择 */
  if ($('#function')) {
    $('#function').value = p.kind;
    $('#function').onchange = e => { p.kind = +e.target.value; draw(); };
  }

  /* 集合元素拖放 */
  document.querySelectorAll('[data-num]').forEach(b => {
    b.onclick = () => { selected = +b.dataset.num; renderControls(); };
    b.ondragstart = e => e.dataTransfer.setData('text/plain', b.dataset.num);
  });
  document.querySelectorAll('[data-zone]').forEach(b => {
    b.onclick = () => move(selected, +b.dataset.zone);
    b.ondragover = e => e.preventDefault();
    b.ondrop = e => { e.preventDefault(); move(+e.dataTransfer.getData('text/plain'), +b.dataset.zone); };
  });

  /* 播放控制 */
  if ($('#play')) {
    $('#play').onclick = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      } else {
        if (p.t >= 6) p.t = 0;
        timer = setInterval(() => {
          p.t = Math.min(6, Math.round((p.t + .05) * 100) / 100);
          updateTime();
          if (p.t >= 6) { clearInterval(timer); timer = null; $('#play').textContent = '▷ 播放'; }
        }, 50);
      }
      $('#play').textContent = timer ? 'Ⅱ 暂停' : '▷ 播放';
    };
    $('#step').onclick = () => {
      clearInterval(timer); timer = null;
      p.t = Math.min(6, p.t + .1);
      updateTime();
      $('#play').textContent = '▷ 播放';
    };
    $('#rewind').onclick = () => {
      clearInterval(timer); timer = null;
      p.t = 0;
      updateTime();
      $('#play').textContent = '▷ 播放';
    };
  }
}

/* ── 时间更新（播放时）────────────────────────────────── */
function updateTime() {
  const e = document.querySelector('[data-key=t]');
  if (e) e.value = p.t;
  if ($('#out-t')) $('#out-t').textContent = n(p.t);
  draw();
  showComparison();
}

/* ── 集合元素移动 ──────────────────────────────────────── */
function move(k, z) {
  if (stage === 0 || !Object.hasOwn(members, k)) return;
  members[k] = z;
  selected = k;
  renderControls();
  draw();
  showComparison();
}

/* ── 对比快照 ──────────────────────────────────────────── */
function showComparison() {
  $('#clearcompare').hidden = !saved;
  $('#snapshot').disabled = stage === 0;
  $('#comparison').innerHTML = saved
    ? '<strong>已保留的实验</strong><p class="notes">' + saved.label + '</p>'
      + '<div class="comparevalues">' + saved.values.map(([k, v]) => `<span>${k}：${v}</span>`).join('') + '</div>'
    : '';
}

/* ── 全局事件绑定 ──────────────────────────────────────── */
$('#snapshot').onclick = () => {
  saved = {
    p: { ...p },
    values: storeValues.map(a => [...a]),
    label: idx === 0
      ? 'A=' + fmt(setList(v => v & 1)) + '；B=' + fmt(setList(v => v & 2))
      : Array.from(document.querySelectorAll('[data-key]'))
          .map(e => e.getAttribute('aria-label') + ' = ' + n(+e.value)).join(' · ')
  };
  draw();
  showComparison();
};

$('#clearcompare').onclick = () => { saved = null; draw(); showComparison(); };
$('#reset').onclick = () => init(idx);

/* ── 启动 ──────────────────────────────────────────────── */
const hashTopic = location.hash.match(/topic=(\d)/);
init(hashTopic ? +hashTopic[1] : 0);
