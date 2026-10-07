/* global globalThis */
export const TRAINING_DRAFT_SCHEMA_VERSION = 1;

export const TRAINING_JOB_MODE = Object.freeze({
  LEGACY: "legacy",
  ASYNC: "async",
});

export const TRAINING_PHASE = Object.freeze({
  TASK_INFO: "taskInfo",
  DATASET: "dataset",
  FEATURES: "features",
  ALGORITHM: "algorithm",
  SUBMITTING: "submitting",
  TRACKING: "tracking",
  RESULT: "result",
});

export const TRAINING_EVENT = Object.freeze({
  SAVE_TASK_INFO: "SAVE_TASK_INFO",
  SELECT_DATASET: "SELECT_DATASET",
  CONFIRM_FEATURES: "CONFIRM_FEATURES",
  EDIT_STEP: "EDIT_STEP",
  BACK: "BACK",
  SUBMIT_JOB: "SUBMIT_JOB",
  JOB_CREATED: "JOB_CREATED",
  JOB_UPDATED: "JOB_UPDATED",
  CREATE_UNCERTAIN: "CREATE_UNCERTAIN",
  CREATE_FAILED: "CREATE_FAILED",
  POLL_FAILED: "POLL_FAILED",
  CANCEL_REQUESTED: "CANCEL_REQUESTED",
  CANCEL_FAILED: "CANCEL_FAILED",
  LEGACY_SUCCEEDED: "LEGACY_SUCCEEDED",
  INVALIDATE_DATASET: "INVALIDATE_DATASET",
  RESET: "RESET",
});

export const TRAINING_JOB_STATUS = Object.freeze({
  QUEUED: "queued",
  RUNNING: "running",
  FINALIZING: "finalizing",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  CANCELLED: "cancelled",
});

const TERMINAL_JOB_STATUSES = new Set([
  TRAINING_JOB_STATUS.SUCCEEDED,
  TRAINING_JOB_STATUS.FAILED,
  TRAINING_JOB_STATUS.CANCELLED,
]);

const KNOWN_JOB_STATUSES = new Set(Object.values(TRAINING_JOB_STATUS));

const ALLOWED_JOB_STATUS_TRANSITIONS = Object.freeze({
  [TRAINING_JOB_STATUS.QUEUED]: new Set([
    TRAINING_JOB_STATUS.QUEUED,
    TRAINING_JOB_STATUS.RUNNING,
    TRAINING_JOB_STATUS.FINALIZING,
    TRAINING_JOB_STATUS.SUCCEEDED,
    TRAINING_JOB_STATUS.FAILED,
    TRAINING_JOB_STATUS.CANCELLED,
  ]),
  [TRAINING_JOB_STATUS.RUNNING]: new Set([
    TRAINING_JOB_STATUS.RUNNING,
    TRAINING_JOB_STATUS.FINALIZING,
    TRAINING_JOB_STATUS.SUCCEEDED,
    TRAINING_JOB_STATUS.FAILED,
    TRAINING_JOB_STATUS.CANCELLED,
  ]),
  [TRAINING_JOB_STATUS.FINALIZING]: new Set([
    TRAINING_JOB_STATUS.FINALIZING,
    TRAINING_JOB_STATUS.SUCCEEDED,
    TRAINING_JOB_STATUS.FAILED,
    TRAINING_JOB_STATUS.CANCELLED,
  ]),
  [TRAINING_JOB_STATUS.SUCCEEDED]: new Set([TRAINING_JOB_STATUS.SUCCEEDED]),
  [TRAINING_JOB_STATUS.FAILED]: new Set([TRAINING_JOB_STATUS.FAILED]),
  [TRAINING_JOB_STATUS.CANCELLED]: new Set([TRAINING_JOB_STATUS.CANCELLED]),
});

const PHASE_STEP = Object.freeze({
  [TRAINING_PHASE.TASK_INFO]: 1,
  [TRAINING_PHASE.DATASET]: 2,
  [TRAINING_PHASE.FEATURES]: 3,
  [TRAINING_PHASE.ALGORITHM]: 4,
  [TRAINING_PHASE.SUBMITTING]: 4,
  [TRAINING_PHASE.TRACKING]: 4,
  [TRAINING_PHASE.RESULT]: 5,
});

const EDITABLE_SETUP_PHASES = Object.freeze([
  TRAINING_PHASE.TASK_INFO,
  TRAINING_PHASE.DATASET,
  TRAINING_PHASE.FEATURES,
  TRAINING_PHASE.ALGORITHM,
]);

export class TrainingWorkflowError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "TrainingWorkflowError";
    this.code = code;
    this.retryable = false;
  }
}

function createIdentifier(prefix) {
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function nowIso(now) {
  const value = typeof now === "function" ? now() : Date.now();
  return new Date(value).toISOString();
}

function requireCondition(condition, code, message) {
  if (!condition) throw new TrainingWorkflowError(code, message);
}

function normalizeMode(mode) {
  return mode === TRAINING_JOB_MODE.ASYNC
    ? TRAINING_JOB_MODE.ASYNC
    : TRAINING_JOB_MODE.LEGACY;
}

export function isTerminalTrainingJobStatus(status) {
  return TERMINAL_JOB_STATUSES.has(status);
}

export function isAllowedTrainingJobStatusTransition(fromStatus, toStatus) {
  const allowed = ALLOWED_JOB_STATUS_TRANSITIONS[fromStatus];
  return Boolean(allowed && allowed.has(toStatus));
}

export function trainingPhaseToStep(phase) {
  return PHASE_STEP[phase] || 1;
}

export function createInitialTrainingWorkflow(options = {}) {
  const updatedAt = nowIso(options.now);
  return {
    schemaVersion: TRAINING_DRAFT_SCHEMA_VERSION,
    draftId: options.draftId || createIdentifier("draft"),
    revision: 0,
    phase: TRAINING_PHASE.TASK_INFO,
    mode: normalizeMode(options.mode),
    updatedAt,
    idempotencyKey: null,
    job: null,
    cancelRequested: false,
    lastError: null,
  };
}

export function normalizeTrainingJob(job, previousJob = null) {
  requireCondition(job && typeof job === "object", "INVALID_JOB", "训练任务响应为空");
  const jobId = job.jobId || job.id;
  const status = String(job.status || "").toLowerCase();
  requireCondition(typeof jobId === "string" && jobId.length > 0, "INVALID_JOB_ID", "训练任务缺少 jobId");
  requireCondition(KNOWN_JOB_STATUSES.has(status), "INVALID_JOB_STATUS", `未知训练任务状态：${status || "empty"}`);

  const previousVersion = previousJob && Number.isFinite(previousJob.statusVersion)
    ? previousJob.statusVersion
    : 0;
  const responseVersion = Number(job.statusVersion);
  const statusVersion = Number.isFinite(responseVersion)
    ? responseVersion
    : previousVersion + 1;
  const rawProgress = Number(job.progress);

  return {
    jobId,
    status,
    statusVersion,
    stage: job.stage || "",
    progress: Number.isFinite(rawProgress)
      ? Math.max(0, Math.min(100, rawProgress))
      : null,
    pollAfterMs: Number.isFinite(Number(job.pollAfterMs))
      ? Number(job.pollAfterMs)
      : null,
    attempt: Number.isFinite(Number(job.attempt)) ? Number(job.attempt) : 1,
    createdAt: job.createdAt || (previousJob && previousJob.createdAt) || null,
    startedAt: job.startedAt || (previousJob && previousJob.startedAt) || null,
    updatedAt: job.updatedAt || null,
    finishedAt: job.finishedAt || null,
    result: job.result || null,
    resultRef: job.resultRef || null,
    error: job.error || null,
  };
}

function nextState(state, changes, now) {
  return {
    ...state,
    ...changes,
    revision: state.revision + 1,
    updatedAt: nowIso(now),
  };
}

function normalizeEventError(payload, fallback) {
  const error = payload && payload.error;
  return {
    message: (error && error.message) || fallback,
    code: error && (error.code || error.businessCode),
    retryable: Boolean(error && error.retryable),
    at: nowIso(payload && payload.now),
  };
}

export function transitionTrainingWorkflow(state, event) {
  requireCondition(state && typeof state === "object", "INVALID_STATE", "训练工作流状态无效");
  requireCondition(event && typeof event.type === "string", "INVALID_EVENT", "训练工作流事件无效");
  const payload = event.payload || {};

  switch (event.type) {
    case TRAINING_EVENT.SAVE_TASK_INFO:
      requireCondition(state.phase === TRAINING_PHASE.TASK_INFO, "ILLEGAL_TRANSITION", "当前步骤不能保存任务信息");
      requireCondition(payload.taskName && String(payload.taskName).trim(), "TASK_NAME_REQUIRED", "请填写任务名称");
      requireCondition(payload.productSeries, "PRODUCT_SERIES_REQUIRED", "请选择产品系列");
      return nextState(state, {
        phase: TRAINING_PHASE.DATASET,
        job: null,
        idempotencyKey: null,
        cancelRequested: false,
        lastError: null,
      }, payload.now);

    case TRAINING_EVENT.SELECT_DATASET:
      requireCondition(state.phase === TRAINING_PHASE.DATASET, "ILLEGAL_TRANSITION", "当前步骤不能选择数据集");
      requireCondition(payload.importId && payload.meta, "DATASET_REQUIRED", "请先上传并校验数据集");
      return nextState(state, {
        phase: TRAINING_PHASE.FEATURES,
        job: null,
        idempotencyKey: null,
        cancelRequested: false,
        lastError: null,
      }, payload.now);

    case TRAINING_EVENT.CONFIRM_FEATURES:
      requireCondition(state.phase === TRAINING_PHASE.FEATURES, "ILLEGAL_TRANSITION", "当前步骤不能确认特征配置");
      requireCondition(payload.hasDataset, "DATASET_REQUIRED", "数据集已失效，请重新上传");
      return nextState(state, {
        phase: TRAINING_PHASE.ALGORITHM,
        lastError: null,
      }, payload.now);

    case TRAINING_EVENT.EDIT_STEP: {
      const targetPhase = payload.phase;
      const targetIndex = EDITABLE_SETUP_PHASES.indexOf(targetPhase);
      const sourceIndex = EDITABLE_SETUP_PHASES.indexOf(state.phase);
      const terminalJob = state.phase === TRAINING_PHASE.RESULT || (
        state.phase === TRAINING_PHASE.TRACKING &&
        state.job &&
        isTerminalTrainingJobStatus(state.job.status)
      );

      requireCondition(targetIndex >= 0, "INVALID_EDIT_TARGET", "不能修改未知的训练步骤");
      requireCondition(
        (sourceIndex >= 0 && targetIndex < sourceIndex) || terminalJob,
        "ILLEGAL_TRANSITION",
        "当前状态不能修改该训练步骤"
      );

      return nextState(state, {
        phase: targetPhase,
        // 已完成的 run 是一次独立实验；修改配置后不能继续复用旧结果或旧任务标识。
        job: terminalJob ? null : state.job,
        idempotencyKey: terminalJob ? null : state.idempotencyKey,
        cancelRequested: false,
        lastError: null,
      }, payload.now);
    }

    case TRAINING_EVENT.SUBMIT_JOB: {
      const retryingUncertainCreate = state.phase === TRAINING_PHASE.SUBMITTING && !state.job;
      const retryingTerminalJob = state.phase === TRAINING_PHASE.TRACKING && state.job && isTerminalTrainingJobStatus(state.job.status);
      requireCondition(
        state.phase === TRAINING_PHASE.ALGORITHM || retryingUncertainCreate || retryingTerminalJob,
        "ILLEGAL_TRANSITION",
        "当前状态不能提交训练任务"
      );
      requireCondition(payload.productSeries, "PRODUCT_SERIES_REQUIRED", "训练任务缺少产品系列");
      requireCondition(payload.algorithm, "ALGORITHM_REQUIRED", "请选择训练算法");
      requireCondition(payload.hasDataset || retryingUncertainCreate, "DATASET_REQUIRED", "数据集已失效，请重新上传");

      const reuseKey = retryingUncertainCreate && state.idempotencyKey;
      return nextState(state, {
        phase: TRAINING_PHASE.SUBMITTING,
        mode: normalizeMode(payload.mode || state.mode),
        idempotencyKey: reuseKey || payload.idempotencyKey || createIdentifier("train"),
        // 每次明确重试都会创建新 job；只有结果未知的创建请求复用原幂等键。
        job: null,
        cancelRequested: false,
        lastError: null,
      }, payload.now);
    }

    case TRAINING_EVENT.JOB_CREATED: {
      requireCondition(state.phase === TRAINING_PHASE.SUBMITTING, "ILLEGAL_TRANSITION", "当前没有正在创建的训练任务");
      const job = normalizeTrainingJob(payload.job);
      return nextState(state, {
        phase: job.status === TRAINING_JOB_STATUS.SUCCEEDED
          ? TRAINING_PHASE.RESULT
          : TRAINING_PHASE.TRACKING,
        job,
        cancelRequested: false,
        lastError: job.status === TRAINING_JOB_STATUS.FAILED
          ? { message: (job.error && job.error.message) || "模型训练失败", code: job.error && job.error.code }
          : null,
      }, payload.now);
    }

    case TRAINING_EVENT.JOB_UPDATED: {
      requireCondition(state.job, "JOB_REQUIRED", "当前没有可更新的训练任务");
      const job = normalizeTrainingJob(payload.job, state.job);
      requireCondition(job.jobId === state.job.jobId, "JOB_MISMATCH", "训练任务响应与当前 job 不匹配");
      if (job.statusVersion < state.job.statusVersion) return state;
      if (job.statusVersion === state.job.statusVersion) {
        requireCondition(
          job.status === state.job.status &&
            job.progress === state.job.progress &&
            job.stage === state.job.stage,
          "JOB_VERSION_CONFLICT",
          "相同 statusVersion 返回了不同的训练任务状态"
        );
      }
      requireCondition(
        isAllowedTrainingJobStatusTransition(state.job.status, job.status),
        "ILLEGAL_JOB_TRANSITION",
        `训练任务状态不能从 ${state.job.status} 迁移到 ${job.status}`
      );
      if (
        job.statusVersion === state.job.statusVersion &&
        job.status === state.job.status &&
        job.progress === state.job.progress
      ) {
        return state;
      }
      return nextState(state, {
        phase: job.status === TRAINING_JOB_STATUS.SUCCEEDED
          ? TRAINING_PHASE.RESULT
          : TRAINING_PHASE.TRACKING,
        job,
        cancelRequested: state.cancelRequested && !isTerminalTrainingJobStatus(job.status),
        lastError: job.status === TRAINING_JOB_STATUS.FAILED
          ? { message: (job.error && job.error.message) || "模型训练失败", code: job.error && job.error.code }
          : null,
      }, payload.now);
    }

    case TRAINING_EVENT.CREATE_UNCERTAIN:
      requireCondition(state.phase === TRAINING_PHASE.SUBMITTING, "ILLEGAL_TRANSITION", "当前没有正在创建的训练任务");
      return nextState(state, {
        lastError: normalizeEventError(payload, "训练任务提交结果未知，请重新确认"),
      }, payload.now);

    case TRAINING_EVENT.CREATE_FAILED:
      requireCondition(state.phase === TRAINING_PHASE.SUBMITTING, "ILLEGAL_TRANSITION", "当前没有正在创建的训练任务");
      return nextState(state, {
        phase: TRAINING_PHASE.ALGORITHM,
        idempotencyKey: null,
        cancelRequested: false,
        lastError: normalizeEventError(payload, "训练任务创建失败"),
      }, payload.now);

    case TRAINING_EVENT.POLL_FAILED:
      requireCondition(state.job, "JOB_REQUIRED", "当前没有可查询的训练任务");
      return nextState(state, {
        lastError: normalizeEventError(payload, "暂时无法获取训练任务状态"),
      }, payload.now);

    case TRAINING_EVENT.CANCEL_REQUESTED:
      requireCondition(
        state.job && !isTerminalTrainingJobStatus(state.job.status),
        "JOB_NOT_CANCELLABLE",
        "当前训练任务不能取消"
      );
      return nextState(state, { cancelRequested: true, lastError: null }, payload.now);

    case TRAINING_EVENT.CANCEL_FAILED:
      requireCondition(state.job, "JOB_REQUIRED", "当前没有可取消的训练任务");
      return nextState(state, {
        cancelRequested: false,
        lastError: normalizeEventError(payload, "取消训练任务失败"),
      }, payload.now);

    case TRAINING_EVENT.LEGACY_SUCCEEDED: {
      requireCondition(state.phase === TRAINING_PHASE.SUBMITTING, "ILLEGAL_TRANSITION", "当前没有正在运行的兼容训练请求");
      const job = normalizeTrainingJob({
        jobId: payload.jobId || createIdentifier("legacy"),
        status: TRAINING_JOB_STATUS.SUCCEEDED,
        statusVersion: 1,
        progress: 100,
        result: payload.result || null,
        finishedAt: nowIso(payload.now),
      });
      return nextState(state, {
        phase: TRAINING_PHASE.RESULT,
        job,
        cancelRequested: false,
        lastError: null,
      }, payload.now);
    }

    case TRAINING_EVENT.BACK: {
      const previousPhase = state.phase === TRAINING_PHASE.TRACKING && state.job && isTerminalTrainingJobStatus(state.job.status)
        ? TRAINING_PHASE.FEATURES
        : ({
        [TRAINING_PHASE.DATASET]: TRAINING_PHASE.TASK_INFO,
        [TRAINING_PHASE.FEATURES]: TRAINING_PHASE.DATASET,
        [TRAINING_PHASE.ALGORITHM]: TRAINING_PHASE.FEATURES,
        [TRAINING_PHASE.RESULT]: TRAINING_PHASE.ALGORITHM,
      }[state.phase]);
      requireCondition(previousPhase, "ILLEGAL_TRANSITION", "当前状态不能返回上一步");
      const leavesCompletedResult = state.phase === TRAINING_PHASE.RESULT;
      return nextState(state, {
        phase: previousPhase,
        job: leavesCompletedResult ? null : state.job,
        idempotencyKey: leavesCompletedResult ? null : state.idempotencyKey,
        cancelRequested: false,
        lastError: null,
      }, payload.now);
    }

    case TRAINING_EVENT.INVALIDATE_DATASET:
      return nextState(state, {
        phase: TRAINING_PHASE.DATASET,
        job: null,
        idempotencyKey: null,
        cancelRequested: false,
        lastError: payload.error
          ? normalizeEventError(payload, "数据集已失效，请重新上传")
          : null,
      }, payload.now);

    case TRAINING_EVENT.RESET:
      return createInitialTrainingWorkflow({ mode: state.mode, now: payload.now });

    default:
      throw new TrainingWorkflowError("UNKNOWN_EVENT", `未知训练工作流事件：${event.type}`);
  }
}

export function restoreTrainingWorkflow(rawWorkflow, options = {}) {
  const fallback = createInitialTrainingWorkflow(options);
  if (!rawWorkflow || typeof rawWorkflow !== "object") return fallback;
  if (rawWorkflow.schemaVersion !== TRAINING_DRAFT_SCHEMA_VERSION) return fallback;
  if (!Object.values(TRAINING_PHASE).includes(rawWorkflow.phase)) return fallback;

  let job = null;
  if (rawWorkflow.job) {
    try {
      job = normalizeTrainingJob(rawWorkflow.job);
    } catch (error) {
      job = null;
    }
  }

  let phase = rawWorkflow.phase;
  const mode = normalizeMode(rawWorkflow.mode || options.mode);
  if (phase === TRAINING_PHASE.TRACKING && !job) phase = TRAINING_PHASE.ALGORITHM;
  if (phase === TRAINING_PHASE.RESULT && (!job || job.status !== TRAINING_JOB_STATUS.SUCCEEDED)) {
    phase = TRAINING_PHASE.ALGORITHM;
  }
  if (phase === TRAINING_PHASE.SUBMITTING && mode === TRAINING_JOB_MODE.LEGACY) {
    phase = TRAINING_PHASE.ALGORITHM;
  }

  return {
    ...fallback,
    schemaVersion: TRAINING_DRAFT_SCHEMA_VERSION,
    draftId: typeof rawWorkflow.draftId === "string" ? rawWorkflow.draftId : fallback.draftId,
    revision: Number.isFinite(Number(rawWorkflow.revision)) ? Number(rawWorkflow.revision) : 0,
    phase,
    mode,
    updatedAt: rawWorkflow.updatedAt || fallback.updatedAt,
    idempotencyKey: typeof rawWorkflow.idempotencyKey === "string"
      ? rawWorkflow.idempotencyKey
      : null,
    job,
    cancelRequested: false,
    lastError: rawWorkflow.lastError || null,
  };
}
