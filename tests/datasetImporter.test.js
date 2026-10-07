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
    if (Object.prototype.hasOwnProperty.call(dependencies, request)) {
      return dependencies[request];
    }
    return require(request);
  };
  const evaluate = new Function("require", "module", "exports", transformed.code);
  evaluate(localRequire, target, target.exports);
  return target.exports;
}

const schemaPath = path.resolve(__dirname, "../src/domain/dataset/datasetSchema.js");
const importerPath = path.resolve(__dirname, "../src/domain/dataset/datasetImporter.js");
const repositoryPath = path.resolve(__dirname, "../src/domain/dataset/datasetRepository.js");
const schema = loadModule(schemaPath);
const importer = loadModule(importerPath, {
  "./datasetSchema": schema,
  papaparse: require("papaparse"),
});
const repository = loadModule(repositoryPath);

function importText(csv, options = {}) {
  return importer.createCsvImportTask(csv, {
    fileName: "fixture.csv",
    ...options,
  }).promise;
}

test("typed schema validates rows while preview stays bounded", async () => {
  const typedSchema = schema.createDatasetSchema({
    id: "typed-fixture",
    columns: [
      { key: "batchCode", type: "string", required: true, nullable: false },
      { key: "pressure", type: "number", required: true, nullable: false, min: 0, max: 100 },
      { key: "enabled", type: "boolean", required: true, nullable: false },
    ],
    unknownColumnPolicy: "reject",
  });
  const result = await importText(
    "batchCode,pressure,enabled\n00123,12.5,TRUE\nA-2,20,false\n",
    { schema: typedSchema, previewRows: 1 }
  );

  assert.equal(result.rows.length, 2);
  assert.equal(result.previewRows.length, 1);
  assert.equal(result.rows[0].batchCode, "00123");
  assert.equal(result.rows[0].pressure, 12.5);
  assert.equal(result.rows[0].enabled, true);
  assert.equal(result.descriptor.rowCount, 2);
  assert.equal(result.descriptor.columnCount, 3);
  assert.equal(Object.prototype.hasOwnProperty.call(result.descriptor, "rows"), false);
});

test("generic schema uses conservative inference without damaging identifiers or dates", async () => {
  const result = await importText(
    "code,value,createdAt\n00123,12.5,2026-08-26T10:00:00Z\n"
  );

  assert.equal(result.rows[0].code, "00123");
  assert.equal(result.rows[0].value, 12.5);
  assert.equal(result.rows[0].createdAt, "2026-08-26T10:00:00Z");
});

test("duplicate and missing required headers are rejected with structured issues", async () => {
  const requiredSchema = schema.createDatasetSchema({
    id: "required-fixture",
    columns: [
      { key: "feature", required: true },
      { key: "label", required: true },
    ],
  });

  await assert.rejects(
    importText("feature,feature\n1,2\n", { schema: requiredSchema }),
    error => {
      assert.equal(error.code, "HEADER_VALIDATION_FAILED");
      assert.ok(error.details.issues.countsByCode.DUPLICATE_HEADER >= 1);
      assert.equal(error.details.issues.countsByCode.REQUIRED_COLUMN_MISSING, 1);
      return true;
    }
  );
});

test("row errors include positions and keep issue samples bounded", async () => {
  const numberSchema = schema.createDatasetSchema({
    id: "number-fixture",
    columns: [{ key: "pressure", type: "number", required: true, nullable: false }],
    unknownColumnPolicy: "reject",
  });

  await assert.rejects(
    importText("pressure\nNaN\nInfinity\n", {
      schema: numberSchema,
      maxIssueSamples: 1,
    }),
    error => {
      assert.equal(error.code, "DATASET_VALIDATION_FAILED");
      assert.equal(error.details.issues.errorCount, 2);
      assert.equal(error.details.issues.samples.length, 1);
      assert.equal(error.details.issues.truncated, true);
      assert.equal(error.details.issues.samples[0].row, 2);
      return true;
    }
  );
});

test("parser errors keep the correct physical row across chunks", async () => {
  await assert.rejects(
    importText("a,b\n1,2\n3\n4,5\n", { chunkSize: 6 }),
    error => {
      const mismatch = error.details.issues.samples.find(
        issue => issue.code === "CSV_TOOFEWFIELDS"
      );
      assert.ok(mismatch);
      assert.equal(mismatch.row, 3);
      return true;
    }
  );
});

test("file, row and cell budgets fail before unbounded retention", async () => {
  await assert.rejects(
    importText("a\n1\n", { maxFileBytes: 2 }),
    error => error.code === "FILE_TOO_LARGE"
  );

  await assert.rejects(
    importText("a\n1\n2\n", { maxRows: 1 }),
    error => error.code === "TOO_MANY_ROWS"
  );

  await assert.rejects(
    importText("a,b\n1,2\n", { maxCells: 1 }),
    error => error.code === "TOO_MANY_CELLS"
  );
});

test("empty files and dangerous headers are rejected", async () => {
  await assert.rejects(
    importText(""),
    error => error.code === "EMPTY_FILE"
  );
  await assert.rejects(
    importText("__proto__,value\nunsafe,1\n"),
    error => {
      assert.equal(error.code, "HEADER_VALIDATION_FAILED");
      assert.equal(error.details.issues.countsByCode.UNSAFE_HEADER, 1);
      return true;
    }
  );
});

test("cancelled asynchronous imports cannot publish a result", async () => {
  let parserAborted = false;
  const fakePapa = {
    parse(input, config) {
      setTimeout(() => {
        const parser = { abort() { parserAborted = true; } };
        config.chunk({
          data: [{ value: "1" }],
          errors: [],
          meta: { fields: ["value"], cursor: input.length },
        }, parser);
        if (!parserAborted) config.complete();
      }, 5);
    },
  };
  const asyncImporter = loadModule(importerPath, {
    "./datasetSchema": schema,
    papaparse: fakePapa,
  });
  const task = asyncImporter.createCsvImportTask("value\n1\n", {
    fileName: "async.csv",
  });
  task.cancel();

  await assert.rejects(task.promise, error => error.code === "IMPORT_CANCELLED");
  await new Promise(resolve => setTimeout(resolve, 15));
  assert.equal(parserAborted, true);
});

test("repository retains full rows outside Vue state and releases them explicitly", async () => {
  repository.clearDatasetRepository();
  const result = await importText("a\n1\n2\n", { previewRows: 1 });
  const handle = repository.registerDataset(result);

  assert.deepEqual(handle, { kind: "memory", importId: result.importId });
  assert.equal(repository.getDatasetRows(result.importId).length, 2);
  assert.equal(repository.getDatasetDescriptor(result.importId).previewRowCount, 1);
  assert.equal(repository.releaseDataset(result.importId), true);
  assert.equal(repository.getDatasetRows(result.importId), null);
});
