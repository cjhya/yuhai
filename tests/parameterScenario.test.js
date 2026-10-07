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
  const localRequire = request => dependencies[request] || require(request);
  const evaluate = new Function("require", "module", "exports", transformed.code);
  evaluate(localRequire, target, target.exports);
  return target.exports;
}

const schemaPath = path.resolve(__dirname, "../src/domain/parameter/parameterSchema.js");
const scenarioPath = path.resolve(__dirname, "../src/domain/parameter/parameterScenario.js");
const schema = loadModule(schemaPath);
const scenario = loadModule(scenarioPath, { "./parameterSchema": schema });

function createForm(revision = 0) {
  return {
    schemaVersion: schema.PARAMETER_SCHEMA_VERSION,
    revision,
    values: schema.PARAMETER_FIELDS.reduce((result, field, index) => {
      result[field.id] = index;
      return result;
    }, Object.create(null)),
  };
}

test("snapshot freezes parameters, context and result at submission time", () => {
  const form = createForm(3);
  const context = { machine: { id: 1, value: "M-01" }, model: "P+RF" };
  const snapshot = scenario.createParameterSnapshot("recommendation", form, {
    context,
    result: { quality: { weight: 10 } },
    createdAt: 100,
    source: { type: "dataset-row", label: "CSV 第 3 行" },
  });

  form.values[schema.PARAMETER_FIELDS[0].id] = 999;
  context.machine.value = "M-02";

  assert.equal(snapshot.values[schema.PARAMETER_FIELDS[0].id], 0);
  assert.equal(snapshot.context.machine.value, "M-01");
  assert.equal(snapshot.createdAt, 100);
  assert.equal(snapshot.source.label, "CSV 第 3 行");
  assert.equal(Object.isFrozen(snapshot.values), true);
  assert.equal(Object.isFrozen(snapshot.context.machine), true);
  assert.equal(Object.isFrozen(snapshot.source), true);
});

test("diff reports only the changed domain field with numeric direction", () => {
  const baseline = createForm(1);
  const working = createForm(2);
  const targetField = schema.PARAMETER_FIELDS[10];
  working.values[targetField.id] = baseline.values[targetField.id] + 5;

  const diff = scenario.compareParameterStates(baseline, working, {
    changedOnly: true,
  });

  assert.equal(diff.length, 1);
  assert.equal(diff[0].fieldId, targetField.id);
  assert.equal(diff[0].numericChange, 5);
  assert.ok(diff[0].groupLabel);
});

test("prediction staleness follows parameter content and production context", () => {
  const form = createForm(1);
  const context = { machine: { id: 1, value: "M-01" }, task: "task-a" };
  const snapshot = scenario.createParameterSnapshot("prediction", form, {
    context,
    createdAt: 100,
  });

  assert.equal(scenario.isParameterSnapshotStale(snapshot, form, context), false);
  assert.deepEqual(scenario.getParameterSnapshotStaleReasons(snapshot, form, context), []);

  const edited = createForm(2);
  edited.values[schema.PARAMETER_FIELDS[0].id] = -1;
  assert.equal(scenario.isParameterSnapshotStale(snapshot, edited, context), true);
  assert.deepEqual(
    scenario.getParameterSnapshotStaleReasons(snapshot, edited, context),
    ["parameters-changed"]
  );
  assert.equal(
    scenario.isParameterSnapshotStale(snapshot, form, {
      ...context,
      task: "task-b",
    }),
    true
  );
  assert.deepEqual(
    scenario.getParameterSnapshotStaleReasons(snapshot, edited, {
      ...context,
      task: "task-b",
    }),
    ["parameters-changed", "context-changed"]
  );
});

test("restoring a snapshot creates a new editable revision with the same values", () => {
  const form = createForm(4);
  const snapshot = scenario.createParameterSnapshot("baseline", form, {
    context: {},
    createdAt: 100,
  });
  const edited = createForm(8);
  edited.values[schema.PARAMETER_FIELDS[0].id] = 500;

  const restored = scenario.restoreParameterSnapshot(snapshot, edited);

  assert.equal(restored.revision, 9);
  assert.equal(restored.values[schema.PARAMETER_FIELDS[0].id], 0);
  assert.equal(
    scenario.createParameterFingerprint(restored),
    snapshot.parameterFingerprint
  );
});
