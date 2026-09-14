/* 定理交互实验室 · 通用框架
   职责：为带 interactive 定义的定理渲染「SVG 图示 + 参数滑块 + 实时读数」组件，
   处理滑块输入与图上手柄（.th-handle）的指针拖拽，拖拽/滑动后重绘 SVG 并同步 UI。
   图示的几何内容由 theorem-labs.js 中的函数按参数实时计算生成，保证标注点
   永远落在正确的几何位置上。 */
(function(root) {
  "use strict";

  const VB_W = 640, VB_H = 320;

  function fmtNum(v) {
    if (typeof v !== 'number' || !isFinite(v)) return '—';
    const r = Math.round(v * 100) / 100;
    return (Object.is(r, -0) ? 0 : r).toString();
  }

  /* 把指针事件坐标换算为 SVG viewBox 坐标（考虑 letterbox） */
  function svgPoint(svg, evt) {
    const rect = svg.getBoundingClientRect();
    const scale = Math.min(rect.width / VB_W, rect.height / VB_H) || 1;
    const ox = (rect.width - VB_W * scale) / 2;
    const oy = (rect.height - VB_H * scale) / 2;
    return { x: (evt.clientX - rect.left - ox) / scale, y: (evt.clientY - rect.top - oy) / scale };
  }

  function mount(container, theorem) {
    if (!container || !theorem) return;
    const def = theorem.interactive;
    if (!def || !def.render) return;

    container.classList.add('theorem-lab');
    container.innerHTML = `
      <div class="lab-stage"><svg viewBox="0 0 ${VB_W} ${VB_H}" role="img" aria-label="${theorem.name} 交互图"></svg></div>
      <div class="lab-panel">
        <div class="lab-sliders"></div>
        <div class="lab-readout"></div>
      </div>
      <div class="lab-hint">拖动图中的圆点或滑块改变参数，观察结论如何保持成立</div>
    `;

    const svg = container.querySelector('svg');
    const slidersBox = container.querySelector('.lab-sliders');
    const readoutEl = container.querySelector('.lab-readout');

    const params = Object.assign({}, def.defaults || {});
    const sliderRefs = [];
    (def.params || []).forEach(pr => {
      params[pr.key] = pr.value;
      if (pr.hidden) return;
      const row = document.createElement('label');
      row.className = 'lab-slider';
      row.innerHTML = `
        <span class="lab-slider-name">${pr.label}</span>
        <input type="range" min="${pr.min}" max="${pr.max}" step="${pr.step}" value="${pr.value}" />
        <span class="lab-slider-val"></span>`;
      const input = row.querySelector('input');
      const val = row.querySelector('.lab-slider-val');
      input.addEventListener('input', () => {
        const prev = params[pr.key];
        params[pr.key] = parseFloat(input.value);
        if (def.clamp) def.clamp(params, pr.key, prev);
        repaint();
      });
      slidersBox.appendChild(row);
      sliderRefs.push({ pr, input, val });
    });

    let activeHandle = null;

    svg.addEventListener('pointerdown', evt => {
      const grip = evt.target.closest ? evt.target.closest('.th-handle') : null;
      if (!grip) return;
      activeHandle = grip.dataset.h;
      try { svg.setPointerCapture(evt.pointerId); } catch (_) {}
      evt.preventDefault();
    });
    svg.addEventListener('pointermove', evt => {
      if (!activeHandle || !def.onDrag) return;
      const pt = svgPoint(svg, evt);
      const prev = Object.assign({}, params);
      def.onDrag(params, activeHandle, pt.x, pt.y);
      if (def.clamp) def.clamp(params, 'drag', prev);
      repaint();
    });
    const release = () => { activeHandle = null; };
    svg.addEventListener('pointerup', release);
    svg.addEventListener('pointercancel', release);
    svg.addEventListener('pointerleave', release);

    function syncControls() {
      sliderRefs.forEach(r => {
        const v = params[r.pr.key];
        r.input.value = v;
        r.val.textContent = fmtNum(v);
      });
    }

    function repaint() {
      let inner = '';
      try { inner = def.render(params, theorem.id) || ''; } catch (err) { inner = ''; }
      svg.innerHTML = inner;
      svg.querySelectorAll('.th-handle').forEach(h => h.setAttribute('tabindex', '0'));
      if (def.readout) {
        let items = [];
        try { items = def.readout(params) || []; } catch (_) {}
        readoutEl.innerHTML = items.map(it => `
          <span class="lab-chip ${it.tone ? 'tone-' + it.tone : ''}">
            <span class="lab-chip-label">${it.label}</span>
            <span class="lab-chip-value">${it.value}</span>
          </span>`).join('');
      }
      syncControls();
    }

    syncControls();
    repaint();
  }

  function mountAll(scope) {
    const data = root.TheoremData;
    if (!data || !data.theorems) return;
    (scope || document).querySelectorAll('.theorem-lab[data-lab]').forEach(el => {
      if (el.dataset.mounted) return;
      const t = data.theorems.find(x => x.id === el.dataset.lab);
      if (!t) return;
      el.dataset.mounted = '1';
      mount(el, t);
    });
  }

  root.TheoremLab = { mount, mountAll, fmtNum };
})(typeof window === 'undefined' ? globalThis : window);
