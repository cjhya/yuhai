import {
  TRAINING_DRAFT_SCHEMA_VERSION,
  TRAINING_JOB_MODE,
  TRAINING_PHASE,
  restoreTrainingWorkflow,
} from "./trainingWorkflow";

const STORAGE_PREFIX = "yuhai:model-training-draft";
const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function getBrowserStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
}

function getCurrentOwnerId() {
  if (typeof window === "undefined" || !window.sessionStorage) return "anonymous";
  return window.sessionStorage.getItem("userid") || "anonymous";
}

export function getTrainingDraftStorageKey(ownerId = getCurrentOwnerId()) {
  return `${STORAGE_PREFIX}:v${TRAINING_DRAFT_SCHEMA_VERSION}:${ownerId}`;
}

function sanitizeTrainModel(trainModel = {}) {
  return {
    taskName: trainModel.taskName || "",
    responsiber: trainModel.responsiber || "",
    productSeries: trainModel.productSeries || "",
    remark: trainModel.remark || "",
    createTime: trainModel.createTime || "",
    dataSet: "",
    dataName: trainModel.dataName || "",
    dataImportId: "",
    dataSetMeta: trainModel.dataSetMeta || null,
    algorithm: trainModel.algorithm && typeof trainModel.algorithm === "object"
      ? trainModel.algorithm
      : { selected_algorithm: "", algorithm_infos: {} },
    result: trainModel.result && typeof trainModel.result === "object"
      ? trainModel.result
      : { mape_val: 0 },
  };
}

export function createTrainingDraftSnapshot(moduleState, options = {}) {
  const savedAt = Number.isFinite(options.now) ? options.now : Date.now();
  return {
    schemaVersion: TRAINING_DRAFT_SCHEMA_VERSION,
    savedAt,
    workflow: moduleState.workflow,
    trainModel: sanitizeTrainModel(moduleState.train_model),
  };
}

export function saveTrainingDraft(moduleState, options = {}) {
  const storage = options.storage || getBrowserStorage();
  if (!storage || !moduleState) return false;
  try {
    const key = options.key || getTrainingDraftStorageKey(options.ownerId);
    storage.setItem(key, JSON.stringify(createTrainingDraftSnapshot(moduleState, options)));
    return true;
  } catch (error) {
    return false;
  }
}

export function loadTrainingDraft(options = {}) {
  const storage = options.storage || getBrowserStorage();
  if (!storage) return null;
  const key = options.key || getTrainingDraftStorageKey(options.ownerId);
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const snapshot = JSON.parse(raw);
    const now = Number.isFinite(options.now) ? options.now : Date.now();
    const maxAgeMs = Number.isFinite(options.maxAgeMs)
      ? options.maxAgeMs
      : DEFAULT_MAX_AGE_MS;
    if (
      !snapshot ||
      snapshot.schemaVersion !== TRAINING_DRAFT_SCHEMA_VERSION ||
      !Number.isFinite(snapshot.savedAt) ||
      now - snapshot.savedAt > maxAgeMs
    ) {
      storage.removeItem(key);
      return null;
    }

    const workflow = restoreTrainingWorkflow(snapshot.workflow, options);
    const trainModel = sanitizeTrainModel(snapshot.trainModel);
    const hasRecoverableRemoteJob = workflow.mode === TRAINING_JOB_MODE.ASYNC && (
      workflow.job ||
      (workflow.phase === TRAINING_PHASE.SUBMITTING && workflow.idempotencyKey)
    );
    if (
      !hasRecoverableRemoteJob &&
      [TRAINING_PHASE.FEATURES, TRAINING_PHASE.ALGORITHM, TRAINING_PHASE.SUBMITTING, TRAINING_PHASE.TRACKING]
        .includes(workflow.phase)
    ) {
      workflow.phase = TRAINING_PHASE.DATASET;
      workflow.job = null;
      workflow.idempotencyKey = null;
      workflow.lastError = {
        code: "LOCAL_DATASET_EXPIRED",
        message: "页面刷新后本地数据集已释放，请重新上传",
      };
    }

    return { workflow, trainModel };
  } catch (error) {
    try {
      storage.removeItem(key);
    } catch (removeError) {
      // 存储不可用时保持静默，由页面使用默认草稿。
    }
    return null;
  }
}

export function clearTrainingDraft(options = {}) {
  const storage = options.storage || getBrowserStorage();
  if (!storage) return false;
  try {
    storage.removeItem(options.key || getTrainingDraftStorageKey(options.ownerId));
    return true;
  } catch (error) {
    return false;
  }
}

export function createTrainingDraftPersistencePlugin(options = {}) {
  return store => {
    store.subscribe((mutation, state) => {
      if (!mutation.type.startsWith("modelTraining/")) return;
      if (mutation.type === "modelTraining/HydrateTrainingDraft") return;
      saveTrainingDraft(state.modelTraining, options);
    });
  };
}
