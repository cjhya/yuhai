import { isTerminalTrainingJobStatus } from "./trainingWorkflow";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function defaultController() {
  return typeof AbortController === "function"
    ? new AbortController()
    : { signal: undefined, abort() {} };
}

export class TrainingJobPoller {
  constructor(options = {}) {
    if (typeof options.fetchJob !== "function") {
      throw new TypeError("TrainingJobPoller requires fetchJob");
    }
    this.fetchJob = options.fetchJob;
    this.onUpdate = options.onUpdate || (() => {});
    this.onError = options.onError || (() => {});
    this.onFatalError = options.onFatalError || this.onError;
    // 浏览器原生计时器依赖 window 作为调用上下文，不能直接保存后再以对象方法调用。
    this.setTimer = options.setTimer || ((handler, delay) => setTimeout(handler, delay));
    this.clearTimer = options.clearTimer || (timer => clearTimeout(timer));
    this.random = options.random || Math.random;
    this.minDelayMs = options.minDelayMs || 2000;
    this.maxDelayMs = options.maxDelayMs || 30000;
    this.hiddenDelayMs = options.hiddenDelayMs || 30000;
    this.maxConsecutiveFailures = options.maxConsecutiveFailures || 8;
    this.visibilityTarget = options.visibilityTarget || (
      typeof document !== "undefined" ? document : null
    );
    this.onlineTarget = options.onlineTarget || (
      typeof window !== "undefined" ? window : null
    );
    this.timer = null;
    this.controller = null;
    this.jobId = null;
    this.token = 0;
    this.failures = 0;
    this.failureLimitNotified = false;
    this.running = false;
    this.handleVisibility = this.handleVisibility.bind(this);
    this.handleOnline = this.handleOnline.bind(this);
  }

  start(jobId) {
    if (!jobId) throw new TypeError("jobId is required");
    if (this.running && this.jobId === jobId) return;
    this.stop();
    this.jobId = jobId;
    this.running = true;
    this.failures = 0;
    this.failureLimitNotified = false;
    this.token += 1;
    if (this.visibilityTarget && this.visibilityTarget.addEventListener) {
      this.visibilityTarget.addEventListener("visibilitychange", this.handleVisibility);
    }
    if (this.onlineTarget && this.onlineTarget.addEventListener) {
      this.onlineTarget.addEventListener("online", this.handleOnline);
    }
    this.schedule(0, this.token);
  }

  stop() {
    this.running = false;
    this.jobId = null;
    this.token += 1;
    if (this.timer !== null) this.clearTimer(this.timer);
    this.timer = null;
    if (this.controller) this.controller.abort();
    this.controller = null;
    if (this.visibilityTarget && this.visibilityTarget.removeEventListener) {
      this.visibilityTarget.removeEventListener("visibilitychange", this.handleVisibility);
    }
    if (this.onlineTarget && this.onlineTarget.removeEventListener) {
      this.onlineTarget.removeEventListener("online", this.handleOnline);
    }
  }

  schedule(delay, token = this.token) {
    if (!this.running || token !== this.token) return;
    if (this.timer !== null) this.clearTimer(this.timer);
    this.timer = this.setTimer(() => {
      this.timer = null;
      return this.tick(token);
    }, delay);
  }

  nextDelay(job) {
    const serverDelay = Number(job && job.pollAfterMs);
    const base = Number.isFinite(serverDelay)
      ? clamp(serverDelay, this.minDelayMs, this.maxDelayMs)
      : this.minDelayMs;
    const hidden = this.visibilityTarget && this.visibilityTarget.visibilityState === "hidden";
    const jitter = 0.85 + this.random() * 0.3;
    const jitteredDelay = base * jitter;
    const finalDelay = hidden
      ? Math.max(jitteredDelay, this.hiddenDelayMs)
      : jitteredDelay;
    return Math.round(clamp(finalDelay, this.minDelayMs, this.maxDelayMs));
  }

  retryDelay() {
    const exponential = this.minDelayMs * (2 ** Math.max(0, this.failures - 1));
    const jitter = 0.5 + this.random() * 0.5;
    return Math.round(clamp(exponential * jitter, this.minDelayMs, this.maxDelayMs));
  }

  async tick(token) {
    if (!this.running || token !== this.token || !this.jobId) return;
    const jobId = this.jobId;
    const controller = defaultController();
    this.controller = controller;
    try {
      const job = await this.fetchJob(jobId, { signal: controller.signal });
      if (!this.running || token !== this.token || jobId !== this.jobId) return;
      this.controller = null;
      this.failures = 0;
      this.failureLimitNotified = false;
      await this.onUpdate(job);
      if (!this.running || token !== this.token) return;
      if (isTerminalTrainingJobStatus(job.status)) {
        this.stop();
        return;
      }
      this.schedule(this.nextDelay(job), token);
    } catch (error) {
      if (!this.running || token !== this.token || (error && error.kind === "cancel")) return;
      this.controller = null;
      this.failures += 1;
      const fatal = error && error.retryable === false;
      if (fatal) {
        await this.onFatalError(error, { willRetry: false });
        this.stop();
        return;
      }
      if (this.failures >= this.maxConsecutiveFailures) {
        this.failures = this.maxConsecutiveFailures;
        if (!this.failureLimitNotified) {
          this.failureLimitNotified = true;
          await this.onFatalError(error, { willRetry: true });
        }
      } else {
        await this.onError(error, this.failures);
      }
      this.schedule(this.retryDelay(), token);
    }
  }

  handleVisibility() {
    if (
      this.running &&
      this.visibilityTarget &&
      this.visibilityTarget.visibilityState === "visible"
    ) {
      this.wake();
    }
  }

  handleOnline() {
    if (this.running) this.wake();
  }

  wake() {
    if (!this.running) return;
    // 使旧请求失去提交资格；即使底层忽略 abort，旧响应也不能覆盖新状态。
    this.token += 1;
    if (this.controller) this.controller.abort();
    this.controller = null;
    this.schedule(0, this.token);
  }
}

export function createTrainingJobPoller(options) {
  return new TrainingJobPoller(options);
}
