/* 高中数学定理联系列表 · 数据与图示 */
(function(root) {
  "use strict";
  const C = { blue: '#166534', teal: '#b45309', muted: '#9ca3af', axis: '#a1a1aa' };
  const L = (x1,y1,x2,y2,c=C.axis,w=1.5,d='') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-width="${w}" ${d?`stroke-dasharray="${d}"`:''}/>`;
  const T = (x,y,t,c=C.axis,s=13) => `<text x="${x}" y="${y}" style="fill:${c};font-size:${s}px;font-family:'Noto Serif SC',serif">${t}</text>`;
  const Ci = (cx,cy,r,c=C.axis,w=1.5) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c}" stroke-width="${w}"/>`;
  const Do = (cx,cy,r=4,c=C.blue) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}"/>`;
  const Pa = (d,c=C.blue,w=2,f='none') => `<path d="${d}" fill="${f}" stroke="${c}" stroke-width="${w}"/>`;
  const Tx = (x,y,t,c=C.axis,s=13) => `<text x="${x}" y="${y}" style="fill:${c};font-size:${s}px;font-family:'Noto Serif SC',serif">${t}</text>`;
  const Wr = (content) => `<svg viewBox="0 0 640 320" xmlns="http://www.w3.org/2000/svg">${content}</svg>`;

  const theorems = [
    /* ════════════════════════════════════════════════════════════════
       代数与函数
       ════════════════════════════════════════════════════════════════ */
    {
      id: 'quadratic-formula',
      name: '二次方程求根公式',
      category: '代数与函数',
      statement: '对于一元二次方程 $ax^2+bx+c=0$（$a\\neq 0$），其根为：$$x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}$$',
      diagram: Wr(
        Pa('M 80 260 Q 320 40 560 260', C.blue, 2.5) +
        L(60,260,600,260,C.axis,1.5) +
        L(320,40,320,290,C.muted,1,'5 4') +
        Do(80,260) + Do(560,260) +
        T(66,285,'x₁',C.blue,14) + T(544,285,'x₂',C.blue,14) +
        T(328,162,'对称轴',C.muted,12) +
        T(450,100,'Δ>0: 两个实根',C.teal,13) +
        T(450,125,'Δ=0: 一个重根',C.teal,13) +
        T(450,150,'Δ<0: 无实根',C.teal,13)
      ),
      proof: [
        '从 $ax^2+bx+c=0$ 出发，两边除以 $a$：$x^2+\\frac{b}{a}x+\\frac{c}{a}=0$',
        '移项：$x^2+\\frac{b}{a}x=-\\frac{c}{a}$',
        '配方：$\\left(x+\\frac{b}{2a}\\right)^2=\\frac{b^2-4ac}{4a^2}$',
        '开方：$x+\\frac{b}{2a}=\\pm\\frac{\\sqrt{b^2-4ac}}{2a}$',
        '整理得：$x=\\frac{-b\\pm\\sqrt{b^2-4ac}}{2a}$'
      ],
      examples: [
        { q: '解方程 $2x^2-5x+2=0$', steps: ['$a=2,b=-5,c=2$','$\\Delta=25-16=9$','$x=\\frac{5\\pm 3}{4}$','$x_1=2,\\;x_2=\\frac{1}{2}$'] }
      ]
    },
    {
      id: 'vieta',
      name: '韦达定理',
      category: '代数与函数',
      statement: '若 $x_1,x_2$ 是 $ax^2+bx+c=0$ 的两根，则：$$x_1+x_2=-\\frac{b}{a},\\quad x_1\\cdot x_2=\\frac{c}{a}$$',
      diagram: Wr(
        Pa('M 80 260 Q 320 40 560 260', C.blue, 2.5) +
        L(60,260,600,260,C.axis,1.5) +
        Do(80,260) + Do(560,260) +
        T(66,285,'x₁',C.blue,14) + T(544,285,'x₂',C.blue,14) +
        L(80,260,80,290,C.teal,1.5) + L(560,260,560,290,C.teal,1.5) +
        T(240,308,'x₁+x₂ = -b/a',C.teal,13) +
        T(240,326,'x₁·x₂ = c/a',C.teal,13)
      ),
      proof: [
        '由求根公式：$x_1=\\frac{-b+\\sqrt{\\Delta}}{2a}$，$x_2=\\frac{-b-\\sqrt{\\Delta}}{2a}$',
        '相加：$x_1+x_2=\\frac{-2b}{2a}=-\\frac{b}{a}$',
        '相乘：$x_1\\cdot x_2=\\frac{b^2-\\Delta}{4a^2}=\\frac{4ac}{4a^2}=\\frac{c}{a}$'
      ],
      examples: [
        { q: '已知 $x^2-3x+2=0$ 的两根为 $x_1,x_2$，求 $x_1^2+x_2^2$', steps: ['$x_1+x_2=3$','$x_1\\cdot x_2=2$','$x_1^2+x_2^2=(x_1+x_2)^2-2x_1x_2=9-4=5$'] }
      ]
    },
    {
      id: 'amgm',
      name: '均值不等式',
      category: '代数与函数',
      statement: '对于非负实数 $a,b$，有：$$\\frac{a+b}{2}\\geq\\sqrt{ab}$$等号成立当且仅当 $a=b$。',
      diagram: Wr(
        Ci(320,160,120,C.blue,2) +
        L(200,160,440,160,C.axis,1.5) +
        L(320,40,320,280,C.muted,1,'5 4') +
        L(260,160,260,56,C.teal,2) +
        Do(260,160) + Do(260,56,C.teal,4) + Do(320,40) +
        T(250,180,'a',C.blue,14) + T(360,180,'b',C.blue,14) +
        T(320,30,'(a+b)/2 = 半径',C.teal,13) +
        T(266,110,'√(ab)',C.teal,12)
      ),
      proof: [
        '考虑 $(\\sqrt{a}-\\sqrt{b})^2\\geq 0$',
        '展开：$a-2\\sqrt{ab}+b\\geq 0$',
        '移项：$a+b\\geq 2\\sqrt{ab}$',
        '两边除以 2：$\\frac{a+b}{2}\\geq\\sqrt{ab}$',
        '等号成立 $\\Leftrightarrow \\sqrt{a}=\\sqrt{b} \\Leftrightarrow a=b$'
      ],
      examples: [
        { q: '求 $x+\\frac{1}{x}$（$x>0$）的最小值', steps: ['由均值不等式：$x+\\frac{1}{x}\\geq 2\\sqrt{x\\cdot\\frac{1}{x}}=2$','等号成立当 $x=\\frac{1}{x}$，即 $x=1$','最小值为 $2$'] }
      ]
    },

    /* ════════════════════════════════════════════════════════════════
       平面几何
       ════════════════════════════════════════════════════════════════ */
    {
      id: 'pythagorean',
      name: '勾股定理',
      category: '平面几何',
      statement: '直角三角形两直角边 $a,b$ 与斜边 $c$ 满足：$$a^2+b^2=c^2$$',
      diagram: Wr(
        Pa('M 160 240 L 160 100 L 360 240 Z', C.blue, 2.5) +
        Pa('M 160 240 L 180 240 L 180 220 L 160 220 Z', C.axis, 1.5) +
        T(140,175,'a',C.blue,15) + T(260,260,'b',C.blue,15) + T(270,160,'c',C.teal,15) +
        T(420,120,'a² + b² = c²',C.teal,16)
      ),
      proof: [
        '构造边长为 $a+b$ 的正方形',
        '内部包含 4 个全等直角三角形和一个小正方形',
        '大正方形面积：$(a+b)^2=a^2+2ab+b^2$',
        '也等于：$4\\cdot\\frac{1}{2}ab+c^2=2ab+c^2$',
        '因此 $a^2+2ab+b^2=2ab+c^2$，即 $a^2+b^2=c^2$'
      ],
      examples: [
        { q: '直角三角形两直角边为 3 和 4，求斜边', steps: ['$a=3,b=4$','$c=\\sqrt{3^2+4^2}=\\sqrt{9+16}=\\sqrt{25}=5$'] }
      ]
    },
    {
      id: 'triangle-sum',
      name: '三角形内角和定理',
      category: '平面几何',
      statement: '三角形三个内角之和等于 $180°$：$$\\angle A+\\angle B+\\angle C=180°$$',
      diagram: Wr(
        Pa('M 160 240 L 320 80 L 480 240 Z', C.blue, 2.5) +
        T(145,235,'A',C.blue,14) + T(315,70,'B',C.blue,14) + T(490,235,'C',C.blue,14) +
        Pa('M 180 240 A 30 30 0 0 1 175 215', C.teal, 2) +
        Pa('M 310 100 A 30 30 0 0 1 335 105', C.teal, 2) +
        Pa('M 460 240 A 30 30 0 0 1 465 215', C.teal, 2) +
        T(190,220,'α',C.teal,13) + T(320,115,'β',C.teal,13) + T(450,220,'γ',C.teal,13) +
        T(380,280,'α + β + γ = 180°',C.teal,14)
      ),
      proof: [
        '过顶点 $A$ 作 $BC$ 的平行线 $DE$',
        '由平行线性质：$\\angle DAB=\\angle B$（内错角）',
        '同理：$\\angle EAC=\\angle C$',
        '而 $\\angle DAB+\\angle BAC+\\angle EAC=180°$（平角）',
        '因此 $\\angle B+\\angle A+\\angle C=180°$'
      ],
      examples: [
        { q: '三角形中 $\\angle A=50°$，$\\angle B=60°$，求 $\\angle C$', steps: ['$\\angle C=180°-\\angle A-\\angle B$','$\\angle C=180°-50°-60°=70°$'] }
      ]
    },
    {
      id: 'parallel-ratio',
      name: '平行线截比例定理',
      category: '平面几何',
      statement: '三条平行线截两条直线，所得对应线段成比例。若 $l_1\\parallel l_2\\parallel l_3$，则：$$\\frac{AB}{BC}=\\frac{DE}{EF}$$',
      diagram: Wr(
        L(100,80,540,80,C.blue,2) + L(100,160,540,160,C.blue,2) + L(100,240,540,240,C.blue,2) +
        L(180,60,360,260,C.teal,2) + L(300,60,480,260,C.teal,2) +
        Do(198,80) + Do(270,160) + Do(342,240) + Do(318,80) + Do(390,160) + Do(462,240) +
        T(186,72,'A',C.blue,13) + T(258,152,'B',C.blue,13) + T(350,254,'C',C.blue,13) +
        T(306,72,'D',C.teal,13) + T(398,152,'E',C.teal,13) + T(470,254,'F',C.teal,13) +
        T(400,130,'AB/BC = DE/EF',C.teal,14)
      ),
      proof: [
        '设三条平行线 $l_1,l_2,l_3$ 截直线 $m$ 于 $A,B,C$',
        '截直线 $n$ 于 $D,E,F$',
        '过 $B$ 作 $n$ 的平行线，交 $l_1$ 于 $G$',
        '利用相似三角形或面积关系可证：$\\frac{AB}{BC}=\\frac{DE}{EF}$'
      ],
      examples: [
        { q: '已知 $AB=3,BC=5,DE=6$，求 $EF$', steps: ['由定理：$\\frac{AB}{BC}=\\frac{DE}{EF}$','即 $\\frac{3}{5}=\\frac{6}{EF}$','解得 $EF=10$'] }
      ]
    },
    {
      id: 'similar-triangle',
      name: '相似三角形',
      category: '平面几何',
      statement: '两三角形对应角相等、对应边成比例则相似。若 $\\triangle ABC\\sim\\triangle A\'B\'C\'$，则：$$\\frac{AB}{A\'B\'}=\\frac{BC}{B\'C\'}=\\frac{CA}{C\'A\'}$$',
      diagram: Wr(
        Pa('M 120 240 L 240 100 L 360 240 Z', C.blue, 2.5) +
        Pa('M 380 240 L 460 140 L 540 240 Z', C.teal, 2.5) +
        T(108,255,'A',C.blue,13) + T(235,90,'B',C.blue,13) + T(348,258,'C',C.blue,13) +
        T(386,258,'A\'',C.teal,13) + T(455,130,'B\'',C.teal,13) + T(550,255,'C\'',C.teal,13) +
        T(200,280,'相似比 k',C.muted,13)
      ),
      proof: [
        '判定方法：AA（两角对应相等）、SAS（两边成比例且夹角相等）、SSS（三边成比例）',
        '性质：对应边成比例，对应角相等',
        '面积比等于相似比的平方：$\\frac{S_{ABC}}{S_{A\'B\'C\'}}=k^2$'
      ],
      examples: [
        { q: '$\\triangle ABC\\sim\\triangle DEF$，相似比为 2:3，$AB=4$，求 $DE$', steps: ['由相似比：$\\frac{AB}{DE}=\\frac{2}{3}$','即 $\\frac{4}{DE}=\\frac{2}{3}$','解得 $DE=6$'] }
      ]
    },
    {
      id: 'inscribed-angle',
      name: '圆周角定理',
      category: '平面几何',
      statement: '同弧所对的圆周角等于圆心角的一半：$$\\angle ACB=\\frac{1}{2}\\angle AOB$$',
      diagram: Wr(
        Ci(320,160,120,C.blue,2) +
        Do(320,160,3,C.muted) + T(330,155,'O',C.muted,12) +
        Do(216,100) + Do(424,100) + Do(320,280) +
        L(320,160,216,100,C.teal,1.5) + L(320,160,424,100,C.teal,1.5) +
        L(216,100,320,280,C.blue,2) + L(424,100,320,280,C.blue,2) +
        T(202,92,'A',C.blue,13) + T(432,92,'B',C.blue,13) + T(325,295,'C',C.blue,13) +
        T(440,140,'∠AOB',C.teal,13) + T(340,220,'∠ACB',C.blue,13)
      ),
      proof: [
        '连接 $CO$ 并延长交圆于 $D$',
        '在 $\\triangle AOC$ 中，$OA=OC$（半径），故 $\\angle OAC=\\angle OCA$',
        '外角 $\\angle AOD=\\angle OAC+\\angle OCA=2\\angle OCA$',
        '同理 $\\angle BOD=2\\angle OCB$',
        '因此 $\\angle AOB=2\\angle ACB$'
      ],
      examples: [
        { q: '圆心角 $\\angle AOB=120°$，求圆周角 $\\angle ACB$', steps: ['由圆周角定理：$\\angle ACB=\\frac{1}{2}\\angle AOB$','$\\angle ACB=\\frac{1}{2}\\times 120°=60°$'] }
      ]
    },

    /* ════════════════════════════════════════════════════════════════
       立体几何
       ════════════════════════════════════════════════════════════════ */
    {
      id: 'three-perpendicular',
      name: '三垂线定理',
      category: '立体几何',
      statement: '平面内一条直线，如果和这个平面的一条斜线的射影垂直，那么它也和这条斜线垂直。',
      diagram: Wr(
        Pa('M 120 240 L 520 240 L 480 280 L 80 280 Z', C.muted, 1.5) +
        L(320,80,320,240,C.teal,2,'5 4') +
        L(320,80,240,200,C.blue,2.5) +
        L(320,240,240,200,C.axis,1.5) +
        L(160,200,400,200,C.teal,2) +
        Do(320,240,3,C.teal) + Do(240,200,3,C.blue) + Do(320,80,3,C.blue) +
        T(330,255,'A',C.teal,12) + T(230,195,'B',C.blue,12) + T(330,75,'P',C.blue,12) +
        T(280,220,'⊥',C.teal,14) +
        T(420,140,'PA⊥面α',C.teal,12) + T(420,160,'AB是射影',C.teal,12) + T(420,180,'l⊥AB⇒l⊥PA',C.teal,12)
      ),
      proof: [
        '设 $PA\\perp$ 平面 $\\alpha$，$A$ 为垂足',
        '$AB$ 是斜线 $PB$ 在平面 $\\alpha$ 内的射影',
        '若平面 $\\alpha$ 内直线 $l\\perp AB$',
        '则 $l\\perp PA$（因为 $PA\\perp\\alpha$）',
        '又 $l\\perp AB$，故 $l\\perp$ 平面 $PAB$',
        '因此 $l\\perp PB$（三垂线定理）'
      ],
      examples: [
        { q: '正方体中，证明体对角线与不共面的棱垂直', steps: ['建立空间直角坐标系','设棱长为 1，体对角线向量 $\\vec{d}=(1,1,1)$','棱向量 $\\vec{v}=(1,0,0)$','$\\vec{d}\\cdot\\vec{v}=1\\neq 0$，不垂直','需选择合适的面和射影关系'] }
      ]
    },
    {
      id: 'pyramid-volume',
      name: '棱锥体积公式',
      category: '立体几何',
      statement: '棱锥的体积等于底面积与高的乘积的三分之一：$$V=\\frac{1}{3}Sh$$',
      diagram: Wr(
        Pa('M 320 60 L 200 240 L 440 240 Z', C.blue, 2.5) +
        Pa('M 200 240 L 440 240 L 400 280 L 160 280 Z', C.teal, 2) +
        L(320,60,400,280,C.blue,2) + L(320,60,160,280,C.blue,2) +
        L(320,60,320,280,C.muted,1.5,'5 4') +
        T(330,290,'h',C.muted,14) + T(280,260,'S',C.teal,14) +
        T(460,160,'V = Sh/3',C.teal,15)
      ),
      proof: [
        '三棱柱可分成三个等体积的三棱锥',
        '设三棱柱 $ABC-A\'B\'C\'$，底面积为 $S$，高为 $h$',
        '三棱锥 $A\'-ABC$ 的体积为 $V_1$',
        '三棱锥 $A\'-BB\'C$ 的体积为 $V_2$',
        '三棱锥 $A\'-B\'C\'C$ 的体积为 $V_3$',
        '可证 $V_1=V_2=V_3$，且 $V_1+V_2+V_3=Sh$',
        '因此 $V_{\\text{锥}}=\\frac{1}{3}Sh$'
      ],
      examples: [
        { q: '正四棱锥底面边长为 4，高为 6，求体积', steps: ['底面积 $S=4^2=16$','高 $h=6$','$V=\\frac{1}{3}\\times 16\\times 6=32$'] }
      ]
    },

    /* ════════════════════════════════════════════════════════════════
       三角学
       ════════════════════════════════════════════════════════════════ */
    {
      id: 'sine-rule',
      name: '正弦定理',
      category: '三角学',
      statement: '在 $\\triangle ABC$ 中，$a,b,c$ 分别为三边，$R$ 为外接圆半径：$$\\frac{a}{\\sin A}=\\frac{b}{\\sin B}=\\frac{c}{\\sin C}=2R$$',
      diagram: Wr(
        Ci(320,160,120,C.muted,1.5) +
        Pa('M 228 237 L 299 42 L 429 211 Z', C.blue, 2.5) +
        Do(320,160,3,C.muted) + T(330,155,'O',C.muted,12) +
        T(214,255,'A',C.blue,13) + T(293,32,'B',C.blue,13) + T(443,222,'C',C.blue,13) +
        T(252,146,'c',C.teal,14) + T(376,132,'a',C.teal,14) + T(336,232,'b',C.teal,14) +
        T(440,280,'a/sinA = 2R',C.teal,13)
      ),
      proof: [
        '设 $\\triangle ABC$ 外接圆半径为 $R$，圆心为 $O$',
        '连接 $BO$ 并延长交圆于 $D$，连接 $CD$',
        '由圆周角定理：$\\angle D=\\angle A$（同弧所对）',
        '又 $BD$ 为直径，故 $\\angle BCD=90°$',
        '在 Rt$\\triangle BCD$ 中：$\\sin D=\\frac{BC}{BD}=\\frac{a}{2R}$',
        '因此 $\\frac{a}{\\sin A}=\\frac{a}{\\sin D}=2R$'
      ],
      examples: [
        { q: '$\\triangle ABC$ 中，$a=6$，$A=30°$，求外接圆半径 $R$', steps: ['由正弦定理：$\\frac{a}{\\sin A}=2R$','$\\frac{6}{\\sin 30°}=2R$','$\\frac{6}{0.5}=12=2R$','$R=6$'] }
      ]
    },
    {
      id: 'cosine-rule',
      name: '余弦定理',
      category: '三角学',
      statement: '在 $\\triangle ABC$ 中：$$c^2=a^2+b^2-2ab\\cos C$$',
      diagram: Wr(
        Pa('M 160 240 L 400 240 L 300 100 Z', C.blue, 2.5) +
        T(145,255,'A',C.blue,13) + T(415,255,'B',C.blue,13) + T(295,90,'C',C.blue,13) +
        T(216,176,'b',C.teal,14) + T(360,170,'a',C.teal,14) + T(270,264,'c',C.teal,14) +
        Pa('M 281.6 118.4 A 26 26 0 0 0 315.1 121.2', C.teal, 2) +
        T(440,140,'c²=a²+b²-2ab·cosC',C.teal,13)
      ),
      proof: [
        '以 $C$ 为原点建立坐标系',
        '设 $A=(b,0)$，$B=(a\\cos C, a\\sin C)$',
        '则 $c^2=|AB|^2=(a\\cos C-b)^2+(a\\sin C)^2$',
        '$=a^2\\cos^2 C-2ab\\cos C+b^2+a^2\\sin^2 C$',
        '$=a^2(\\cos^2 C+\\sin^2 C)+b^2-2ab\\cos C$',
        '$=a^2+b^2-2ab\\cos C$'
      ],
      examples: [
        { q: '$a=5,b=4,C=60°$，求 $c$', steps: ['$c^2=25+16-2\\times 5\\times 4\\times\\cos 60°$','$c^2=41-40\\times 0.5=41-20=21$','$c=\\sqrt{21}$'] }
      ]
    },

    /* ════════════════════════════════════════════════════════════════
       解析几何
       ════════════════════════════════════════════════════════════════ */
    {
      id: 'ellipse',
      name: '椭圆定义与标准方程',
      category: '解析几何',
      statement: '平面上到两定点 $F_1,F_2$ 距离之和为常数 $2a$（$2a>|F_1F_2|$）的点的轨迹为椭圆。标准方程：$$\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1$$',
      diagram: Wr(
        Pa('M 120 160 A 200 100 0 1 1 520 160 A 200 100 0 1 1 120 160', C.blue, 2.5) +
        Do(147,160,4,C.teal) + Do(493,160,4,C.teal) +
        L(147,160,320,100,C.teal,1.5) + L(493,160,320,100,C.teal,1.5) +
        Do(320,100,3,C.blue) +
        T(122,182,'F₁',C.teal,12) + T(478,182,'F₂',C.teal,12) + T(325,95,'P',C.blue,12) +
        T(440,240,'|PF₁|+|PF₂|=2a',C.teal,13)
      ),
      proof: [
        '设 $F_1(-c,0),F_2(c,0)$，$P(x,y)$ 满足 $|PF_1|+|PF_2|=2a$',
        '$\\sqrt{(x+c)^2+y^2}+\\sqrt{(x-c)^2+y^2}=2a$',
        '移项并平方，化简得：$\\frac{x^2}{a^2}+\\frac{y^2}{a^2-c^2}=1$',
        '令 $b^2=a^2-c^2$，得标准方程 $\\frac{x^2}{a^2}+\\frac{y^2}{b^2}=1$'
      ],
      examples: [
        { q: '椭圆 $\\frac{x^2}{25}+\\frac{y^2}{9}=1$，求焦点坐标', steps: ['$a^2=25,b^2=9$','$c^2=a^2-b^2=25-9=16$','$c=4$','焦点为 $(\\pm 4, 0)$'] }
      ]
    },
    {
      id: 'hyperbola',
      name: '双曲线定义与标准方程',
      category: '解析几何',
      statement: '平面上到两定点 $F_1,F_2$ 距离之差的绝对值为常数 $2a$（$0<2a<|F_1F_2|$）的点的轨迹为双曲线。标准方程：$$\\frac{x^2}{a^2}-\\frac{y^2}{b^2}=1$$',
      diagram: Wr(
        Pa('M 240 160 Q 252 92 330 56 M 240 160 Q 252 228 330 264 M 400 160 Q 388 92 310 56 M 400 160 Q 388 228 310 264', C.blue, 2.5) +
        Do(190,160,4,C.teal) + Do(450,160,4,C.teal) + Do(240,160,3,C.blue) + Do(400,160,3,C.blue) +
        L(190,160,276,92,C.teal,1.5) + L(450,160,276,92,C.teal,1.5) +
        Do(276,92,3,C.blue) +
        T(176,182,'F₁',C.teal,12) + T(442,182,'F₂',C.teal,12) + T(284,86,'P',C.blue,12) +
        T(440,240,'||PF₁|-|PF₂||=2a',C.teal,12)
      ),
      proof: [
        '设 $F_1(-c,0),F_2(c,0)$，$P(x,y)$ 满足 $||PF_1|-|PF_2||=2a$',
        '$|\\sqrt{(x+c)^2+y^2}-\\sqrt{(x-c)^2+y^2}|=2a$',
        '平方并化简，类似椭圆推导',
        '令 $b^2=c^2-a^2$，得 $\\frac{x^2}{a^2}-\\frac{y^2}{b^2}=1$'
      ],
      examples: [
        { q: '双曲线 $\\frac{x^2}{16}-\\frac{y^2}{9}=1$，求渐近线', steps: ['令右边为 0：$\\frac{x^2}{16}-\\frac{y^2}{9}=0$','$y=\\pm\\frac{3}{4}x$','渐近线为 $y=\\pm\\frac{3}{4}x$'] }
      ]
    }
  ];

  root.TheoremData = { version: 1, theorems };
})(typeof window === 'undefined' ? globalThis : window);
