const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const babel = require("@babel/core");

function loadModule(relativePath) {
  const filePath = path.resolve(__dirname, relativePath);
  const source = fs.readFileSync(filePath, "utf8");
  const transformed = babel.transformSync(source, {
    filename: filePath,
    babelrc: false,
    configFile: false,
    plugins: ["@babel/plugin-transform-modules-commonjs"],
  });
  const target = { exports: {} };
  new Function("require", "module", "exports", transformed.code)(require, target, target.exports);
  return target.exports;
}

const demoMode = loadModule("../src/demo/demoMode.js");
const demoDataset = loadModule("../src/demo/demoDataset.js");

test("demo mode is enabled by default and can be explicitly disabled", () => {
  assert.equal(demoMode.isDemoModeEnabled({}), true);
  assert.equal(demoMode.isDemoModeEnabled({ VUE_APP_DEMO_MODE: "true" }), true);
  assert.equal(demoMode.isDemoModeEnabled({ VUE_APP_DEMO_MODE: "false" }), false);
});

test("demo CSV is deterministic and contains enough rows for both import flows", () => {
  const first = demoDataset.createDemoCsvText(12);
  const second = demoDataset.createDemoCsvText(12);
  assert.equal(first, second);
  assert.equal(first.split("\n").length, 13);
  assert.match(first, /注射压力三段/);
  assert.match(first, /实测B边变形/);
  assert.match(first, /DEMO-012/);
});

