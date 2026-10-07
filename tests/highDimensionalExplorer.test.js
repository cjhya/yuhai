const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const babel = require("@babel/core");

function loadModule(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const transformed = babel.transformSync(source, {
    filename: filePath,
    babelrc: false,
    configFile: false,
    plugins: ["@babel/plugin-transform-modules-commonjs"],
  });
  const target = { exports: {} };
  const evaluate = new Function("require", "module", "exports", transformed.code);
  evaluate(require, target, target.exports);
  return target.exports;
}

const explorer = loadModule(
  path.resolve(__dirname, "../src/domain/data/highDimensionalExplorer.js")
);

const fieldMap = {
  machine: "资产编号",
  pressure: "位置尺/压力传感器-射胶压力",
  temperature: "温度-料温温度",
  missing: "温度-未采集温度",
};

const records = [
  { machine: "M-01", pressure: 10, temperature: 220, extra: "A" },
  { machine: "M-02", pressure: 12, temperature: 220, extra: "B" },
];

test("field catalog keeps map order, raw aliases, groups and availability", () => {
  const catalog = explorer.buildFieldCatalog({
    category: "机台参数",
    fieldMap,
    records,
  });

  assert.deepEqual(
    catalog.map(field => field.rawKey),
    ["machine", "pressure", "temperature", "missing", "extra"]
  );
  assert.equal(catalog[1].group, "位置尺/压力传感器");
  assert.equal(catalog[2].group, "温度");
  assert.equal(catalog[3].available, false);
  assert.equal(catalog[4].label, "extra");
  assert.ok(catalog[1].aliases.includes("pressure"));
});

test("translated sample records reuse mapped fields instead of doubling the catalog", () => {
  const translatedRecords = [
    {
      资产编号: "M-01",
      "位置尺/压力传感器-射胶压力": 10,
      "温度-料温温度": 220,
    },
  ];
  const catalog = explorer.buildFieldCatalog({
    category: "机台参数",
    fieldMap,
    records: translatedRecords,
  });

  assert.equal(catalog.length, Object.keys(fieldMap).length);
  assert.equal(catalog.find(field => field.rawKey === "machine").available, true);
  assert.equal(
    explorer.getRecordFieldCell(translatedRecords[0], catalog[1]).value,
    10
  );
});

test("catalog filtering searches labels and raw aliases without losing group filters", () => {
  const catalog = explorer.buildFieldCatalog({
    category: "机台参数",
    fieldMap,
    records,
  });

  assert.deepEqual(
    explorer.filterFieldCatalog(catalog, { query: "pressure" }).map(item => item.rawKey),
    ["pressure"]
  );
  assert.deepEqual(
    explorer
      .filterFieldCatalog(catalog, { group: "温度", availableOnly: true })
      .map(item => item.rawKey),
    ["temperature"]
  );
});

test("vertical projection preserves missing fields and selected field order", () => {
  const catalog = explorer.buildFieldCatalog({
    category: "机台参数",
    fieldMap,
    records,
  });
  const selectedIds = [catalog[0].id, catalog[3].id];
  const rows = explorer.projectRecord(records[0], catalog, selectedIds);

  assert.equal(rows.length, 2);
  assert.equal(rows[0].value, "M-01");
  assert.equal(rows[0].present, true);
  assert.equal(rows[1].present, false);
});

test("record comparison can focus on changed fields", () => {
  const catalog = explorer.buildFieldCatalog({
    category: "机台参数",
    fieldMap,
    records,
  });
  const selectedIds = catalog.map(field => field.id);
  const changedRows = explorer.compareRecords(records, catalog, selectedIds, {
    changedOnly: true,
  });

  assert.deepEqual(
    changedRows.map(row => row.rawKey),
    ["machine", "pressure", "extra"]
  );
  assert.equal(changedRows[1].values[0].value, 10);
  assert.equal(changedRows[1].values[1].value, 12);
});

test("default fields sample different groups before filling remaining slots", () => {
  const catalog = explorer.buildFieldCatalog({
    category: "机台参数",
    fieldMap,
    records,
  });
  const selected = explorer.pickFieldIdsByGroup(catalog, 3);
  const groups = selected.map(id => catalog.find(field => field.id === id).group);

  assert.equal(selected.length, 3);
  assert.equal(new Set(groups).size, 3);
});
