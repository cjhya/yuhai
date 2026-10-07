import {
  PARAMETER_FIELDS,
  PARAMETER_RENDER_GROUPS,
  PARAMETER_SCHEMA_VERSION,
} from "./parameterSchema";

const GROUP_TITLE_BY_ID = Object.freeze(
  PARAMETER_RENDER_GROUPS.reduce((result, group) => {
    result[group.id] = group.title;
    return result;
  }, Object.create(null))
);

function cloneSerializable(value) {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.keys(value).forEach(key => deepFreeze(value[key]));
  return Object.freeze(value);
}

function stableValue(value) {
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "__NaN__";
    if (value === Infinity) return "__Infinity__";
    if (value === -Infinity) return "__-Infinity__";
    if (Object.is(value, -0)) return "__-0__";
  }
  if (value === undefined) return "__undefined__";
  return value;
}

function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (!value || typeof value !== "object") return stableValue(value);
  return Object.keys(value)
    .sort()
    .reduce((result, key) => {
      result[key] = stableObject(value[key]);
      return result;
    }, {});
}

function resolveValues(source) {
  if (!source || typeof source !== "object") return Object.create(null);
  if (source.values && typeof source.values === "object") return source.values;
  if (source.form && source.form.values) return source.form.values;
  return Object.create(null);
}

export function createParameterFingerprint(form) {
  const values = resolveValues(form);
  return JSON.stringify(
    PARAMETER_FIELDS.map(field => [field.id, stableValue(values[field.id])])
  );
}

export function createContextFingerprint(context = {}) {
  return JSON.stringify(stableObject(context || {}));
}

export function createParameterSnapshot(kind, form, options = {}) {
  if (!form || !form.values || typeof form.values !== "object") {
    throw new TypeError("创建工艺方案快照需要有效参数表单");
  }

  const values = PARAMETER_FIELDS.reduce((result, field) => {
    result[field.id] = form.values[field.id];
    return result;
  }, Object.create(null));
  const context = cloneSerializable(options.context || {});
  const result = cloneSerializable(options.result || null);
  const source = cloneSerializable(options.source || null);
  const createdAt = Number.isFinite(Number(options.createdAt))
    ? Number(options.createdAt)
    : Date.now();

  return deepFreeze({
    kind: String(kind || "working"),
    schemaVersion: form.schemaVersion || PARAMETER_SCHEMA_VERSION,
    sourceRevision: Number(
      form.revision !== undefined ? form.revision : form.sourceRevision || 0
    ),
    createdAt,
    values,
    context,
    result,
    source,
    parameterFingerprint: createParameterFingerprint({ values }),
    contextFingerprint: createContextFingerprint(context),
  });
}

export function restoreParameterSnapshot(snapshot, currentForm) {
  if (!snapshot || !snapshot.values) {
    throw new TypeError("恢复工艺方案需要有效快照");
  }
  return {
    schemaVersion: snapshot.schemaVersion || PARAMETER_SCHEMA_VERSION,
    revision: Number(currentForm && currentForm.revision || 0) + 1,
    values: PARAMETER_FIELDS.reduce((result, field) => {
      result[field.id] = snapshot.values[field.id];
      return result;
    }, Object.create(null)),
  };
}

function valueChanged(before, after) {
  return !Object.is(before, after);
}

export function compareParameterStates(beforeState, afterState, options = {}) {
  const beforeValues = resolveValues(beforeState);
  const afterValues = resolveValues(afterState);
  const changedOnly = options.changedOnly === true;

  return PARAMETER_FIELDS.map(field => {
    const before = beforeValues[field.id];
    const after = afterValues[field.id];
    const changed = valueChanged(before, after);
    const numericChange =
      typeof before === "number" &&
      Number.isFinite(before) &&
      typeof after === "number" &&
      Number.isFinite(after)
        ? after - before
        : null;

    return {
      fieldId: field.id,
      label: field.recommendationKey,
      groupId: field.groupId,
      groupLabel: GROUP_TITLE_BY_ID[field.groupId] || field.groupId,
      before,
      after,
      changed,
      numericChange,
    };
  }).filter(row => !changedOnly || row.changed);
}

export function isParameterSnapshotStale(snapshot, form, context = {}) {
  return getParameterSnapshotStaleReasons(snapshot, form, context).length > 0;
}

export function getParameterSnapshotStaleReasons(snapshot, form, context = {}) {
  if (!snapshot) return ["missing-snapshot"];
  const reasons = [];
  if (snapshot.parameterFingerprint !== createParameterFingerprint(form)) {
    reasons.push("parameters-changed");
  }
  if (snapshot.contextFingerprint !== createContextFingerprint(context)) {
    reasons.push("context-changed");
  }
  return reasons;
}
