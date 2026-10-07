<template>
  <div>
    <el-alert
      v-if="demoMode"
      title="演示提示：可以填充任务、载入样例 CSV、查看特征图、核对配置，再提交一个支持进度、取消和刷新恢复的本地训练任务。"
      type="info"
      :closable="false"
      show-icon
      class="demo-workflow-tip"
    />
    <el-container>
      <el-header>
        <div id="step">
          <el-steps :active="step" align-center>
            <el-step title="任务创建" icon="el-icon-user"></el-step>
            <el-step title="数据选择" icon="el-icon-document"></el-step>
            <el-step title="特征分析" icon="el-icon-edit"></el-step>
            <el-step title="算法与训练" icon="el-icon-data-line"></el-step>
            <el-step title="运算结果" icon="el-icon-view"></el-step>
          </el-steps>
        </div>
      </el-header>

      <div class="workflow-feedback" v-if="workflow.lastError || workflow.revision > 0">
        <el-alert
          v-if="workflow.lastError"
          :title="workflow.lastError.message"
          type="warning"
          :closable="false"
          show-icon
        />
        <el-button
          v-if="workflow.revision > 0"
          class="discard-button"
          size="mini"
          @click="discardDraft"
        >放弃当前草稿</el-button>
      </div>

      <!-- <el-divider></el-divider> -->

      <el-main v-if="step == 1" class="mainBox">
        <TaskInfoVue :moduleName="moduleName"></TaskInfoVue>
      </el-main>

      <el-main v-if="step == 2" class="mainBox">
        <DataSelectVue :moduleName="moduleName"></DataSelectVue>
      </el-main>

      <el-main v-if="step == 3" class="mainBox">
        <FeatureSelectVue :moduleName="moduleName"></FeatureSelectVue>
      </el-main>

      <el-main v-if="step == 4" class="mainBox">
        <AlgorithmSelectVue :moduleName="moduleName"></AlgorithmSelectVue>
      </el-main>

      <el-main v-if="step == 5" class="mainBox">
        <ResultVue :moduleName="moduleName"></ResultVue>
      </el-main>
    </el-container>
  </div>
</template>

<script>
import { mapState } from "vuex";
import AlgorithmSelectVue from "../model_training/AlgorithmSelect.vue";
import DataSelectVue from "../model_training/DataSelect.vue";
import FeatureSelectVue from "../model_training/FeatureSelect.vue";
import ResultVue from "../model_training/Result.vue";
import TaskInfoVue from "../model_training/TaskInfo.vue";
import {
  getTrainingJob,
  resolveTrainingJobByIdempotencyKey,
} from "@/api/trainingJob";
import { createTrainingJobPoller } from "@/domain/training/trainingJobPoller";
import { releaseDataset } from "@/domain/dataset/datasetRepository";
import {
  TRAINING_EVENT,
  TRAINING_JOB_MODE,
  TRAINING_PHASE,
  isTerminalTrainingJobStatus,
} from "@/domain/training/trainingWorkflow";
import { getApiErrorMessage } from "@/utils/http";
import { isDemoMode } from "@/demo/demoMode";
export default {
  name: "ModelTraining",
  components: {
    TaskInfoVue,
    DataSelectVue,
    FeatureSelectVue,
    AlgorithmSelectVue,
    ResultVue,
  },
  computed: {
    ...mapState("modelTraining", ["step", "workflow"]),
    activeJobId() {
      return this.workflow.job && this.workflow.job.jobId;
    },
    activeJobStatus() {
      return this.workflow.job && this.workflow.job.status;
    },
    hasActiveRemoteJob() {
      return Boolean(
        this.workflow.mode === TRAINING_JOB_MODE.ASYNC &&
        this.workflow.job &&
        !isTerminalTrainingJobStatus(this.workflow.job.status)
      );
    },
    hasUncertainCreate() {
      return Boolean(
        this.workflow.mode === TRAINING_JOB_MODE.ASYNC &&
        this.workflow.phase === TRAINING_PHASE.SUBMITTING &&
        !this.workflow.job &&
        this.workflow.idempotencyKey
      );
    },
  },
  data() {
    return {
      moduleName: "modelTraining",
      demoMode: isDemoMode,
    };
  },

  created() {
    this._destroyedByRoute = false;
    this._jobPoller = createTrainingJobPoller({
      fetchJob: (jobId, config) => getTrainingJob(jobId, config),
      onUpdate: job => this.handleJobUpdate(job),
      onError: error => this.handlePollError(error),
      onFatalError: (error, context) => this.handlePollError(error, true, context),
      minDelayMs: isDemoMode ? 800 : undefined,
      hiddenDelayMs: isDemoMode ? 1200 : undefined,
    });
    this.restoreAndResume();
  },

  watch: {
    activeJobId() {
      this.syncJobPoller();
    },
    activeJobStatus() {
      this.syncJobPoller();
    },
  },

  beforeDestroy() {
    this._destroyedByRoute = true;
    if (this._jobPoller) this._jobPoller.stop();
  },

  methods: {
    async restoreAndResume() {
      await this.$store.dispatch("modelTraining/restoreTrainingDraft");
      if (this._destroyedByRoute) return;
      this.applyJobResult(this.workflow.job);

      if (
        this.workflow.mode === TRAINING_JOB_MODE.ASYNC &&
        this.workflow.phase === TRAINING_PHASE.SUBMITTING &&
        !this.workflow.job &&
        this.workflow.idempotencyKey
      ) {
        try {
          const job = await resolveTrainingJobByIdempotencyKey(
            this.workflow.idempotencyKey
          );
          await this.$store.dispatch("modelTraining/transitionTraining", {
            type: TRAINING_EVENT.JOB_CREATED,
            payload: { job },
          });
          this.applyJobResult(job);
        } catch (error) {
          if (error && error.httpStatus === 404) {
            await this.$store.dispatch("modelTraining/invalidateDataset", {
              code: "JOB_NOT_FOUND",
              message: "未找到已提交任务，请重新上传数据后提交",
            });
          } else {
            await this.$store.dispatch("modelTraining/transitionTraining", {
              type: TRAINING_EVENT.CREATE_UNCERTAIN,
              payload: { error },
            });
          }
        }
      }
      this.syncJobPoller();
    },
    syncJobPoller() {
      if (!this._jobPoller) return;
      const job = this.workflow.job;
      if (
        this.workflow.mode === TRAINING_JOB_MODE.ASYNC &&
        job &&
        !isTerminalTrainingJobStatus(job.status)
      ) {
        this._jobPoller.start(job.jobId);
      } else {
        this._jobPoller.stop();
      }
    },
    async handleJobUpdate(job) {
      if (this._destroyedByRoute) return;
      await this.$store.dispatch("modelTraining/transitionTraining", {
        type: TRAINING_EVENT.JOB_UPDATED,
        payload: { job },
      });
      this.applyJobResult(job);
    },
    async handlePollError(error, fatal = false, context = {}) {
      if (this._destroyedByRoute || !this.workflow.job) return;
      try {
        await this.$store.dispatch("modelTraining/transitionTraining", {
          type: TRAINING_EVENT.POLL_FAILED,
          payload: { error },
        });
      } catch (transitionError) {
        console.error("训练任务轮询状态更新失败", transitionError);
      }
      if (fatal) {
        const message = getApiErrorMessage(error, "无法获取训练任务状态");
        this.$message.error(context.willRetry ? `${message}，系统将继续重试` : message);
      }
    },
    applyJobResult(job) {
      if (!job || job.status !== "succeeded") return;
      const result = job.result || {};
      this.$store.commit("modelTraining/ChangeModelTrain", {
        result: {
          ...result,
          mape_val: result.mape_val ?? result.mapeVal ?? 0,
        },
      });
    },
    async discardDraft() {
      if (this.hasActiveRemoteJob || this.hasUncertainCreate) {
        this.$message.warning("训练任务仍可能在后台执行，请先确认或取消任务");
        return;
      }
      try {
        await this.$confirm("放弃后将清除当前训练草稿，是否继续？", "提示", {
          type: "warning",
        });
      } catch (error) {
        return;
      }
      releaseDataset(this.$store.state.modelTraining.train_model.dataImportId);
      await this.$store.dispatch("modelTraining/resetTraining");
      this.$message.success("训练草稿已清除");
    },
  },
};
</script>
<style scoped>
.demo-workflow-tip {
  margin-bottom: 12px;
}
.workflow-feedback {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 20px 12px;
}

.workflow-feedback .el-alert {
  flex: 1;
}

.discard-button {
  flex: none;
}
</style>
