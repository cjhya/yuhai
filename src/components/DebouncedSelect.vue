<template>
  <el-select
    v-model="innerValue"
    filterable
    remote
    value-key="id"
    :placeholder="placeholder"
    :remote-method="debouncedRemoteMethod"
    :loading="loading"
    :no-data-text="loadError ? '加载失败，请重新打开下拉框重试' : '无数据'"
    size="small"
    style="width: 200px"
    @change="$emit('change', innerValue)"
    @focus="handleFocus"
  >
    <el-option
      v-for="item in options"
      :key="item.id"
      :label="item.value"
      :value="item"
    />
  </el-select>
</template>

<script>
import { debounce } from "lodash";
import { getRequest } from "@/api/user";
import {
  API_ERROR_KIND,
  ApiError,
  getApiErrorMessage,
  isCanceledError,
} from "@/utils/http";

export default {
  name: "DebouncedSelect",
  props: {
    value: {
      type: Object,
      default: null,
    },
    apiUrl: {
      type: String,
      required: true,
    },
    placeholder: {
      type: String,
      default: "请选择",
    },
  },
  data() {
    return {
      innerValue: this.value,
      allOptions: [],
      options: [],
      loading: false,
      loadError: null,
      hasData: false,
      currentQuery: "",
      debouncedRemoteMethod: null,
    };
  },
  watch: {
    value(val) {
      this.innerValue = val;
    },
    innerValue(val) {
      this.$emit("input", val);
    },
    apiUrl() {
      this.resetOptions();
    },
  },
  created() {
    this._destroyedByRoute = false;
    this._loadController = null;
    this._loadPromise = null;
    this._querySequence = 0;
    this.debouncedRemoteMethod = debounce(this.remoteMethod, 300);
  },
  beforeDestroy() {
    this._destroyedByRoute = true;
    this._querySequence += 1;
    this.debouncedRemoteMethod.cancel();
    if (this._loadController) {
      this._loadController.abort();
    }
  },
  methods: {
    handleFocus() {
      if (!this.hasData) {
        this.remoteMethod(this.currentQuery);
      }
    },
    resetOptions() {
      this._querySequence += 1;
      if (this._loadController) {
        this._loadController.abort();
      }
      this._loadController = null;
      this._loadPromise = null;
      this.allOptions = [];
      this.options = [];
      this.hasData = false;
      this.loadError = null;
      this.loading = false;
      this.currentQuery = "";
    },
    async loadOptions() {
      if (this._loadPromise) {
        return this._loadPromise;
      }

      const controller = new AbortController();
      this._loadController = controller;

      const loadPromise = getRequest(this.apiUrl, undefined, {
        signal: controller.signal,
      })
        .then(res => {
          if (this._destroyedByRoute || controller.signal.aborted) {
            throw new ApiError({
              kind: API_ERROR_KIND.CANCEL,
              service: "business",
              message: "请求已取消",
              code: "ERR_CANCELED",
            });
          }

          if (!res || !Array.isArray(res.data)) {
            throw new ApiError({
              kind: API_ERROR_KIND.INVALID_RESPONSE,
              service: "business",
              message: "下拉选项响应格式不正确",
            });
          }

          this.allOptions = Object.freeze(res.data.slice());
          this.hasData = true;
          return this.allOptions;
        })
        .finally(() => {
          if (this._loadPromise === loadPromise) {
            this._loadPromise = null;
            this._loadController = null;
          }
        });

      this._loadPromise = loadPromise;
      return loadPromise;
    },
    async remoteMethod(query = "") {
      const normalizedQuery = String(query || "").trim().toLocaleLowerCase();
      const sequence = ++this._querySequence;
      this.currentQuery = normalizedQuery;
      this.loadError = null;

      if (this.hasData) {
        this.options = this.filterOptions(normalizedQuery, this.allOptions);
        this.loading = false;
        return;
      }

      this.loading = true;
      try {
        const allOptions = await this.loadOptions();
        if (this._destroyedByRoute || sequence !== this._querySequence) {
          return;
        }

        this.options = this.filterOptions(normalizedQuery, allOptions);
      } catch (error) {
        if (
          this._destroyedByRoute ||
          sequence !== this._querySequence ||
          isCanceledError(error)
        ) {
          return;
        }

        this.loadError = getApiErrorMessage(error, "下拉选项加载失败");
        this.options = [];
        this.$emit("error", error);
      } finally {
        if (!this._destroyedByRoute && sequence === this._querySequence) {
          this.loading = false;
        }
      }
    },
    filterOptions(query, data = this.allOptions) {
      if (!query) {
        return data;
      }

      return data.filter(item => {
        const value = item && item.value;
        return value !== null && value !== undefined &&
          String(value).toLocaleLowerCase().includes(query);
      });
    }
  },
};
</script>
