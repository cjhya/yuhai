const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const babel = require("@babel/core");

function loadModule(filePath, dependencies = {}) {
  const source = fs.readFileSync(filePath, "utf8");
  const transformed = babel.transformSync(source, {
    filename: filePath,
    babelrc: false,
    configFile: false,
    plugins: ["@babel/plugin-transform-modules-commonjs"],
  });
  const target = { exports: {} };
  const localRequire = request => {
    if (dependencies[request]) return dependencies[request];
    return require(request);
  };
  const evaluate = new Function("require", "module", "exports", transformed.code);
  evaluate(localRequire, target, target.exports);
  return target.exports;
}

const schemaPath = path.resolve(__dirname, "../src/domain/parameter/parameterSchema.js");
const transformPath = path.resolve(__dirname, "../src/domain/parameter/parameterTransform.js");
const defaultParametersPath = path.resolve(__dirname, "../src/assets/data/params.js");
const recommendationFixturePath = path.resolve(
  __dirname,
  "../src/assets/data/parameter.json"
);
const schema = loadModule(schemaPath);
const transform = loadModule(transformPath, { "./parameterSchema": schema });
const defaultParameters = loadModule(defaultParametersPath).default;
const recommendationFixture = JSON.parse(
  fs.readFileSync(recommendationFixturePath, "utf8")
);

function createCompleteLegacyDto() {
  const dto = {};
  schema.PARAMETER_FIELDS.forEach((field, index) => {
    dto[field.legacyKey] = index + 0.25;
  });
  dto.ip3rdPressure = true;
  dto.hp2ndPressure = false;
  return dto;
}

test("schema covers 76 unique domain, history and recommendation fields", () => {
  assert.equal(schema.PARAMETER_FIELDS.length, 76);
  assert.equal(new Set(schema.PARAMETER_FIELDS.map(field => field.id)).size, 76);
  assert.equal(new Set(schema.PARAMETER_FIELDS.map(field => field.legacyKey)).size, 76);
  assert.equal(new Set(schema.PARAMETER_FIELDS.map(field => field.recommendationKey)).size, 76);
  assert.equal(schema.assertParameterSchema(), true);
});

test("current default and recommendation fixtures are accepted by the schema", () => {
  const defaultConversion = transform.fromLegacyParameterDto(defaultParameters);
  const defaultValidation = transform.validateParameterForm(
    defaultConversion.form,
    { target: "prediction" }
  );
  const recommendationConversion = transform.fromRecommendationParameterDto(
    recommendationFixture
  );
  const recommendationValidation = transform.validateParameterForm(
    recommendationConversion.form
  );

  assert.equal(Object.keys(defaultParameters).length, 64);
  assert.equal(Object.keys(defaultConversion.form.values).length, 76);
  assert.equal(
    schema.PARAMETER_FIELDS.filter(
      field => !Object.prototype.hasOwnProperty.call(defaultParameters, field.legacyKey)
    ).length,
    12
  );
  assert.equal(
    Object.values(defaultConversion.form.values).filter(value => value === null).length,
    18
  );
  assert.equal(defaultValidation.valid, true);
  assert.equal(recommendationConversion.issues.length, 0);
  assert.equal(recommendationValidation.valid, true);
});

test("legacy DTO round trip preserves normalized values without mutating input", () => {
  const source = createCompleteLegacyDto();
  const frozenSource = Object.freeze({ ...source });
  const converted = transform.fromLegacyParameterDto(frozenSource);
  const validation = transform.validateParameterForm(converted.form);

  assert.equal(converted.issues.length, 0);
  assert.equal(validation.valid, true);
  assert.deepEqual({ ...transform.toLegacyParameterDto(validation.value) }, source);
  assert.deepEqual(frozenSource, source);
});

test("fourth/fifth injection times and cabinet 5/6 stay independent", () => {
  const source = createCompleteLegacyDto();
  source.it4rdTime = 4.4;
  source.it5rdTime = 5.5;
  source.wk5Kb1Temperature = 51;
  source.wk6Kb1Temperature = 61;

  const validation = transform.validateParameterForm(
    transform.fromLegacyParameterDto(source).form
  );
  const result = transform.toLegacyParameterDto(validation.value);

  assert.equal(result.it4rdTime, 4.4);
  assert.equal(result.it5rdTime, 5.5);
  assert.equal(result.wk5Kb1Temperature, 51);
  assert.equal(result.wk6Kb1Temperature, 61);
});

test("strict parsing rejects partial numbers and non-finite values while preserving zero and false", () => {
  let form = transform.fromLegacyParameterDto(createCompleteLegacyDto()).form;
  form = transform.updateParameterForm(form, "injection.speed.stage1", "12abc");
  form = transform.updateParameterForm(form, "holding.speed.stage1", "Infinity");
  form = transform.updateParameterForm(form, "injection.time.stage1", "0");
  form = transform.updateParameterForm(form, "holding.pressure.stage2", "false");

  const validation = transform.validateParameterForm(form);
  assert.equal(validation.valid, false);
  assert.equal(validation.errors["injection.speed.stage1"][0].code, "INVALID_TYPE");
  assert.equal(validation.errors["holding.speed.stage1"][0].code, "INVALID_TYPE");
  assert.equal(validation.value.values["injection.time.stage1"], 0);
  assert.equal(validation.value.values["holding.pressure.stage2"], false);
});

test("recommendation aliases convert to the same canonical form", () => {
  const legacy = createCompleteLegacyDto();
  const legacyValidation = transform.validateParameterForm(
    transform.fromLegacyParameterDto(legacy).form
  );
  const recommendationDto = transform.toRecommendationParameterDto(legacyValidation.value);
  const recommendationValidation = transform.validateParameterForm(
    transform.fromRecommendationParameterDto(recommendationDto).form
  );

  assert.equal(recommendationValidation.valid, true);
  assert.deepEqual(
    { ...transform.toLegacyParameterDto(recommendationValidation.value) },
    legacy
  );
});

test("a selected dataset row becomes an explicit partial baseline without inheriting hidden defaults", () => {
  const converted = transform.fromDatasetParameterRow({
    批次: "B-001",
    注射压力三段: "118.5",
    喷嘴温度: "265",
    一段温度: "258.5",
  });

  assert.deepEqual(converted.matchedFieldIds, [
    "injection.pressure.stage3",
    "temperature.nozzle",
    "temperature.zone1",
  ]);
  assert.deepEqual(converted.unmatchedColumns, ["批次"]);
  assert.equal(converted.form.values["injection.pressure.stage3"], 118.5);
  assert.equal(converted.form.values["temperature.nozzle"], 265);
  assert.equal(converted.form.values["temperature.zone1"], 258.5);
  assert.equal(converted.form.values["holding.pressure.stage1"], null);
  assert.equal(converted.issues.length, 0);
});

test("dataset baseline reports duplicate aliases instead of silently overwriting a parameter", () => {
  const converted = transform.fromDatasetParameterRow({
    ip3rdPressure: "110",
    注射压力三段: "120",
  });

  assert.equal(converted.matchedFieldIds.length, 1);
  assert.deepEqual(converted.duplicateColumns, ["注射压力三段"]);
  assert.equal(converted.form.values["injection.pressure.stage3"], 110);
  assert.equal(converted.issues[0].code, "DUPLICATE_PARAMETER_COLUMN");
});

test("prediction DTO contains the existing 26 fields and reflects form edits", () => {
  const form = transform.fromLegacyParameterDto(createCompleteLegacyDto()).form;
  const baselineValidation = transform.validateParameterForm(form, { target: "prediction" });
  const baselineDto = transform.toPredictionParameterDto(baselineValidation.value);
  const changedForm = transform.updateParameterForm(
    form,
    "injection.pressure.stage1",
    "120"
  );
  const validation = transform.validateParameterForm(changedForm, { target: "prediction" });
  const predictionDto = transform.toPredictionParameterDto(validation.value);
  const changedEntries = predictionDto.filter(
    (entry, index) =>
      entry.label !== baselineDto[index].label || entry.value !== baselineDto[index].value
  );

  assert.equal(validation.valid, true);
  assert.equal(predictionDto.length, 26);
  assert.deepEqual(predictionDto[0], { label: "注射（压力一段）", value: 120 });
  assert.deepEqual(changedEntries, [
    { label: "注射（压力一段）", value: 120 },
  ]);
});

test("unknown external fields are reported and cannot enter canonical values", () => {
  const converted = transform.fromLegacyParameterDto({
    ip1stPressure: 10,
    __unexpected: 20,
  });
  assert.equal(converted.issues.length, 1);
  assert.equal(converted.issues[0].code, "UNKNOWN_FIELD");
  assert.equal(Object.prototype.hasOwnProperty.call(converted.form.values, "__unexpected"), false);
});
