export const STALE_REQUEST_CODE = "ERR_STALE_REQUEST";

export class StaleRequestError extends Error {
  constructor(cause) {
    super("请求结果已过期");
    this.name = "StaleRequestError";
    this.code = STALE_REQUEST_CODE;
    this.cause = cause;
  }
}

function createAbortController() {
  if (typeof AbortController === "function") {
    return new AbortController();
  }

  return {
    signal: undefined,
    abort() {},
  };
}

export function isRequestCanceled(error) {
  return Boolean(
    error &&
      (error.code === STALE_REQUEST_CODE ||
        error.code === "ERR_CANCELED" ||
        error.kind === "cancel")
  );
}

export class LatestRequestCoordinator {
  constructor() {
    this.requests = new Map();
    this.disposed = false;
  }

  run(key, executor) {
    if (this.disposed) {
      return Promise.reject(new StaleRequestError());
    }

    const previous = this.requests.get(key);
    if (previous) {
      previous.controller.abort();
    }

    const entry = {
      controller: createAbortController(),
      sequence: previous ? previous.sequence + 1 : 1,
    };
    this.requests.set(key, entry);

    const isLatest = () => this.requests.get(key) === entry && !this.disposed;

    return Promise.resolve()
      .then(() =>
        executor({
          signal: entry.controller.signal,
          sequence: entry.sequence,
        })
      )
      .then(
        result => {
          if (!isLatest()) {
            throw new StaleRequestError();
          }
          return result;
        },
        error => {
          if (!isLatest()) {
            throw new StaleRequestError(error);
          }
          throw error;
        }
      )
      .finally(() => {
        if (isLatest()) {
          this.requests.delete(key);
        }
      });
  }

  cancel(key) {
    const entry = this.requests.get(key);
    if (!entry) return;

    this.requests.delete(key);
    entry.controller.abort();
  }

  cancelAll() {
    const entries = Array.from(this.requests.values());
    this.requests.clear();
    entries.forEach(entry => entry.controller.abort());
  }

  dispose() {
    this.disposed = true;
    this.cancelAll();
  }
}

export function createLatestRequestCoordinator() {
  return new LatestRequestCoordinator();
}
