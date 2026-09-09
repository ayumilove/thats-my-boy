(function () {
  "use strict";
  const $ = (id) => document.getElementById(id),
    S = window.LearningStore,
    C = window.Curriculum,
    A = window.LearningAI;
  const esc = (value) =>
    String(value ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const subjectName = (id) => C.subjects.find((s) => s.id === id)?.name || id;
  const notify = (message) => {
    $("notice").textContent = message;
  };
  let active = null,
    controller = null;
  function safe(action) {
    return (...args) => {
      try {
        return action(...args);
      } catch (e) {
        notify(e.message);
      }
    };
  }
  const options = C.subjects
    .map(
      (s) =>
        `<option value="${s.id}">${s.name}${s.available ? "" : "（课程待补）"}</option>`,
    )
    .join("");
  $("subject").innerHTML = options;
  $("filter").insertAdjacentHTML("beforeend", options);
  function renderRecords() {
    const records = S.list().filter(
      (r) => !$("filter").value || r.subject === $("filter").value,
    );
    $("records").innerHTML = records.length
      ? records
          .map(
            (r) =>
              `<article class="record"><span class="badge-text">${esc(subjectName(r.subject))} · ${esc(r.source || "手动录入")} · ${r.analysis ? "已关联，待复核" : "待关联"}</span><a class="record-link" href="#mistake=${encodeURIComponent(r.id)}">${esc(r.question.slice(0, 100))}</a><p class="notes">${r.reviews?.length ? `已有 ${r.reviews.length} 次复核记录` : "尚无独立复核记录"}</p></article>`,
          )
          .join("")
      : "<p>还没有这类错题。在上面录入一道即可开始。</p>";
  }
  function renderDetail(id) {
    const r = S.list().find((x) => x.id === id);
    if (!r) {
      location.hash = "notebook";
      notify("这条错题不存在或已删除。");
      return;
    }
    active = r.id;
    const a = r.analysis;
    $("detail").innerHTML =
      `<h1>找到这道题的卡点</h1><p class="badge-text">${esc(subjectName(r.subject))} · ${esc(r.source || "手动录入")}</p><h2>题目</h2><p class="source-text">${esc(r.question)}</p><h2>你的解法</h2><p class="source-text">${esc(r.studentAnswer || "尚未填写，暂不能判断具体错因。")}</p>${r.expectedAnswer ? `<details><summary>参考答案</summary><p class="source-text">${esc(r.expectedAnswer)}</p></details>` : ""}
    <div class="actions"><button class="primary" id="analyze">${a ? "重新分析" : "用 AI 关联知识"}</button><button class="quiet" id="cancel" hidden>取消分析</button><a href="#settings">API 设置</a></div><p class="notes">点击分析会发送此题内容到已设置的服务。结果是学习建议，不是能力诊断。</p><div id="analysis-progress" role="status"></div>
    ${
      a
        ? `<h2>关联结果 <span class="badge-text">${a.source === "ai" ? "AI 建议 · 待核对" : "手动关联"}</span></h2><p class="analysis-summary source-text">${esc(a.summary)}</p>${a.links
            .map((l) => {
              const n = C.get(l.id);
              if (!n) return "";
              return `<article class="knowledge-link"><h3>${esc(n.title)}</h3><span class="badge-text">${{ tested: "本题考查", weakness: "疑似卡点", prerequisite: "前置基础" }[l.role] || "手动关联"} · ${l.confidence === "high" ? "较高" : l.confidence === "medium" ? "中等" : "较低"}置信度（非测评分数）</span><p>原文：<q>${esc(l.evidence)}</q></p><p>${esc(l.reason)}</p><a href="${esc(C.href(n.id, r.id))}">${n.training ? "开始补强" : "打开知识实验"} →</a>${n.prerequisites.length ? `<p class="notes">需要时先补：${n.prerequisites.map((id) => `<a href="${esc(C.href(id, r.id))}">${esc(C.get(id).title)}</a>`).join("、")}</p>` : ""}</article>`;
            })
            .join(
              "",
            )}${a.missing.length ? `<h2>系统还缺少的内容</h2>${a.missing.map((m) => `<p><strong>${esc(m.title)}</strong>：${esc(m.reason)}</p>`).join("")}<a href="#gaps">已记录，查看待补知识 →</a>` : ""}`
        : "<p>可以用 AI 分析，也可以在下面直接选择知识点。</p>"
    }
    <details id="manual"><summary>手动关联 / 修正建议</summary><form id="manual-form"><label>选择知识点<select id="node"><option value="">系统没有对应知识点</option>${C.nodes
      .filter(
        (n) =>
          n.subject === r.subject ||
          (r.subject === "physics" && n.subject === "math"),
      )
      .map((n) => `<option value="${n.id}">${esc(n.title)}</option>`)
      .join(
        "",
      )}</select></label><label>关联依据或需要补充的内容<input id="manual-reason" required maxlength="500" placeholder="说明具体哪一步有问题；没有课程时填写知识点名称"></label><button class="primary">保存此关联</button><p class="notes">手动保存会替换当前建议，原题保留。</p></form></details>
    <details><summary>补充或修改错题</summary><form id="edit-form"><label>题目<textarea id="edit-question" required maxlength="8000">${esc(r.question)}</textarea></label><label>你的解法<textarea id="edit-answer" maxlength="8000">${esc(r.studentAnswer)}</textarea></label><label>参考答案<textarea id="edit-expected" maxlength="8000">${esc(r.expectedAnswer)}</textarea></label><button class="primary">保存修改，重新关联</button><p class="notes">修改会清除旧分析与复核，避免沿用不匹配的建议。</p></form></details>
    <h2>复核记录</h2><p class="notes">先遮住答案重做原题，再记录结果。自评和系统练习分别记录，均不直接标记为长期掌握。</p><form id="review-form"><label>这次结果<select id="review-result"><option value="independent">独立完成，能解释理由</option><option value="assisted">借助提示完成</option><option value="retry">仍需补强</option></select></label><button class="quiet">记录本次自评</button></form><div>${(r.reviews || []).map((v) => `<p class="notes">${esc(new Date(v.at).toLocaleString())} · ${v.source === "training" ? "专项复核" : "原题自评"}：${{ independent: "独立完成", assisted: "借助帮助", retry: "需再练" }[v.result] || "已记录"}</p>`).join("")}</div><details><summary>删除此题</summary><button class="quiet" id="delete">确认删除这条错题及关联记录</button></details>`;
    $("analyze").onclick = () => analyze(r.id);
    $("cancel").onclick = () => controller?.abort();
    $("manual-form").onsubmit = safe((e) => {
      e.preventDefault();
      const node = $("node").value,
        reason = $("manual-reason").value.trim();
      if (!reason) throw new Error("请填写关联依据。");
      r.analysis = {
        source: "manual",
        summary: reason,
        createdAt: new Date().toISOString(),
        links: node
          ? [
              {
                id: node,
                role: "tested",
                evidence: (r.studentAnswer || r.question).slice(0, 3000),
                reason,
                confidence: "low",
              },
            ]
          : [],
        missing: node ? [] : [{ title: reason.slice(0, 120), reason }],
      };
      S.put(r);
      renderDetail(r.id);
      notify("手动关联已保存。");
    });
    $("edit-form").onsubmit = safe((e) => {
      e.preventDefault();
      const question = $("edit-question").value.trim();
      if (!question) throw new Error("题目不能为空。");
      S.put({
        ...r,
        question,
        studentAnswer: $("edit-answer").value.trim(),
        expectedAnswer: $("edit-expected").value.trim(),
        analysis: null,
        reviews: [],
      });
      renderDetail(r.id);
      notify("修改已保存，请重新关联。");
    });
    $("review-form").onsubmit = safe((e) => {
      e.preventDefault();
      r.reviews = [
        ...(r.reviews || []),
        {
          at: new Date().toISOString(),
          source: "self",
          result: $("review-result").value,
        },
      ];
      S.put(r);
      renderDetail(r.id);
      notify("复核已记录。建议隔一两天用新题再检查。");
    });
    $("delete").onclick = safe(() => {
      S.remove(r.id);
      location.hash = "notebook";
      notify("已删除此题。");
    });
  }
  async function analyze(id) {
    if (controller) return;
    controller = new AbortController();
    const currentController = controller;
    $("analyze").disabled = true;
    $("cancel").hidden = false;
    for (const f of $("detail").querySelectorAll("form button,#delete"))
      f.disabled = true;
    $("analysis-progress").textContent =
      "正在核对题目、解法与知识目录，最长等待 45 秒…";
    try {
      const r = S.list().find((x) => x.id === id),
        analysis = await A.analyze(r, controller.signal);
      if (currentController.signal.aborted) return;
      const latest = S.list().find((x) => x.id === id);
      if (latest) {
        S.put({ ...latest, analysis });
        if (active === id) renderDetail(id);
        notify("分析已保存。请核对原文证据，再选择一项补强。");
      }
    } catch (e) {
      notify(e.message);
    } finally {
      controller = null;
      if (active === id && $("analyze")) {
        $("analyze").disabled = false;
        $("cancel").hidden = true;
        $("analysis-progress").textContent = "";
        for (const f of $("detail").querySelectorAll("form button,#delete"))
          f.disabled = false;
      }
    }
  }
  function route() {
    controller?.abort();
    active = null;
    notify("");
    const hash = location.hash.slice(1),
      view =
        hash === "settings"
          ? "settings"
          : hash === "gaps"
            ? "gaps"
            : hash.startsWith("mistake=")
              ? "detail"
              : "notebook";
    for (const name of ["notebook", "detail", "settings", "gaps"])
      $(name + "-view").hidden = name !== view;
    if (view === "notebook") {
      renderRecords();
      if (hash === "new") $("question").focus();
    }
    if (view === "detail") renderDetail(decodeURIComponent(hash.slice(8)));
    if (view === "settings") {
      const c = A.config();
      $("api-url").value = c.url || "";
      $("api-model").value = c.model || "";
      $("api-key").value = c.key || "";
      $("remember-key").checked = !!c.remember;
    }
    if (view === "gaps")
      $("gaps").innerHTML =
        S.gaps()
          .map(
            (g) =>
              `<article class="gap"><h2>${esc(subjectName(g.subject))} · ${esc(g.title)}</h2><p>${esc(g.reason)}</p><p>关联 ${g.mistakeIds.length} 道错题：${g.mistakeIds.map((id, i) => `<a href="#mistake=${encodeURIComponent(id)}">原题 ${i + 1}</a>`).join("、")}</p></article>`,
          )
          .join("") ||
        "<p>目前没有记录知识缺口。未匹配到课程的内容会出现在这里。</p>";
  }
  $("mistake-form").onsubmit = safe((e) => {
    e.preventDefault();
    const question = $("question").value.trim();
    if (!question) throw new Error("请填写题目。");
    const r = S.create({
      subject: $("subject").value,
      source: $("source").value.trim(),
      question,
      studentAnswer: $("student-answer").value.trim(),
      expectedAnswer: $("expected-answer").value.trim(),
    });
    $("mistake-form").reset();
    location.hash = "mistake=" + r.id;
    notify("错题已保存。");
  });
  const formConfig = () => ({
    url: $("api-url").value,
    model: $("api-model").value,
    key: $("api-key").value,
    remember: $("remember-key").checked,
  });
  $("settings-form").onsubmit = safe((e) => {
    e.preventDefault();
    A.saveConfig(formConfig());
    $("api-status").textContent = "设置已保存。返回错题即可分析。";
  });
  $("test-api").onclick = async () => {
    if (!$("settings-form").reportValidity()) return;
    $("test-api").disabled = true;
    $("api-status").textContent = "正在测试…";
    try {
      await A.request(formConfig(), [{ role: "user", content: "请回复 OK" }]);
      $("api-status").textContent = "连接成功，模型可以返回文本。请保存设置。";
    } catch (e) {
      $("api-status").textContent = e.message;
    } finally {
      $("test-api").disabled = false;
    }
  };
  $("clear-key").onclick = safe(() => {
    A.clearKey();
    $("api-key").value = "";
    $("remember-key").checked = false;
    $("api-status").textContent = "已清除保存的密钥。";
  });
  function download(data, name) {
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      ),
      link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $("export").onclick = safe(() =>
    download(S.backup(), "mathesis-learning.json"),
  );
  $("export-gaps").onclick = safe(() =>
    download(
      { schemaVersion: 1, gaps: S.gaps() },
      "mathesis-curriculum-gaps.json",
    ),
  );
  $("import").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      if (file.size > 5e6) throw new Error("备份超过 5 MB，请分批整理。");
      const data = JSON.parse(await file.text());
      if (
        data.schemaVersion !== 1 ||
        !Array.isArray(data.mistakes) ||
        data.mistakes.length > 5000
      )
        throw new Error("不是支持的学习备份。");
      const existing = S.list(),
        ids = new Set(existing.map((r) => r.id)),
        add = [];
      for (const r of data.mistakes) {
        if (
          typeof r.id !== "string" ||
          !/^[\w-]{1,100}$/.test(r.id) ||
          !C.subjects.some((s) => s.id === r.subject) ||
          typeof r.question !== "string" ||
          !r.question.trim() ||
          r.question.length > 8000 ||
          typeof r.studentAnswer !== "string" ||
          r.studentAnswer.length > 8000 ||
          typeof r.expectedAnswer !== "string" ||
          r.expectedAnswer.length > 8000
        )
          throw new Error("备份包含无效题目，未导入任何记录。");
        if (ids.has(r.id)) continue;
        let analysis = null;
        if (r.analysis) {
          analysis = A.validate(JSON.stringify(r.analysis), r);
          analysis.source = r.analysis.source === "manual" ? "manual" : "ai";
        }
        add.push({
          id: r.id,
          subject: r.subject,
          question: r.question,
          studentAnswer: r.studentAnswer,
          expectedAnswer: r.expectedAnswer,
          source: typeof r.source === "string" ? r.source.slice(0, 120) : "",
          createdAt: r.createdAt,
          analysis,
          reviews: Array.isArray(r.reviews)
            ? r.reviews
                .filter(
                  (v) =>
                    v &&
                    ["independent", "assisted", "retry"].includes(v.result) &&
                    Number.isFinite(Date.parse(v.at)),
                )
                .map((v) => ({
                  at: v.at,
                  result: v.result,
                  source: v.source === "training" ? "training" : "self",
                }))
            : [],
        });
        ids.add(r.id);
      }
      S.write("mistakes", [...add, ...existing]);
      route();
      notify(
        `已合并 ${add.length} 条错题；已有错题保留。练习进度以此设备为准。`,
      );
    } catch (error) {
      notify(error.message);
    } finally {
      e.target.value = "";
    }
  };
  $("filter").onchange = safe(renderRecords);
  window.addEventListener("hashchange", safe(route));
  safe(route)();
})();
