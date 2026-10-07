<template>
  <div v-loading="loading" element-loading-text="拼命运算中">
    <el-container style="justify-content: center; display: flex;">
      <el-col :span="3">
        <div class="grid-content bg-purple">
          <div class="left_tree">
            <!-- <el-tabs id="modelRadiosList" v-model="model" tab-position="left"> -->
            <div style="margin-left: 10%">
              <!-- tab-pane的name值必须与vuex里的算法名字一一对应 -->
              <!-- <el-alert> 这里你可以选择多个算法同时训练 </el-alert> -->
              <el-row :gutter="20" style="margin-top: 10%" v-for="(item, index) in model_froms" :key="index">
                <span>{{ item.name }}</span>
                <el-switch style="margin-left: 10%" v-model="item.isSelect"
                  @change="handleCheckAlg($event, item.modelname)" :active-text="item.modelname" inactive-text=""
                  :disabled="configurationLocked">
                </el-switch>
              </el-row>
            </div>
          </div>
        </div>
      </el-col>

      <el-col :span="17">
        <div class="grid-content bg-purple">
          <!-- 横的tabs标签 -->
          <el-tabs v-model="editableTabsValue" type="card" @edit="handleTabsEdit">
            <el-tab-pane v-for="(item, index) in filteredEditableTabs" :key="index" :label="item.modelname"
              :name="item.modelname">
              <!-- <div v-if="item.name === 'dqn'"> -->
              <div class="titleBox">{{ item.modelFullName }}</div>
              <div class="introBox">
                <p>模型说明：</p>
                <p>{{ item.introduction }}</p>
                <p></p>
              </div>

              <!-- 模型参数表单 -->
              <!-- <div>
                <div class="paramBox" v-if="editableTabsValue === item.modelname">
                  <el-form label-position="top" :model="paramObject">
                    <el-row :gutter="20">
                      <el-col :span="8" v-for="(value, key) in paramObject" :key="key">
                        <el-form-item :prop="key">
                          <template slot="label">
                            <span class="paramTitle" style="margin: auto">{{
                              key
                            }}</span>
                          </template>
                          <el-input v-model="paramObject[key]"></el-input>
                          <span class="valueRange">{{ value }}</span>
                        </el-form-item>
                      </el-col>
                    </el-row>
                  </el-form>
                </div>
              </div> -->
              <!-- </div> -->
            </el-tab-pane>
          </el-tabs>
        </div>
      </el-col>
    </el-container>
    <div class="job-status" v-if="isAsyncJobMode && trainingJob">
      <el-alert
        :title="jobStatusText"
        :type="trainingJob.status === 'failed' ? 'error' : 'info'"
        :closable="false"
        show-icon
      />
      <el-progress
        v-if="trainingJob.progress !== null"
        :percentage="jobProgress"
        :status="trainingJob.status === 'failed' ? 'exception' : undefined"
      />
    </div>
    <el-dialog
      title="训练前核对"
      :visible.sync="reviewVisible"
      width="680px"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-alert
        title="训练开始后，数据集和算法配置将作为本次实验输入；请在提交前确认。"
        type="warning"
        :closable="false"
        show-icon
        class="review-alert"
      />

      <section class="review-section">
        <div class="review-section__header">
          <strong>任务信息</strong>
          <el-button v-if="canEditConfiguration" type="text" @click="editPreviousStep(TRAINING_PHASE.TASK_INFO)">修改</el-button>
        </div>
        <dl class="review-list">
          <div><dt>任务名称</dt><dd>{{ m_train_model.taskName || "未填写" }}</dd></div>
          <div><dt>产品系列</dt><dd>{{ m_train_model.productSeries || "未选择" }}</dd></div>
          <div><dt>负责人</dt><dd>{{ m_train_model.responsiber || "未填写" }}</dd></div>
        </dl>
      </section>

      <section class="review-section">
        <div class="review-section__header">
          <strong>训练数据</strong>
          <el-button v-if="canEditConfiguration" type="text" @click="editPreviousStep(TRAINING_PHASE.DATASET)">修改</el-button>
        </div>
        <dl class="review-list">
          <div><dt>文件</dt><dd>{{ m_train_model.dataName || "未选择" }}</dd></div>
          <div><dt>规模</dt><dd>{{ datasetSizeText }}</dd></div>
        </dl>
      </section>

      <section class="review-section">
        <div class="review-section__header">
          <strong>特征处理</strong>
          <el-button v-if="canEditConfiguration" type="text" @click="editPreviousStep(TRAINING_PHASE.FEATURES)">返回查看</el-button>
        </div>
        <p class="review-note">已完成相关性和重要性分析。当前版本未提交人工筛选的特征清单。</p>
      </section>

      <section class="review-section">
        <div class="review-section__header">
          <strong>算法配置</strong>
          <el-button v-if="canEditConfiguration" type="text" @click="reviewVisible = false">继续修改</el-button>
        </div>
        <dl class="review-list">
          <div><dt>算法</dt><dd>{{ pendingSubmission && pendingSubmission.algorithmLabel }}</dd></div>
          <div><dt>参数</dt><dd>{{ algorithmParamsText }}</dd></div>
        </dl>
      </section>

      <span slot="footer" class="dialog-footer">
        <el-button @click="reviewVisible = false">{{ canEditConfiguration ? "返回修改" : "暂不重试" }}</el-button>
        <el-button type="primary" @click="confirmSubmit">确认并开始训练</el-button>
      </span>
    </el-dialog>
    <div class="buttonGroup">
      <el-button round @click="backStep()" :disabled="loading || hasActiveJob">上一步</el-button>
      <el-button type="primary" round @click="submit()" :loading="loading"
        :disabled="loading || hasActiveJob">{{ submitButtonText }}</el-button>
      <el-button v-if="hasActiveJob" type="danger" round @click="cancelJob()"
        :loading="m_training_workflow.cancelRequested">取消任务</el-button>
    </div>
  </div>
</template>

<script>
import { resetForm } from "@/components/mixins/mixin.js";
import vuex_mixin from "@/components/mixins/vuex_mixin";
import model from '@/assets/data/model'
import { trainModel } from "@/api/useAlgorithm"
import {
  buildTrainingJobPayload,
  cancelTrainingJob,
  createTrainingJob,
} from "@/api/trainingJob";
import { getDatasetRows } from "@/domain/dataset/datasetRepository";
import {
  TRAINING_EVENT,
  TRAINING_JOB_MODE,
  TRAINING_PHASE,
  isTerminalTrainingJobStatus,
} from "@/domain/training/trainingWorkflow";
import {
  API_ERROR_KIND,
  ApiError,
  getApiErrorMessage,
  isCanceledError,
  parseJsonResponse,
} from "@/utils/http";
import { isDemoMode } from "@/demo/demoMode";
export default {
  name: "AlgorithmSelect",
  mixins: [resetForm, vuex_mixin],
  props: {
    moduleName: {
      type: String,
      default: "modelTraining",
    },
  },
  computed: {
    filteredEditableTabs() {
      // 根据条件筛选 editableTabs 数组
      return this.model_froms.filter((item) => item.isSelect);
    },
    isAsyncJobMode() {
      return this.m_training_workflow.mode === TRAINING_JOB_MODE.ASYNC;
    },
    trainingJob() {
      return this.m_training_workflow.job;
    },
    hasActiveJob() {
      return Boolean(
        this.isAsyncJobMode &&
        this.trainingJob &&
        !isTerminalTrainingJobStatus(this.trainingJob.status)
      );
    },
    configurationLocked() {
      return Boolean(
        this.loading ||
        this.hasActiveJob ||
        this.m_training_workflow.phase === TRAINING_PHASE.SUBMITTING
      );
    },
    canEditConfiguration() {
      return this.m_training_workflow.phase === TRAINING_PHASE.ALGORITHM || Boolean(
        this.trainingJob && isTerminalTrainingJobStatus(this.trainingJob.status)
      );
    },
    jobProgress() {
      return this.trainingJob && Number.isFinite(this.trainingJob.progress)
        ? this.trainingJob.progress
        : 0;
    },
    jobStatusText() {
      if (!this.trainingJob) return "";
      const labels = {
        queued: "训练任务已进入队列",
        running: "模型正在训练",
        finalizing: "训练完成，正在保存结果",
        succeeded: "训练成功",
        failed: "训练失败",
        cancelled: "训练任务已取消",
      };
      const stage = this.trainingJob.stage ? ` · ${this.trainingJob.stage}` : "";
      return `${labels[this.trainingJob.status] || this.trainingJob.status}${stage}`;
    },
    submitButtonText() {
      if (
        this.isAsyncJobMode &&
        this.m_training_workflow.phase === TRAINING_PHASE.SUBMITTING &&
        !this.trainingJob
      ) {
        return "重新确认提交";
      }
      if (
        this.trainingJob &&
        ["failed", "cancelled"].includes(this.trainingJob.status)
      ) {
        return "检查并重新训练";
      }
      return "检查并提交";
    },
    datasetSizeText() {
      const descriptor = this.m_train_model.dataSetMeta || {};
      const rows = Number(descriptor.rowCount);
      const columns = Number(descriptor.columnCount);
      if (!Number.isFinite(rows) || !Number.isFinite(columns)) return "暂无规模信息";
      return `${rows} 行 × ${columns} 列`;
    },
    algorithmParamsText() {
      const params = this.pendingSubmission && this.pendingSubmission.params;
      if (!params || typeof params !== "object") return "使用默认参数";
      const entries = Object.entries(params);
      if (!entries.length) return "使用默认参数";
      return entries.map(([key, value]) => `${key}=${value}`).join("，");
    },
  },
  data() {
    return {
      TRAINING_PHASE,
      // 所有模型的表单都在集合中
      model_froms: [],
      paramObject: {},
      editableTabsValue: "",
      model: model,
      loading: false,
      ret: [],
      reviewVisible: false,
      pendingSubmission: null,
    };
  },

  created() {
    this._destroyedByRoute = false
    this._trainController = null
    this._cancelController = null
    this.init();
  },
  beforeDestroy() {
    this._destroyedByRoute = true
    if (this._trainController) {
      this._trainController.abort()
    }
    if (this._cancelController) {
      this._cancelController.abort()
    }
  },

  watch: {
    editableTabsValue(newValue, oldValue) {
      this.modifyParamObject(newValue, oldValue);
    },
  },

  methods: {
    modifyParamObject(newValue, oldValue) {
      for (let i in this.model_froms) {
        if (this.model_froms[i].modelname == this.editableTabsValue) {
          const parsedData = this.model_froms[i].params
          this.paramObject = parsedData
          console.log('参数', parsedData)
        }
      }
      for (let i in this.model_froms) {
        if (
          (this.model_froms[i].isSelect &&
            this.model_froms[i].modelname == oldValue) ||
          this.model_froms[i].modelname == newValue
        ) {
          const parsedData = this.model_froms[i].params
          this.model_froms[i].algorithm_params = parsedData;
        }
      }
    },
    handleTabsEdit(targetName, action) {
      if (action === "remove") {
        let tabs = this.filteredEditableTabs;
        let activeName = this.editableTabsValue;
        if (activeName === targetName) {
          tabs.forEach((tab, index) => {
            if (tab.name === targetName) {
              let nextTab = tabs[index + 1] || tabs[index - 1];
              if (nextTab) {
                activeName = nextTab.name;
              }
            }
          });
        }

        this.editableTabsValue = activeName;

        tabs.forEach((tab) => {
          if (tab.name === targetName) {
            this.$set(tab, "isSelect", false); // 使用 Vue 的 $set 方法确保响应性
          }
        });
      }

      console.log("remove后", this.model_froms);
    },
    handleCheckAlg(checked, name) {
      console.log("name:", name, " checked ", checked);
      if (checked) {
        // 先把所有 isSelect 设为 false
        this.model_froms.forEach((item) => {
          item.isSelect = item.modelname === name; // 只有当前选中的开关保持 true
        });
        this.editableTabsValue = name;
      } else {
        for (var i in this.model_froms) {
          console.log(this.model_froms);
          if (this.model_froms[i].modelname == name) {
            this.model_froms[i].isSelect = false;
          }
          if (this.model_froms[i].isSelect) {
            this.editableTabsValue = this.model_froms[i].modelname;
          }
        }
      }
    },

    init() {
      // 同步数据库数据或者缓存数据
      this.getInitInfo();
    },

    // 同步数据库数据或者缓存数据
    getInitInfo() {
      this.model_froms = this.model.map(item => ({
        ...item,
        params: { ...(item.params || {}) },
        algorithm_params: { ...(item.params || {}) },
      }));
      if (this.m_train_model.algorithm.selected_algorithm === "") {
        this.editableTabsValue = this.model_froms[0].modelname
        if (isDemoMode && this.model_froms[0]) {
          this.model_froms[0].isSelect = true
        }
        // 刚进页面
        // getRequest(`Task/getAllModelInfo`).then((res) => {
        //   if (res) {
        //     let i = 0;
        //     for (i = 0; i < res.length; i++) {
        //       this.model_froms.push(res[i]);
        //       if (res[i].isSelect) {
        //         this.model_froms[i].isSelect = true;
        //         this.editableTabsValue = res[i].modelname;
        //       }
        //     }
        //   }
        // });
      } else {
        // 已经有缓存数据
        const modelName = this.m_train_model.algorithm.selected_algorithm
        this.editableTabsValue = modelName
        this.model_froms.forEach((item) => {
          item.isSelect = item.modelname === modelName // 只有当前选中的开关保持 true
        });
      }
      console.log("this.editableTabsValue", this.editableTabsValue)
      console.log("this.model_froms", this.model_froms)
    },

    backStep() {
      this.m_transitionTraining({ type: TRAINING_EVENT.BACK }).catch(error => {
        this.$message.error(error.message || "无法返回上一步");
      });
    },

    async submit() {
      if (this.loading) return
      let params = {};
      let algorithm = "";
      this.model_froms.forEach(item => {
        if (item.isSelect) {
          algorithm = item.modelname;
          params = item.algorithm_params || item.params || {};
        }
      });
      if (!algorithm) {
        this.$message.warning("请选择算法");
        return;
      }

      const datasetRows = getDatasetRows(this.m_train_model.dataImportId);
      if (!datasetRows || datasetRows.length === 0) {
        await this.$store.dispatch(`${this.moduleName}/invalidateDataset`, {
          code: "LOCAL_DATASET_EXPIRED",
          message: "数据集已失效，请重新上传",
        });
        this.$message.warning("数据集已失效，请重新上传");
        return;
      }

      this.m_changeModelTrain({
        algorithm: {
          selected_algorithm: algorithm,
          algorithm_infos: { ...params },
        },
      });

      const selectedModel = this.model_froms.find(item => item.modelname === algorithm);
      this.pendingSubmission = {
        algorithm,
        algorithmLabel: (selectedModel && (selectedModel.modelFullName || selectedModel.name)) || algorithm,
        params: { ...params },
      };
      this.reviewVisible = true;
    },

    async editPreviousStep(phase) {
      const impactMessages = {
        [TRAINING_PHASE.TASK_INFO]: "修改产品系列后需要重新确认数据集和算法配置。当前内容会保留到你实际修改或重新选择，是否返回？",
        [TRAINING_PHASE.DATASET]: "如果重新选择数据集，当前算法配置和旧结果将失效。现有数据会保留到你选择或清除文件，是否返回？",
        [TRAINING_PHASE.FEATURES]: "返回特征分析不会立即清除数据集和算法选择，再次确认后可回到算法配置。是否返回？",
      };
      try {
        await this.$confirm(impactMessages[phase] || "是否返回修改？", "修改训练配置", {
          confirmButtonText: "返回修改",
          cancelButtonText: "继续核对",
          type: "warning",
        });
      } catch (error) {
        return;
      }
      this.reviewVisible = false;
      try {
        await this.m_transitionTraining({
          type: TRAINING_EVENT.EDIT_STEP,
          payload: { phase },
        });
      } catch (error) {
        this.$message.error(error.message || "无法返回修改该步骤");
      }
    },

    async confirmSubmit() {
      if (this.loading || !this.pendingSubmission) return;
      const submission = this.pendingSubmission;
      this.reviewVisible = false;
      await this.executeSubmission(submission);
    },

    async executeSubmission(submission) {
      const { algorithm, params } = submission;
      const datasetRows = getDatasetRows(this.m_train_model.dataImportId);
      if (!datasetRows || datasetRows.length === 0) {
        await this.$store.dispatch(`${this.moduleName}/invalidateDataset`, {
          code: "LOCAL_DATASET_EXPIRED",
          message: "数据集已失效，请重新上传",
        });
        this.$message.warning("数据集已失效，请重新上传");
        return;
      }

      // 核对后再写入一次，确保实际提交与弹窗中展示的算法配置一致。
      this.m_changeModelTrain({
        algorithm: {
          selected_algorithm: algorithm,
          algorithm_infos: { ...params },
        },
      });

      this.loading = true;
      const controller = new AbortController();
      this._trainController = controller;
      try {
        const workflow = await this.m_transitionTraining({
          type: TRAINING_EVENT.SUBMIT_JOB,
          payload: {
            mode: this.isAsyncJobMode ? TRAINING_JOB_MODE.ASYNC : TRAINING_JOB_MODE.LEGACY,
            productSeries: this.m_train_model.productSeries,
            algorithm,
            hasDataset: true,
          },
        });

        if (this.isAsyncJobMode) {
          const job = await createTrainingJob(
            buildTrainingJobPayload(this.m_train_model, workflow, datasetRows),
            workflow.idempotencyKey,
            { signal: controller.signal }
          );
          if (this._destroyedByRoute || controller.signal.aborted) return;
          await this.m_transitionTraining({
            type: TRAINING_EVENT.JOB_CREATED,
            payload: { job },
          });
          this.applyJobResult(job);
          return;
        }

        const res = await trainModel(
          this.m_train_model.productSeries,
          algorithm,
          { signal: controller.signal }
        );
        if (this._destroyedByRoute || controller.signal.aborted) return;
        if (typeof res.shap_importances !== "string") {
          throw new ApiError({
            kind: API_ERROR_KIND.INVALID_RESPONSE,
            service: "algorithm",
            message: "模型训练结果格式不正确",
          });
        }
        parseJsonResponse(res.shap_importances, {
          service: "algorithm",
          message: "模型特征重要性响应格式不正确",
        });
        const result = { mape_val: res.mape_val };
        this.m_changeModelTrain({ result });
        await this.m_transitionTraining({
          type: TRAINING_EVENT.LEGACY_SUCCEEDED,
          payload: { result },
        });
      } catch (error) {
        if (isCanceledError(error) || this._destroyedByRoute) return;
        const eventType = this.isAsyncJobMode && error.retryable
          ? TRAINING_EVENT.CREATE_UNCERTAIN
          : TRAINING_EVENT.CREATE_FAILED;
        try {
          await this.m_transitionTraining({
            type: eventType,
            payload: { error },
          });
        } catch (transitionError) {
          console.error("训练任务状态更新失败", transitionError);
        }
        console.error("模型训练失败", error);
        this.$message.error(getApiErrorMessage(error, "模型训练失败，请稍后重试"));
      } finally {
        if (this._trainController === controller) this._trainController = null;
        if (!this._destroyedByRoute) this.loading = false;
      }
      // this.$axios.get(`/train/${this.m_train_model.productSeries}/${this.m_train_model.algorithm.selected_algorithm}`).then((res) => {
      //   console.log("提交成功:", res)
      //   // this.m_train_model.result = {}
      //   const shapImportances = JSON.parse(res.shap_importances)
      //   // const result = res.mape_val
      //   this.m_changeModelTrain({
      //     result: {
      //       'mape_val': res.mape_val,
      //     },
      //   });
      //   console.log(shapImportances);
      //   this.loading = false;
      //   this.m_changeStep(this.m_step + 1);
      // })
      //   .catch((error) => {
      //     console.error("提交失败:", error);
      //     alert("数据提交失败，请检查！");
      //   });
    },
    applyJobResult(job) {
      if (!job || job.status !== "succeeded") return;
      const source = job.result || {};
      this.m_changeModelTrain({
        result: {
          ...source,
          mape_val: source.mape_val ?? source.mapeVal ?? 0,
        },
      });
    },
    async cancelJob() {
      if (
        !this.trainingJob ||
        !this.hasActiveJob ||
        this.m_training_workflow.cancelRequested
      ) return;
      const controller = new AbortController();
      this._cancelController = controller;
      try {
        await this.m_transitionTraining({ type: TRAINING_EVENT.CANCEL_REQUESTED });
        const job = await cancelTrainingJob(this.trainingJob.jobId, {
          signal: controller.signal,
        });
        if (this._destroyedByRoute || controller.signal.aborted) return;
        await this.m_transitionTraining({
          type: TRAINING_EVENT.JOB_UPDATED,
          payload: { job },
        });
      } catch (error) {
        if (isCanceledError(error) || this._destroyedByRoute) return;
        try {
          await this.m_transitionTraining({
            type: TRAINING_EVENT.CANCEL_FAILED,
            payload: { error },
          });
        } catch (transitionError) {
          console.error("训练任务取消状态更新失败", transitionError);
        }
        this.$message.error(getApiErrorMessage(error, "取消训练任务失败"));
      } finally {
        if (this._cancelController === controller) {
          this._cancelController = null;
        }
      }
    },
  },
};
</script>

<style scoped>
#modelList {
  height: 60vh;
  width: 100%;
  margin-bottom: 5vh;
}

.titleBox {
  margin: 10px auto 10px auto;
  font-size: 25px;
  font-weight: bold;
  text-align: center;
}

.introBox {
  background-color: #e8f3ff;
  height: 12vh;
  width: 100%;
  overflow: auto;
}

.introBox p {
  margin-left: 15px;
}

.introBox p:first-child {
  font-size: 18px;
  font-weight: 600;
}

.introBox p:nth-child(2) {
  margin-left: 2em;
}

.paramBox .el-form {
  margin-top: 3vh;
  /* margin-left: 40vh; */
}

.paramBox .el-form .el-input {
  width: 25vh;
}

.paramTitle {
  font-size: 20px;
  font-weight: 600;
}

.valueRange {
  color: gray;
  margin-left: 10px;
}

.el-icon-warning-outline {
  margin-left: 10px;
  font-size: 20px;
}

.el-icon-warning-outline:hover {
  color: #368ce7;
}

.buttonGroup {
  position: fixed;
  bottom: 3%;
  left: 50%;
  transform: translateX(-50%);
  /* 水平居中 */
  width: 300px;
  z-index: 9999;
  /* 置于最顶层 */
  margin-left: 5%;
}

.job-status {
  width: 80%;
  margin: 20px auto 0;
}

.review-alert {
  margin-bottom: 16px;
}

.review-section {
  padding: 12px 0;
  border-bottom: 1px solid #ebeef5;
}

.review-section:last-of-type {
  border-bottom: 0;
}

.review-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.review-list {
  margin: 0;
}

.review-list > div {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 12px;
  padding: 4px 0;
}

.review-list dt {
  color: #909399;
}

.review-list dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.review-note {
  margin: 0;
  color: #606266;
  line-height: 1.6;
}
</style>
