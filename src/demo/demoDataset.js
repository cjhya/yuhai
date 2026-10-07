const DEMO_COLUMNS = [
  "批次",
  "注射压力三段",
  "注射速度三段",
  "保压压力三段",
  "保压速度三段",
  "喷嘴温度",
  "一段温度",
  "实测值A-1",
  "实测值A-3",
  "实测值A-5",
  "实测值B-1",
  "实测值B-3",
  "实测B边变形",
  "实测C边变形",
  "是否合格",
];

function fixed(value, digits = 3) {
  return Number(value).toFixed(digits);
}

export function createDemoCsvText(rowCount = 36) {
  const rows = Array.from({ length: rowCount }, (_, index) => {
    const wave = (index % 7) - 3;
    return [
      `DEMO-${String(index + 1).padStart(3, "0")}`,
      fixed(118 + wave * 1.4, 1),
      fixed(470 + (index % 5) * 8, 1),
      fixed(112 + (index % 4) * 2.5, 1),
      fixed(31 + (index % 6), 1),
      fixed(264 + wave * 0.7, 1),
      fixed(257 + (index % 5) * 0.8, 1),
      fixed(313.68 + wave * 0.006),
      fixed(313.70 + (index % 5) * 0.005),
      fixed(313.69 - wave * 0.004),
      fixed(225.30 + wave * 0.007),
      fixed(225.38 - (index % 4) * 0.006),
      fixed(0.55 + (index % 5) * 0.025),
      fixed(0.42 + (index % 4) * 0.018),
      index % 9 === 0 ? "否" : "是",
    ];
  });
  return `\uFEFF${[DEMO_COLUMNS, ...rows].map(row => row.join(",")).join("\n")}`;
}

export function createDemoCsvFile(name = "注塑工艺演示数据.csv") {
  const content = createDemoCsvText();
  if (typeof File === "function") {
    return new File([content], name, { type: "text/csv;charset=utf-8" });
  }
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  Object.defineProperty(blob, "name", { value: name });
  return blob;
}

export function createDemoUploadFile(name) {
  const raw = createDemoCsvFile(name);
  return {
    name: raw.name,
    size: raw.size,
    status: "ready",
    percentage: 0,
    uid: Date.now(),
    raw,
  };
}

