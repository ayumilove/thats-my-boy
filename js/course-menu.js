/* Shared, curriculum-driven navigation. At most three clicks to any lesson. */
(function (root) {
  "use strict";
  const C = root.Curriculum,
    host = document.getElementById("course-menu");
  if (!host) return;
  const escape = (value) =>
    String(value).replace(
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
  let active = null,
    subject = C.subjects[0].id;
  const mobile = root.matchMedia("(max-width: 900px)");
  host.innerHTML = `<details id="course-picker" ${mobile.matches ? "" : "open"}><summary><span>选课</span><small id="course-current">四科精选课程</small></summary><div class="course-picker-content"><div class="subject-switch" role="group" aria-label="选择学科">${C.subjects.map((s) => `<button type="button" data-subject="${s.id}" aria-pressed="false" aria-controls="course-list">${s.name}</button>`).join("")}</div><p id="course-list-label" class="course-list-label"></p><nav id="course-list" aria-labelledby="course-list-label"></nav></div></details>`;
  const picker = document.getElementById("course-picker"),
    list = document.getElementById("course-list");
  function render() {
    const nodes = C.nodes.filter((n) => n.subject === subject && C.href(n.id));
    host
      .querySelectorAll("[data-subject]")
      .forEach((b) =>
        b.setAttribute("aria-pressed", String(b.dataset.subject === subject)),
      );
    document.getElementById("course-list-label").textContent =
      C.subjects.find((s) => s.id === subject).name +
      " · " +
      nodes.length +
      " 门课";
    list.innerHTML = nodes
      .map(
        (n) =>
          `<a class="course-link" data-course="${n.id}" href="${C.href(n.id)}" ${active === n.id ? 'aria-current="page"' : ""}><span>${escape(n.title)}</span><small>${n.training ? "补强" : "探索"}</small></a>`,
      )
      .join("");
  }
  host.querySelectorAll("[data-subject]").forEach(
    (b) =>
      (b.onclick = () => {
        subject = b.dataset.subject;
        render();
      }),
  );
  // On small screens, selecting a lesson returns space to the lesson itself.
  list.addEventListener("click", (e) => {
    if (e.target.closest("a") && mobile.matches) picker.open = false;
  });
  mobile.addEventListener("change", (e) => {
    picker.open = !e.matches;
  });
  function setCurrent(id) {
    const node = C.get(id);
    if (!node || active === id) return;
    active = id;
    subject = node.subject;
    document.getElementById("course-current").textContent =
      C.subjects.find((s) => s.id === subject).name + " · " + node.title;
    render();
  }
  render();
  root.CourseMenu = { setCurrent };
})(window);
