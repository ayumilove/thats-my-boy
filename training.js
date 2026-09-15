'use strict';
const modules = window.TRAINING_MODULES;
var fmt = fmtNum;
const labels = ['定位卡点','基础一','基础二','解释规律','迁移练习','独立复核'];
let current = 0;
// 实验台参数默认值：旧存档恢复时也据此补全新增参数，避免滑块与图形失同步。
const LAB_DEFAULTS={n:4,t1:2,t2:1,L:120,u:2,a:2,k:3,T:2,left:2,right:5,m:-1,c:1,power:2,v1:2,v2:6,cq:1,cw:2,ga:1,gb:-2,pa:2,qa:0,ea:2,et:1,fv:20,fa:-5};
const persisted = window.LearningBridge?.safely(()=>window.LearningStore.read('training',{})) || {};
const sessions = modules.map(m => {
  const s=persisted[m.id];
  return s && Number.isInteger(s.step) && s.step>=0 && s.step<6 && s.results && s.lab && (!s.checked||s.results[s.step]) ? {...fresh(),...s} : fresh();
});
function fresh() { return { attemptId:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),step:0, selected:null, confidence:'', checked:false, assisted:false, hint:false, stuck:'', results:{}, complete:false, labOpen:false, lab:{...LAB_DEFAULTS} }; }
function persist() { window.LearningBridge?.safely(()=>{const saved=window.LearningStore.read('training',{});saved[modules[current].id]=state();window.LearningStore.write('training',saved);}); }
function state() { return sessions[current]; }
function question() { return modules[current].qs[state().step]; }
function choose(index) { current=index; render(); }
function statusText(s) { if(s.complete) return s.results[5]?.independent ? '本次通过' : '需再练'; return Object.keys(s.results).length ? '进行中' : ''; }
function renderNav() {
  window.CourseMenu?.setCurrent(modules[current].id);
}
function render() {
  const m=modules[current],s=state();
  renderNav(); el('current-name').textContent=m.title; el('module-title').textContent=m.title; el('level').textContent=m.level; el('goal').textContent=m.goal;
  const phase=s.step===0?0:s.step===5?2:1;
  el('training-steps').innerHTML=['定位卡点','按需补强','独立复核'].map((l,i)=>`<div class="step ${i===phase&&!s.complete?'current':i<phase||s.complete?'done':''}">${i+1} · ${l}</div>`).join('');
  renderQuestion(); renderLab(); renderTopicLink();
  if(el('session-summary').innerHTML) showSummary(false);
}
function renderTopicLink() {
  const m=modules[current];
  const topicNames={sets:'集合与集合运算',quad:'二次函数的参数',equation:'方程与不等式',property:'单调性与奇偶性',distance:'路程与位移',motion:'匀变速直线运动',force:'力、质量与加速度'};
  const link=el('topic-link');
  if(link)link.innerHTML='';
  if(link&&m.relatedTopic){
    link.innerHTML=`<a href="index.html#topic=${m.relatedTopic}" class="topic-back">← 返回实验：${topicNames[m.relatedTopic]}</a>`;
  }
}
function renderQuestion() {
  persist();
  const s=state(),q=question();
  if(s.complete) {
    const independent=s.results[5]?.independent;
    el('question-area').innerHTML=`<div class="completed"><span class="badge">本次专项完成</span><h2>${independent?'这道新情境，你独立完成了。':'这组已练完，再留一道给下次。'}</h2><p>${independent?'本次复核首答正确且未使用帮助。一次通过不等于长期掌握，隔一两天再检验。':'复核使用了提示、查看了解释或首答有误，目前记为"需再练"。'}</p><p class="notes">${modules[current].goal}</p><button class="primary" id="next-module">${current===modules.length-1?'查看本次练习情况':'进入下一专项 →'}</button><button class="quiet" id="redo-foundation">从基础一重新练</button></div>`;
    el('next-module').onclick=()=>current===modules.length-1?showSummary():choose(current+1);
    el('redo-foundation').onclick=()=>{sessions[current]=fresh();state().step=1;render()};return;
  }
  const r=s.results[s.step];
  el('question-area').innerHTML=`<span class="badge">${labels[s.step]} · ${q.skill}</span><h2>${q.text}</h2>
  <div role="group" aria-label="答案选择">${q.options.map((o,i)=>`<button class="option ${s.selected===i?'selected':''}" aria-pressed="${s.selected===i}" data-option="${i}" ${s.checked?'disabled':''}><span class="letter">${'ABC'[i]}</span>${o}</button>`).join('')}</div>
  <fieldset class="confidence" ${s.checked?'disabled':''}><legend>这次判断，你有多确定？</legend>${[['sure','能说清理由'],['unsure','不太确定']].map(([v,t])=>`<label><input type="radio" name="confidence" value="${v}" ${s.confidence===v?'checked':''}>${t}</label>`).join('')}</fieldset>
  <div class="hintrow"><select id="stuck" aria-label="说出卡点"><option value="">我卡在……</option>${['读懂题意','选用规律','列式或计算','表达答案'].map(x=>`<option ${s.stuck===x?'selected':''}>${x}</option>`).join('')}</select><button class="quiet" id="hint">给我一步提示</button></div>
  ${s.hint?`<div class="hint" role="status">${q.hint}</div>`:''}
  ${s.stuck?`<p class="helpnote">已标记\u201c${s.stuck}\u201d。先看一步提示；仍不理解时，可以把这个卡点告诉老师。</p>`:''}
  ${s.checked?`<div class="explanation ${r.correct?'':'wrong'}" role="status"><strong>${r.correct?'本题判断正确。':'这一步需要修正。'}</strong><p class="solution">正确选项：${'ABC'[q.answer]} · ${q.options[q.answer]}</p><p>${q.why}</p>${s.step===0?`<p>${r.independent?'下面用解释题检查理解；也可以主动补基础。':'接下来回到两道前置基础题，找到具体卡点。'}</p>`:''}</div>`:''}
  <button class="primary" id="submit" ${!s.checked&&(s.selected===null||!s.confidence)?'disabled':''}>${s.checked?(s.step===5?'完成本次专项':s.step===0&&!r.independent?'进入基础补强 →':'继续下一步 →'):'检验判断'}</button>
  ${s.checked&&s.step===0&&r.independent?'<button class="quiet" id="foundation">我也想检查基础</button>':''}
  <p class="session-tag">提示、实验辅助和首答结果保存在此浏览器，刷新可继续。</p>`;
  document.querySelectorAll('[data-option]').forEach(b=>b.onclick=()=>{s.selected=Number(b.dataset.option);renderQuestion();renderLab()});
  document.querySelectorAll('[name=confidence]').forEach(e=>e.onchange=()=>{s.confidence=e.value;renderQuestion()});
  el('stuck').onchange=e=>{s.stuck=e.target.value;if(s.stuck){s.assisted=true;s.hint=true;}renderQuestion()};
  el('hint').onclick=()=>{s.hint=true;s.assisted=true;renderQuestion()};
  el('submit').onclick=()=>{if(s.checked) advance();else checkAnswer()};
  if(el('foundation'))el('foundation').onclick=()=>goStep(1);
}
function checkAnswer() {
  const s=state();if(s.checked||s.selected===null||!s.confidence)return;
  const q=question(),correct=s.selected===q.answer;
  s.results[s.step]={correct,independent:correct&&!s.assisted&&s.confidence==='sure',assisted:s.assisted,confidence:s.confidence,stuck:s.stuck,skill:q.skill};
  if(!s.results[s.step].independent)window.LearningBridge?.capture({sourceKey:'training:'+modules[current].id+':'+s.step,subject:window.Curriculum.get(modules[current].id).subject,question:q.text,studentAnswer:q.options[s.selected]+(s.stuck?'；卡点：'+s.stuck:''),expectedAnswer:q.options[q.answer]+'。'+q.why,node:modules[current].id,source:'专项练习：'+modules[current].title});
  s.checked=true;render();
}
function advance() {
  const s=state();if(!s.checked)return;
  if(s.step===5){s.complete=true;window.LearningBridge?.review(modules[current].id,s.results[5].independent?'independent':s.results[5].correct?'assisted':'retry',s.attemptId);render();return;}
  goStep(s.step===0?(s.results[0].independent?3:1):s.step+1);
}
function goStep(step) {
  const s=state();s.step=step;s.selected=null;s.checked=false;s.confidence='';s.assisted=false;s.hint=false;s.stuck='';s.labOpen=false;render();
}
function showSummary(scroll = true) {
  el('session-summary').innerHTML=`<h2>练习情况</h2><p class="summarytext">\u201c本次通过\u201d仅表示复核题独立首答正确；保存在此浏览器。<a href="learning.html">查看错题与关联知识 →</a></p><div class="summarywrap"><table class="training-table"><thead><tr><th>专项</th><th>已答 / 6</th><th>需要回看的知识</th><th>状态</th></tr></thead><tbody>${modules.map((m,i)=>{const s=sessions[i],rs=Object.values(s.results),weak=rs.filter(r=>!r.independent).map(r=>r.skill+(r.stuck?'\uff08'+r.stuck+'\uff09':''));return `<tr><td>${m.title}</td><td>${rs.length}</td><td>${weak.length?weak.join('\u3001'):'尚无需要回看的记录'}</td><td>${statusText(s)||'未开始'}</td></tr>`}).join('')}</tbody></table></div>`;
  if(scroll) el('session-summary').scrollIntoView({behavior:'smooth',block:'start'});
}
function range(key,label,min,max,step=1){return `<label class="control"><span>${label}</span><input type="range" data-lab="${key}" aria-label="${label}" min="${min}" max="${max}" step="${step}" value="${state().lab[key]}"><output id="value-${key}">${fmt(state().lab[key])}</output></label>`;}
function readings(values){return '<div class="lab-readings">'+values.map(([k,v])=>`<div class="lab-reading">${k}<b>${v}</b></div>`).join('')+'</div>';}
function renderLab() {
  const s=state(),kind=modules[current].lab;
  s.lab={...LAB_DEFAULTS,...window.ScienceLabs.defaults(s.lab)};
  if(!s.checked&&!s.labOpen&&!s.complete){
    el('lab-content').innerHTML=`<div class="lab-lock"><strong>先判断，再用图形验证</strong><p>选好一个答案后，可以打开实验帮助思考；本题将记为\u201c使用辅助\u201d。也可以独立提交后再观察。</p><button class="quiet" id="open-lab" ${s.selected===null?'disabled':''}>打开实验</button></div>`;
    el('open-lab').onclick=()=>{s.labOpen=true;s.assisted=true;renderQuestion();renderLab()};return;
  }
  let controls=window.ScienceLabs.controls(kind,s.lab);
  if(kind==='time') controls=range('n','第 n 秒',1,8)+range('t1','第一段 / s',1,4,.5)+range('t2','第二段 / s',1,4,.5);
  if(kind==='rate') controls=range('v1','速度一 / m/s',1,10)+range('v2','速度二 / m/s',1,10)+range('t1','时间一 / s',1,4,.5)+range('t2','时间二 / s',1,4,.5);
  if(kind==='ratio')controls=range('u','初速度 / m/s',1,5)+range('k','末速为几倍',2,5)+range('T','总时间 / s',1,6);
  if(kind==='velocity')controls=range('u','初速度 / m/s',0,6)+range('a','加速度 / m/s\u00b2',0,4,.5)+range('T','每段时长 / s',1,3,.5);
  if(kind==='segments')controls=range('L','每段距离 / m',60,180,30)+range('t1','第一段 / s',2,3,.5)+range('t2','第二段 / s',1,2,.5);
  if(kind==='sign')controls=range('m','同乘的数',-3,3,.5);
  if(kind==='quadratic')controls=range('c','系数 a',-3,3,.5);
  if(kind==='roots')controls=range('power','根 1 的重数',1,4);
  if(kind==='cond')controls=range('cq','Q 左端',-1,5,.5)+range('cw','Q 宽度',0.5,4,.5);
  if(kind==='gap')controls=range('ga','数 a',-5,5,.5)+range('gb','数 b',-5,5,.5);
  if(kind==='param2')controls=range('pa','参数 a',-2,4,.5);
  if(kind==='quant')controls=range('qa','参数 a',-3,5,.5);
  if(kind==='deltas')controls=range('ea','加速度 / m/s²',0.5,4,.25)+range('et','每段时长 T / s',1,2,.5);
  if(kind==='vtgraph')controls=range('fv','初速度 v₀ / m/s',0,20,1)+range('fa','加速度 / m/s²',-5,2,.5);
  el('lab-content').innerHTML='<div id="lab-figure"></div><div id="lab-values"></div><p class="lab-caption" id="lab-description"></p>'+controls;
  drawLab(); bindLabDrag(); document.querySelectorAll('[data-lab]').forEach(e=>e.oninput=()=>{s.lab[e.dataset.lab]=Number(e.value);const output=el('value-'+e.dataset.lab);if(output)output.textContent=fmt(Number(e.value));drawLab();persist()});
}
// SVG 手柄拖拽：pointerdown 委托在 #lab-figure，move/up 挂在 window 且只绑定一次（bindLabDrag._bound），
// 拖拽途中 drawLab 重建图形、指针移出图形区域都不会丢事件；labDrag 引用的旧手柄 dataset 在内存中仍可读。
// 屏幕坐标经 getScreenCTM().inverse() 换算为 viewBox 坐标，避免 letterbox 偏移。
let labDrag=null;
function bindLabDrag() {
  const fig=el('lab-figure');if(!fig)return;
  fig.onpointerdown=ev=>{const h=ev.target.closest('.lab-handle');if(!h)return;labDrag=h;ev.preventDefault();};
  if(!window.addEventListener)return;// 无事件系统（数值验证脚本）时跳过
  if(bindLabDrag._bound)return;bindLabDrag._bound=true;
  const toView=(ev,svg)=>{const pt=svg.createSVGPoint();pt.x=ev.clientX;pt.y=ev.clientY;return pt.matrixTransform(svg.getScreenCTM().inverse());};
  window.addEventListener('pointermove',ev=>{
    if(!labDrag)return;const fig=el('lab-figure');if(!fig)return;const svg=fig.querySelector('svg');if(!svg)return;
    const min=Number(labDrag.dataset.min),max=Number(labDrag.dataset.max),x0=Number(labDrag.dataset.x0),xs=Number(labDrag.dataset.xs)||1;
    let v=min+(toView(ev,svg).x-x0)/xs;v=Math.min(max,Math.max(min,v));v=Math.round(v*20)/20;
    const s=state();s.lab[labDrag.dataset.key]=v;const out=el('value-'+labDrag.dataset.key);if(out)out.textContent=fmt(v);
    drawLab();persist();
  });
  window.addEventListener('pointerup',()=>{labDrag=null;});
  window.addEventListener('pointercancel',()=>{labDrag=null;});
}
// Pure calculations are shared with the numerical verification script.
function segmentModel(L,t1,t2) {
  const mid1=t1/2,mid2=t1+t2/2,v1=L/t1,v2=L/t2,a=(v2-v1)/(mid2-mid1),u=v1-a*mid1;
  return {mid1,mid2,v1,v2,a,u};
}
function drawLab() {
  const p=state().lab,kind=modules[current].lab;let art='',values=[],note='';
  const science=window.ScienceLabs.draw(kind,p);
  if(science){el('lab-figure').innerHTML=science.html;el('lab-values').innerHTML=readings(science.values);el('lab-description').textContent=science.note;return;}
  const timeline=(start,d1,d2)=>{const end=start+d1+d2,X=t=>55+(t-start)/(d1+d2)*480;let z=svgLine(55,100,535,100);z+=svgLine(X(start),100,X(start+d1),100,'#166534',9)+svgLine(X(start+d1),100,X(end),100,'#b45309',9);[start,start+d1,end].forEach(t=>z+=svgLine(X(t),90,X(t),112)+svgText(X(t)-14,137,fmt(t)+' s'));[start+d1/2,start+d1+d2/2].forEach((t,i)=>z+=svgDot(X(t),100,i?'#b45309':'#166534')+svgText(X(t)-25,68,fmt(t)+' s'));return z;};
  if(kind==='time'){
    art=svgText(30,24,`\u7b2c ${p.n} \u79d2\u5185\uff1a${p.n-1}\uff5e${p.n} s\uff1b\u7b2c ${p.n} \u79d2\u672b\uff1at=${p.n} s`)+timeline(0,p.t1,p.t2)+svgText(35,185,'\u5706\u70b9\u4ee3\u8868\u6bcf\u6bb5\u81ea\u5df1\u7684\u4e2d\u95f4\u65f6\u523b');
    values=[['\u7b2c\u4e00\u6bb5\u4e2d\u70b9',fmt(p.t1/2)+' s'],['\u7b2c\u4e8c\u6bb5\u4e2d\u70b9',fmt(p.t1+p.t2/2)+' s'],['\u4e2d\u70b9\u95f4\u9694',fmt((p.t1+p.t2)/2)+' s'],['\u7b2c n \u79d2\u4e0e\u4e0b\u4e00\u79d2\u5408\u5e76',`[${p.n-1}, ${p.n+1}] s`]];
    note='\u4e0a\u65b9\u6587\u5b57\u968f n \u6539\u53d8\uff1b\u65f6\u95f4\u8f74\u5355\u72ec\u5c55\u793a\u4ece 0 \u5f00\u59cb\u7684\u4e24\u6bb5\u53ef\u53d8\u65f6\u957f\u3002\u5148\u5206\u522b\u6c42\u4e2d\u70b9\uff0c\u518d\u76f8\u51cf\u3002';
  }
  if(kind==='rate'){
    const s1=p.v1*p.t1,s2=p.v2*p.t2,total=s1+s2;art=svgText(30,35,'\u4e24\u6bb5\u540c\u5411\u8fd0\u52a8\uff1a\u6761\u5f62\u957f\u5ea6\u8868\u793a\u4f4d\u79fb')+`<rect x="35" y="75" width="${510*s1/total}" height="46" fill="#166534"/><rect x="${35+510*s1/total}" y="75" width="${510*s2/total}" height="46" fill="#b45309"/>`+svgText(35,159,`\u7b2c\u4e00\u6bb5 ${fmt(s1)} m / ${fmt(p.t1)} s`)+svgText(35,195,`\u7b2c\u4e8c\u6bb5 ${fmt(s2)} m / ${fmt(p.t2)} s`);
    values=[['\u603b\u4f4d\u79fb / \u603b\u65f6\u95f4',fmt(total/(p.t1+p.t2))+' m/s'],['\u4e24\u6bb5\u901f\u5ea6\u76f4\u63a5\u5e73\u5747',fmt((p.v1+p.v2)/2)+' m/s']];note='\u4e24\u6bb5\u5206\u522b\u6309\u56fa\u5b9a\u901f\u5ea6\u8fd0\u52a8\uff1b\u5168\u7a0b\u4e0d\u8981\u6c42\u5300\u53d8\u901f\u3002\u65f6\u95f4\u76f8\u7b49\u6216\u901f\u5ea6\u76f8\u7b49\u65f6\uff0c\u8fd9\u4e24\u4e2a\u5e73\u5747\u503c\u76f8\u7b49\uff1b\u4e00\u822c\u9700\u6309\u5404\u6bb5\u65f6\u95f4\u52a0\u6743\u3002';
  }
  if(kind==='ratio'){
    const v=p.k*p.u,delta=v-p.u,mean=(v+p.u)/2;art=svgText(30,30,'\u672b\u901f\u5ea6 = \u539f\u6709\u901f\u5ea6 + \u901f\u5ea6\u589e\u52a0\u91cf');for(let i=0;i<p.k;i++)art+=`<rect x="${35+i*95}" y="85" width="88" height="55" rx="5" fill="${i===0?'#166534':'#b45309'}"/>`+svgText(57+i*95,120,fmt(p.u),'white');art+=svgText(35,180,`1 \u4efd\u539f\u6709 + ${p.k-1} \u4efd\u589e\u52a0 = ${p.k} \u4efd\u672b\u901f\u5ea6`);values=[['\u0394v = v\u672b \u2212 v\u521d',fmt(delta)+' m/s'],['\u5e73\u5747\u901f\u5ea6',fmt(mean)+' m/s'],['\u4f4d\u79fb = \u5e73\u5747\u901f\u5ea6 \u00d7 t',fmt(mean*p.T)+' m'],['a = \u0394v / t',fmt(delta/p.T)+' m/s\u00b2']];note='\u4fdd\u6301\u5300\u52a0\u901f\u4e14\u540c\u5411\u3002\u672b\u901f\u5ea6\u201c\u53d8\u4e3a k \u500d\u201d\uff0c\u901f\u5ea6\u53d8\u5316\u91cf\u662f (k\u22121)u\u3002\u6bcf\u4e2a\u65b9\u5757\u4ee3\u8868\u4e00\u4efd\u521d\u901f\u5ea6\uff0c\u4e0d\u662f\u4f4d\u79fb\u3002';
  }
  if(kind==='velocity'){
    const total=2*p.T,end=p.u+p.a*total,X=t=>50+t/total*480,Y=v=>210-v/Math.max(1,end)*160;
    art=svgLine(50,210,550,210)+svgLine(50,210,50,35)+svgLine(X(0),Y(p.u),X(total),Y(end),'#166534',3);
    [0,p.T,total].forEach(t=>art+=svgDot(X(t),Y(p.u+p.a*t))+svgText(X(t)-10,240,fmt(t)+' s'));
    art+=svgText(65,28,'v / m\u00b7s\u207b\u00b9')+svgText(400,28,'\u76f4\u7ebf\uff1a\u52a0\u901f\u5ea6\u6052\u5b9a');
    const s1=p.u*p.T+.5*p.a*p.T*p.T,s2=(p.u+p.a*p.T)*p.T+.5*p.a*p.T*p.T;
    values=[['\u7b2c\u4e00\u6bb5\u4f4d\u79fb',fmt(s1)+' m'],['\u7b2c\u4e8c\u6bb5\u4f4d\u79fb',fmt(s2)+' m'],['\u4ea4\u754c\u65f6\u523b\u901f\u5ea6',fmt(p.u+p.a*p.T)+' m/s'],['(s\u2081+s\u2082)/(2T)',fmt((s1+s2)/(2*p.T))+' m/s']];note='\u56fe\u4e0a\u6a2a\u5750\u6807\u662f\u65f6\u95f4\u3002\u7b49\u65f6\u4e24\u6bb5\u7684\u4ea4\u754c\u70b9\u4e5f\u662f\u6574\u4e2a\u65f6\u95f4\u533a\u95f4\u7684\u4e2d\u70b9\uff1b\u8be5\u5904\u901f\u5ea6\u7b49\u4e8e\u6574\u4e2a\u533a\u95f4\u5e73\u5747\u901f\u5ea6\u3002\u4e0d\u662f\u4e2d\u95f4\u4f4d\u7f6e\u5904\u7684\u901f\u5ea6\u3002';
  }
  if(kind==='segments'){
    const z=segmentModel(p.L,p.t1,p.t2);art=svgText(30,24,`\u4e24\u6bb5\u8ddd\u79bb\u5747\u4e3a ${p.L} m\uff1b\u5706\u70b9\u662f\u5e73\u5747\u901f\u5ea6\u5bf9\u5e94\u7684\u65f6\u523b`)+timeline(0,p.t1,p.t2)+svgText(35,187,`v(${fmt(z.mid1)}) = ${fmt(z.v1)} m/s`,'#166534')+svgText(35,224,`v(${fmt(z.mid2)}) = ${fmt(z.v2)} m/s`,'#b45309');
    values=[['\u901f\u5ea6\u4e4b\u5dee',fmt(z.v2-z.v1)+' m/s'],['\u5bf9\u5e94\u65f6\u523b\u4e4b\u5dee',fmt(z.mid2-z.mid1)+' s'],['a = \u0394v / \u0394t',fmt(z.a)+' m/s\u00b2'],['\u7531\u6761\u4ef6\u53cd\u63a8\u521d\u901f\u5ea6',fmt(z.u)+' m/s']];
    note=z.u<0?'\u8fd9\u7ec4\u53c2\u6570\u53cd\u63a8\u51fa\u8d1f\u521d\u901f\u5ea6\uff0c\u4e0d\u80fd\u4f5c\u4e3a\u201c\u5168\u7a0b\u540c\u5411\u3001\u4e24\u6bb5\u8def\u7a0b\u5747\u4e3a\u7ed9\u5b9a\u503c\u201d\u7684\u6848\u4f8b\uff1b\u8fd9\u91cc\u53ea\u80fd\u4f5c\u4e24\u6bb5\u6709\u5411\u4f4d\u79fb\u7684\u4ee3\u6570\u6f14\u793a\u3002\u8bf7\u8c03\u56de 2 s\u30011 s\u3002':'\u5047\u8bbe\u5168\u7a0b\u5300\u53d8\u901f\u4e14\u540c\u5411\uff0c\u521d\u901f\u5ea6\u7531\u6761\u4ef6\u53cd\u63a8\uff0c\u5e76\u672a\u5047\u5b9a\u4ece\u9759\u6b62\u5f00\u59cb\u3002\u5206\u6bcd\u5fc5\u987b\u4e0e\u6240\u7528\u901f\u5ea6\u503c\u7684\u4e24\u4e2a\u65f6\u523b\u5bf9\u5e94\u3002';
  }
  if(kind==='sign'){
    const X=x=>300+x/16*255;art=svgText(25,30,'\u539f\u6765 2 < 5\uff1b\u540c\u4e58\u4e00\u4e2a\u6570\u540e\uff0c\u6bd4\u8f83\u4e24\u4e2a\u65b0\u4f4d\u7f6e')+svgLine(35,135,565,135);
    for(let x=-15;x<=15;x+=5)art+=svgLine(X(x),130,X(x),142)+svgText(X(x)-12,170,x);
    art+=svgDot(X(2*p.m),135,'#166534')+svgDot(X(5*p.m),135,'#b45309')+svgText(30,220,`\u84dd\u70b9\uff1a2\u00d7${fmt(p.m)}\uff1b\u7eff\u70b9\uff1a5\u00d7${fmt(p.m)}`);
    values=[['\u4e24\u4e2a\u7ed3\u679c',`${fmt(2*p.m)} ${p.m>0?'<':p.m<0?'>':'='} ${fmt(5*p.m)}`],['\u6bd4\u8f83\u89c4\u5219',p.m>0?'\u6b21\u5e8f\u4fdd\u7559':p.m<0?'\u6b21\u5e8f\u53cd\u8f6c':'\u5747\u4e3a\u96f6\uff0c\u4fe1\u606f\u4e22\u5931']];note='\u4e58\u8d1f\u6570\u4f1a\u7ffb\u8f6c\u6570\u8f74\u4e0a\u7684\u5de6\u53f3\u6b21\u5e8f\u3002\u4e58\u96f6\u540e\u4e0d\u80fd\u4fdd\u7559\u4e25\u683c\u4e0d\u7b49\u5f0f\uff0c\u4e5f\u4e0d\u80fd\u518d\u901a\u8fc7\u9664\u96f6\u8fd8\u539f\u3002';
  }
  if(kind==='quadratic'||kind==='roots'){
    const f=x=>kind==='quadratic'?p.c*(x-1)*(x-3):(x-1)**p.power*(x-3);
    const X=x=>50+(x+1)/6*500,Y=y=>130-y*12;
    art=svgText(25,24,kind==='quadratic'?`y=${fmt(p.c)}(x\u22121)(x\u22123)`:`y=(x\u22121)^${p.power}(x\u22123)`);
    art+='<defs><clipPath id="curveclip"><rect x="50" y="40" width="500" height="180"/></clipPath></defs>'+svgLine(50,130,550,130)+svgLine(X(0),40,X(0),220);
    for(let x=-1;x<=5;x++)art+=svgLine(X(x),126,X(x),135)+svgText(X(x)-5,245,x);
    const path=Array.from({length:361},(_,i)=>{const x=-1+i/60;return (i?'L':'M')+X(x)+','+Y(f(x))}).join(' ');
    art+=`<path d="${path}" fill="none" stroke="#166534" stroke-width="3" clip-path="url(#curveclip)"/>`+svgDot(X(1),130)+svgDot(X(3),130);
    const positive=kind==='quadratic'?(p.c>0?'(\u2212\u221e,1) \u222a (3,+\u221e)':p.c<0?'(1,3)':'\u2205'):(p.power%2?'(\u2212\u221e,1) \u222a (3,+\u221e)':'(3,+\u221e)');
    values=[['y > 0 \u7684\u89e3\u96c6',positive],['x=1 \u4e24\u4fa7\u7b26\u53f7',kind==='quadratic'?(p.c===0?'\u4e24\u4fa7\u90fd\u4e3a\u96f6':'\u53d8\u53f7'):(p.power%2?'\u53d8\u53f7':'\u4e0d\u53d8\u53f7')]];
    note=kind==='quadratic'?'\u8d1f\u7cfb\u6570\u65f6\u6b63\u8d1f\u533a\u95f4\u7ffb\u8f6c\uff1ba=0 \u65f6\u6574\u6761\u66f2\u7ebf\u5728\u6a2a\u8f74\u4e0a\u3002\u6b64\u5904\u53ea\u663e\u793a\u4e25\u683c\u5927\u4e8e\u96f6\u7684\u89e3\u96c6\u3002':'\u56fa\u5b9a\u6700\u9ad8\u6b21\u9879\u7cfb\u6570\u4e3a\u6b63\u3002\u6839 1 \u7684\u91cd\u6570\u4e3a\u5076\u6570\u65f6\u4e0d\u53d8\u53f7\uff0c\u4e3a\u5947\u6570\u65f6\u53d8\u53f7\u3002\u82e5\u9898\u76ee\u542b\u7b49\u53f7\uff0c\u8fd8\u5fc5\u987b\u7eb3\u5165\u76f8\u5e94\u96f6\u70b9\u3002\u56fe\u5f62\u8d85\u51fa\u7eb5\u5411\u7a97\u53e3\u7684\u90e8\u5206\u88ab\u88c1\u5207\u3002';
  }
  if(kind==='cond'){
    const cq=p.cq??1,cw=p.cw??2;
    const X=x=>75+(x+3)*75;
    art=svgText(30,26,'P（绿）：使 p 成立的 x；Q（橙）：使 q 成立的 x')
      +`<rect x="${X(1)}" y="48" width="${X(3)-X(1)}" height="64" fill="#166534" opacity=".16"/>`
      +`<rect x="${X(cq)}" y="78" width="${Math.max(2,X(cq+cw)-X(cq))}" height="64" fill="#b45309" opacity=".16"/>`
      +svgLine(40,110,560,110);
    for(let x=-3;x<=7;x++)art+=svgLine(X(x),104,X(x),116)+svgText(X(x)-5,146,x);
    art+=svgDot(X(1),110,'#166534')+svgDot(X(3),110,'#166534')
      +`<circle class="lab-handle" data-key="cq" data-min="-1" data-max="5" data-x0="${X(-1)}" data-xs="75" cx="${X(cq)}" cy="110" r="10" fill="#b45309" style="cursor:grab"/>`
      +svgText(X(cq)-30,180,`Q 左端 ${fmt(cq)}`)+svgText(40,210,'拖动橙点与滑块改变 Q；p⇒q 对应 P⊂Q');
    const pSubQ=cq<=1+1e-9&&cq+cw>=3-1e-9, qSubP=cq>=1-1e-9&&cq+cw<=3+1e-9;
    let rel='P 与 Q 互不包含：p 是 q 的既不充分也不必要条件';
    if(pSubQ&&qSubP)rel='P=Q：p 与 q 互为充要条件';
    else if(pSubQ)rel='P⊂Q：p⇒q，p 是 q 的充分不必要条件';
    else if(qSubP)rel='Q⊂P：q⇒p，p 是 q 的必要不充分条件';
    values=[['P ⊆ Q ?',pSubQ?'是':'否'],['Q ⊆ P ?',qSubP?'是':'否'],['判定',rel]];
    note='充分条件的集合语言：p⇒q 等价于 P⊆Q。拖动 Q 观察四种关系如何随位置与宽度变化；两个端点恰好对齐时就是充要。';
  }
  if(kind==='gap'){
    const ga=p.ga??1,gb=p.gb??-2;
    const X=v=>40+(v+6)*24.5,Y1=70,Y2=190;
    art=svgText(30,24,'上行：原数；下行：各自的平方。虚线展示平方后的落点')
      +svgLine(40,Y1,575,Y1)+svgLine(40,Y2,575,Y2);
    [-5,0,5].forEach(v=>art+=svgLine(X(v),Y1-6,X(v),Y1+6)+svgText(X(v)-8,Y1+24,v));
    [0,5,10,15,20,25].forEach(v=>art+=svgLine(X(v),Y2-6,X(v),Y2+6)+svgText(X(v)-10,Y2+28,v));
    art+=svgText(30,Y1-12,'a、b')+svgText(30,Y2-12,'a²、b²')
      +`<line x1="${X(ga)}" y1="${Y1}" x2="${X(ga*ga)}" y2="${Y2}" stroke="#166534" stroke-width="1" stroke-dasharray="4 4"/>`
      +`<line x1="${X(gb)}" y1="${Y1}" x2="${X(gb*gb)}" y2="${Y2}" stroke="#b45309" stroke-width="1" stroke-dasharray="4 4"/>`
      +`<circle class="lab-handle" data-key="ga" data-min="-5" data-max="5" data-x0="${X(-5)}" data-xs="24.5" cx="${X(ga)}" cy="${Y1}" r="9" fill="#166534" style="cursor:grab"/>`
      +`<circle class="lab-handle" data-key="gb" data-min="-5" data-max="5" data-x0="${X(-5)}" data-xs="24.5" cx="${X(gb)}" cy="${Y1}" r="9" fill="#b45309" style="cursor:grab"/>`
      +svgDot(X(ga*ga),Y2,'#166534')+svgDot(X(gb*gb),Y2,'#b45309');
    const diff=ga-gb,sq=ga*ga-gb*gb;
    values=[['a − b',fmt(diff)+(diff>0?' > 0':diff<0?' < 0':' = 0')],['a² − b²',fmt(sq)],['(a−b)(a+b)',`${fmt(diff)}×${fmt(ga+gb)} = ${fmt(sq)}`],['结论',diff>0&&sq>0?'a>b 且 a²>b²':diff>0?'a>b 但 a²<b²（异号）':diff<0&&sq>0?'a<b 但 a²>b²（异号）':'a<b 且 a²<b²']];
    note='作差法：a²−b²=(a−b)(a+b)，差的符号由两个因子共同决定。拖动两数到一正一负，看“大数的平方反而小”；只有 a>b>0（同非负）才保证 a²>b²。';
  }
  if(kind==='param2'){
    const pa=p.pa??2;
    const f=x=>(x-1)*(x-pa);
    const X=x=>70+(x+2)*74,Y=y=>115-y*12;
    art=svgText(30,26,`y=(x−1)(x−${fmt(pa)})　两根：1 与 ${fmt(pa)}`)
      +'<defs><clipPath id="p2clip"><rect x="70" y="32" width="485" height="178"/></clipPath></defs>'
      +svgLine(70,115,555,115)+svgLine(X(0),32,X(0),210);
    for(let x=-2;x<=5;x++)art+=svgLine(X(x),111,X(x),119)+svgText(X(x)-5,230,x);
    const path=Array.from({length:281},(_,i)=>{const x=-2+i/50;return (i?'L':'M')+X(x)+','+Y(f(x))}).join(' ');
    art+=`<path d="${path}" fill="none" stroke="#166534" stroke-width="3" clip-path="url(#p2clip)"/>`;
    const lo=Math.min(1,pa),hi=Math.max(1,pa);
    if(pa!==1)art+=svgLine(X(lo),115,X(hi),115,'#16a34a',9);
    art+=svgDot(X(1),115,'#334155')
      +`<circle class="lab-handle" data-key="pa" data-min="-2" data-max="4" data-x0="${X(-2)}" data-xs="74" cx="${X(pa)}" cy="115" r="10" fill="#b45309" style="cursor:grab"/>`
      +svgText(35,255,'拖动橙点改变参数 a；绿线是 y<0 的解集');
    values=[['两根',`${fmt(1)} 与 ${fmt(pa)}`],['根序',pa>1?'a>1：1 在左':pa<1?'a<1：a 在左':'a=1：重根'],['y<0 解集',pa>1?`(1, ${fmt(pa)})`:pa<1?`(${fmt(pa)}, 1)`:'∅（严格不等式）']];
    note='小于零取两根之间——但“哪根在左”由参数决定。拖动 a 穿过 1：两根互换、解集翻转；a=1 时两根重合，区间缩成一点，严格小于零无解。';
  }
  if(kind==='quant'){
    const qa=p.qa??0;
    const Xu=x=>40+x*95,Yu=y=>98-y*8;
    const Xl=x=>330+(x+1.2)*100,Yl=y=>232-y*8;
    art=svgText(40,24,'上：∀x∈[1,2]，x²−a≥0？　下：∃x∈[0,1]，x²+x+a<0？');
    // 上面板
    art+=`<rect x="${Xu(1)}" y="34" width="${Xu(2)-Xu(1)}" height="72" fill="${qa<=1?'#16a34a':'#dc2626'}" opacity=".14"/>`
      +svgLine(35,98,300,98);
    let up='';for(let x=0;x<=2.6;x+=.1)up+=(up?'L':'M')+Xu(x)+','+Yu(x*x-qa);
    art+=`<path d="${up}" fill="none" stroke="#166534" stroke-width="2.5"/>`
      +svgText(40,120,`f(1)=1−a=${fmt(1-qa)} ${qa<=1?'≥ 0 ✓ 全部成立':'< 0 ✗ 存在反例'}`);
    // 下面板
    art+=`<rect x="${Xl(0)}" y="168" width="${Xl(1)-Xl(0)}" height="70" fill="${qa<0?'#16a34a':'#dc2626'}" opacity=".14"/>`
      +svgLine(325,232,590,232);
    let low='';for(let x=-1.2;x<=1.2;x+=.08)low+=(low?'L':'M')+Xl(x)+','+Yl(x*x+x+qa);
    art+=`<path d="${low}" fill="none" stroke="#b45309" stroke-width="2.5"/>`
      +svgText(335,254,`f(0)=a=${fmt(qa)} ${qa<0?'< 0 ✓ 找得到':'≥ 0 ✗ 找不到'}`);
    values=[['∀x∈[1,2]，x²−a≥0',qa<=1?'真：区间最低点 f(1)≥0':'假：最低点 f(1)<0'],['∃x∈[0,1]，x²+x+a<0',qa<0?'真：f(0)<0 即可':'假：最小值 f(0)≥0'],['否定的量词互换','∀↔∃，结论同时取反']];
    note='全称命题看区间内最低点（函数最小值），存在命题只需找到一个点。同一个 a 同时驱动两个命题：a 滑过 1 和 0 的瞬间，两个命题的真假先后翻转。';
  }
  if(kind==='deltas'){
    const ea=p.ea??2,et=p.et??1,v0=1;
    const x=t=>v0*t+.5*ea*t*t,T3=3*et,maxS=x(T3)+.1;
    const Xt=t=>45+t/T3*260,Yx=y=>215-y/maxS*150;
    art=svgText(30,22,'左：x–t 图（三段等时）；右：各段位移柱状图');
    art+=svgLine(40,215,315,215)+svgLine(45,55,45,215);
    [0,1,2,3].forEach(i=>art+=svgLine(Xt(i*et),211,Xt(i*et),219)+svgText(Xt(i*et)-10,237,fmt(i*et)+'s'));
    for(let i=0;i<3;i++)art+=`<rect x="${Xt(i*et)}" y="55" width="${Xt((i+1)*et)-Xt(i*et)}" height="160" fill="${i%2?'#b45309':'#166534'}" opacity=".08"/>`;
    let curve='';for(let t=0;t<=T3;t+=T3/60)curve+=(curve?'L':'M')+Xt(t)+','+Yx(x(t));
    art+=`<path d="${curve}" fill="none" stroke="#334155" stroke-width="2.5"/>`;
    const s1=x(et)-x(0),s2=x(2*et)-x(et),s3=x(3*et)-x(2*et),maxBar=Math.max(s1,s2,s3);
    [s1,s2,s3].forEach((sv,i)=>{const bx=345+i*72,bh=Math.max(2,sv/maxBar*150);art+=`<rect x="${bx}" y="${215-bh}" width="55" height="${bh}" fill="${i%2?'#b45309':'#166534'}" opacity=".85"/>`+svgText(bx+4,208-bh,fmt(sv));});
    art+=svgText(345,244,'s₁')+svgText(417,244,'s₂')+svgText(489,244,'s₃')
      +svgText(345,256,`相邻差都 = aT² = ${fmt(ea*et*et)}`);
    values=[['s₁ / s₂ / s₃',`${fmt(s1)} / ${fmt(s2)} / ${fmt(s3)}`],['s₂−s₁',fmt(s2-s1)+' m'],['s₃−s₂',fmt(s3-s2)+' m'],['aT²',fmt(ea*et*et)+' m/s² × s²']];
    note='拖动加速度或每段时长：柱高在变，但相邻差始终等于 aT²——推导时初速度 v₀ 在两段相减中消去，所以差与 v₀ 无关。自由落体 g=10、T=1 s 时，相邻一秒位移差恒为 10 m。';
  }
  if(kind==='vtgraph'){
    const fv=p.fv??20,fa=p.fa??-5,TT=8;
    const tStop=fa<0?fv/(-fa):Infinity;
    const vMax=Math.max(fv+fa*TT,fv,10)+3;
    const X=t=>55+t/TT*495,Y=v=>200-v/vMax*155;
    art=svgText(30,22,'v–t 图：斜率 = a，面积 = 位移；红虚线是“不检验停止时间”的错误延伸')
      +svgLine(50,200,555,200)+svgLine(55,30,55,200);
    [0,2,4,6,8].forEach(t=>art+=svgLine(X(t),196,X(t),204)+svgText(X(t)-8,222,t+'s'));
    const vAt=t=>fv+fa*t;
    let vl='';const tEnd=fa<0?Math.min(TT,tStop):TT;
    for(let t=0;t<=tEnd+1e-9;t+=tEnd/60)vl+=(vl?'L':'M')+X(t)+','+Y(vAt(t));
    art+=`<path d="${vl}" fill="none" stroke="#166534" stroke-width="3"/>`;
    if(fa<0&&tStop<TT){art+=svgLine(X(tStop),200,X(tStop),Y(0),'#334155',1)+svgText(X(tStop)-30,214,`停于 ${fmt(tStop)}s`);
      let bad='';for(let t=tStop;t<=TT;t+=TT/60)bad+='L'+X(t)+','+Y(vAt(t));
      art+=`<path d="M${X(tStop)},${Y(0)} ${bad}" fill="none" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="5 4"/>`;
      art+=svgLine(X(tStop),200,X(TT),200,'#166534',3);
    }
    art+=svgDot(X(0),Y(fv),'#334155')+svgText(60,Y(fv)-8,`v₀=${fmt(fv)}`);
    const xReal=fa>=0?fv*TT+.5*fa*TT*TT:(tStop<=TT?fv*fv/(2*(-fa)):fv*tStop+.5*fa*tStop*tStop);
    const xNaive=fv*TT+.5*fa*TT*TT;
    values=[['停止时间',fa<0?fmt(tStop)+' s':'8 s 内不停'],['实际位移（8 s 内）',fmt(xReal)+' m'],['直接套 8 s 公式',fa<0?fmt(xNaive)+' m（错误）':fmt(xNaive)+' m'],['刹车距离 v₀²/2|a|',fa<0?fmt(fv*fv/(2*(-fa)))+' m':'—']];
    note='刹车题先算停止时间 v₀/|a|：车停下后速度保持 0，实线贴轴。红虚线是把公式硬套到 8 s 的结果——等于假设车倒车回去，位移偏小。求刹车距离用 v²−v₀²=2ax（不含 t）一步到位，再用“梯形面积”互相检验。';
  }
  el('lab-figure').innerHTML=svgWrap(art,260,modules[current].title);el('lab-values').innerHTML=readings(values);el('lab-description').textContent=note;
}
el('restart').onclick=()=>{sessions[current]=fresh();render();};
el('summary').onclick=showSummary;
function routeTraining() {
  const value=typeof location==='undefined'?null:new URLSearchParams(location.hash.slice(1)).get('module');
  const found=modules.findIndex(m=>m.id===value);
  current=found>=0?found:/^\d+$/.test(value||'')&&Number(value)<modules.length?Number(value):0;
  render();
}
if(window.addEventListener)window.addEventListener('hashchange',routeTraining);
routeTraining();
