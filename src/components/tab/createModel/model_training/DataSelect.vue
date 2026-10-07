<template>
  <div class="main" v-loading="next_loading || importStatus === 'parsing'" element-loading-text="正在解析并校验数据" element-loading-spinner="el-icon-loading">
    <div class="button-container">
      <div class="upload-button">
        <el-upload
          action=""
          ref="uploadRef"
          :auto-upload="false"
          :on-change="handleFileChange"
          :file-list="fileList"
          accept=".csv"
        >
          <el-button slot="trigger" size="small" type="primary" style="align-content: center">上传 CSV 文件</el-button>
        </el-upload>
        <el-button v-if="demoMode" size="small" type="success" plain @click="loadDemoDataset">
          加载演示 CSV
        </el-button>
      </div>
      <div class="delete-button">
        <el-button size="small" type="danger" @click="clearFileAndTable">
          删除文件
        </el-button>
      </div>
    </div>
    <div class="dataset-import-feedback" v-if="importStatus !== 'idle'">
      <el-progress v-if="importStatus === 'parsing'" :percentage="importProgress" :stroke-width="8" />
      <el-alert
        v-else-if="importStatus === 'failed'"
        :title="importError"
        type="error"
        :closable="false"
        show-icon
      />
      <el-alert
        v-else-if="importStatus === 'ready' && datasetDescriptor"
        :title="`已校验 ${datasetDescriptor.rowCount} 行、${datasetDescriptor.columnCount} 列；当前预览 ${datasetDescriptor.previewRowCount} 行`"
        :type="datasetDescriptor.issueReport.warningCount ? 'warning' : 'success'"
        :closable="false"
        show-icon
      />
    </div>
    <div class="table">
      <!--------------------------------- 数据集预览头部 ----------------------------------------------->
      <div class="describe_content">
        <div></div>
        <h3 style="text-align: center">
          <i class="el-icon-s-data" style="font-size: 18px"></i>数据集预览
        </h3>
        <div></div>
        <div>
          <i class="el-icon-folder"></i>数据集名称:
          <span>{{ showDataForm.tableName }}</span>
        </div>
        <!-- <div>
          <i class="el-icon-folder-opened"></i>所属类别:
          <span>{{ showDataForm.classPath }}</span>
        </div> -->
        <div>
          <i class="el-icon-date"></i>特征个数:
          <span>{{ showDataForm.rowCount }}</span>
        </div>
        <div>
          <i class="el-icon-coin"></i>样本条数:
          <span>{{ showDataForm.columnCount }}</span>
        </div>
      </div>
      <!-- 点击左树之前显示的提示内容 -->
      <div>
        <div v-if="!selectedDataset" style="width: 100%;height: 100%;">
          <div class="table-container-before">
            <div class="blinking-text" style="margin-top: 20px">
              选择数据集
            </div>
            <br />
            <img src="@/assets/暂无数据.png" class="imgStyle" />
          </div>
        </div>
        <!----------- 显示表数据 -------------->
        <div v-else>
          <div class="table-container-after">
            <!---------------------------------- 骨架屏 --------------------------------->
            <el-skeleton v-if="!dataLoaded" style="width: 100%;" :rows="30" animated />
            <el-table v-if="tableData.length" :data="tableData" height="550" border style="
                overflow-x: hidden;
                margin-top: 20px;
                min-width: 800px;
                /* height: 500px;
              overflow: auto;*/
                overflow-x: scroll;
              ">
            <!-- 动态生成表头 -->
            <el-table-column v-for="column in columns" :key="column" :prop="column" :label="column"
              align="center"></el-table-column>
          </el-table>
            <!-- <el-table v-else :data="pagedData" stripe class="custom-table" :header-cell-style="headerCellStyle"
              ref="scrollTable" height="60vh">
              <el-table-column v-for="(value, key) in tableData[0]" :key="key" :prop="key" :label="key" width="auto"
                :show-overflow-tooltip="true" :sortable="true">
                <template slot-scope="{ row }">
                  <div class="truncate-text">{{ row[key] }}</div>
                </template>
              </el-table-column>
            </el-table> -->
            <!-- 分页组件 -->
             <!-- <div class="table-pagination">
              <el-pagination :current-page="currentPage" :page-size="pageSize" :total="tableData.length"
              @current-change="handlePageChange" layout="total, prev, pager, next, jumper"></el-pagination>
             </div> -->
          </div>
        </div>
      </div>
      <div class="buttonGroup">
        <el-button @click="backStep()" round>上一步</el-button>
        <el-button type="primary" @click="next(showDataForm.tableName)" round>下一步</el-button>
      </div>
    </div>
  </div>
</template>

<script>
import vuex_mixin from "@/components/mixins/vuex_mixin";
import { mapGetters, mapState } from "vuex";
import { resetForm, debounce } from "@/components/mixins/mixin.js";
import {
  createCsvImportTask,
  getDatasetImportErrorMessage,
  isDatasetImportCancelled,
} from "@/domain/dataset/datasetImporter";
import { MODEL_TRAINING_DATASET_SCHEMA } from "@/domain/dataset/datasetSchema";
import {
  getDatasetRows,
  registerDataset,
  releaseDataset,
} from "@/domain/dataset/datasetRepository";
import { TRAINING_EVENT } from "@/domain/training/trainingWorkflow";
import { createDemoUploadFile } from "@/demo/demoDataset";
import { isDemoMode } from "@/demo/demoMode";
export default {
  name: "DataSelect",
  mixins: [resetForm, debounce, vuex_mixin],
  props: {
    moduleName: {
      type: String,
      default: "modelTraining",
    },
  },
  computed: {
    ...mapGetters(["dataDisList", "dataCreatorList"]),
    ...mapState(["dataList"]),
    headerCellStyle() {
      return {
        color: "black", // 设置表头文字颜色为白色
      };
    },

    loginUserID() {
      return sessionStorage.getItem("userid");
    },

    // 根据分页切割数据
    pagedData() {
      const start = (this.currentPage - 1) * this.pageSize
      const end = start + this.pageSize
      return this.tableData.slice(start, end)
    },
  },

  data() {
    return {
      demoMode: isDemoMode,
      currentPage: 1, // 当前页
      pageSize: 20, // 每页显示行数
      datasetNum: 0,
      diseaseNum: 0,
      next_loading: false,
      selectedDataset: false,
      dataLoaded: false, //骨架屏加载
      chosenData: "",
      dataSet: "",
      dataTotal: 0,
      dataTableVision: false,
      patientTable: [],
      allFeatures: [],
      list: [],
      showDataForm: {
        tableName: "",
        columnCount: "",
        rowCount: "",
      },
      showList: [],
      tableData: [],
      columns: [],
      fileList: [],
      importStatus: "idle",
      importProgress: 0,
      importError: "",
      datasetDescriptor: null,
    };
  },

  created() {
    this._datasetImportTask = null;
    this._activeDatasetImportId = "";
    this.init();
  },
  beforeDestroy() {
    this.cancelDatasetImport();
    if (
      this._activeDatasetImportId &&
      this.m_train_model.dataImportId !== this._activeDatasetImportId
    ) {
      releaseDataset(this._activeDatasetImportId);
    }
  },
  methods: {
    async loadDemoDataset() {
      const upload = createDemoUploadFile("模型训练演示数据.csv");
      await this.handleFileChange(upload, [upload]);
      if (this.importStatus === "ready") {
        this.$message.success("演示 CSV 已通过与真实文件相同的解析校验流程");
      }
    },
    init() {
      this.synchronous();
      this.getTableData();
    },
    // 处理分页变更
    handlePageChange(page) {
      this.currentPage = page;
    },

    // 显示表数据
    showTableData(descriptor) {
      this.showDataForm.columnCount = descriptor.rowCount;
      this.showDataForm.rowCount = descriptor.columnCount;
      this.selectedDataset = true
      this.dataLoaded = true
    },
    // 获取表格数据  // 获取机台、模具、产品等id
    getTableData () {
      // 此处函数预留从接口拿数据 接受机台、产品等id查数据库
      if (this.nodeId && typeof this.getTableDescribe === "function") {
        this.getTableDescribe(this.nodeId, this.chosenData);
        //显示表数据
        this.selectedDataset = true;
        this.dataLoaded = false;
      }
      for (const item of this.m_dataList) {
        if (item.disease === this.disease) {
          this.list.push(item);
        }
      }
      if (this.list.length < 1) {
        return false;
      }
      this.dataTotal = this.list.length;
    },

    // 同步保存的信息
    synchronous() {
      this.chosenData = this.m_train_model.dataSet;
      this.dataName = this.m_train_model.dataName;
      this._activeDatasetImportId = this.m_train_model.dataImportId || "";
      if (this.m_train_model.dataSetMeta && Array.isArray(this.m_train_model.dataSet)) {
        this.datasetDescriptor = this.m_train_model.dataSetMeta;
        this.tableData = this.m_train_model.dataSet;
        this.columns = this.m_train_model.dataSetMeta.columns || [];
        this.showDataForm.tableName = this.m_train_model.dataName;
        this.importStatus = "ready";
        this.importProgress = 100;
        this.showTableData(this.m_train_model.dataSetMeta);
      }
    },
    cancelDatasetImport() {
      const task = this._datasetImportTask;
      this._datasetImportTask = null;
      if (task) task.cancel();
    },
    releaseActiveDataset() {
      releaseDataset(this._activeDatasetImportId);
      this._activeDatasetImportId = "";
      this.datasetDescriptor = null;
    },
    // 删除上传的表格数据
    clearFileAndTable() {
      this.cancelDatasetImport();
      this.releaseActiveDataset();
      this.fileList = [];
      this.tableData = [];
      this.columns = [];
      this.selectedDataset = false;
      this.dataLoaded = false;
      this.importStatus = "idle";
      this.importProgress = 0;
      this.importError = "";
      this.showDataForm = { tableName: "", columnCount: "", rowCount: "" };
      this.m_changeModelTrain({
        dataSet: "",
        dataName: "",
        dataImportId: "",
        dataSetMeta: null,
      });
      if (this.$refs.uploadRef) {
        this.$refs.uploadRef.clearFiles();
      }
    },
    async handleFileChange(file, fileList) {
      this.cancelDatasetImport();
      this.releaseActiveDataset();
      this.m_changeModelTrain({
        dataSet: "",
        dataName: "",
        dataImportId: "",
        dataSetMeta: null,
      });

      this.fileList = Array.isArray(fileList) ? fileList.slice(-1) : [file];
      this.tableData = [];
      this.columns = [];
      this.selectedDataset = false;
      this.dataLoaded = false;
      this.importStatus = "parsing";
      this.importProgress = 0;
      this.importError = "";
      this.showDataForm.tableName = file.name;

      let task = null;
      task = createCsvImportTask(file && file.raw, {
        schema: MODEL_TRAINING_DATASET_SCHEMA,
        maxFileBytes: Number(process.env.VUE_APP_DATASET_MAX_FILE_SIZE_MB) * 1024 * 1024,
        maxRows: Number(process.env.VUE_APP_DATASET_MAX_ROWS),
        maxCells: Number(process.env.VUE_APP_DATASET_MAX_CELLS),
        previewRows: Number(process.env.VUE_APP_DATASET_PREVIEW_ROWS),
        onProgress: progress => {
          if (task && this._datasetImportTask === task) this.importProgress = progress.percent;
        },
      });
      this._datasetImportTask = task;

      try {
        const result = await task.promise;
        if (this._datasetImportTask !== task) return;
        registerDataset(result);
        this._activeDatasetImportId = result.importId;
        this.datasetDescriptor = result.descriptor;
        this.columns = result.columns;
        this.tableData = result.previewRows;
        this.importProgress = 100;
        this.importStatus = "ready";
        this.showTableData(result.descriptor);
      } catch (error) {
        if (this._datasetImportTask !== task || isDatasetImportCancelled(error)) return;
        this.importStatus = "failed";
        this.importError = getDatasetImportErrorMessage(error);
        this.$message.error(this.importError);
      } finally {
        if (this._datasetImportTask === task) this._datasetImportTask = null;
      }
    },
    async next(name) {
      if (!name) {
        this.$message({
          message: "请先选择数据！",
          type: "warning",
        });
        return;
      }
      const datasetRows = getDatasetRows(this._activeDatasetImportId);
      if (!datasetRows || datasetRows.length === 0 || !this.datasetDescriptor) {
        this.$message.warning("数据集已失效，请重新上传！");
        return;
      }
      this.next_loading = true
      this.chosenData = this.tableData
      // 仅在数据集真正变化时清理下游配置；从核对页返回查看后继续使用原数据，不应丢失算法选择。
      const datasetChanged = this.m_train_model.dataImportId !== this._activeDatasetImportId
      if (datasetChanged) this.m_reset_train_select_data()

      this.m_changeModelTrain({
        dataSet: this.chosenData,
        dataName: this.showDataForm.tableName,
        dataImportId: this._activeDatasetImportId,
        dataSetMeta: this.datasetDescriptor,
      });

      try {
        await this.m_transitionTraining({
          type: TRAINING_EVENT.SELECT_DATASET,
          payload: {
            importId: this._activeDatasetImportId,
            meta: this.datasetDescriptor,
          },
        });
      } catch (error) {
        this.next_loading = false;
        this.$message.error(error.message || "数据集状态更新失败");
        return;
      }

      this.next_loading = false;
        this.$notify({
          title: "数据选择成功",
          message: "请选择特征进行下一步",
          type: "success",
        });
      // try {
      //   // 等待第一个异步操作完成
      //   const resFeatures = await postRequest(
      //     "runtime_bus/getLackinfos_features",
      //     {
      //       tableName: this.chosenData,
      //       modename: "software10",
      //     }
      //   );
      //   this.allFeatures = resFeatures;
      //   this.m_changeModelTrain({
      //     all_features: this.allFeatures,
      //   });
      //   // 等待第二个异步操作完成
      //   const resLabels = await postRequest("runtime_bus/getLackinfos_labels", {
      //     tableName: this.chosenData,
      //     modename: "software10",
      //   });
      //   this.targetFeatures = resLabels;
      //   this.m_changeModelTrain({
      //     target_features: this.targetFeatures,
      //   });

      //   // 确保所有异步操作完成后再进行下一步
      //   this.next_loading = false;
      //   this.m_changeStep(3);
      //   this.$notify({
      //     title: "数据选择成功",
      //     message: "请选择特征进行下一步",
      //     type: "success",
      //   });
      //   console.log(
      //     "data_select—end this.targetFeatures:",
      //     this.m_train_model.target_features
      //   );
      //   console.log("this.m_all_features:", this.m_all_features);
      // } catch (error) {
      //   console.error(error); // 如果异步请求出错，打印错误信息
      // }
    },
    backStep() {
      this.cancelDatasetImport();
      this.releaseActiveDataset();
      this.m_changeModelTrain({
        dataSet: "",
        dataName: "",
        dataImportId: "",
        dataSetMeta: null,
      });
      this.m_transitionTraining({ type: TRAINING_EVENT.BACK }).catch(error => {
        this.$message.error(error.message || "无法返回上一步");
      });
    },
  },
};
</script>

<style scoped>
/* 表头列添加背景阴影 */
::v-deep .el-table th {
  box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.2);
  /* 设置阴影效果 */
  /* background-color: #f4f4f4; 可选：设置背景色 */
}

#dataList {
  width: 80%;
  display: flex;
  flex-flow: row wrap;
  justify-content: space-evenly;
  margin-left: 100px;
}

.main {
  /* display: grid; */
  place-items: center;
  height: 700px;
}
.button-container {
  display: flex;
  /* 使用 Flexbox 布局 */
  justify-content: space-between;
  /* 两个部分左右分布 */
  align-items: center;
  /* 垂直方向居中 */
  margin: 10px;
  /* 顶部间距，可调整 */
  width: 80%;
  height: 50px;
}

.upload-button {
  flex-grow: 1;
  /* 占据可用空间 */
  text-align: left;
}
.dataset-import-feedback {
  width: 80%;
  margin: 0 auto 10px;
}
.delete-button {
  flex-shrink: 0;
  /* 预测按钮保持固定大小 */
  text-align: right;
}

#dataList .button {
  padding: 0;
  float: right;
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
@keyframes scrollText {
  0% {
    transform: translateX(0px);
  }

  12% {
    transform: translateX(0px);
  }

  75% {
    transform: translateX(calc(-100% + 12em));
  }

  100% {
    transform: translateX(calc(-100% + 12em));
  }
}

.table {
  /* display: grid;
  grid-template-rows: auto auto; */
  height: 100%;
  width: 85%;
  overflow-y: hidden;
  border-radius: 3px;
  border: 1px solid #fff;
  border-radius: 10px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  /* 修正阴影的颜色和透明度 */
  background: rgba(255, 255, 255, 0.1);
  font-size: 20px;
}

.describe_content {
  display: grid;
  grid-template-rows: auto auto auto;
  grid-template-columns: 1fr 1fr 1fr;
  width: 100%;
  height: 60px;
  color: #585858;
  background-color: rgba(124, 124, 124, 0.1);
  font-size: 16px;
}

.describe_content i {
  margin: 0 5px;
}

.describe_content span {
  margin-right: 13px;
}

.table-container-before {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-size: 24px;
}

.blinking-text {
  color: #585858;
  animation: blink-animation 1s infinite alternate;
  /* 定义闪烁动画 */
}

@keyframes blink-animation {
  from {
    opacity: 0.9;
    /* 起始状态为不透明 */
  }

  to {
    opacity: 0.3;
    /* 终止状态为完全透明 */
  }
}

/* 隐藏浏览器滚动条 */

.scrollHidden {
  scrollbar-width: none;
  /* 隐藏 Firefox 的滚动条 */
  -ms-overflow-style: none;
  /* 隐藏 IE/Edge 的滚动条 */
}

.imgStyle {
  width: 25%;
  margin-left: 50px;
}

.truncate-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.custom-table {
  width: 100%;
  height: auto;
}

.custom-table tr {
  background-color: #dcf3fc !important;
}

.table-container-after {
  width: 100%;
  overflow-y: auto;
  overflow-x: auto;
}
.table-pagination{
  display: flex;
  justify-content: center;
}
</style>
