import {
  PARAMETER_FIELDS,
  PARAMETER_FIELD_BY_ID,
  PARAMETER_FIELD_BY_LEGACY_KEY,
  PARAMETER_FIELD_BY_RECOMMENDATION_KEY,
  PARAMETER_SCHEMA_VERSION,
} from "./parameterSchema";

const DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function isPlainObject(value) {
  if (!value || Object.prototype.toString.call(value) !== "[object Object]") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function createEmptyValues() {
  const values = Object.create(null);
  PARAMETER_FIELDS.forEach(field => {
    values[field.id] = field.defaultValue;
  });
  return values;
}

function copyKnownValues(form) {
  const values = createEmptyValues();
  if (!form || !isPlainObject(form.values)) return values;

  PARAMETER_FIELDS.forEach(field => {
    if (hasOwn(form.values, field.id)) values[field.id] = form.values[field.id];
  });
  return values;
}

function createForm(values, schemaVersion = PARAMETER_SCHEMA_VERSION, revision = 0) {
  return {
    schemaVersion,
    revision,
    values,
  };
}

function normalizeSampleColumnName(value) {
  return String(value === null || value === undefined ? "" : value)
    .trim()
    .toLocaleLowerCase()
    .replace(/[\s（）()_\-—–]/g, "");
}

const SAMPLE_FIELD_BY_COLUMN = (() => {
  const index = new Map();
  const ambiguous = new Set();

  PARAMETER_FIELDS.forEach(field => {
    const names = [
      field.id,
      field.legacyKey,
      field.recommendationKey,
      field.predictionLabel,
      ...(field.aliases || []),
    ];
    names.forEach(name => {
      const normalized = normalizeSampleColumnName(name);
      if (!normalized || ambiguous.has(normalized)) return;
      const existing = index.get(normalized);
      if (existing && existing.id !== field.id) {
        index.delete(normalized);
        ambiguous.add(normalized);
        return;
      }
      index.set(normalized, field);
    });
  });

  return index;
})();

function createIssue(code, message, sourceKey = null) {
  return { code, message, sourceKey };
}

function unwrapHistorySource(input, issues) {
  if (!isPlainObject(input)) {
    issues.push(createIssue("INVALID_SOURCE", "历史参数必须是对象"));
    return { source: Object.create(null), schemaVersion: PARAMETER_SCHEMA_VERSION };
  }

  if (isPlainObject(input.parameters)) {
    const version = Number.isInteger(input.schemaVersion)
      ? input.schemaVersion
      : PARAMETER_SCHEMA_VERSION;
    return { source: input.parameters, schemaVersion: version };
  }

  return { source: input, schemaVersion: PARAMETER_SCHEMA_VERSION };
}

export function fromLegacyParameterDto(input) {
  const issues = [];
  const { source, schemaVersion } = unwrapHistorySource(input, issues);
  const values = createEmptyValues();

  Object.keys(source).forEach(key => {
    const field = PARAMETER_FIELD_BY_LEGACY_KEY[key];
    if (!field) {
      issues.push(createIssue("UNKNOWN_FIELD", `忽略未知历史字段：${key}`, key));
      return;
    }
    values[field.id] = source[key];
  });

  if (schemaVersion !== PARAMETER_SCHEMA_VERSION) {
    issues.push(
      createIssue(
        "UNSUPPORTED_SCHEMA_VERSION",
        `参数版本 ${schemaVersion} 与当前版本 ${PARAMETER_SCHEMA_VERSION} 不一致`
      )
    );
  }

  return { form: createForm(values, schemaVersion), issues };
}

export function fromRecommendationParameterDto(input, baseForm = null) {
  const issues = [];
  const values = baseForm ? copyKnownValues(baseForm) : createEmptyValues();

  if (!isPlainObject(input)) {
    issues.push(createIssue("INVALID_SOURCE", "推荐参数必须是对象"));
    return { form: createForm(values), issues };
  }

  Object.keys(input).forEach(key => {
    const field = PARAMETER_FIELD_BY_RECOMMENDATION_KEY[key];
    if (!field) {
      issues.push(createIssue("UNKNOWN_FIELD", `忽略未知推荐字段：${key}`, key));
      return;
    }
    values[field.id] = input[key];
  });

  return {
    form: createForm(
      values,
      PARAMETER_SCHEMA_VERSION,
      baseForm ? Number(baseForm.revision || 0) + 1 : 0
    ),
    issues,
  };
}

export function fromDatasetParameterRow(row) {
  const issues = [];
  const values = createEmptyValues();
  const matchedFieldIds = [];
  const unmatchedColumns = [];
  const duplicateColumns = [];
  const matchedColumns = Object.create(null);

  if (!isPlainObject(row)) {
    issues.push(createIssue("INVALID_SOURCE", "数据样本必须是对象"));
    return {
      form: createForm(values),
      matchedFieldIds,
      unmatchedColumns,
      duplicateColumns,
      issues,
    };
  }

  Object.entries(row).forEach(([column, rawValue]) => {
    const field = SAMPLE_FIELD_BY_COLUMN.get(normalizeSampleColumnName(column));
    if (!field) {
      unmatchedColumns.push(column);
      return;
    }
    if (matchedColumns[field.id]) {
      duplicateColumns.push(column);
      issues.push(
        createIssue(
          "DUPLICATE_PARAMETER_COLUMN",
          `字段 ${field.recommendationKey} 同时匹配多列，已保留 ${matchedColumns[field.id]}`,
          column
        )
      );
      return;
    }
    matchedColumns[field.id] = column;
    matchedFieldIds.push(field.id);
    values[field.id] = rawValue;
  });

  const draft = createForm(values, PARAMETER_SCHEMA_VERSION, 1);
  const validation = validateParameterForm(draft);
  return {
    form: validation.value,
    matchedFieldIds,
    unmatchedColumns,
    duplicateColumns,
    issues: [
      ...issues,
      ...validation.errorList.map(error =>
        createIssue(error.code, error.message, matchedColumns[error.fieldId] || null)
      ),
    ],
  };
}

export function updateParameterForm(form, fieldId, rawValue) {
  if (!PARAMETER_FIELD_BY_ID[fieldId]) {
    throw new Error(`未知工艺参数字段：${fieldId}`);
  }

  const values = copyKnownValues(form);
  values[fieldId] = rawValue;
  return createForm(values, PARAMETER_SCHEMA_VERSION, (form && form.revision || 0) + 1);
}

function normalizeFieldValue(field, rawValue) {
  if (rawValue === null || rawValue === undefined) {
    return { valid: field.nullable, value: null, code: "REQUIRED", message: "不能为空" };
  }

  let value = rawValue;
  if (typeof value === "string") {
    value = value.trim();
    if (value === "") {
      return { valid: field.nullable, value: null, code: "REQUIRED", message: "不能为空" };
    }

    if (field.types.includes("boolean") && (value === "true" || value === "false")) {
      return { valid: true, value: value === "true" };
    }

    if (!field.types.includes("number") || !DECIMAL_PATTERN.test(value)) {
      return { valid: false, value: null, code: "INVALID_TYPE", message: "请输入合法数值" };
    }

    value = Number(value);
  }

  if (typeof value === "boolean") {
    if (!field.types.includes("boolean")) {
      return { valid: false, value: null, code: "INVALID_TYPE", message: "该字段不接受布尔值" };
    }
    return { valid: true, value };
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { valid: false, value: null, code: "NUMBER_NOT_FINITE", message: "请输入有限数值" };
  }

  if (field.min !== null && value < field.min) {
    return { valid: false, value: null, code: "BELOW_MIN", message: `不能小于 ${field.min}` };
  }
  if (field.max !== null && value > field.max) {
    return { valid: false, value: null, code: "ABOVE_MAX", message: `不能大于 ${field.max}` };
  }

  return { valid: true, value: Object.is(value, -0) ? 0 : value };
}

function addFieldError(errors, errorList, field, code, message, rawValue) {
  const error = {
    fieldId: field.id,
    fieldLabel: field.recommendationKey,
    code,
    message,
    rawValue,
  };
  if (!errors[field.id]) errors[field.id] = [];
  errors[field.id].push(error);
  errorList.push(error);
}

export function validateParameterForm(form, { target = null } = {}) {
  const errors = Object.create(null);
  const errorList = [];
  const values = createEmptyValues();

  if (!form || !isPlainObject(form.values)) {
    const error = {
      fieldId: null,
      fieldLabel: "工艺参数",
      code: "INVALID_FORM",
      message: "参数表单结构不正确",
      rawValue: form,
    };
    return {
      valid: false,
      value: createForm(values),
      errors,
      errorList: [error],
    };
  }

  if (form.schemaVersion !== PARAMETER_SCHEMA_VERSION) {
    errorList.push({
      fieldId: null,
      fieldLabel: "工艺参数",
      code: "SCHEMA_VERSION_MISMATCH",
      message: `参数版本 ${form.schemaVersion} 与当前版本 ${PARAMETER_SCHEMA_VERSION} 不一致`,
      rawValue: form.schemaVersion,
    });
  }

  PARAMETER_FIELDS.forEach(field => {
    const rawValue = form.values[field.id];
    const normalized = normalizeFieldValue(field, rawValue);
    const requiredForTarget = target && field.requiredFor.includes(target);

    if (normalized.valid && normalized.value === null && requiredForTarget) {
      addFieldError(errors, errorList, field, "REQUIRED_FOR_TARGET", "当前操作要求填写该字段", rawValue);
      return;
    }

    if (!normalized.valid) {
      addFieldError(errors, errorList, field, normalized.code, normalized.message, rawValue);
      return;
    }

    values[field.id] = normalized.value;
  });

  return {
    valid: errorList.length === 0,
    value: createForm(values, PARAMETER_SCHEMA_VERSION, form.revision || 0),
    errors,
    errorList,
  };
}

function assertParameterSet(parameterSet) {
  if (!parameterSet || !isPlainObject(parameterSet.values)) {
    throw new TypeError("必须传入经过校验的工艺参数对象");
  }
}

export function toLegacyParameterDto(parameterSet) {
  assertParameterSet(parameterSet);
  const dto = Object.create(null);
  PARAMETER_FIELDS.forEach(field => {
    dto[field.legacyKey] = parameterSet.values[field.id];
  });
  return dto;
}

export function toRecommendationParameterDto(parameterSet) {
  assertParameterSet(parameterSet);
  const dto = Object.create(null);
  PARAMETER_FIELDS.forEach(field => {
    dto[field.recommendationKey] = parameterSet.values[field.id];
  });
  return dto;
}

export function toPredictionParameterDto(parameterSet) {
  assertParameterSet(parameterSet);
  return PARAMETER_FIELDS.filter(field => field.predictionLabel).map(field => {
    const value = parameterSet.values[field.id];
    if (value === null || value === undefined) {
      throw new Error(`预测参数缺失：${field.recommendationKey}`);
    }
    return { label: field.predictionLabel, value };
  });
}

export function getParameterErrorSummary(validation, limit = 3) {
  if (!validation || !Array.isArray(validation.errorList) || validation.errorList.length === 0) {
    return "";
  }
  const messages = validation.errorList
    .slice(0, limit)
    .map(error => `${error.fieldLabel}：${error.message}`);
  const rest = validation.errorList.length - messages.length;
  return `${messages.join("；")}${rest > 0 ? `；另有 ${rest} 项` : ""}`;
}
