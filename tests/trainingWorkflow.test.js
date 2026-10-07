const assert = require("node:assert/strict");
const { readFile } = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

function toModuleUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
}

async function readModule(relativePath, replacements = []) {
  let source = await readFile(path.resolve(__dirname, relativePath), "utf8");
  replacements.forEach(([from, to]) => {
    source = source.replace(from, to);
  });
  return { source, url: toModuleUrl(source) };
}

const modulesPromise = (async () => {
  const workflowModule = await readModule("../src/domain/training/trainingWorkflow.js");
  const workflow = await import(workflowModule.url);
  const draftModule = await readModule(
    "../src/domain/training/trainingDraftStorage.js",
    [['"./trainingWorkflow"', JSON.stringify(workflowModule.url)]]
  );
  const pollerModule = await readModule(
    "../src/domain/training/trainingJobPoller.js",
    [['"./trainingWorkflow"', JSON.stringify(workflowModule.url)]]
  );
  return {
    workflow,
    draft: await import(draftModule.url),
    poller: await import(pollerModule.url),
  };
})();

function advanceToAlgorithm(workflow, mode) {
  const { TRAINING_EVENT, transitionTrainingWorkflow } = workflow;
  let state = workflow.createInitialTrainingWorkflow({ mode, now: () => 0 });
  state = transitionTrainingWorkflow(state, {
    type: TRAINING_EVENT.SAVE_TASK_INFO,
    payload: { taskName: "train_001", productSeries: "001", now: () => 1 },
  });
  state = transitionTrainingWorkflow(state, {
    type: TRAINING_EVENT.SELECT_DATASET,
    payload: { importId: "import_1", meta: { rowCount: 2 }, now: () => 2 },
  });
  return transitionTrainingWorkflow(state, {
    type: TRAINING_EVENT.CONFIRM_FEATURES,
    payload: { hasDataset: true, now: () => 3 },
  });
}

test("训练工作流只允许通过合法事件从任务信息进入结果页", async () => {
  const { workflow } = await modulesPromise;
  const {
    TRAINING_EVENT,
    TRAINING_JOB_MODE,
    TRAINING_PHASE,
    transitionTrainingWorkflow,
  } = workflow;
  let state = workflow.createInitialTrainingWorkflow({
    mode: TRAINING_JOB_MODE.ASYNC,
    now: () => 0,
  });

  assert.throws(
    () => transitionTrainingWorkflow(state, {
      type: TRAINING_EVENT.CONFIRM_FEATURES,
      payload: { hasDataset: true },
    }),
    error => error.code === "ILLEGAL_TRANSITION"
  );

  state = advanceToAlgorithm(workflow, TRAINING_JOB_MODE.ASYNC);
  assert.equal(state.phase, TRAINING_PHASE.ALGORITHM);
  state = transitionTrainingWorkflow(state, {
    type: TRAINING_EVENT.SUBMIT_JOB,
    payload: { productSeries: "001", algorithm: "ro", hasDataset: true },
  });
  assert.equal(state.phase, TRAINING_PHASE.SUBMITTING);
  assert.match(state.idempotencyKey, /^train_/);

  state = transitionTrainingWorkflow(state, {
    type: TRAINING_EVENT.JOB_CREATED,
    payload: { job: { jobId: "job_1", status: "queued", statusVersion: 1 } },
  });
  state = transitionTrainingWorkflow(state, {
    type: TRAINING_EVENT.JOB_UPDATED,
    payload: { job: { jobId: "job_1", status: "running", statusVersion: 2, progress: 40 } },
  });
  state = transitionTrainingWorkflow(state, {
    type: TRAINING_EVENT.JOB_UPDATED,
    payload: {
      job: {
        jobId: "job_1",
        status: "succeeded",
        statusVersion: 3,
        progress: 100,
        result: { mape_val: 0.12 },
      },
    },
  });
  assert.equal(state.phase, TRAINING_PHASE.RESULT);
  assert.equal(state.job.result.mape_val, 0.12);
});

test("旧状态响应被忽略，版本更新也不能让 job 状态倒退", async () => {
  const { workflow } = await modulesPromise;
  const { TRAINING_EVENT, TRAINING_JOB_MODE, transitionTrainingWorkflow } = workflow;
  let state = advanceToAlgorithm(workflow, TRAINING_JOB_MODE.ASYNC);
  state = transitionTrainingWorkflow(state, {
    type: TRAINING_EVENT.SUBMIT_JOB,
    payload: { productSeries: "001", algorithm: "ro", hasDataset: true },
  });
  state = transitionTrainingWorkflow(state, {
    type: TRAINING_EVENT.JOB_CREATED,
    payload: { job: { jobId: "job_1", status: "running", statusVersion: 2 } },
  });

  const staleResult = transitionTrainingWorkflow(state, {
    type: TRAINING_EVENT.JOB_UPDATED,
    payload: { job: { jobId: "job_1", status: "queued", statusVersion: 1 } },
  });
  assert.equal(staleResult, state);
  assert.throws(
    () => transitionTrainingWorkflow(state, {
      type: TRAINING_EVENT.JOB_UPDATED,
      payload: { job: { jobId: "job_1", status: "queued", statusVersion: 3 } },
    }),
    error => error.code === "ILLEGAL_JOB_TRANSITION"
  );
  assert.throws(
    () => transitionTrainingWorkflow(state, {
      type: TRAINING_EVENT.JOB_UPDATED,
      payload: { job: { jobId: "job_1", status: "running", statusVersion: 2, progress: 80 } },
    }),
    error => error.code === "JOB_VERSION_CONFLICT"
  );
});

test("未知创建复用幂等键，明确终态重试创建新 job", async () => {
  const { workflow } = await modulesPromise;
  const { TRAINING_EVENT, TRAINING_JOB_MODE, transitionTrainingWorkflow } = workflow;
  let state = advanceToAlgorithm(workflow, TRAINING_JOB_MODE.ASYNC);
  state = transitionTrainingWorkflow(state, {
    type: TRAINING_EVENT.SUBMIT_JOB,
    payload: { productSeries: "001", algorithm: "ro", hasDataset: true },
  });
  const uncertainKey = state.idempotencyKey;
  state = transitionTrainingWorkflow(state, {
    type: TRAINING_EVENT.CREATE_UNCERTAIN,
    payload: { error: { message: "network", retryable: true } },
  });
  state = transitionTrainingWorkflow(state, {
    type: TRAINING_EVENT.SUBMIT_JOB,
    payload: { productSeries: "001", algorithm: "ro", hasDataset: false },
  });
  assert.equal(state.idempotencyKey, uncertainKey);

  state = transitionTrainingWorkflow(state, {
    type: TRAINING_EVENT.JOB_CREATED,
    payload: { job: { jobId: "job_failed", status: "failed", statusVersion: 1 } },
  });
  state = transitionTrainingWorkflow(state, {
    type: TRAINING_EVENT.SUBMIT_JOB,
    payload: { productSeries: "001", algorithm: "ro", hasDataset: true },
  });
  assert.notEqual(state.idempotencyKey, uncertainKey);
  assert.equal(state.job, null);

  state = transitionTrainingWorkflow(state, {
    type: TRAINING_EVENT.CREATE_UNCERTAIN,
    payload: { error: { message: "timeout", retryable: true } },
  });
  assert.equal(state.job, null);
  assert.equal(state.idempotencyKey !== null, true);
});

test("取消失败会复位请求标记，取消期间的运行状态不会清除标记", async () => {
  const { workflow } = await modulesPromise;
  const { TRAINING_EVENT, TRAINING_JOB_MODE, transitionTrainingWorkflow } = workflow;
  let state = advanceToAlgorithm(workflow, TRAINING_JOB_MODE.ASYNC);
  state = transitionTrainingWorkflow(state, {
    type: TRAINING_EVENT.SUBMIT_JOB,
    payload: { productSeries: "001", algorithm: "ro", hasDataset: true },
  });
  state = transitionTrainingWorkflow(state, {
    type: TRAINING_EVENT.JOB_CREATED,
    payload: { job: { jobId: "job_1", status: "queued", statusVersion: 1 } },
  });
  state = transitionTrainingWorkflow(state, { type: TRAINING_EVENT.CANCEL_REQUESTED });
  state = transitionTrainingWorkflow(state, {
    type: TRAINING_EVENT.JOB_UPDATED,
    payload: { job: { jobId: "job_1", status: "running", statusVersion: 2 } },
  });
  assert.equal(state.cancelRequested, true);

  state = transitionTrainingWorkflow(state, {
    type: TRAINING_EVENT.CANCEL_FAILED,
    payload: { error: { message: "cancel rejected" } },
  });
  assert.equal(state.cancelRequested, false);
  assert.equal(state.lastError.message, "cancel rejected");
});

test("从结果页返回算法步骤会清除旧 job，避免复用已完成结果", async () => {
  const { workflow } = await modulesPromise;
  const { TRAINING_EVENT, TRAINING_JOB_MODE, TRAINING_PHASE, transitionTrainingWorkflow } = workflow;
  let state = advanceToAlgorithm(workflow, TRAINING_JOB_MODE.ASYNC);
  state = transitionTrainingWorkflow(state, {
    type: TRAINING_EVENT.SUBMIT_JOB,
    payload: { productSeries: "001", algorithm: "ro", hasDataset: true },
  });
  state = transitionTrainingWorkflow(state, {
    type: TRAINING_EVENT.JOB_CREATED,
    payload: { job: { jobId: "job_done", status: "succeeded", statusVersion: 1 } },
  });
  state = transitionTrainingWorkflow(state, { type: TRAINING_EVENT.BACK });
  assert.equal(state.phase, TRAINING_PHASE.ALGORITHM);
  assert.equal(state.job, null);
  assert.equal(state.idempotencyKey, null);
});

test("训练前核对可以定向返回已完成步骤，但不能跳到未来步骤", async () => {
  const { workflow } = await modulesPromise;
  const { TRAINING_EVENT, TRAINING_JOB_MODE, TRAINING_PHASE, transitionTrainingWorkflow } = workflow;
  const state = advanceToAlgorithm(workflow, TRAINING_JOB_MODE.ASYNC);

  const editingDataset = transitionTrainingWorkflow(state, {
    type: TRAINING_EVENT.EDIT_STEP,
    payload: { phase: TRAINING_PHASE.DATASET },
  });
  assert.equal(editingDataset.phase, TRAINING_PHASE.DATASET);
  assert.equal(editingDataset.job, null);

  assert.throws(
    () => transitionTrainingWorkflow(editingDataset, {
      type: TRAINING_EVENT.EDIT_STEP,
      payload: { phase: TRAINING_PHASE.ALGORITHM },
    }),
    error => error.code === "ILLEGAL_TRANSITION"
  );
});

test("修改已完成实验配置会清除旧 job 和幂等键", async () => {
  const { workflow } = await modulesPromise;
  const { TRAINING_EVENT, TRAINING_JOB_MODE, TRAINING_PHASE, transitionTrainingWorkflow } = workflow;
  let state = advanceToAlgorithm(workflow, TRAINING_JOB_MODE.ASYNC);
  state = transitionTrainingWorkflow(state, {
    type: TRAINING_EVENT.SUBMIT_JOB,
    payload: { productSeries: "001", algorithm: "ro", hasDataset: true },
  });
  state = transitionTrainingWorkflow(state, {
    type: TRAINING_EVENT.JOB_CREATED,
    payload: { job: { jobId: "job_done", status: "succeeded", statusVersion: 1 } },
  });

  state = transitionTrainingWorkflow(state, {
    type: TRAINING_EVENT.EDIT_STEP,
    payload: { phase: TRAINING_PHASE.DATASET },
  });
  assert.equal(state.phase, TRAINING_PHASE.DATASET);
  assert.equal(state.job, null);
  assert.equal(state.idempotencyKey, null);
});

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }
  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }
  setItem(key, value) {
    this.values.set(key, String(value));
  }
  removeItem(key) {
    this.values.delete(key);
  }
}

test("草稿持久化排除完整数据，旧本地数据句柄刷新后回退到数据步骤", async () => {
  const { workflow, draft } = await modulesPromise;
  const storage = new MemoryStorage();
  const key = "draft:test";
  const workflowState = advanceToAlgorithm(workflow, workflow.TRAINING_JOB_MODE.LEGACY);
  const moduleState = {
    workflow: workflowState,
    train_model: {
      taskName: "train_001",
      productSeries: "001",
      dataSet: [{ huge: "row" }],
      dataImportId: "import_1",
      dataName: "train.csv",
      dataSetMeta: { rowCount: 1 },
      algorithm: { selected_algorithm: "ro", algorithm_infos: {} },
      result: { mape_val: 0 },
    },
  };

  assert.equal(draft.saveTrainingDraft(moduleState, { storage, key, now: 100 }), true);
  const raw = JSON.parse(storage.getItem(key));
  assert.equal(raw.trainModel.dataSet, "");
  assert.equal(raw.trainModel.dataImportId, "");

  const restored = draft.loadTrainingDraft({ storage, key, now: 120 });
  assert.equal(restored.workflow.phase, workflow.TRAINING_PHASE.DATASET);
  assert.equal(restored.workflow.lastError.code, "LOCAL_DATASET_EXPIRED");
  assert.equal(restored.trainModel.dataSetMeta.rowCount, 1);
});

test("异步远程 job 可在本地数据释放后恢复，过期草稿会被清理", async () => {
  const { workflow, draft } = await modulesPromise;
  const storage = new MemoryStorage();
  const key = "draft:async";
  let workflowState = advanceToAlgorithm(workflow, workflow.TRAINING_JOB_MODE.ASYNC);
  workflowState = workflow.transitionTrainingWorkflow(workflowState, {
    type: workflow.TRAINING_EVENT.SUBMIT_JOB,
    payload: { productSeries: "001", algorithm: "ro", hasDataset: true },
  });
  workflowState = workflow.transitionTrainingWorkflow(workflowState, {
    type: workflow.TRAINING_EVENT.JOB_CREATED,
    payload: { job: { jobId: "job_1", status: "running", statusVersion: 2 } },
  });

  draft.saveTrainingDraft({
    workflow: workflowState,
    train_model: { taskName: "train_001", dataImportId: "import_1" },
  }, { storage, key, now: 100 });
  const restored = draft.loadTrainingDraft({ storage, key, now: 120 });
  assert.equal(restored.workflow.phase, workflow.TRAINING_PHASE.TRACKING);
  assert.equal(restored.workflow.job.jobId, "job_1");

  assert.equal(
    draft.loadTrainingDraft({ storage, key, now: 1000, maxAgeMs: 50 }),
    null
  );
  assert.equal(storage.getItem(key), null);
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createTimerHarness() {
  let id = 0;
  const timers = new Map();
  return {
    setTimer(callback, delay) {
      const timerId = ++id;
      timers.set(timerId, { callback, delay });
      return timerId;
    },
    clearTimer(timerId) {
      timers.delete(timerId);
    },
    runNext() {
      const entry = timers.entries().next().value;
      assert.ok(entry, "expected a scheduled timer");
      const [timerId, timer] = entry;
      timers.delete(timerId);
      return timer.callback();
    },
    get size() {
      return timers.size;
    },
  };
}

test("轮询唤醒会取消旧请求资格，旧响应不能覆盖新状态", async () => {
  const { poller } = await modulesPromise;
  const timers = createTimerHarness();
  const first = deferred();
  const second = deferred();
  const requests = [];
  const updates = [];
  const instance = new poller.TrainingJobPoller({
    fetchJob(jobId, config) {
      requests.push({ jobId, signal: config.signal });
      return requests.length === 1 ? first.promise : second.promise;
    },
    onUpdate: job => updates.push(job),
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
    random: () => 0.5,
  });

  instance.start("job_1");
  const firstTick = timers.runNext();
  instance.handleOnline();
  assert.equal(requests[0].signal.aborted, true);
  const secondTick = timers.runNext();
  second.resolve({ jobId: "job_1", status: "running", pollAfterMs: 2000 });
  await secondTick;
  first.resolve({ jobId: "job_1", status: "queued", pollAfterMs: 2000 });
  await firstTick;

  assert.deepEqual(updates.map(job => job.status), ["running"]);
  assert.equal(timers.size, 1);
  instance.stop();
});

test("瞬时故障达到阈值后降频继续恢复，明确不可重试错误才停止", async () => {
  const { poller } = await modulesPromise;
  const timers = createTimerHarness();
  const degraded = [];
  const instance = new poller.TrainingJobPoller({
    fetchJob: () => Promise.reject(Object.assign(new Error("network"), { retryable: true })),
    onFatalError: (error, context) => degraded.push({ error, context }),
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
    minDelayMs: 10,
    maxDelayMs: 40,
    maxConsecutiveFailures: 2,
    random: () => 0.5,
  });
  instance.start("job_1");
  await timers.runNext();
  await timers.runNext();
  assert.equal(instance.running, true);
  assert.equal(degraded[0].context.willRetry, true);
  assert.equal(timers.size, 1);
  instance.stop();

  const fatalTimers = createTimerHarness();
  const fatalInstance = new poller.TrainingJobPoller({
    fetchJob: () => Promise.reject(Object.assign(new Error("not found"), { retryable: false })),
    setTimer: fatalTimers.setTimer,
    clearTimer: fatalTimers.clearTimer,
  });
  fatalInstance.start("job_missing");
  await fatalTimers.runNext();
  assert.equal(fatalInstance.running, false);
  assert.equal(fatalTimers.size, 0);
});
