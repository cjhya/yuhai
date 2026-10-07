const datasets = new Map();

export function registerDataset(importResult) {
  if (
    !importResult ||
    typeof importResult.importId !== "string" ||
    !Array.isArray(importResult.rows)
  ) {
    throw new TypeError("无法注册无效的数据集导入结果");
  }

  const record = {
    rows: importResult.rows,
    descriptor: importResult.descriptor || null,
  };
  datasets.set(importResult.importId, record);

  return {
    kind: "memory",
    importId: importResult.importId,
  };
}

export function getDatasetRows(importId) {
  const record = datasets.get(importId);
  return record ? record.rows : null;
}

export function getDatasetDescriptor(importId) {
  const record = datasets.get(importId);
  return record ? record.descriptor : null;
}

export function hasDataset(importId) {
  return datasets.has(importId);
}

export function releaseDataset(importId) {
  if (!importId) return false;
  return datasets.delete(importId);
}

export function clearDatasetRepository() {
  datasets.clear();
}

