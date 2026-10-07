const DATASET_COLUMN_TYPES = new Set([
  "string",
  "number",
  "integer",
  "boolean",
  "enum",
  "date",
]);

function normalizeColumn(column) {
  if (!column || typeof column.key !== "string" || !column.key.trim()) {
    throw new TypeError("数据集 Schema 的列必须包含非空 key");
  }

  const type = column.type || "string";
  if (!DATASET_COLUMN_TYPES.has(type)) {
    throw new TypeError(`数据集列 ${column.key} 使用了不支持的类型 ${type}`);
  }

  return {
    key: column.key.trim(),
    aliases: Array.isArray(column.aliases)
      ? column.aliases.map(alias => String(alias).trim()).filter(Boolean)
      : [],
    required: Boolean(column.required),
    nullable: column.nullable !== false,
    type,
    trim: column.trim !== false,
    min: Number.isFinite(column.min) ? column.min : null,
    max: Number.isFinite(column.max) ? column.max : null,
    enumValues: Array.isArray(column.enumValues) ? [...column.enumValues] : [],
  };
}

export function createDatasetSchema(options = {}) {
  const id = typeof options.id === "string" && options.id.trim()
    ? options.id.trim()
    : "generic-csv";
  const version = Number.isInteger(options.version) && options.version > 0
    ? options.version
    : 1;
  const columns = Array.isArray(options.columns)
    ? options.columns.map(normalizeColumn)
    : [];
  const knownNames = new Set();

  columns.forEach(column => {
    [column.key, ...column.aliases].forEach(name => {
      const normalizedName = name.toLowerCase();
      if (knownNames.has(normalizedName)) {
        throw new TypeError(`数据集 Schema 存在重复列或别名：${name}`);
      }
      knownNames.add(normalizedName);
    });
  });

  return {
    id,
    version,
    columns,
    minRows: Number.isInteger(options.minRows) && options.minRows >= 0
      ? options.minRows
      : 1,
    unknownColumnPolicy: options.unknownColumnPolicy === "reject" ? "reject" : "allow",
    coerceUnknown: options.coerceUnknown !== false,
  };
}

// 当前算法仓库没有提供稳定的必需列契约；先实施结构校验和受控类型推断，
// 后续只需为两个业务 Schema 补充 columns，无需改动解析管线。
export const PARAMETER_TUNING_DATASET_SCHEMA = createDatasetSchema({
  id: "parameter-tuning-csv",
  version: 1,
});

export const MODEL_TRAINING_DATASET_SCHEMA = createDatasetSchema({
  id: "model-training-csv",
  version: 1,
});

