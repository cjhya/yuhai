import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFieldCatalog,
  filterFieldCatalog,
  getRecordFieldCell,
} from "../src/domain/highDimensionalExplorer.ts";

const records = [{ 资产编号: "M-001", 总功率: 100, 吨位: "550" }];
const catalog = buildFieldCatalog({ category: "机器信息", records });

test("字段目录从现有记录生成，并能返回字段值", () => {
  assert.equal(catalog.length, 3);
  const powerField = catalog.find((field) => field.label === "总功率");
  assert.ok(powerField);
  assert.equal(getRecordFieldCell(records[0], powerField).value, 100);
});

test("字段搜索会真实过滤中文字段", () => {
  assert.deepEqual(
    filterFieldCatalog(catalog, { query: "功率", availableOnly: true }).map(
      (field) => field.label,
    ),
    ["总功率"],
  );
  assert.equal(
    filterFieldCatalog(catalog, { query: "不存在", availableOnly: true }).length,
    0,
  );
});

