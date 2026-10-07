<template>
  <div id="mainBox">
    <div class="info">
      <span> 模型训练： </span>
      <br />
      <span>在进行预测任务之前您需要训练模型, 通过训练好的模型进行下一步预测</span>
    </div>
    <el-form ref="taskInfoForm" :model="taskInfoForm" label-width="100px" class="form" label-position="top">
      <el-form-item prop="taskName" class="inputBox shortItem">
        <template slot="label">
          <span class="lineStyle">▍</span>
          <span>任务名称</span>
        </template>
        <el-input v-model="taskInfoForm.taskName" placeholder="任务名称仅允许出现汉字、英文字母、数字及下划线"
          @blur="checkTaskNameUnique"></el-input>
      </el-form-item>
      <el-form-item prop="principal" class="inputBox shortItem">
        <template slot="label">
          <span class="lineStyle">▍</span>
          <span>任务创建人</span>
        </template>
        <el-input v-model="taskInfoForm.responsiber" :disabled="true"></el-input>
      </el-form-item>
      <el-form-item prop="productSeries" class="inputBox shortItem">
        <template slot="label">
          <span class="lineStyle">▍</span>
          <span>产品系列</span>
        </template>
        <!-- 多选框 -->
        <el-select v-model="taskInfoForm.productSeries" placeholder="请选择">
          <el-option v-for="item in options" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <!-- <el-input v-model="taskInfoForm.productSeries"></el-input> -->
      </el-form-item>
      <div></div>

      <el-form-item prop="remark" class="inputBox shortItem">
        <template slot="label">
          <span class="lineStyle">▍</span>
          <span>任务备注</span>
        </template>
        <el-input v-model="taskInfoForm.remark" type="textarea" placeholder="请填写任务备注......"></el-input>
      </el-form-item>
    </el-form>
    <div class="buttonGroup">
      <el-button v-if="demoMode" type="success" plain @click="fillDemoTask()" round>填充演示任务</el-button>
      <el-button @click="resetForm()" round>清除</el-button>
      <el-button type="primary" @click="next()" :loading="checkingTaskName" round>下一步</el-button>
    </div>
  </div>
</template>

<script>
import vuex_mixin from "@/components/mixins/vuex_mixin";
import { existsTaskName } from "@/api/model"
import { releaseDataset } from "@/domain/dataset/datasetRepository";
import { TRAINING_EVENT } from "@/domain/training/trainingWorkflow";
import { isDemoMode } from "@/demo/demoMode";
export default {
  name: "TaskInfo",
  mixins: [vuex_mixin],
  props: {
    moduleName: {
      type: String,
      default: "modelTraining",
    },
  },
  data() {
    return {
      demoMode: isDemoMode,
      taskInfoForm: {
        taskName: "",
        responsiber: "",
        productSeries: "",
        remark: "",
        createTime: "",
      },
      showWarning: false,
      taskNameUnique: 0,
      checkingTaskName: false,
      // 产品系列选择
      options: [
        { label: "001", value: "001", detail: "选项 A 的详细信息" },
        { label: "002", value: "002", detail: "选项 B 的详细信息" },
        { label: "003", value: "003", detail: "选项 C 的详细信息" },
        { label: "004", value: "004", detail: "选项 D 的详细信息" },
      ],
      selectedItems: [],
    };
  },

  // TODO:初始化两遍，还可把数据放到localStorage里解决这个问题
  created() {
    this._taskNameCheckSequence = 0;
    this.init();
    this.$watch("m_dataDisList", () => {
      this.init();
      this.$message({
        message: "数据更新成功",
        type: "success",
      });
    });
  },

  methods: {
    fillDemoTask() {
      const suffix = new Date().toTimeString().slice(0, 8).replace(/:/g, "");
      this.taskInfoForm = {
        ...this.taskInfoForm,
        taskName: `前端演示训练_${suffix}`,
        responsiber: sessionStorage.getItem("username") || "演示用户",
        productSeries: "001",
        remark: "验证 CSV 导入、阶段进度、取消与刷新恢复流程",
      };
      this.taskNameUnique = 0;
      this.$message.success("演示任务信息已填充");
    },
    init() {
      this.tips(); // 弹出提示
      this.synchronous(); // 同步保存的信息
    },

    // 弹出提示
    tips() {
      this.$notify({
        title: "提示",
        message: "请填写任务信息进行下一步操作",
        type: "success",
      });
    },

    // 同步保存的信息
    synchronous() {
      this.taskInfoForm.taskName = this.m_train_model.taskName
      this.taskInfoForm.responsiber = sessionStorage.getItem("username")
      this.taskInfoForm.participants = this.m_train_model.participants
      this.taskInfoForm.productSeries = this.m_train_model.productSeries
      this.taskInfoForm.remark = this.m_train_model.remark
      this.taskInfoForm.createTime = this.m_train_model.createTime
    },

    // 检查任务名称
    async checkTaskNameUnique(showMessage = true) {
      const taskName = this.taskInfoForm.taskName.trim();
      if (!taskName) return false;
      const sequence = ++this._taskNameCheckSequence;
      this.taskNameUnique = 0;
      this.checkingTaskName = true;
      try {
        const res = await existsTaskName(taskName);
        if (sequence !== this._taskNameCheckSequence || taskName !== this.taskInfoForm.taskName.trim()) {
          return false;
        }
        this.taskNameUnique = Boolean(res.data);
        if (showMessage) {
          if (!this.taskNameUnique) {
            this.$message.success("任务名称可用！");
          } else {
            this.$message.warning("任务名称已存在！");
          }
        }
        return !this.taskNameUnique;
      } catch (error) {
        if (sequence === this._taskNameCheckSequence) {
          this.$message.error("任务名称校验失败，请稍后重试");
        }
        return false;
      } finally {
        if (sequence === this._taskNameCheckSequence) {
          this.checkingTaskName = false;
        }
      }
    },

    // 重置任务信息
    resetForm() {
      this.taskInfoForm.taskName = ""
      this.taskInfoForm.participants = ""
      this.taskInfoForm.remark = ""
      this.taskInfoForm.productSeries = ""
      this.taskInfoForm.createTime = ""
      this.m_changeModelTrain(this.taskInfoForm)
      console.log("this.m_train_model", this.m_train_model)
    },

    // 下一步
    async next() {
      // 定义一个正则表达式，匹配不允许出现的字符
      const illegalCharacters = /[^\w\u4e00-\u9fa5]/;
      const getToday = () => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`;
      };
      this.taskInfoForm.createTime = getToday()
      // 检查任务名称是否包含非法字符
      if (illegalCharacters.test(this.taskInfoForm.taskName)) {
        this.$message({
          showClose: true,
          message: "任务名称不允许出现非法字符",
          type: "error",
        });
        return;
      }

      if (this.taskInfoForm.taskName.length < 1) {
        this.$message({
          showClose: true,
          message: "请填写任务名称",
          type: "error",
        });
        return;
      }
      if (this.taskInfoForm.productSeries === "") {
        this.$message({
          showClose: true,
          message: "请选择产品系列",
          type: "error",
        });
        return;
      }
      const taskNameAvailable = await this.checkTaskNameUnique(false);
      if (!taskNameAvailable) {
        if (this.taskNameUnique) {
          this.$message.warning("任务名称已存在！");
        }
        return;
      }

      const previousProductSeries = this.m_train_model.productSeries;
      const productSeriesChanged = Boolean(
        previousProductSeries && previousProductSeries !== this.taskInfoForm.productSeries
      );
      if (productSeriesChanged) {
        releaseDataset(this.m_train_model.dataImportId);
        this.m_changeModelTrain({
          dataSet: "",
          dataName: "",
          dataImportId: "",
          dataSetMeta: null,
        });
        this.m_reset_train_select_data();
      }
      this.m_changeModelTrain(this.taskInfoForm);
      try {
        await this.m_transitionTraining({
          type: TRAINING_EVENT.SAVE_TASK_INFO,
          payload: this.taskInfoForm,
        });
      } catch (error) {
        this.$message.error(error.message || "任务信息保存失败");
        return;
      }
      this.$notify({
        title: productSeriesChanged ? "产品系列已变更" : "任务信息填写成功",
        message: productSeriesChanged
          ? "原数据集和算法配置已失效，请重新选择数据"
          : "请选择或确认数据集进行下一步操作",
        type: productSeriesChanged ? "warning" : "success",
      });
    },
  },
};
</script>

<style scoped>
#mainBox {
  margin: 0 auto;
  overflow: auto;
}

.info {
  height: 4rem;
  background-color: rgba(139, 187, 233, 0.2);
  line-height: 2rem;
  text-align: left;
  margin-bottom: 20px;
  margin-left: 20%;
  width: 48vw;
}

.info span:first-child {
  font-size: 18px;
  font-weight: bold;
  margin-left: 5px;
}

.info span:nth-child(3) {
  margin-left: 2rem;
}

.form {
  width: 60vw;
  margin-left: 20%;
}

.form .inputBox {
  width: 35%;
}

.form .shortItem {
  display: inline-block;
  margin-right: 12vh;
}

.form .inputBox:last-child {
  width: 50%;
}

.lineStyle {
  color: rgb(100, 172, 231);
}

#disGroup {
  width: 70%;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

.disGroup-item {
  width: 180px;
  margin-bottom: 10px;
}

/* 这里是最后的两个按钮固定在页面上 */
.buttonGroup {
  position: fixed;
  bottom: 3%;
  /* 距离页面底部 10px */
  left: 50%;
  transform: translateX(-50%);
  /* 水平居中 */
  width: 480px;
  z-index: 9999;
  /* 置于最顶层 */
  margin-left: 5%;
}

::v-deep .el-textarea__inner {
  height: 200px;
  width: 48vw;
}

::v-deep .el-textarea__inner:focus {
  height: 300px;
  transition: all 0.5s ease;
}
</style>
