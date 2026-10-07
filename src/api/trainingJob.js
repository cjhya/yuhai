import request from "@/utils/requestAlg";
import { TRAINING_JOB_MODE } from "@/domain/training/trainingWorkflow";
import { isDemoMode } from "@/demo/demoMode";

export function getConfiguredTrainingJobMode() {
  if (isDemoMode) return TRAINING_JOB_MODE.ASYNC;
  return process.env.VUE_APP_TRAINING_JOB_MODE === TRAINING_JOB_MODE.ASYNC
    ? TRAINING_JOB_MODE.ASYNC
    : TRAINING_JOB_MODE.LEGACY;
}

function isTrainingJob(value) {
  const job = value && value.data && !value.jobId ? value.data : value;
  return Boolean(
    job &&
    typeof job === "object" &&
    typeof (job.jobId || job.id) === "string" &&
    typeof job.status === "string"
  );
}

export function unwrapTrainingJob(value) {
  return value && value.data && !value.jobId ? value.data : value;
}

export function createTrainingJob(payload, idempotencyKey, config = {}) {
  return request.post("/training-jobs", payload, {
    ...config,
    headers: {
      ...(config.headers || {}),
      "Idempotency-Key": idempotencyKey,
    },
    validateData: isTrainingJob,
  }).then(unwrapTrainingJob);
}

export function getTrainingJob(jobId, config = {}) {
  return request.get(`/training-jobs/${encodeURIComponent(jobId)}`, {
    ...config,
    validateData: isTrainingJob,
  }).then(unwrapTrainingJob);
}

export function resolveTrainingJobByIdempotencyKey(idempotencyKey, config = {}) {
  return request.get(
    `/training-jobs/by-idempotency-key/${encodeURIComponent(idempotencyKey)}`,
    { ...config, validateData: isTrainingJob }
  ).then(unwrapTrainingJob);
}

export function cancelTrainingJob(jobId, config = {}) {
  return request.post(
    `/training-jobs/${encodeURIComponent(jobId)}/cancel`,
    {},
    { ...config, validateData: isTrainingJob }
  ).then(unwrapTrainingJob);
}

export function buildTrainingJobPayload(trainModel, workflow, datasetRows) {
  return {
    clientDraftId: workflow.draftId,
    draftRevision: workflow.revision,
    taskName: trainModel.taskName,
    responsiber: trainModel.responsiber,
    productSeries: trainModel.productSeries,
    remark: trainModel.remark,
    createTime: trainModel.createTime,
    dataset: {
      clientImportId: trainModel.dataImportId,
      name: trainModel.dataName,
      descriptor: trainModel.dataSetMeta,
      // 最小接口直接提交已校验数据；规模扩大后替换为服务端 datasetId。
      rows: datasetRows,
    },
    algorithm: {
      name: trainModel.algorithm.selected_algorithm,
      params: trainModel.algorithm.algorithm_infos || {},
    },
  };
}
