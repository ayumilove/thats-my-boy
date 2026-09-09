const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const storage = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
  };
};
const window = {
  localStorage: storage(),
  sessionStorage: storage(),
  crypto: { randomUUID },
};
let responder,
  requests = [];
const ctx = vm.createContext({
  window,
  URL,
  AbortController,
  setTimeout,
  clearTimeout,
  fetch: async (...args) => {
    requests.push(args);
    return responder(...args);
  },
});
for (const file of ["curriculum", "learning-store", "llm"])
  vm.runInContext(
    fs.readFileSync(path.join(__dirname, "../js/" + file + ".js"), "utf8"),
    ctx,
  );
const { Curriculum: C, LearningStore: S, LearningAI: A } = window;
async function main() {
  assert.equal(new Set(C.nodes.map((n) => n.id)).size, C.nodes.length);
  for (const n of C.nodes) {
    assert(C.subjects.some((s) => s.id === n.subject));
    for (const p of n.prerequisites) assert(C.get(p));
    assert(C.href(n.id).includes(n.training ? "module=" : "topic="));
  }
  function visit(id, ancestors = []) {
    assert(!ancestors.includes(id), "Prerequisite cycle");
    for (const p of C.get(id).prerequisites) visit(p, [...ancestors, id]);
  }
  C.nodes.forEach((n) => visit(n.id));
  const r = S.create({
    subject: "physics",
    question: "两段等距离运动，时间为2秒、1秒，求加速度。",
    studentAnswer: "我用速度之差除以1秒。",
    expectedAnswer: "用中点时刻差。",
    source: "周测",
  });
  assert.equal(S.list()[0].id, r.id);
  assert.equal(
    S.capture({ sourceKey: "test", subject: "physics", question: "q" }).id,
    S.capture({ sourceKey: "test", question: "q" }).id,
  );
  assert.equal(
    A.endpoint("https://example.com/v1/"),
    "https://example.com/v1/chat/completions",
  );
  assert.equal(
    A.endpoint("http://localhost:1234/v1/chat/completions"),
    "http://localhost:1234/v1/chat/completions",
  );
  for (const url of [
    "http://example.com/v1",
    "https://user:pass@example.com",
    "https://example.com?key=secret",
    "javascript:alert(1)",
  ])
    assert.throws(() => A.endpoint(url));
  A.saveConfig({
    url: "https://example.com/v1",
    model: "custom-model",
    key: "private-key",
    remember: false,
  });
  assert(!JSON.stringify(S.read("api", {})).includes("private-key"));
  assert.equal(A.config().key, "private-key");
  A.saveConfig({
    url: "https://example.com/v1",
    model: "custom-model",
    key: "private-key",
    remember: true,
  });
  assert.equal(S.read("api", {}).key, "private-key");
  assert(!JSON.stringify(S.backup()).includes("private-key"));
  A.clearKey();
  assert.equal(A.config().key, "");
  const valid = {
    summary: "需要核对时间差。",
    links: [
      {
        id: "unequal",
        role: "weakness",
        evidence: "除以1秒",
        reason: "需要核对两个中点的间隔。",
        confidence: "medium",
      },
    ],
    missing: [],
  };
  assert.equal(
    A.validate("```json\n" + JSON.stringify(valid) + "\n```", r).links[0].id,
    "unequal",
  );
  assert.throws(() => A.validate("not json", r));
  assert.throws(() =>
    A.validate(
      JSON.stringify({
        ...valid,
        links: [{ ...valid.links[0], evidence: "不存在的原文" }],
      }),
      r,
    ),
  );
  assert.throws(
    () =>
      A.validate(
        JSON.stringify({
          ...valid,
          links: [{ ...valid.links[0], evidence: "两段等距离运动" }],
        }),
        r,
      ),
    /解法/,
  );
  assert.throws(() =>
    A.validate(
      JSON.stringify({ ...valid, links: [{ ...valid.links[0], id: "sets" }] }),
      r,
    ),
  );
  const unknown = A.validate(
    JSON.stringify({
      ...valid,
      links: [{ ...valid.links[0], id: "missing-node" }],
    }),
    r,
  );
  assert.equal(unknown.links.length, 0);
  assert.equal(unknown.missing.length, 1);
  S.put({ ...r, analysis: unknown });
  assert.equal(S.gaps()[0].mistakeIds[0], r.id);
  responder = async () => ({
    ok: true,
    json: async () => ({
      choices: [
        { message: { content: JSON.stringify(valid) }, finish_reason: "stop" },
      ],
    }),
  });
  A.saveConfig({
    url: "https://example.com/v1",
    model: "custom-model",
    key: "key",
    remember: false,
  });
  const analysis = await A.analyze(r);
  assert.equal(analysis.source, "ai");
  assert.equal(analysis.model, "custom-model");
  const [url, options] = requests.at(-1),
    body = JSON.parse(options.body);
  assert.equal(body.model, "custom-model");
  assert.equal(options.headers.Authorization, "Bearer key");
  assert.equal(options.redirect, "error");
  assert.equal(body.messages.length, 2);
  assert(!body.messages[1].content.includes("private-key"));
  for (const status of [401, 403, 404, 429, 500]) {
    responder = async () => ({ ok: false, status });
    await assert.rejects(() => A.analyze(r));
  }
  responder = async () => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: "{}" }, finish_reason: "length" }],
    }),
  });
  await assert.rejects(() => A.analyze(r), /截断/);
  responder = async () => ({ ok: true, json: async () => ({ choices: [] }) });
  await assert.rejects(() => A.analyze(r), /可用文本/);
  responder = async (url, opts) =>
    new Promise((resolve, reject) => {
      if (opts.signal.aborted) reject(new Error("abort"));
      else
        opts.signal.addEventListener("abort", () => reject(new Error("abort")));
    });
  const c = new AbortController(),
    p = A.analyze(r, c.signal);
  c.abort();
  await assert.rejects(() => p, /取消/);
  window.localStorage.setItem("mathesis.v1.mistakes", "invalid json");
  assert.throws(() => S.list(), /读取/);
  window.localStorage.setItem("mathesis.v1.mistakes", "{}");
  assert.throws(() => S.list(), /格式/);
  window.localStorage.setItem = () => {
    throw new Error("quota");
  };
  assert.throws(() => S.write("test", []), /保存失败/);
  console.log(
    "PASS: curriculum integrity, persistence, deduplication, secret exclusion, API requests/errors/cancellation, evidence validation and unknown-node backlog.",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
