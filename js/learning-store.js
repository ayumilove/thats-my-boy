(function (root) {
  "use strict";
  const prefix = "mathesis.v1.";
  function read(key, fallback) {
    try {
      const raw = root.localStorage.getItem(prefix + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      throw new Error(
        "本地记录无法读取，请检查浏览器存储权限；不要清除存储，以免丢失旧记录。",
      );
    }
  }
  function write(key, value) {
    try {
      root.localStorage.setItem(prefix + key, JSON.stringify(value));
    } catch (e) {
      throw new Error("保存失败：浏览器存储不可用或空间已满，请先导出记录。");
    }
    return value;
  }
  function list() {
    const value = read("mistakes", []);
    if (!Array.isArray(value))
      throw new Error("错题记录格式异常，请先备份浏览器数据。");
    return value;
  }
  function put(record) {
    const records = list(),
      i = records.findIndex((r) => r.id === record.id);
    if (i < 0) records.unshift(record);
    else records[i] = record;
    write("mistakes", records);
    return record;
  }
  function create(data) {
    const record = {
      id: root.crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: "pending",
      analysis: null,
      reviews: [],
      ...data,
    };
    return put(record);
  }
  function capture(data) {
    const existing = list().find((r) => r.sourceKey === data.sourceKey);
    if (existing) return existing;
    return create(data);
  }
  function gaps() {
    const grouped = new Map();
    for (const r of list())
      for (const gap of r.analysis?.missing || []) {
        const key = r.subject + ":" + gap.title.trim().toLowerCase();
        if (!grouped.has(key))
          grouped.set(key, {
            subject: r.subject,
            title: gap.title,
            reason: gap.reason,
            mistakeIds: [],
          });
        grouped.get(key).mistakeIds.push(r.id);
      }
    return [...grouped.values()];
  }
  root.LearningStore = {
    read,
    write,
    list,
    put,
    create,
    capture,
    gaps,
    remove: (id) =>
      write(
        "mistakes",
        list().filter((r) => r.id !== id),
      ),
    backup: () => ({
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      mistakes: list(),
      training: read("training", {}),
      gaps: gaps(),
    }),
  };
})(typeof window === "undefined" ? globalThis : window);
