'use strict';
const modules = window.TRAINING_MODULES;
var fmt = fmtNum;
const labels = ['定位卡点','基础一','基础二','解释规律','迁移练习','独立复核'];
let current = 0;
const persisted = window.LearningBridge?.safely(()=>window.LearningStore.read('training',{})) || {};
const sessions = modules.map(m => {
  const s=persisted[m.id];
  return s && Number.isInteger(s.step) && s.step>=0 && s.step<6 && s.results && s.lab && (!s.checked||s.results[s.step]) ? {...fresh(),...s} : fresh();
});
function fresh() { return { attemptId:Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),step:0, selected:null, confidence:'', checked:false, assisted:false, hint:false, stuck:'', results:{}, complete:false, labOpen:false, lab:{n:4,t1:2,t2:1,L:120,u:2,a:2,k:3,T:2,left:2,right:5,m:-1,c:1,power:2,v1:2,v2:6} }; }
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
  s.lab=window.ScienceLabs.defaults(s.lab);
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
  el('lab-content').innerHTML='<div id="lab-figure"></div><div id="lab-values"></div><p class="lab-caption" id="lab-description"></p>'+controls;
  drawLab(); document.querySelectorAll('[data-lab]').forEach(e=>e.oninput=()=>{s.lab[e.dataset.lab]=Number(e.value);const output=el('value-'+e.dataset.lab);if(output)output.textContent=fmt(Number(e.value));drawLab();persist()});
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
