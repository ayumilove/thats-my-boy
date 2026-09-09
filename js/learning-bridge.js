/* Shared integration for existing lessons. Never block a lesson on storage failure. */
(function (root) {
  "use strict";
  const S = root.LearningStore,
    C = root.Curriculum;
  function notice(message) {
    let box = document.getElementById("learning-notice");
    if (!box) {
      box = document.createElement("p");
      box.id = "learning-notice";
      box.setAttribute("role", "status");
      document.querySelector("main").prepend(box);
    }
    box.textContent = message;
  }
  function safely(fn) {
    try {
      return fn();
    } catch (e) {
      notice(e.message);
      return null;
    }
  }
  function capture({
    sourceKey,
    subject,
    question,
    studentAnswer,
    expectedAnswer,
    node,
    source,
  }) {
    return safely(() =>
      S.capture({
        sourceKey,
        subject,
        question,
        studentAnswer,
        expectedAnswer,
        source,
        analysis: {
          source: "manual",
          summary:
            "系统练习中的首答或辅助作答已记录。关联的是本题考查范围，具体错因还需结合解法判断。",
          links: [
            {
              id: node,
              role: "tested",
              evidence: question,
              reason: "由该题所属专项直接关联，不据此判定学生能力。",
              confidence: "high",
            },
          ],
          missing: [],
        },
      }),
    );
  }
  function origin() {
    return new URLSearchParams(location.hash.slice(1)).get("mistake");
  }
  function review(moduleId, result, attemptId) {
    safely(() => {
      const r = S.list().find((r) => r.id === origin());
      if (
        !r ||
        !r.analysis?.links.some(
          (l) =>
            C.get(l.id)?.training === moduleId ||
            C.get(l.id)?.prerequisites.some(
              (id) => C.get(id)?.training === moduleId,
            ),
        )
      )
        return;
      if (r.reviews.some((v) => v.attemptId === attemptId)) return;
      r.reviews.push({
        at: new Date().toISOString(),
        source: "training",
        moduleId,
        attemptId,
        result,
      });
      S.put(r);
    });
  }
  const id = origin();
  if (id)
    safely(() => {
      const r = S.list().find((x) => x.id === id);
      if (!r) return;
      const p = document.createElement("p"),
        a = document.createElement("a");
      a.href = "learning.html#mistake=" + encodeURIComponent(id);
      a.textContent = "← 返回原错题：" + r.question.slice(0, 60);
      p.append(a);
      document.querySelector("main").prepend(p);
    });
  root.LearningBridge = { capture, review, safely, notice };
})(window);
