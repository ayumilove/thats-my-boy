// Run with Playwright available through NODE_PATH or a local installation.
const { chromium } = require("playwright");
const http = require("node:http"),
  fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const server = http.createServer((req, res) => {
  const filename = path.resolve(
    root,
    "." +
      decodeURIComponent(
        req.url.split("?")[0] === "/" ? "/index.html" : req.url.split("?")[0],
      ),
  );
  if (!filename.startsWith(root + path.sep)) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(filename, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end();
    }
    res.setHeader(
      "Content-Type",
      filename.endsWith(".js")
        ? "text/javascript"
        : filename.endsWith(".css")
          ? "text/css"
          : "text/html",
    );
    res.end(data);
  });
});
async function main() {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_CHANNEL
      ? { channel: process.env.BROWSER_CHANNEL }
      : {}),
  });
  try {
    const page = await browser.newPage(),
      base = "http://127.0.0.1:" + server.address().port,
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    // Third-party libraries are optional; test offline fallback too.
    await page.route(/https:\/\/(fonts\.|cdn\.)/, (route) => route.abort());
    await page.goto(base + "/learning.html");
    await page.selectOption("#subject", "physics");
    await page.fill("#question", "两段等距离运动，时间为2秒和1秒，求加速度。");
    await page.fill("#student-answer", "我用速度之差除以1秒。");
    await page.locator("#mistake-form button[type=submit]").click();
    await page.waitForSelector("#analyze");
    const mistakeUrl = page.url();
    await page.reload();
    assert.match(await page.locator("#detail").innerText(), /速度之差除以1秒/);
    await page.locator('#detail a[href="#settings"]').click();
    await page.fill("#api-url", "https://mock.example/v1");
    await page.fill("#api-model", "test-model");
    await page.fill("#api-key", "test-secret");
    await page.locator("#settings-form button[type=submit]").click();
    assert(
      !(await page.evaluate(() =>
        JSON.stringify(localStorage).includes("test-secret"),
      )),
    );
    let apiCalls = 0;
    await page.route(
      "https://mock.example/v1/chat/completions",
      async (route) => {
        apiCalls++;
        const req = route.request().postDataJSON();
        assert.equal(req.model, "test-model");
        await route.fulfill({
          json: {
            choices: [
              {
                finish_reason: "stop",
                message: {
                  content: JSON.stringify({
                    summary: "核对中点时间差。",
                    links: [
                      {
                        id: "unequal",
                        role: "weakness",
                        evidence: "除以1秒",
                        reason: "应使用平均速度所对应时刻之差。",
                        confidence: "medium",
                      },
                    ],
                    missing: [
                      { title: "图像题进阶", reason: "需要补充图像题讲解。" },
                    ],
                  }),
                },
              },
            ],
          },
        });
      },
    );
    await page.goto(mistakeUrl);
    await page.locator("#analyze").click();
    await page.waitForSelector(".knowledge-link");
    assert.equal(apiCalls, 1);
    await page.locator(".knowledge-link > a").click();
    await page.waitForSelector("#module-title");
    assert.match(await page.locator("#module-title").innerText(), /等距离/);
    await page.locator('[data-option="0"]').click();
    await page.locator("[name=confidence][value=sure]").check();
    await page.locator("#submit").click();
    await page.reload();
    assert(await page.locator(".explanation").isVisible());
    // Exercise completion writes one review back to its source mistake.
    await page.evaluate(() => {
      goStep(5);
      state().selected = question().answer;
      state().confidence = "sure";
      checkAnswer();
      advance();
    });
    await page.goto(mistakeUrl);
    assert.match(await page.locator("#detail").innerText(), /专项复核/);
    await page.goto(base + "/learning.html#gaps");
    assert.match(await page.locator("#gaps").innerText(), /图像题进阶/);
    // Export, delete, and restore round-trip through the real UI.
    await page.locator(".sidebar-tools > summary").click();
    const downloadEvent = page.waitForEvent("download");
    await page.locator("#export").click();
    const download = await downloadEvent;
    const backup = await download.path();
    assert(!fs.readFileSync(backup, "utf8").includes("test-secret"));
    await page.goto(mistakeUrl);
    await page.getByText("删除此题", { exact: true }).click();
    await page.locator("#delete").click();
    await page.waitForURL("**/learning.html#notebook");
    await page.locator(".sidebar-tools > summary").click();
    await page.locator("#import").setInputFiles(backup);
    await page.waitForFunction(() =>
      document.getElementById("notice").textContent.includes("已合并"),
    );
    await page.goto(mistakeUrl);
    assert(await page.locator(".knowledge-link").isVisible());
    // Untrusted content is rendered as text.
    await page.goto(base + "/learning.html#new");
    await page.fill("#question", '<img src=x onerror="window.injected=true">');
    await page.locator("#mistake-form button[type=submit]").click();
    await page.waitForSelector("#analyze");
    assert.equal(await page.evaluate(() => window.injected), undefined);
    assert.equal(await page.locator("#detail img").count(), 0);
    // New subjects can record gaps without unrelated lesson links.
    await page.goto(base + "/learning.html#new");
    await page.selectOption("#subject", "chemistry");
    await page.fill("#question", "求氧化还原反应中的电子转移数。");
    await page.locator("#mistake-form button[type=submit]").click();
    await page.waitForSelector("#manual");
    await page.locator("#manual summary").click();
    assert.equal(
      await page.locator('#node option[value="balance"]').count(),
      1,
    );
    await page.fill("#manual-reason", "氧化还原反应");
    await page.locator("#manual-form button").click();
    assert.match(await page.locator("#detail").innerText(), /系统还缺少的内容/);
    // Both new subjects link to actual practice and write final reviews back.
    for (const [subject, id, title] of [
      ["chemistry", "balance", "Al + O₂ 配平"],
      ["biology", "inheritance", "Aa×Aa 子代概率"],
    ]) {
      await page.goto(base + "/learning.html#new");
      await page.selectOption("#subject", subject);
      await page.fill("#question", title);
      await page.fill("#student-answer", "我不确定如何列出所有组合。");
      await page.locator("#mistake-form button[type=submit]").click();
      await page.waitForSelector("#manual");
      const origin = page.url();
      await page.locator("#manual summary").click();
      await page.selectOption("#node", id);
      await page.fill("#manual-reason", "需要检查本专题的基础知识。");
      await page.locator("#manual-form button").click();
      await page.locator(".knowledge-link > a").click();
      await page.waitForSelector("#module-title");
      assert.match(page.url(), new RegExp("module=" + id));
      assert.equal(await page.locator("#topic-link a").count(), 0);
      await page.locator('[data-option="0"]').click();
      await page.locator("#open-lab").click();
      if (id === "balance") {
        for (const [key, value] of [
          ["al", "4"],
          ["oxygen", "3"],
          ["oxide", "2"],
        ]) {
          await page.locator(`[data-lab="${key}"]`).fill(value);
          await page.locator(`[data-lab="${key}"]`).dispatchEvent("input");
        }
        assert.match(
          await page.locator("#lab-values").innerText(),
          /已是最简整数比/,
        );
        await page.reload();
        assert.equal(await page.locator('[data-lab="al"]').inputValue(), "4");
      } else {
        await page.selectOption('[data-lab="parent1"]', "2");
        await page.selectOption('[data-lab="parent2"]', "2");
        assert.match(
          await page.locator("#lab-values").innerText(),
          /条件不成立/,
        );
        await page.selectOption('[data-lab="parent1"]', "1");
        await page.selectOption('[data-lab="parent2"]', "1");
        assert.match(await page.locator("#lab-values").innerText(), /66.7%/);
      }
      await page.setViewportSize({ width: 390, height: 844 });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "Science mobile overflow",
      );
      await page.screenshot({
        path: path.join(root, `tests/${id}-preview.png`),
        fullPage: true,
      });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.evaluate(() => {
        goStep(5);
        state().selected = question().answer;
        state().confidence = "sure";
        checkAnswer();
        advance();
      });
      await page.goto(origin);
      assert.match(await page.locator("#detail").innerText(), /专项复核/);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    for (const hash of ["notebook", "settings", "gaps"]) {
      await page.goto(base + "/learning.html#" + hash);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "Mobile overflow: " + hash,
      );
    }
    await page.screenshot({
      path: path.join(root, "tests/mobile-preview.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(mistakeUrl);
    await page.screenshot({
      path: path.join(root, "tests/desktop-preview.png"),
      fullPage: true,
    });
    await page.goto(base + "/index.html#topic=motion");
    assert.match(await page.locator("#title").innerText(), /匀变速/);
    for (const id of [
      "sets",
      "quad",
      "equation",
      "property",
      "distance",
      "motion",
      "force",
    ]) {
      await page.goto(base + "/index.html#topic=" + id);
      assert(await page.locator("#title").innerText());
    }
    await page.goto(base + "/index.html#topic=999");
    assert.match(await page.locator("#title").innerText(), /集合/);
    await page.goto(base + "/training.html#module=6");
    assert.match(await page.locator("#module-title").innerText(), /二次/);
    // Count real menu clicks from all three entry pages to every shipped lesson.
    const lessons = await page.evaluate(() =>
      window.Curriculum.nodes.map((n) => ({
        id: n.id,
        subject: n.subject,
        training: !!n.training,
      })),
    );
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const origin of ["index.html", "training.html", "learning.html"]) {
        for (const lesson of lessons) {
          await page.goto(base + "/" + origin);
          let clicks = 0;
          if (width < 901) {
            assert.equal(
              await page.locator("#course-picker").getAttribute("open"),
              null,
            );
            assert(
              (await page
                .locator("aside")
                .evaluate((e) => e.getBoundingClientRect().height)) < 200,
              "Mobile menu takes too much space",
            );
            await page.locator("#course-picker > summary").click();
            clicks++;
          }
          await page.locator(`[data-subject="${lesson.subject}"]`).click();
          clicks++;
          const visibleIds = await page
            .locator("#course-list a")
            .evaluateAll((links) => links.map((a) => a.dataset.course));
          assert(
            visibleIds.every(
              (id) =>
                lessons.find((n) => n.id === id).subject === lesson.subject,
            ),
            "Other subjects leaked into list",
          );
          await page.locator(`[data-course="${lesson.id}"]`).click();
          clicks++;
          await page.waitForSelector(
            `[data-course="${lesson.id}"][aria-current="page"]`,
            { state: "attached" },
          );
          assert(clicks <= 3);
          assert.match(
            page.url(),
            new RegExp(
              (lesson.training ? "module=" : "topic=") + lesson.id + "$",
            ),
          );
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
          );
        }
      }
      await page.goto(base + "/training.html#module=inheritance");
      await page.screenshot({
        path: path.join(root, `tests/menu-${width}-preview.png`),
        fullPage: true,
      });
    }
    // Native disclosures and subject buttons work without a pointer.
    await page.goto(base + "/index.html");
    await page.locator("#course-picker > summary").focus();
    await page.keyboard.press("Enter");
    await page.locator('[data-subject="chemistry"]').focus();
    await page.keyboard.press("Enter");
    await page.locator('[data-course="balance"]').focus();
    await page.keyboard.press("Enter");
    await page.waitForSelector('[data-course="balance"][aria-current="page"]', {
      state: "attached",
    });
    assert.deepEqual(errors, []);
    console.log(
      "PASS: notebook/API mock/persistence/review/backup/import/XSS/science; 102 menu routes (17 lessons × 3 entry pages × 2 viewport sizes) within 3 clicks; keyboard and legacy routes.",
    );
  } finally {
    await browser.close();
  }
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => server.close());
