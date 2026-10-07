import axios from "axios";
import machineData from "@/assets/data/machine_data";
import moldData from "@/assets/data/mold_data";
import materialData from "@/assets/data/material_data";
import productData from "@/assets/data/design_data";
import machineParameterData from "@/assets/data/machine_parameter";
import recommendedParameters from "@/assets/data/parameter.json";
import qualityTemplate from "@/assets/data/quality.json";
import defaultParameters from "@/assets/data/params";

const STORAGE_KEY = "yuhai:demo-backend:v1";
const memoryState = createInitialState();

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function createInitialState() {
  return {
    parameterHistories: [],
    models: [],
    jobs: {},
    idempotency: {},
  };
}

function getStorage() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
}

function readState() {
  const storage = getStorage();
  if (!storage) return memoryState;
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY));
    return parsed && typeof parsed === "object"
      ? { ...createInitialState(), ...parsed }
      : createInitialState();
  } catch (error) {
    return createInitialState();
  }
}

function writeState(state) {
  const storage = getStorage();
  if (!storage) {
    Object.assign(memoryState, state);
    return;
  }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // 浏览器禁用存储时仍允许当前页面继续演示。
  }
}

function parseData(data) {
  if (typeof data !== "string") return data || {};
  try {
    return JSON.parse(data);
  } catch (error) {
    return data;
  }
}

function toPath(config) {
  const url = new URL(config.url || "/", "http://demo.local");
  Object.entries(config.params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  });
  return { pathname: url.pathname.replace(/\/$/, "") || "/", searchParams: url.searchParams };
}

function createVariants(source, count, changes = {}) {
  const base = source[0] || {};
  return Array.from({ length: count }, (_, index) => {
    const item = clone(source[index] || base);
    Object.entries(changes).forEach(([key, transform]) => {
      item[key] = transform(item[key], index);
    });
    return item;
  });
}

const entityRecords = {
  machine: createVariants(machineData, 3, {
    "资产编号": (_, index) => `YHG-JX-CXJ0017${index + 1}`,
    "吨位": (value, index) => Number(value || 550) + index * 50,
  }),
  mold: createVariants(moldData, 3, {
    "模号": (_, index) => `YH2413${index + 6}`,
    "穴数": (value, index) => Number(value || 1) + index,
  }),
  material: createVariants(materialData, 3, {
    "公司": (value, index) => `${value || "科思创"}${index ? `-${index + 1}` : ""}`,
    "密度": (_, index) => `${(1.28 + index * 0.03).toFixed(2)} g/cm³`,
  }),
  product: createVariants(productData, 3, {
    "产品编号": (_, index) => `13010100286${index + 5}`,
    "产品名称": (value, index) => `${value || "LCD 后盖"}${index ? `-${index + 1}` : ""}`,
  }),
};

const dataLists = {
  machine_info: entityRecords.machine,
  mold_info: entityRecords.mold,
  material_info: entityRecords.material,
  product_info: entityRecords.product,
  machine_params: machineParameterData,
};

const entityLabels = {
  machine: record => record["资产编号"] || record["资产名称"],
  mold: record => record["模号"],
  material: record => `${record["公司"] || "材料"} · ${record["种类"] || "PC/ABS"}`,
  product: record => `${record["产品编号"] || "产品"} · ${record["产品名称"] || "设计标准"}`,
};

function listOptions(type) {
  return entityRecords[type].map((record, index) => ({
    id: record.ID || `${type}-${index + 1}`,
    value: entityLabels[type](record),
  }));
}

function findEntity(type, id) {
  const records = entityRecords[type] || [];
  return clone(records.find((record, index) => String(record.ID || `${type}-${index + 1}`) === String(id)) || records[0]);
}

function demoRecommendation() {
  return {
    ...clone(recommendedParameters),
    "注射（压力一段）": 2.4,
    "注射（速度三段）": 480,
    "保压（压力三段）": 120,
    "保压（时间三段）": 9.5,
    "喷嘴（温度）": 265,
  };
}

function demoQuality(seed = 0) {
  const quality = clone(qualityTemplate);
  const delta = (seed % 5) * 0.003;
  Object.keys(quality).forEach(key => {
    if (typeof quality[key] === "number") quality[key] = Number((quality[key] + delta).toFixed(3));
  });
  return quality;
}

function payloadSeed(payload) {
  const source = JSON.stringify(payload || {});
  let value = 0;
  for (let index = 0; index < source.length; index += 1) value = (value + source.charCodeAt(index)) % 97;
  return value;
}

function dateText(offset = 0) {
  const date = new Date(Date.now() - offset * 86400000);
  return date.toISOString().slice(0, 10);
}

function publicJob(job) {
  const visible = clone(job);
  delete visible.payload;
  delete visible.persisted;
  return visible;
}

function materializeJob(state, job) {
  if (!job || ["cancelled", "failed", "succeeded"].includes(job.status)) return job;
  const elapsed = Date.now() - new Date(job.createdAt).getTime();
  let next;
  if (elapsed < 1800) next = { status: "queued", statusVersion: 1, progress: 8, stage: "等待训练资源" };
  else if (elapsed < 4200) next = { status: "running", statusVersion: 2, progress: 38, stage: "数据预处理" };
  else if (elapsed < 6800) next = { status: "running", statusVersion: 3, progress: 72, stage: "模型拟合" };
  else if (elapsed < 9000) next = { status: "finalizing", statusVersion: 4, progress: 94, stage: "生成评估结果" };
  else next = {
    status: "succeeded",
    statusVersion: 5,
    progress: 100,
    stage: "演示训练完成",
    finishedAt: new Date().toISOString(),
    result: { mape_val: 3.84, demo: true },
  };
  Object.assign(job, next, { updatedAt: new Date().toISOString(), pollAfterMs: 1200 });
  if (job.status === "succeeded" && !job.persisted) {
    const payload = job.payload || {};
    state.models.unshift({
      id: `demo-model-${Date.now()}`,
      taskName: payload.taskName || "纯前端演示训练",
      responsiber: payload.responsiber || "演示用户",
      productSeries: payload.productSeries || "001",
      algorithm: payload.algorithm && payload.algorithm.name || "gsogb-smoter",
      dataSet: payload.dataset && payload.dataset.name || "注塑工艺演示数据.csv",
      resultJson: JSON.stringify(job.result),
      createTime: payload.createTime || new Date().toISOString(),
      remark: payload.remark || "浏览器本地演示任务",
      uid: "demo-user",
    });
    job.persisted = true;
  }
  writeState(state);
  return job;
}

function paginate(items, searchParams) {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.max(1, Number(searchParams.get("pageSize")) || 10);
  return { records: items.slice((page - 1) * pageSize, page * pageSize), total: items.length, page, pageSize };
}

function notFound(pathname, config) {
  const error = new Error(`演示接口未实现：${pathname}`);
  error.config = config;
  error.response = { status: 404, data: { message: error.message }, config };
  throw error;
}

export function handleDemoRequest(service, config) {
  const method = String(config.method || "get").toLowerCase();
  const { pathname, searchParams } = toPath(config);
  const body = parseData(config.data);
  const state = readState();

  if (service === "business") {
    if (method === "get" && pathname === "/data/list") {
      return { code: 200, data: clone(dataLists[searchParams.get("type")] || []) };
    }
    const listMatch = pathname.match(/^\/(machine|mold|material|product)\/list$/);
    if (method === "get" && listMatch) return { code: 200, data: listOptions(listMatch[1]) };
    const detailMatch = pathname.match(/^\/(machine|mold|material|product)\/detail\/(.+)$/);
    if (method === "get" && detailMatch) return { code: 200, data: findEntity(detailMatch[1], decodeURIComponent(detailMatch[2])) };

    if (method === "get" && pathname === "/model/modelFilterObject") {
      return { code: 200, data: { "001+gsogb-smoter": ["LCD 后盖质量演示"], "001+smogn": ["稳健质量演示"] } };
    }
    if (method === "get" && pathname === "/model/existTaskName") {
      const name = String(searchParams.get("taskName") || "");
      return { code: 200, data: state.models.some(item => item.taskName === name) };
    }
    if (method === "get" && pathname === "/model/list") return { code: 200, data: clone(state.models) };
    if (method === "get" && pathname === "/model/page") return { code: 200, data: paginate(state.models, searchParams) };
    if (method === "post" && pathname === "/model") {
      const model = { id: `demo-model-${Date.now()}`, uid: "demo-user", dataSet: "本地 CSV", ...body };
      state.models.unshift(model);
      writeState(state);
      return { code: 200, msg: "演示任务已保存到浏览器", data: clone(model) };
    }
    const modelDelete = pathname.match(/^\/model\/(.+)$/);
    if (method === "delete" && modelDelete) {
      state.models = state.models.filter(item => String(item.id) !== decodeURIComponent(modelDelete[1]));
      writeState(state);
      return { code: 200, msg: "演示任务已删除" };
    }
    if (method === "get" && pathname === "/model/modelNums") return { code: 200, data: state.models.length };
    if (method === "get" && pathname === "/model/getModelNearlyDays") {
      const date = Array.from({ length: 11 }, (_, index) => dateText(10 - index));
      return { code: 200, data: { date, number: date.map((_, index) => index % 4) } };
    }
    if (method === "get" && pathname === "/model/getAlgoNearlyDays") {
      return { code: 200, data: Array.from({ length: 8 }, (_, index) => ({ date: dateText(7 - index), algo: index % 2 ? "SMOGN" : "GSOGB-SMOTER", number: index % 3 + 1 })) };
    }

    if (method === "get" && pathname === "/parameterHistory/list") return { code: 200, data: clone(state.parameterHistories) };
    if (method === "get" && pathname === "/parameterHistory/page") return { code: 200, data: paginate(state.parameterHistories, searchParams) };
    if (method === "get" && pathname === "/parameterHistory/parameterNums") return { code: 200, data: state.parameterHistories.length };
    if (method === "post" && pathname === "/parameterHistory") {
      const history = { id: `demo-parameter-${Date.now()}`, createTime: new Date().toLocaleString("zh-CN"), ...body };
      state.parameterHistories.unshift(history);
      writeState(state);
      return { code: 200, msg: "演示方案已保存到浏览器", data: clone(history) };
    }
    const historyDelete = pathname.match(/^\/parameterHistory\/(.+)$/);
    if (method === "delete" && historyDelete) {
      state.parameterHistories = state.parameterHistories.filter(item => String(item.id) !== decodeURIComponent(historyDelete[1]));
      writeState(state);
      return { code: 200, msg: "演示方案已删除" };
    }
    if (method === "get" && ["/user/querUser", "/user/querUser"].includes(pathname)) {
      return { code: 200, data: [{ id: "demo-user", username: "演示用户", role: "1" }] };
    }
    return notFound(pathname, config);
  }

  if (method === "post" && pathname.startsWith("/recommend/")) {
    const seed = payloadSeed(body);
    return {
      recommend_data: JSON.stringify([demoRecommendation()]),
      recommend_label: JSON.stringify([demoQuality(seed)]),
      loss: Number((0.12 + (seed % 7) * 0.006).toFixed(3)),
      demo: true,
    };
  }
  if (method === "post" && pathname.startsWith("/predict/")) {
    return JSON.stringify([demoQuality(payloadSeed(body))]);
  }
  if (method === "get" && pathname.startsWith("/train/")) {
    return { mape_val: 3.84, shap_importances: JSON.stringify({ "注射速度三段": 0.31, "喷嘴温度": 0.24 }), demo: true };
  }
  if (method === "post" && pathname === "/training-jobs") {
    const key = config.headers && (config.headers["Idempotency-Key"] || config.headers.get && config.headers.get("Idempotency-Key"));
    if (key && state.idempotency[key] && state.jobs[state.idempotency[key]]) {
      return publicJob(materializeJob(state, state.jobs[state.idempotency[key]]));
    }
    const now = new Date().toISOString();
    const job = {
      jobId: `demo-job-${Date.now()}`,
      status: "queued",
      statusVersion: 1,
      progress: 8,
      stage: "等待训练资源",
      pollAfterMs: 1200,
      attempt: 1,
      createdAt: now,
      updatedAt: now,
      result: null,
      error: null,
      payload: body,
      persisted: false,
    };
    state.jobs[job.jobId] = job;
    if (key) state.idempotency[key] = job.jobId;
    writeState(state);
    return publicJob(job);
  }
  const byKey = pathname.match(/^\/training-jobs\/by-idempotency-key\/(.+)$/);
  if (method === "get" && byKey) {
    const jobId = state.idempotency[decodeURIComponent(byKey[1])];
    if (!jobId || !state.jobs[jobId]) return notFound(pathname, config);
    return publicJob(materializeJob(state, state.jobs[jobId]));
  }
  const cancelMatch = pathname.match(/^\/training-jobs\/([^/]+)\/cancel$/);
  if (method === "post" && cancelMatch) {
    const job = state.jobs[decodeURIComponent(cancelMatch[1])];
    if (!job) return notFound(pathname, config);
    Object.assign(job, { status: "cancelled", statusVersion: (job.statusVersion || 1) + 1, progress: job.progress || 0, stage: "用户已取消", updatedAt: new Date().toISOString(), finishedAt: new Date().toISOString() });
    writeState(state);
    return publicJob(job);
  }
  const jobMatch = pathname.match(/^\/training-jobs\/([^/]+)$/);
  if (method === "get" && jobMatch) {
    const job = state.jobs[decodeURIComponent(jobMatch[1])];
    if (!job) return notFound(pathname, config);
    return publicJob(materializeJob(state, job));
  }
  return notFound(pathname, config);
}

function delay(config, delayMs) {
  return new Promise((resolve, reject) => {
    if (config.signal && config.signal.aborted) {
      reject(new axios.CanceledError("演示请求已取消", config));
      return;
    }
    const timer = setTimeout(resolve, delayMs);
    if (config.signal) {
      config.signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new axios.CanceledError("演示请求已取消", config));
      }, { once: true });
    }
  });
}

export function createDemoAdapter(service) {
  return async config => {
    await delay(config, service === "algorithm" ? 420 : 140);
    const data = handleDemoRequest(service, config);
    return {
      data,
      status: 200,
      statusText: "OK (Frontend Demo)",
      headers: { "x-yuhai-demo": "true" },
      config,
      request: { demo: true },
    };
  };
}

export function getDemoDefaults() {
  return {
    parameters: clone(defaultParameters),
    model: "001+gsogb-smoter",
    task: "LCD 后盖质量演示",
    algorithm: "pso",
  };
}
