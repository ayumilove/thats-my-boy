/* Stable curriculum IDs are shared by notebooks, lessons, exercises and AI. */
(function (root) {
  "use strict";
  const subjects = [
    { id: "math", name: "数学", available: true },
    { id: "physics", name: "物理", available: true },
    { id: "chemistry", name: "化学", available: true },
    { id: "biology", name: "生物", available: true },
  ];
  const topicSubjects = {
    sets: "math",
    quad: "math",
    equation: "math",
    property: "math",
    distance: "physics",
    motion: "physics",
    force: "physics",
  };
  const nodes = [
    [
      "sets",
      "math",
      "集合与集合运算",
      "交集、并集、补集及元素归属",
      [],
      "sets",
    ],
    [
      "quad",
      "math",
      "二次函数的参数",
      "开口、顶点、对称轴与退化情况",
      [],
      "quad",
    ],
    [
      "equation",
      "math",
      "方程与不等式",
      "方程根与函数图像、解集和端点",
      ["quad"],
      "equation",
    ],
    [
      "property",
      "math",
      "单调性与奇偶性",
      "定义域、增减、奇偶与对称",
      [],
      "property",
    ],
    [
      "distance",
      "physics",
      "路程与位移",
      "标量与矢量、方向、往返运动",
      [],
      "distance",
    ],
    [
      "motion",
      "physics",
      "匀变速直线运动",
      "恒加速度条件、速度时间图与位移",
      ["distance"],
      "motion",
    ],
    [
      "force",
      "physics",
      "力、质量与加速度",
      "合力、质量与牛顿第二定律",
      ["motion"],
      "force",
    ],
    [
      "time",
      "physics",
      "时刻、时间段与中点",
      "第 n 秒内、秒末、两段时间各自中点",
      [],
      null,
      "time",
    ],
    [
      "rate",
      "physics",
      "平均量、比值与单位",
      "总位移除以总时间、加权平均",
      ["distance"],
      null,
      "rate",
    ],
    [
      "algebra",
      "physics",
      "倍数、变化量与列式",
      "末速度与速度变化量、倍数和消元",
      ["rate"],
      null,
      "algebra",
    ],
    [
      "midtime",
      "physics",
      "平均速度对应哪个时刻",
      "匀变速条件、中时速与中位速",
      ["time", "rate", "motion"],
      null,
      "midtime",
    ],
    [
      "unequal",
      "physics",
      "等距离、不等时间",
      "两段平均速度对应中点、速度差除以中点时间差",
      ["time", "midtime"],
      null,
      "unequal",
    ],
    [
      "sign",
      "math",
      "负数、数轴与不等号",
      "乘除负数变号、乘零信息丢失",
      [],
      null,
      "sign",
    ],
    [
      "quadratic",
      "math",
      "二次不等式与参数分类",
      "系数正负零、端点与因式分解",
      ["sign", "quad"],
      null,
      "quadratic",
    ],
    [
      "roots",
      "math",
      "穿根法与重根",
      "奇根变号、偶根不变号、孤立零点",
      ["quadratic"],
      null,
      "roots",
    ],
    [
      "balance",
      "chemistry",
      "化学方程式配平与守恒",
      "原子守恒、系数与下标、括号原子计数、最简整数比及物质的量比；不含氧化还原电子配平、离子方程式和反应能否发生的判断",
      [],
      null,
      "balance",
    ],
    [
      "inheritance",
      "biology",
      "基因、配子与遗传概率",
      "基因与等位基因、基因型与表现型、分离定律、单基因完全显性杂交与条件概率；不含伴性遗传、连锁、多基因性状和基因表达机制",
      [],
      null,
      "inheritance",
    ],
  ].map(([id, subject, title, scope, prerequisites, topic, training]) => ({
    id,
    subject,
    title,
    scope,
    prerequisites,
    topic,
    training,
    version: 1,
    stage: "高中及必要前置基础",
  }));
  const get = (id) => nodes.find((n) => n.id === id);
  const href = (id, mistakeId) => {
    const n = get(id);
    if (!n) return null;
    const origin = mistakeId ? "&mistake=" + encodeURIComponent(mistakeId) : "";
    return n.training
      ? "training.html#module=" + encodeURIComponent(n.training) + origin
      : n.topic
        ? "index.html#topic=" + encodeURIComponent(n.topic) + origin
        : null;
  };
  root.Curriculum = { version: 2, subjects, nodes, get, href, topicSubjects };
})(typeof window === "undefined" ? globalThis : window);
