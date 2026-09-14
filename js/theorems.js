/* 定理列表页渲染逻辑 */
(function() {
  "use strict";
  const data = window.TheoremData;
  if (!data) return;

  const theorems = data.theorems;
  const categories = [...new Set(theorems.map(t => t.category))];
  let activeCategory = null;

  function render() {
    const container = document.getElementById('theorem-list');
    if (!container) return;

    const filtered = activeCategory
      ? theorems.filter(t => t.category === activeCategory)
      : theorems;

    container.innerHTML = filtered.map(t => `
      <div class="theorem-card" id="theorem-${t.id}">
        <div class="theorem-header">
          <h3>${t.name}</h3>
          <span class="theorem-category">${t.category}</span>
        </div>
        <div class="theorem-body">
          ${t.interactive
            ? `<div class="theorem-lab" data-lab="${t.id}"></div>`
            : `<div class="theorem-diagram">${t.diagram}</div>`}
          <div class="theorem-content">
            <div class="theorem-statement">${renderMath(t.statement)}</div>
            <details class="theorem-proof">
              <summary>证明过程</summary>
              <div class="proof-steps">
                ${t.proof.map((step, i) => `<div class="proof-step"><span class="step-num">${i+1}</span>${renderMath(step)}</div>`).join('')}
              </div>
            </details>
            ${t.examples && t.examples.length > 0 ? `
              <details class="theorem-examples">
                <summary>例题演示</summary>
                ${t.examples.map(ex => `
                  <div class="example">
                    <div class="example-question">${renderMath(ex.q)}</div>
                    <div class="example-solution">
                      ${ex.steps.map((step, i) => `<div class="solution-step">${renderMath(step)}</div>`).join('')}
                    </div>
                  </div>
                `).join('')}
              </details>
            ` : ''}
          </div>
        </div>
      </div>
    `).join('');

    renderCategoryFilter();
    renderMathInContainer(container);
    if (window.TheoremLab) window.TheoremLab.mountAll(container);
  }

  function renderCategoryFilter() {
    const filter = document.getElementById('category-filter');
    if (!filter) return;

    filter.innerHTML = `
      <button class="category-btn ${!activeCategory ? 'active' : ''}" data-category="">全部</button>
      ${categories.map(c => `
        <button class="category-btn ${activeCategory === c ? 'active' : ''}" data-category="${c}">${c}</button>
      `).join('')}
    `;

    filter.querySelectorAll('.category-btn').forEach(btn => {
      btn.onclick = () => {
        activeCategory = btn.dataset.category || null;
        render();
      };
    });
  }

  function renderMath(text) {
    if (typeof text !== 'string') return text;
    return text.replace(/\$\$([^$]+)\$\$/g, '<div class="katex-tex display">$1</div>')
               .replace(/\$([^$]+)\$/g, '<span class="katex-tex inline">$1</span>');
  }

  function renderMathInContainer(container) {
    if (typeof katex === 'undefined' || !container) return;
    container.querySelectorAll('.katex-tex').forEach(el => {
      try {
        const isDisplay = el.classList.contains('display');
        katex.render(el.textContent, el, { throwOnError: false, displayMode: isDisplay });
      } catch (_) {}
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
