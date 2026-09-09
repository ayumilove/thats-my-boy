/* Small, deterministic models. They do not predict real experiments or families. */
(function (root) {
  "use strict";
  function balance(a, b, c) {
    const gcd = (x, y) => (y ? gcd(y, x % y) : x);
    const rows = [
      { element: "Al", left: a, right: 2 * c },
      { element: "O", left: 2 * b, right: 3 * c },
    ];
    const balanced = rows.every((r) => r.left === r.right);
    return { rows, balanced, minimal: balanced && gcd(gcd(a, b), c) === 1 };
  }
  const genotypes = ["AA", "Aa", "aa"];
  function cross(first, second) {
    if (!genotypes.includes(first) || !genotypes.includes(second))
      throw new Error("Unsupported genotype");
    const cells = [...first].flatMap((a) =>
      [...second].map((b) => [a, b].sort().join("")),
    );
    const counts = { AA: 0, Aa: 0, aa: 0 };
    cells.forEach((g) => counts[g]++);
    return {
      cells,
      counts,
      dominant: (counts.AA + counts.Aa) / 4,
      recessive: counts.aa / 4,
      heterozygousGivenDominant:
        counts.AA + counts.Aa ? counts.Aa / (counts.AA + counts.Aa) : null,
    };
  }
  function defaults(lab) {
    return { al: 1, oxygen: 1, oxide: 1, parent1: 1, parent2: 1, ...lab };
  }
  function controls(kind, p) {
    if (kind === "balance")
      return [
        ["al", "Al 的系数"],
        ["oxygen", "O₂ 的系数"],
        ["oxide", "Al₂O₃ 的系数"],
      ]
        .map(
          ([key, label]) =>
            `<label class="control"><span>${label}</span><input type="range" data-lab="${key}" aria-label="${label}" min="1" max="8" step="1" value="${p[key]}"><output id="value-${key}">${p[key]}</output></label>`,
        )
        .join("");
    if (kind === "inheritance")
      return [1, 2]
        .map(
          (i) =>
            `<label class="control"><span>亲本 ${i} 基因型</span><select aria-label="亲本 ${i} 基因型" data-lab="parent${i}">${genotypes.map((g, index) => `<option value="${index}" ${p["parent" + i] === index ? "selected" : ""}>${g}</option>`).join("")}</select></label>`,
        )
        .join("");
    return "";
  }
  function draw(kind, p) {
    if (kind === "balance") {
      const z = balance(p.al, p.oxygen, p.oxide);
      return {
        html: `<p class="science-equation">${p.al}Al + ${p.oxygen}O₂ → ${p.oxide}Al₂O₃</p><p class="notes">反应条件略；当前系数仅用于计数，未必已经配平。</p><table class="science-table"><caption>逐元素检查：系数 × 下标</caption><thead><tr><th>元素</th><th>反应物侧</th><th>生成物侧</th><th>检查</th></tr></thead><tbody>${z.rows.map((r) => `<tr><th>${r.element}</th><td>${r.left}</td><td>${r.right}</td><td>${r.left === r.right ? "守恒" : "未守恒"}</td></tr>`).join("")}</tbody></table>`,
        values: [
          ["原子数检查", z.balanced ? "两种元素均守恒" : "还需调整系数"],
          [
            "整数比检查",
            z.minimal
              ? "已是最简整数比"
              : z.balanced
                ? "守恒，但还可约简"
                : "先保证逐元素守恒",
          ],
        ],
        note: "只改系数，不改下标。先处理氧的公倍数，再检查铝。右侧原子数会随整份物质数量变化；配平不能证明某反应实际能够发生。本模型不是操作实验。",
      };
    }
    if (kind === "inheritance") {
      const a = genotypes[p.parent1],
        b = genotypes[p.parent2],
        z = cross(a, b);
      return {
        html: `<table class="science-table"><caption>${a} × ${b}：每格是 1/4 的组合机会</caption><thead><tr><th>配子</th><th>${b[0]}</th><th>${b[1]}</th></tr></thead><tbody>${[0, 1].map((i) => `<tr><th>${a[i]}</th><td>${z.cells[i * 2]}</td><td>${z.cells[i * 2 + 1]}</td></tr>`).join("")}</tbody></table><p class="notes">纯合子两栏配子符号相同，表示同一种配子的两份等概率位置；Aa 与 aA 记为同一基因型。</p>`,
        values: [
          [
            "基因型 AA : Aa : aa",
            `${z.counts.AA} : ${z.counts.Aa} : ${z.counts.aa}`,
          ],
          ["显性表现型概率", z.dominant * 100 + "%"],
          ["隐性表现型概率", z.recessive * 100 + "%"],
          [
            "已知显性时为 Aa",
            z.heterozygousGivenDominant === null
              ? "无显性子代，条件不成立"
              : (z.heterozygousGivenDominant * 100).toFixed(1) + "%",
          ],
        ],
        note: "模型限定：二倍体、单基因、完全显性、等位基因正常分离、配子等概率结合、后代存活率相同。比例是理论概率，不保证 4 个子代恰好各占相应份数。不适用于伴性遗传、连锁、多基因性状等情形。",
      };
    }
    return null;
  }
  root.ScienceLabs = { balance, cross, defaults, controls, draw };
})(window);
