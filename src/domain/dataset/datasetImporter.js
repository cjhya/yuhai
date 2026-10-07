import Papa from "papaparse";
import { createDatasetSchema } from "./datasetSchema";

const DEFAULT_MAX_FILE_BYTES = 20 * 1024 * 1024;
const DEFAULT_MAX_ROWS = 100000;
const DEFAULT_MAX_CELLS = 2000000;
const DEFAULT_MAX_COLUMNS = 256;
const DEFAULT_MAX_CELL_LENGTH = 10000;
const DEFAULT_PREVIEW_ROWS = 200;
const DEFAULT_MAX_ISSUE_SAMPLES = 200;
const DEFAULT_CHUNK_SIZE = 1024 * 1024;
const SAFE_NUMBER_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const DANGEROUS_HEADERS = new Set(["__proto__", "prototype", "constructor"]);
const ACCEPTED_MIME_TYPES = new Set([
  "text/csv",
  "text/plain",
  "application/csv",
  "application/vnd.ms-excel",
]);

let importSequence = 0;

export const DATASET_IMPORT_STATUS = Object.freeze({
  PREFLIGHT: "preflight",
  PARSING: "parsing",
  READY: "ready",
  FAILED: "failed",
  CANCELLED: "cancelled",
});

export class DatasetImportError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = "DatasetImportError";
    this.code = code;
    this.details = details;
  }
}

export class DatasetImportCancelledError extends DatasetImportError {
  constructor() {
    super("IMPORT_CANCELLED", "数据集导入已取消");
    this.name = "DatasetImportCancelledError";
  }
}

export function isDatasetImportCancelled(error) {
  return Boolean(error && error.code === "IMPORT_CANCELLED");
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function createImportId() {
  importSequence += 1;
  return `dataset-${Date.now().toString(36)}-${importSequence.toString(36)}`;
}

function normalizeHeader(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/^\uFEFF/, "")
    .trim();
}

function safeCallback(callback, value) {
  if (typeof callback !== "function") return;
  try {
    callback(value);
  } catch (error) {
    console.error("数据集导入回调执行失败", error);
  }
}

function createIssueCollector(maxSamples) {
  const samples = [];
  const countsByCode = Object.create(null);
  let errorCount = 0;
  let warningCount = 0;

  return {
    add(issue) {
      const normalized = {
        severity: issue.severity === "warning" ? "warning" : "error",
        code: issue.code || "UNKNOWN_IMPORT_ERROR",
        row: Number.isInteger(issue.row) ? issue.row : null,
        column: issue.column || null,
        rawValue: issue.rawValue,
        message: issue.message || "数据集校验失败",
      };
      if (normalized.severity === "warning") warningCount += 1;
      else errorCount += 1;
      countsByCode[normalized.code] = (countsByCode[normalized.code] || 0) + 1;
      if (samples.length < maxSamples) {
        samples.push(normalized);
      } else if (normalized.severity === "error") {
        const warningIndex = samples.findIndex(sample => sample.severity === "warning");
        if (warningIndex >= 0) samples.splice(warningIndex, 1, normalized);
      }
    },
    snapshot() {
      return {
        errorCount,
        warningCount,
        sampledCount: samples.length,
        truncated: errorCount + warningCount > samples.length,
        countsByCode: { ...countsByCode },
        samples: [...samples],
      };
    },
    get errorCount() {
      return errorCount;
    },
  };
}

function getInputMetadata(input, options) {
  if (typeof input === "string") {
    return {
      name: options.fileName || "dataset.csv",
      size: input.length,
      mime: "text/csv",
      lastModified: null,
    };
  }

  if (!input || typeof input.size !== "number" || typeof input.slice !== "function") {
    throw new DatasetImportError("INVALID_FILE", "请选择有效的 CSV 文件");
  }

  return {
    name: input.name || options.fileName || "dataset.csv",
    size: input.size,
    mime: input.type || "",
    lastModified: Number.isFinite(input.lastModified) ? input.lastModified : null,
  };
}

function runPreflight(fileMeta, limits, issues) {
  if (!fileMeta.name.toLowerCase().endsWith(".csv")) {
    throw new DatasetImportError("INVALID_EXTENSION", "仅支持 .csv 文件");
  }
  if (fileMeta.size <= 0) {
    throw new DatasetImportError("EMPTY_FILE", "CSV 文件为空");
  }
  if (fileMeta.size > limits.maxFileBytes) {
    const maxMb = Math.round(limits.maxFileBytes / 1024 / 1024);
    throw new DatasetImportError(
      "FILE_TOO_LARGE",
      `CSV 文件超过客户端 ${maxMb} MB 导入上限`
    );
  }
  if (fileMeta.mime && !ACCEPTED_MIME_TYPES.has(fileMeta.mime.toLowerCase())) {
    issues.add({
      severity: "warning",
      code: "UNEXPECTED_MIME_TYPE",
      message: `文件 MIME 类型为 ${fileMeta.mime}，将继续按 CSV 内容校验`,
    });
  }
}

function buildSchemaLookup(schema) {
  const lookup = new Map();
  schema.columns.forEach(column => {
    [column.key, ...column.aliases].forEach(name => {
      lookup.set(name.toLowerCase(), column);
    });
  });
  return lookup;
}

function buildHeaderPlan(rawHeaders, schema, limits, issues) {
  if (!Array.isArray(rawHeaders) || rawHeaders.length === 0) {
    issues.add({ code: "MISSING_HEADER", message: "CSV 缺少有效表头" });
    return null;
  }
  if (rawHeaders.length > limits.maxColumns) {
    issues.add({
      code: "TOO_MANY_COLUMNS",
      message: `CSV 列数 ${rawHeaders.length} 超过 ${limits.maxColumns} 列上限`,
    });
    return null;
  }

  const schemaLookup = buildSchemaLookup(schema);
  const mappings = [];
  const canonicalHeaders = new Set();
  const presentSchemaKeys = new Set();

  rawHeaders.forEach(rawHeader => {
    const header = normalizeHeader(rawHeader);
    if (!header) {
      issues.add({ code: "EMPTY_HEADER", message: "CSV 存在空表头" });
      return;
    }
    if (DANGEROUS_HEADERS.has(header.toLowerCase())) {
      issues.add({
        code: "UNSAFE_HEADER",
        column: header,
        message: `CSV 表头 ${header} 不允许使用`,
      });
      return;
    }

    const definition = schemaLookup.get(header.toLowerCase()) || null;
    if (!definition && schema.unknownColumnPolicy === "reject") {
      issues.add({
        code: "UNKNOWN_COLUMN",
        column: header,
        message: `CSV 包含 Schema 未定义的列 ${header}`,
      });
      return;
    }

    const outputKey = definition ? definition.key : header;
    if (canonicalHeaders.has(outputKey.toLowerCase())) {
      issues.add({
        code: "DUPLICATE_HEADER",
        column: outputKey,
        message: `CSV 存在重复列 ${outputKey}`,
      });
      return;
    }
    canonicalHeaders.add(outputKey.toLowerCase());
    if (definition) presentSchemaKeys.add(definition.key);
    mappings.push({ inputKey: header, outputKey, definition });
  });

  schema.columns.forEach(column => {
    if (column.required && !presentSchemaKeys.has(column.key)) {
      issues.add({
        code: "REQUIRED_COLUMN_MISSING",
        column: column.key,
        message: `CSV 缺少必需列 ${column.key}`,
      });
    }
  });

  return mappings;
}

function isMissing(value) {
  return value === null || value === undefined || (typeof value === "string" && !value.trim());
}

function hasUnsafeLeadingZero(value) {
  return /^[+-]?0\d+$/.test(value);
}

function safelyInferValue(rawValue) {
  if (isMissing(rawValue)) return { ok: true, value: null };
  if (typeof rawValue !== "string") return { ok: true, value: rawValue };

  const value = rawValue.trim();
  if (/^(true|false)$/i.test(value)) {
    return { ok: true, value: value.toLowerCase() === "true" };
  }
  if (/^(nan|[+-]?infinity)$/i.test(value)) {
    return { ok: false, code: "NON_FINITE_NUMBER", message: "数值不能为 NaN 或 Infinity" };
  }
  if (
    SAFE_NUMBER_PATTERN.test(value) &&
    !hasUnsafeLeadingZero(value)
  ) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && Math.abs(parsed) < Math.pow(2, 53)) {
      return { ok: true, value: parsed };
    }
  }
  return { ok: true, value: rawValue };
}

function convertDefinedValue(rawValue, definition) {
  if (isMissing(rawValue)) {
    if (!definition.nullable) {
      return { ok: false, code: "REQUIRED_VALUE_MISSING", message: "值不能为空" };
    }
    return { ok: true, value: null };
  }

  const source = typeof rawValue === "string" && definition.trim
    ? rawValue.trim()
    : rawValue;

  if (definition.type === "string") return { ok: true, value: String(source) };
  if (definition.type === "boolean") {
    if (source === true || source === false) return { ok: true, value: source };
    const normalized = String(source).toLowerCase();
    if (["true", "1"].includes(normalized)) return { ok: true, value: true };
    if (["false", "0"].includes(normalized)) return { ok: true, value: false };
    return { ok: false, code: "INVALID_BOOLEAN", message: "值不是有效布尔值" };
  }
  if (definition.type === "enum") {
    if (definition.enumValues.includes(source)) return { ok: true, value: source };
    return { ok: false, code: "INVALID_ENUM", message: "值不在允许枚举范围内" };
  }
  if (definition.type === "date") {
    if (!Number.isNaN(Date.parse(String(source)))) return { ok: true, value: String(source) };
    return { ok: false, code: "INVALID_DATE", message: "值不是有效日期" };
  }

  const text = String(source);
  if (!SAFE_NUMBER_PATTERN.test(text)) {
    return { ok: false, code: "INVALID_NUMBER", message: "值不是有效数字" };
  }
  const number = Number(text);
  if (!Number.isFinite(number) || Math.abs(number) >= Math.pow(2, 53)) {
    return { ok: false, code: "UNSAFE_NUMBER", message: "数值超出 JavaScript 安全转换范围" };
  }
  if (definition.type === "integer" && !Number.isInteger(number)) {
    return { ok: false, code: "INVALID_INTEGER", message: "值不是整数" };
  }
  if (definition.min !== null && number < definition.min) {
    return { ok: false, code: "NUMBER_BELOW_MIN", message: `数值不能小于 ${definition.min}` };
  }
  if (definition.max !== null && number > definition.max) {
    return { ok: false, code: "NUMBER_ABOVE_MAX", message: `数值不能大于 ${definition.max}` };
  }
  return { ok: true, value: number };
}

function createColumnStats(mappings) {
  return mappings.reduce((stats, mapping) => {
    stats[mapping.outputKey] = {
      count: 0,
      missingCount: 0,
      invalidCount: 0,
      min: null,
      max: null,
    };
    return stats;
  }, Object.create(null));
}

function updateColumnStats(stats, key, value) {
  const column = stats[key];
  column.count += 1;
  if (value === null || value === undefined || value === "") {
    column.missingCount += 1;
    return;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    column.min = column.min === null ? value : Math.min(column.min, value);
    column.max = column.max === null ? value : Math.max(column.max, value);
  }
}

function normalizeParserIssue(error) {
  const undetectableDelimiter = error && error.code === "UndetectableDelimiter";
  return {
    severity: undetectableDelimiter ? "warning" : "error",
    code: `CSV_${String(error.code || error.type || "PARSE_ERROR").toUpperCase()}`,
    row: Number.isInteger(error.row) ? error.row + 2 : null,
    message: undetectableDelimiter
      ? "CSV 仅包含一列，已使用默认逗号分隔符继续解析"
      : error.message || "CSV 语法解析失败",
  };
}

function buildFailureDetails(fileMeta, schema, previewRows, columnStats, issues, rowCount) {
  return {
    fileMeta,
    schemaId: schema.id,
    schemaVersion: schema.version,
    rowCount,
    previewRows: [...previewRows],
    columnStats,
    issues: issues.snapshot(),
  };
}

export function createCsvImportTask(input, options = {}) {
  const importId = createImportId();
  const schema = options.schema && Array.isArray(options.schema.columns)
    ? options.schema
    : createDatasetSchema();
  const limits = {
    maxFileBytes: positiveInteger(options.maxFileBytes, DEFAULT_MAX_FILE_BYTES),
    maxRows: positiveInteger(options.maxRows, DEFAULT_MAX_ROWS),
    maxCells: positiveInteger(options.maxCells, DEFAULT_MAX_CELLS),
    maxColumns: positiveInteger(options.maxColumns, DEFAULT_MAX_COLUMNS),
    maxCellLength: positiveInteger(options.maxCellLength, DEFAULT_MAX_CELL_LENGTH),
    previewRows: positiveInteger(options.previewRows, DEFAULT_PREVIEW_ROWS),
    maxIssueSamples: positiveInteger(options.maxIssueSamples, DEFAULT_MAX_ISSUE_SAMPLES),
    chunkSize: positiveInteger(options.chunkSize, DEFAULT_CHUNK_SIZE),
  };
  const issues = createIssueCollector(limits.maxIssueSamples);
  const rows = [];
  const previewRows = [];
  let mappings = null;
  let columns = [];
  let columnStats = Object.create(null);
  let rowCount = 0;
  let validRowCount = 0;
  let invalidRowCount = 0;
  let parserHandle = null;
  let settled = false;
  let cancelRequested = false;
  let rejectPromise;
  let fileMeta;

  const promise = new Promise((resolve, reject) => {
    rejectPromise = reject;

    const rejectOnce = error => {
      if (settled) return;
      settled = true;
      safeCallback(options.onStatus, DATASET_IMPORT_STATUS.FAILED);
      reject(error);
    };

    try {
      safeCallback(options.onStatus, DATASET_IMPORT_STATUS.PREFLIGHT);
      fileMeta = getInputMetadata(input, options);
      runPreflight(fileMeta, limits, issues);
      safeCallback(options.onStatus, DATASET_IMPORT_STATUS.PARSING);

      Papa.parse(input, {
        header: true,
        skipEmptyLines: "greedy",
        dynamicTyping: false,
        encoding: options.encoding || "UTF-8",
        chunkSize: limits.chunkSize,
        transformHeader: normalizeHeader,
        chunk(results, parser) {
          parserHandle = parser;
          if (cancelRequested || settled) {
            parser.abort();
            return;
          }

          (results.errors || []).forEach(error => {
            issues.add(normalizeParserIssue(error));
          });

          if (!mappings) {
            const headerErrorBaseline = issues.errorCount;
            const renamedHeaders = results.meta && results.meta.renamedHeaders;
            if (renamedHeaders) {
              Object.entries(renamedHeaders).forEach(([renamed, original]) => {
                if (DANGEROUS_HEADERS.has(String(original).toLowerCase())) {
                  issues.add({
                    code: "UNSAFE_HEADER",
                    column: original,
                    message: `CSV 表头 ${original} 不允许使用`,
                  });
                } else {
                  issues.add({
                    code: "DUPLICATE_HEADER",
                    column: original,
                    message: `CSV 重复列 ${original} 被解析器重命名为 ${renamed}`,
                  });
                }
              });
            }
            const rawHeaders = results.meta && Array.isArray(results.meta.fields)
              ? results.meta.fields
              : [];
            mappings = buildHeaderPlan(rawHeaders, schema, limits, issues);
            if (!mappings || issues.errorCount > headerErrorBaseline) {
              const details = buildFailureDetails(
                fileMeta,
                schema,
                previewRows,
                columnStats,
                issues,
                rowCount
              );
              rejectOnce(new DatasetImportError(
                "HEADER_VALIDATION_FAILED",
                "CSV 表头校验失败",
                details
              ));
              parser.abort();
              return;
            }
            columns = mappings.map(mapping => mapping.outputKey);
            columnStats = createColumnStats(mappings);
          }

          for (const rawRow of results.data || []) {
            rowCount += 1;
            if (rowCount > limits.maxRows || rowCount * columns.length > limits.maxCells) {
              const code = rowCount > limits.maxRows ? "TOO_MANY_ROWS" : "TOO_MANY_CELLS";
              const message = rowCount > limits.maxRows
                ? `CSV 行数超过 ${limits.maxRows} 行上限`
                : `CSV 单元格数量超过 ${limits.maxCells} 个上限`;
              issues.add({ code, row: rowCount + 1, message });
              const details = buildFailureDetails(
                fileMeta,
                schema,
                previewRows,
                columnStats,
                issues,
                rowCount
              );
              rejectOnce(new DatasetImportError(code, message, details));
              parser.abort();
              return;
            }

            const outputRow = Object.create(null);
            let rowValid = true;
            for (const mapping of mappings) {
              const rawValue = rawRow[mapping.inputKey];
              if (typeof rawValue === "string" && rawValue.length > limits.maxCellLength) {
                rowValid = false;
                columnStats[mapping.outputKey].invalidCount += 1;
                issues.add({
                  code: "CELL_TOO_LARGE",
                  row: rowCount + 1,
                  column: mapping.outputKey,
                  message: `单元格长度超过 ${limits.maxCellLength} 个字符`,
                });
                continue;
              }

              const conversion = mapping.definition
                ? convertDefinedValue(rawValue, mapping.definition)
                : schema.coerceUnknown
                  ? safelyInferValue(rawValue)
                  : { ok: true, value: rawValue };

              if (!conversion.ok) {
                rowValid = false;
                columnStats[mapping.outputKey].invalidCount += 1;
                issues.add({
                  code: conversion.code,
                  row: rowCount + 1,
                  column: mapping.outputKey,
                  rawValue,
                  message: conversion.message,
                });
                continue;
              }

              outputRow[mapping.outputKey] = conversion.value;
              updateColumnStats(columnStats, mapping.outputKey, conversion.value);
            }

            if (rowValid) {
              validRowCount += 1;
              rows.push(outputRow);
              if (previewRows.length < limits.previewRows) previewRows.push(outputRow);
            } else {
              invalidRowCount += 1;
            }
          }

          const totalUnits = typeof input === "string" ? input.length : fileMeta.size;
          const processedUnits = results.meta && Number.isFinite(results.meta.cursor)
            ? Math.min(results.meta.cursor, totalUnits)
            : 0;
          safeCallback(options.onProgress, {
            processedUnits,
            totalUnits,
            percent: totalUnits > 0 ? Math.min(99, Math.round(processedUnits / totalUnits * 100)) : 0,
            rowCount,
          });
        },
        complete() {
          if (settled || cancelRequested) return;
          if (!mappings || rowCount < schema.minRows) {
            issues.add({
              code: "NO_DATA_ROWS",
              message: `CSV 至少需要 ${schema.minRows} 行有效数据`,
            });
          }

          if (issues.errorCount > 0) {
            const details = buildFailureDetails(
              fileMeta,
              schema,
              previewRows,
              columnStats,
              issues,
              rowCount
            );
            rejectOnce(new DatasetImportError(
              "DATASET_VALIDATION_FAILED",
              `CSV 校验失败，共发现 ${details.issues.errorCount} 个错误`,
              details
            ));
            return;
          }

          settled = true;
          const issueReport = issues.snapshot();
          const descriptor = {
            importId,
            name: fileMeta.name,
            size: fileMeta.size,
            mime: fileMeta.mime,
            lastModified: fileMeta.lastModified,
            encoding: options.encoding || "UTF-8",
            schemaId: schema.id,
            schemaVersion: schema.version,
            rowCount,
            validRowCount,
            invalidRowCount,
            columnCount: columns.length,
            columns: [...columns],
            previewRowCount: previewRows.length,
            issueReport,
          };
          safeCallback(options.onProgress, {
            processedUnits: fileMeta.size,
            totalUnits: fileMeta.size,
            percent: 100,
            rowCount,
          });
          safeCallback(options.onStatus, DATASET_IMPORT_STATUS.READY);
          resolve({
            importId,
            status: DATASET_IMPORT_STATUS.READY,
            rows,
            previewRows,
            columns,
            columnStats,
            descriptor,
          });
        },
        error(error) {
          rejectOnce(new DatasetImportError(
            "FILE_READ_FAILED",
            error && error.message ? error.message : "CSV 文件读取失败"
          ));
        },
      });
    } catch (error) {
      rejectOnce(error instanceof DatasetImportError
        ? error
        : new DatasetImportError("IMPORT_FAILED", error.message || "CSV 导入失败"));
    }
  });

  return {
    importId,
    promise,
    cancel() {
      if (settled || cancelRequested) return;
      cancelRequested = true;
      settled = true;
      safeCallback(options.onStatus, DATASET_IMPORT_STATUS.CANCELLED);
      if (rejectPromise) rejectPromise(new DatasetImportCancelledError());
      if (parserHandle) parserHandle.abort();
    },
  };
}

export function getDatasetImportErrorMessage(error) {
  if (!error) return "CSV 导入失败";
  if (isDatasetImportCancelled(error)) return "数据集导入已取消";
  if (error.details && error.details.issues && error.details.issues.samples.length > 0) {
    const first = error.details.issues.samples[0];
    const location = first.row
      ? `第 ${first.row} 行${first.column ? `、${first.column} 列` : ""}`
      : first.column
        ? `${first.column} 列`
        : "";
    return `${error.message}${location ? `：${location}` : ""}，${first.message}`;
  }
  return error.message || "CSV 导入失败";
}
