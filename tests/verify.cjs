// Dependency-free calculation and training-flow checks. Not browser QA.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const elements = new Map();
const document = {
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, { innerHTML:'', textContent:'', scrollIntoView() {} });
    return elements.get(id);
  },
  querySelectorAll() { return []; }
};
const ctx = vm.createContext({ document, window:{}, console });
for (const name of ['js/utils.js','training-data.js','training.js']) vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),ctx);
const run = expression => vm.runInContext(expression,ctx);
assert.equal(run('modules.length'),8);
assert.equal(run('modules.reduce((n,m)=>n+m.qs.length,0)'),48);
assert(run('modules.every(m=>m.qs.length===6&&m.qs.every(q=>Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length&&q.hint&&q.why&&q.skill))'));
// Independent diagnosis skips prerequisites; uncertain correct answers do not.
run("current=0;sessions[0]=fresh();state().selected=question().answer;state().confidence='sure';checkAnswer();advance()");
assert.equal(run('state().step'),3);
run("sessions[0]=fresh();state().selected=question().answer;state().confidence='unsure';checkAnswer();advance()");
assert.equal(run('state().step'),1);
run("sessions[0]=fresh();state().selected=(question().answer+1)%3;state().confidence='sure';checkAnswer();advance()");
assert.equal(run('state().step'),1);
// Viewing the experiment or a hint cannot be counted as independent success.
run("sessions[0]=fresh();state().selected=question().answer;state().confidence='sure';state().assisted=true;checkAnswer();advance()");
assert.equal(run('state().step'),1);
// All module flows and visual calculations execute; final failures remain 'needs practice'.
for(let i=0;i<8;i++) {
  run(`current=${i};sessions[current]=fresh();`);
  for(let j=0;j<6;j++) {
    run(`goStep(${j});state().selected=question().answer;state().confidence='sure';checkAnswer();`);
    assert(!/NaN|Infinity|undefined/.test(elements.get('lab-figure').innerHTML));
  }
  run('advance()');
  assert.equal(run('statusText(state())'),'本次通过');
  run("state().complete=false;goStep(5);state().selected=(question().answer+1)%3;state().confidence='sure';checkAnswer();advance()");
  assert.equal(run('statusText(state())'),'需再练');
}
const z=run('segmentModel(120,2,1)');
assert.equal(z.mid1,1);assert.equal(z.mid2,2.5);assert.equal(z.a,40);assert.equal(z.u,20);
assert.equal(run('segmentModel(60,2,1).a'),20);
assert.equal(run('segmentModel(90,3,1).a'),30);
// Reconstructed velocities integrate to the specified displacement of both segments.
for(const L of [60,120,180])for(const t1 of [2,2.5,3])for(const t2 of [1,1.5,2]) {
  const z=run(`segmentModel(${L},${t1},${t2})`);
  assert(Math.abs(z.u*t1+.5*z.a*t1*t1-L)<1e-8);
  assert(Math.abs((z.u+z.a*t1)*t2+.5*z.a*t2*t2-L)<1e-8);
}
// Scalar arithmetic supporting the ratio and interval-transfer items.
for (const u of [1,2,5]) for (const k of [2,3,5]) for (const t of [1,2,4]) {
  const s=(u+k*u)*t/2,a=(k*u-u)/t;
  assert(Math.abs(a-2*(k-1)*s/((k+1)*t*t))<1e-10);
}
// Inequality solution sets are checked at roots and representative interval points.
for (const x of [-4,-2,0,1,2,3,4,6]) {
  assert.equal(-(x-1)*(x-3)>0,x>1&&x<3);
  assert.equal(-2*(x+2)*(x-4)>=0,x>=-2&&x<=4);
  assert.equal((x-1)**2*(x-3)>=0,x===1||x>=3);
  assert.equal((x+2)**2*(x-4)<=0,x<=4);
}
// Every shipped HTML resource is relative, available locally, and suitable for Pages project paths.
for(const file of ['index.html','training.html']) {
  const html=fs.readFileSync(path.join(root,file),'utf8');
  for(const [,ref] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    assert(!ref.startsWith('/'),`Root-relative resource: ${ref}`);
    if(!/^(https?:|#)/.test(ref))assert(fs.existsSync(path.join(root,ref)),`Missing resource: ${ref}`);
  }
}
console.log('PASS: 48 question records, adaptive branching, all eight render paths, assistance accounting, motion identities, inequality boundaries, local resources.');
