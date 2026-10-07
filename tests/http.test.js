const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const babel = require("@babel/core");

const HTTP_MODULE_PATH = path.resolve(__dirname, "../src/utils/http.js");

function loadHttpModule() {
  const source = fs.readFileSync(HTTP_MODULE_PATH, "utf8");
  const transformed = babel.transformSync(source, {
    filename: HTTP_MODULE_PATH,
    babelrc: false,
    configFile: false,
    plugins: ["@babel/plugin-transform-modules-commonjs"],
  });
  const httpModule = { exports: {} };

  const evaluate = new Function(
    "require",
    "module",
    "exports",
    transformed.code
  );
  evaluate(require, httpModule, httpModule.exports);
  return httpModule.exports;
}

const http = loadHttpModule();

function mockAdapter(data, status = 200) {
  return config =>
    Promise.resolve({
      data,
      status,
      statusText: status === 200 ? "OK" : "ERROR",
      headers: {},
      config,
      request: {},
    });
}

test("Axios errors are normalized without losing service and request metadata", () => {
  const requestConfig = { metadata: { requestId: "request-1" } };
  const timeout = http.normalizeApiError(
    { code: "ECONNABORTED", config: requestConfig },
    "business"
  );
  assert.equal(timeout.kind, http.API_ERROR_KIND.TIMEOUT);
  assert.equal(timeout.service, "business");
  assert.equal(timeout.requestId, "request-1");
  assert.equal(timeout.retryable, true);

  const network = http.normalizeApiError(
    { request: {}, config: requestConfig },
    "business"
  );
  assert.equal(network.kind, http.API_ERROR_KIND.NETWORK);
  assert.equal(network.retryable, true);

  const serverError = http.normalizeApiError(
    {
      response: { status: 503, data: { message: "service unavailable" } },
      config: requestConfig,
    },
    "algorithm"
  );
  assert.equal(serverError.kind, http.API_ERROR_KIND.HTTP);
  assert.equal(serverError.service, "algorithm");
  assert.equal(serverError.httpStatus, 503);
  assert.equal(serverError.message, "service unavailable");
  assert.equal(serverError.retryable, true);

  const canceled = http.normalizeApiError(
    { code: "ERR_CANCELED", config: requestConfig },
    "algorithm"
  );
  assert.equal(canceled.kind, http.API_ERROR_KIND.CANCEL);
  assert.equal(http.isCanceledError(canceled), true);
});

test("invalid JSON is exposed as a typed response-contract error", () => {
  assert.throws(
    () =>
      http.parseJsonResponse("not-json", {
        service: "algorithm",
        message: "invalid algorithm payload",
      }),
    error => {
      assert.equal(error.kind, http.API_ERROR_KIND.INVALID_RESPONSE);
      assert.equal(error.service, "algorithm");
      assert.equal(error.message, "invalid algorithm payload");
      return true;
    }
  );
});

test("HTTP clients attach request metadata, unwrap data, and enforce validators", async () => {
  const client = http.createHttpClient({
    service: "algorithm",
    baseURL: "http://algorithm.test",
    timeout: 1000,
  });
  let adapterConfig;
  const validData = { result: "ok" };

  const result = await client.get("/valid", {
    adapter: config => {
      adapterConfig = config;
      return mockAdapter(validData)(config);
    },
    validateData: data => data && data.result === "ok",
  });

  assert.deepEqual(result, validData);
  assert.equal(typeof adapterConfig.metadata.requestId, "string");
  assert.equal(typeof adapterConfig.metadata.startedAt, "number");

  await assert.rejects(
    client.get("/invalid", {
      adapter: mockAdapter({ unexpected: true }),
      validateData: data => Boolean(data && data.result),
    }),
    error => {
      assert.equal(error.kind, http.API_ERROR_KIND.INVALID_RESPONSE);
      assert.equal(error.service, "algorithm");
      assert.equal(typeof error.requestId, "string");
      return true;
    }
  );
});
