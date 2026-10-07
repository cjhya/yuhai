const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const babel = require("@babel/core");
const { parseComponent } = require("vue-template-compiler");

const COMPONENT_PATH = path.resolve(
  __dirname,
  "../src/components/DebouncedSelect.vue"
);

const API_ERROR_KIND = Object.freeze({
  CANCEL: "cancel",
  INVALID_RESPONSE: "invalid-response",
});

class ApiError extends Error {
  constructor({ kind, service, message, code }) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.service = service;
    this.code = code;
  }
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function loadComponent(getRequest) {
  const source = fs.readFileSync(COMPONENT_PATH, "utf8");
  const descriptor = parseComponent(source);
  const transformed = babel.transformSync(descriptor.script.content, {
    filename: COMPONENT_PATH,
    babelrc: false,
    configFile: false,
    plugins: ["@babel/plugin-transform-modules-commonjs"],
  });
  const componentModule = { exports: {} };

  function localRequire(request) {
    if (request === "lodash") {
      return require("lodash");
    }
    if (request === "@/api/user") {
      return { getRequest };
    }
    if (request === "@/utils/http") {
      return {
        API_ERROR_KIND,
        ApiError,
        getApiErrorMessage: (error, fallback) =>
          (error && error.message) || fallback,
        isCanceledError: error =>
          Boolean(
            error &&
              (error.kind === API_ERROR_KIND.CANCEL ||
                error.code === "ERR_CANCELED")
          ),
      };
    }
    throw new Error(`Unexpected import in DebouncedSelect: ${request}`);
  }

  const evaluate = new Function(
    "require",
    "module",
    "exports",
    transformed.code
  );
  evaluate(localRequire, componentModule, componentModule.exports);
  return componentModule.exports.default;
}

function mountComponent(getRequest) {
  const component = loadComponent(getRequest);
  const emitted = [];
  const props = {
    value: null,
    apiUrl: "/machine/list",
    placeholder: "请选择",
    $emit: (...args) => emitted.push(args),
  };
  const vm = {
    ...props,
    ...component.data.call(props),
  };

  Object.entries(component.methods).forEach(([name, method]) => {
    vm[name] = method.bind(vm);
  });
  component.created.call(vm);

  return {
    component,
    emitted,
    vm,
    destroy: () => component.beforeDestroy.call(vm),
  };
}

test("overlapping queries share one list request and only the latest query commits", async () => {
  const response = deferred();
  let requestCount = 0;
  const { vm } = mountComponent(() => {
    requestCount += 1;
    return response.promise;
  });

  const focusLoad = vm.remoteMethod("");
  const latestQuery = vm.remoteMethod("beta");
  assert.equal(requestCount, 1);

  response.resolve({
    data: [
      { id: 1, value: "Alpha" },
      { id: 2, value: "Beta" },
    ],
  });
  await Promise.all([focusLoad, latestQuery]);

  assert.equal(requestCount, 1);
  assert.deepEqual(vm.options, [{ id: 2, value: "Beta" }]);
  assert.equal(vm.currentQuery, "beta");
  assert.equal(vm.loading, false);
  assert.equal(vm.loadError, null);
});

test("loaded options are reused for later queries and clear operations", async () => {
  let requestCount = 0;
  const { vm } = mountComponent(async () => {
    requestCount += 1;
    return {
      data: [
        { id: 1, value: "Alpha" },
        { id: 2, value: "Beta" },
      ],
    };
  });

  await vm.remoteMethod("");
  await vm.remoteMethod("alpha");
  assert.deepEqual(vm.options, [{ id: 1, value: "Alpha" }]);

  await vm.remoteMethod("beta");
  assert.deepEqual(vm.options, [{ id: 2, value: "Beta" }]);

  await vm.remoteMethod("");
  assert.equal(vm.options.length, 2);
  assert.equal(requestCount, 1);
});

test("destroy aborts the pending request without emitting a user-facing error", async () => {
  const response = deferred();
  let requestSignal;
  const { destroy, emitted, vm } = mountComponent((url, params, config) => {
    requestSignal = config.signal;
    return response.promise;
  });

  const pendingLoad = vm.remoteMethod("");
  destroy();
  assert.equal(requestSignal.aborted, true);

  response.resolve({ data: [{ id: 1, value: "Alpha" }] });
  await pendingLoad;

  assert.equal(vm.hasData, false);
  assert.equal(emitted.some(([event]) => event === "error"), false);
});
