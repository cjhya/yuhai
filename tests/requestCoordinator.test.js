const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const coordinatorModulePromise = readFile(
  path.resolve(__dirname, "../src/utils/requestCoordinator.js"),
  "utf8"
).then(source =>
  import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`)
);

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

test("同一资源只允许最新请求提交结果", async () => {
  const {
    STALE_REQUEST_CODE,
    createLatestRequestCoordinator,
    isRequestCanceled,
  } = await coordinatorModulePromise;
  const coordinator = createLatestRequestCoordinator();
  const firstDeferred = deferred();
  const secondDeferred = deferred();

  const first = coordinator.run("machine", () => firstDeferred.promise);
  const second = coordinator.run("machine", () => secondDeferred.promise);

  secondDeferred.resolve("machine-B");
  assert.equal(await second, "machine-B");

  firstDeferred.resolve("machine-A");
  await assert.rejects(first, error => {
    assert.equal(error.code, STALE_REQUEST_CODE);
    assert.equal(isRequestCanceled(error), true);
    return true;
  });
});

test("旧请求失败不会覆盖新请求的成功状态", async () => {
  const {
    STALE_REQUEST_CODE,
    createLatestRequestCoordinator,
  } = await coordinatorModulePromise;
  const coordinator = createLatestRequestCoordinator();
  const firstDeferred = deferred();
  const secondDeferred = deferred();

  const first = coordinator.run("mold", () => firstDeferred.promise);
  const second = coordinator.run("mold", () => secondDeferred.promise);

  secondDeferred.resolve("mold-B");
  assert.equal(await second, "mold-B");

  firstDeferred.reject(new Error("old request failed"));
  await assert.rejects(first, error => error.code === STALE_REQUEST_CODE);
});

test("当前请求的真实错误会原样交给页面处理", async () => {
  const { createLatestRequestCoordinator } = await coordinatorModulePromise;
  const coordinator = createLatestRequestCoordinator();
  const expected = new Error("network failed");

  await assert.rejects(
    coordinator.run("material", () => Promise.reject(expected)),
    error => error === expected
  );
});

test("销毁协调器会中止请求并拒绝后续状态提交", async () => {
  const {
    STALE_REQUEST_CODE,
    createLatestRequestCoordinator,
  } = await coordinatorModulePromise;
  const coordinator = createLatestRequestCoordinator();
  const requestDeferred = deferred();
  let signal;

  const request = coordinator.run("product", context => {
    signal = context.signal;
    return requestDeferred.promise;
  });
  await Promise.resolve();

  coordinator.dispose();
  assert.equal(signal.aborted, true);

  requestDeferred.resolve("product-A");
  await assert.rejects(request, error => error.code === STALE_REQUEST_CODE);
  await assert.rejects(
    coordinator.run("product", () => Promise.resolve("product-B")),
    error => error.code === STALE_REQUEST_CODE
  );
});
