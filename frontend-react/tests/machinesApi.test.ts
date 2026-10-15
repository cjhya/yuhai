import assert from "node:assert/strict";
import test from "node:test";
import { fetchMachines } from "../src/api/machines.ts";

test("机器接口返回真实后端数据结构", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify([
        {
          ID: "1",
          资产编号: "M-R3-TEST-001",
          资产名称: "测试注塑机",
          规格型号: "VP550",
          资产分类: "单色注塑机",
          吨位: 550,
          总功率: 100,
          螺杆直径: 55,
          创建时间: 1_700_000_000_000,
        },
      ]),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );

  const machines = await fetchMachines();

  assert.equal(machines.length, 1);
  assert.equal(machines[0].资产编号, "M-R3-TEST-001");
});

test("后端失败时直接报错且不回退演示数据", async (context) => {
  const originalFetch = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async () => new Response(null, { status: 503 });

  await assert.rejects(fetchMachines(), /HTTP 503/);
});
