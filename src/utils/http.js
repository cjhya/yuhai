/* global globalThis */
import axios from "axios";

export const API_ERROR_KIND = Object.freeze({
  CANCEL: "cancel",
  TIMEOUT: "timeout",
  NETWORK: "network",
  HTTP: "http",
  BUSINESS: "business",
  INVALID_RESPONSE: "invalid-response",
  UNKNOWN: "unknown",
});

export class ApiError extends Error {
  constructor({
    kind = API_ERROR_KIND.UNKNOWN,
    service = "unknown",
    message = "请求失败",
    code,
    httpStatus,
    businessCode,
    requestId,
    retryable = false,
    cause,
  } = {}) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.service = service;
    this.code = code;
    this.httpStatus = httpStatus;
    this.businessCode = businessCode;
    this.requestId = requestId;
    this.retryable = retryable;
    this.cause = cause;
  }
}

function createRequestId() {
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function getResponseMessage(data, fallback) {
  if (data && typeof data === "object") {
    return data.message || data.msg || fallback;
  }
  return typeof data === "string" && data ? data : fallback;
}

function isRetryableStatus(status) {
  return status === 408 || status === 429 || status >= 500;
}

export function toPositiveNumber(value, fallback) {
  const result = Number(value);
  return Number.isFinite(result) && result > 0 ? result : fallback;
}

export function normalizeApiError(error, service = "unknown") {
  if (error instanceof ApiError) {
    return error;
  }

  const config = error && error.config;
  const requestId = config && config.metadata && config.metadata.requestId;
  const code = error && error.code;

  if (axios.isCancel(error) || code === "ERR_CANCELED") {
    return new ApiError({
      kind: API_ERROR_KIND.CANCEL,
      service,
      message: "请求已取消",
      code,
      requestId,
      cause: error,
    });
  }

  if (code === "ECONNABORTED" || code === "ETIMEDOUT") {
    return new ApiError({
      kind: API_ERROR_KIND.TIMEOUT,
      service,
      message: "请求超时，请稍后重试",
      code,
      requestId,
      retryable: true,
      cause: error,
    });
  }

  if (error && error.response) {
    const status = error.response.status;
    return new ApiError({
      kind: API_ERROR_KIND.HTTP,
      service,
      message: getResponseMessage(error.response.data, `请求失败（${status}）`),
      code,
      httpStatus: status,
      requestId,
      retryable: isRetryableStatus(status),
      cause: error,
    });
  }

  if (error && error.request) {
    return new ApiError({
      kind: API_ERROR_KIND.NETWORK,
      service,
      message: "网络连接失败，请检查网络后重试",
      code,
      requestId,
      retryable: true,
      cause: error,
    });
  }

  return new ApiError({
    kind: API_ERROR_KIND.UNKNOWN,
    service,
    message: (error && error.message) || "请求失败",
    code,
    requestId,
    cause: error,
  });
}

export function isCanceledError(error) {
  return Boolean(
    error &&
      (error.kind === API_ERROR_KIND.CANCEL ||
        error.code === "ERR_CANCELED" ||
        axios.isCancel(error))
  );
}

export function getApiErrorMessage(error, fallback = "请求失败，请稍后重试") {
  return error instanceof ApiError && error.message ? error.message : fallback;
}

export function parseJsonResponse(
  value,
  { service = "unknown", message = "服务响应格式不正确" } = {}
) {
  try {
    return JSON.parse(value);
  } catch (cause) {
    throw new ApiError({
      kind: API_ERROR_KIND.INVALID_RESPONSE,
      service,
      message,
      cause,
    });
  }
}

export function createHttpClient({
  service,
  baseURL,
  timeout,
  headers,
  sendRequestId = false,
  adapter,
}) {
  const client = axios.create({
    baseURL,
    timeout,
    ...(adapter ? { adapter } : {}),
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      ...headers,
    },
  });

  client.interceptors.request.use(
    config => {
      const requestId = createRequestId();
      config.metadata = {
        ...(config.metadata || {}),
        requestId,
        startedAt: Date.now(),
      };

      // 自定义请求头需要后端 CORS 放行，因此默认只在客户端记录。
      if (sendRequestId) {
        config.headers["X-Request-ID"] = requestId;
      }

      return config;
    },
    error => Promise.reject(normalizeApiError(error, service))
  );

  client.interceptors.response.use(
    response => {
      const data = response.data;
      const { validateData, getBusinessError } = response.config;

      if (typeof validateData === "function" && !validateData(data)) {
        throw new ApiError({
          kind: API_ERROR_KIND.INVALID_RESPONSE,
          service,
          message: "服务响应格式不正确",
          requestId: response.config.metadata && response.config.metadata.requestId,
        });
      }

      if (typeof getBusinessError === "function") {
        const businessError = getBusinessError(data);
        if (businessError) {
          throw new ApiError({
            kind: API_ERROR_KIND.BUSINESS,
            service,
            message: businessError.message || "业务处理失败",
            businessCode: businessError.code,
            requestId: response.config.metadata && response.config.metadata.requestId,
          });
        }
      }

      return data;
    },
    error => Promise.reject(normalizeApiError(error, service))
  );

  return client;
}
