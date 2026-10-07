export const PARAMETER_SCHEMA_VERSION = 1;

const STAGES = [
  { id: "stage1", label: "一段", ordinal: "1st", algorithmLabel: "一段" },
  { id: "stage2", label: "二段", ordinal: "2nd", algorithmLabel: "二段" },
  { id: "stage3", label: "三段", ordinal: "3rd", algorithmLabel: "三段" },
  // 4rd/5rd 是现有历史 DTO 的字段拼写，兼容逻辑只保留在传输别名中。
  { id: "stage4", label: "四段", ordinal: "4rd", algorithmLabel: "四段" },
  { id: "stage5", label: "五段", ordinal: "5rd", algorithmLabel: "五段" },
];

const BOARD_COLUMNS = Array.from({ length: 6 }, (_, index) => ({
  id: `board${index + 1}`,
  label: `卡板${index + 1}温度`,
}));

const PARAMETER_LAYOUT = [
  {
    id: "injection",
    title: "注射",
    layoutRow: 0,
    rows: [
      { id: "pressure", label: "压力" },
      { id: "speed", label: "速度" },
      { id: "time", label: "时间" },
    ],
    columns: STAGES.map(stage => ({ id: stage.id, label: stage.label })),
  },
  {
    id: "holding",
    title: "保压",
    layoutRow: 0,
    rows: [
      { id: "pressure", label: "压力" },
      { id: "speed", label: "速度" },
      { id: "time", label: "时间" },
    ],
    columns: STAGES.map(stage => ({ id: stage.id, label: stage.label })),
  },
  {
    id: "temperature",
    title: "温度",
    layoutRow: 1,
    rows: [{ id: "heating", label: "加热值" }],
    columns: [
      { id: "nozzle", label: "喷嘴" },
      ...STAGES.map(stage => ({ id: stage.id, label: stage.label })),
    ],
  },
  {
    id: "moldTemperature",
    title: "模温机",
    layoutRow: 1,
    rows: [{ id: "machine", label: "模温机" }],
    columns: [
      { id: "statusMother", label: "设备状态(母模)" },
      { id: "temperatureMother", label: "出水口温度(母模)" },
      { id: "statusPublic", label: "设备状态(公模)" },
      { id: "temperaturePublic", label: "出水口温度(公模)" },
    ],
  },
  {
    id: "cabinet",
    title: "温控箱",
    layoutRow: 2,
    rows: Array.from({ length: 6 }, (_, index) => ({
      id: `cabinet${index + 1}`,
      label: `温控箱${index + 1}`,
    })),
    columns: BOARD_COLUMNS,
  },
];

function createField({
  id,
  legacyKey,
  recommendationKey,
  predictionLabel = null,
  aliases = [],
  groupId,
  rowId,
  columnId,
  types = ["number"],
  requiredFor = [],
}) {
  return {
    id,
    legacyKey,
    recommendationKey,
    predictionLabel,
    aliases,
    groupId,
    rowId,
    columnId,
    types,
    nullable: true,
    defaultValue: null,
    unit: null,
    min: null,
    max: null,
    precision: null,
    requiredFor,
  };
}

function createSegmentFields({
  idPrefix,
  groupId,
  algorithmGroup,
  legacyPrefixes,
}) {
  const metricDefinitions = [
    { id: "pressure", label: "压力", legacyPrefix: legacyPrefixes.pressure, suffix: "Pressure" },
    { id: "speed", label: "速度", legacyPrefix: legacyPrefixes.speed, suffix: "Speed" },
    { id: "time", label: "时间", legacyPrefix: legacyPrefixes.time, suffix: "Time" },
  ];

  return metricDefinitions.flatMap(metric =>
    STAGES.map((stage, stageIndex) => {
      const isPredictionField = stageIndex < 3;
      const legacyKey = `${metric.legacyPrefix}${stage.ordinal}${metric.suffix}`;
      const recommendationKey = `${algorithmGroup}（${metric.label}${stage.algorithmLabel}）`;
      const acceptsLegacyBoolean =
        legacyKey === "ip3rdPressure" || legacyKey === "hp2ndPressure";

      return createField({
        id: `${idPrefix}.${metric.id}.${stage.id}`,
        legacyKey,
        recommendationKey,
        predictionLabel: isPredictionField ? recommendationKey : null,
        groupId,
        rowId: metric.id,
        columnId: stage.id,
        // 现有接口样例在这两个压力字段中包含布尔值；先兼容既有契约，待后端确认后再收紧。
        types: acceptsLegacyBoolean ? ["number", "boolean"] : ["number"],
        requiredFor: isPredictionField ? ["prediction"] : [],
      });
    })
  );
}

const segmentFields = [
  ...createSegmentFields({
    idPrefix: "injection",
    groupId: "injection",
    algorithmGroup: "注射",
    legacyPrefixes: { pressure: "ip", speed: "is", time: "it" },
  }),
  ...createSegmentFields({
    idPrefix: "holding",
    groupId: "holding",
    algorithmGroup: "保压",
    legacyPrefixes: { pressure: "hp", speed: "hs", time: "ht" },
  }),
];

const temperatureFields = [
  createField({
    id: "temperature.nozzle",
    legacyKey: "ntTemperature",
    recommendationKey: "喷嘴（温度）",
    predictionLabel: "喷嘴（温度）",
    aliases: ["喷嘴温度"],
    groupId: "temperature",
    rowId: "heating",
    columnId: "nozzle",
    requiredFor: ["prediction"],
  }),
  ...STAGES.map((stage, index) => {
    const recommendationKey = `温度（${index + 1}段）`;
    return createField({
      id: `temperature.zone${index + 1}`,
      legacyKey: `z${index + 1}tTemperature`,
      recommendationKey,
      predictionLabel: recommendationKey,
      aliases: [`${stage.label}温度`, `${index + 1}段温度`],
      groupId: "temperature",
      rowId: "heating",
      columnId: stage.id,
      requiredFor: ["prediction"],
    });
  }),
];

const moldTemperatureFields = [
  createField({
    id: "moldTemperature.status.mother",
    legacyKey: "mwStatusM",
    recommendationKey: "模温机设备状态母模",
    groupId: "moldTemperature",
    rowId: "machine",
    columnId: "statusMother",
  }),
  createField({
    id: "moldTemperature.outlet.mother",
    legacyKey: "mwTemperatureM",
    recommendationKey: "模温机母模出水口温度",
    predictionLabel: "模温机母模出水口温度",
    groupId: "moldTemperature",
    rowId: "machine",
    columnId: "temperatureMother",
    requiredFor: ["prediction"],
  }),
  createField({
    id: "moldTemperature.status.public",
    legacyKey: "mwStatusF",
    recommendationKey: "模温机设备状态公模",
    groupId: "moldTemperature",
    rowId: "machine",
    columnId: "statusPublic",
  }),
  createField({
    id: "moldTemperature.outlet.public",
    legacyKey: "mwTemperatureF",
    recommendationKey: "模温机公模出水口温度",
    predictionLabel: "模温机公模出水口温度",
    groupId: "moldTemperature",
    rowId: "machine",
    columnId: "temperaturePublic",
    requiredFor: ["prediction"],
  }),
];

const cabinetFields = Array.from({ length: 6 }, (_, cabinetIndex) =>
  BOARD_COLUMNS.map((board, boardIndex) =>
    createField({
      id: `cabinet.${cabinetIndex + 1}.board.${boardIndex + 1}`,
      legacyKey: `wk${cabinetIndex + 1}Kb${boardIndex + 1}Temperature`,
      recommendationKey: `温控箱${cabinetIndex + 1}卡板${boardIndex + 1}温度`,
      groupId: "cabinet",
      rowId: `cabinet${cabinetIndex + 1}`,
      columnId: board.id,
    })
  )
).flat();

export const PARAMETER_FIELDS = Object.freeze(
  [...segmentFields, ...temperatureFields, ...moldTemperatureFields, ...cabinetFields].map(
    field =>
      Object.freeze({
        ...field,
        aliases: Object.freeze([...(field.aliases || [])]),
        types: Object.freeze([...field.types]),
        requiredFor: Object.freeze([...field.requiredFor]),
      })
  )
);

function createIndex(property) {
  const index = Object.create(null);
  PARAMETER_FIELDS.forEach(field => {
    const key = field[property];
    if (key) index[key] = field;
  });
  return Object.freeze(index);
}

export const PARAMETER_FIELD_BY_ID = createIndex("id");
export const PARAMETER_FIELD_BY_LEGACY_KEY = createIndex("legacyKey");
export const PARAMETER_FIELD_BY_RECOMMENDATION_KEY = createIndex("recommendationKey");

function compileRenderGroups() {
  const fieldByPosition = Object.create(null);
  PARAMETER_FIELDS.forEach(field => {
    fieldByPosition[`${field.groupId}:${field.rowId}:${field.columnId}`] = field.id;
  });

  return PARAMETER_LAYOUT.map(group =>
    Object.freeze({
      id: group.id,
      title: group.title,
      layoutRow: group.layoutRow,
      columns: Object.freeze(group.columns.map(column => Object.freeze({ ...column }))),
      rows: Object.freeze(
        group.rows.map(row => {
          const fieldIds = Object.create(null);
          group.columns.forEach(column => {
            fieldIds[column.id] = fieldByPosition[`${group.id}:${row.id}:${column.id}`];
          });
          return Object.freeze({ ...row, fieldIds: Object.freeze(fieldIds) });
        })
      ),
    })
  );
}

export const PARAMETER_RENDER_GROUPS = Object.freeze(compileRenderGroups());

export function assertParameterSchema() {
  const indexes = [
    ["领域 id", "id"],
    ["历史字段", "legacyKey"],
    ["算法字段", "recommendationKey"],
  ];

  indexes.forEach(([label, property]) => {
    const values = PARAMETER_FIELDS.map(field => field[property]);
    if (new Set(values).size !== values.length) {
      throw new Error(`工艺参数 Schema 存在重复${label}`);
    }
  });

  const predictionLabels = PARAMETER_FIELDS.map(field => field.predictionLabel).filter(Boolean);
  if (new Set(predictionLabels).size !== predictionLabels.length) {
    throw new Error("工艺参数 Schema 存在重复预测字段");
  }

  PARAMETER_RENDER_GROUPS.forEach(group => {
    group.rows.forEach(row => {
      group.columns.forEach(column => {
        if (!row.fieldIds[column.id]) {
          throw new Error(`工艺参数 Schema 缺少布局字段：${group.id}/${row.id}/${column.id}`);
        }
      });
    });
  });

  const renderedFieldIds = PARAMETER_RENDER_GROUPS.flatMap(group =>
    group.rows.flatMap(row => group.columns.map(column => row.fieldIds[column.id]))
  );
  if (
    renderedFieldIds.length !== PARAMETER_FIELDS.length ||
    new Set(renderedFieldIds).size !== PARAMETER_FIELDS.length
  ) {
    throw new Error("工艺参数 Schema 的字段定义与表单布局不一致");
  }

  return true;
}

assertParameterSchema();
