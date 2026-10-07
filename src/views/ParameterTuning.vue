<template>
  <div id="mainBox" element-loading-text="拼命运算中">
    <el-alert
      v-if="demoMode"
      title="演示入口：点击“一键载入演示场景”，从 CSV 样本形成比较方案，再点击“参数推荐”体验参数差异、人工编辑与质量结果失效提示。"
      type="info"
      :closable="false"
      show-icon
      class="demo-scenario-tip"
    />
    <div class="info" v-if="showResult">
      <span>推荐参数及其预测产品质量</span>
      <br />
      <!-- <span
          >在进行预测任务之前您需要训练模型, 通过训练好的模型进行下一步预测</span
        > -->
    </div>
    <el-card v-if="showResult && recommendationSnapshot" class="scheme-lab-card">
      <div class="scheme-lab-header">
        <div>
          <h3>工艺方案实验室</h3>
          <p>保留推荐前比较方案和算法原始建议，在独立工作稿中修改，并把质量结果绑定到实际试算参数。</p>
        </div>
        <el-tag :type="predictionIsStale ? 'warning' : 'success'">
          {{ predictionIsStale ? "质量结果已过期" : "质量结果与当前方案一致" }}
        </el-tag>
      </div>

      <el-alert
        v-if="predictionIsStale"
        :title="predictionStaleMessage"
        type="warning"
        :closable="false"
        show-icon
        class="scheme-alert"
      />

      <div class="snapshot-grid">
        <div class="snapshot-card">
          <span>推荐前比较方案</span>
          <strong>{{ baselineSnapshot ? "已冻结" : "待生成" }}</strong>
          <small>{{ baselineSnapshotDescription }}</small>
        </div>
        <div class="snapshot-card">
          <span>算法原始推荐</span>
          <strong>{{ recommendationSnapshot ? "已冻结" : "待生成" }}</strong>
          <small>{{ formatSnapshotTime(recommendationSnapshot) }}</small>
        </div>
        <div class="snapshot-card working">
          <span>人工工作稿</span>
          <strong>版本 {{ parameterForm.revision }}</strong>
          <small>可继续编辑，原推荐不会被覆盖</small>
        </div>
        <div class="snapshot-card" :class="{ stale: predictionIsStale }">
          <span>质量试算</span>
          <strong>{{ predictionSnapshot ? (predictionIsStale ? "已过期" : "有效") : "待试算" }}</strong>
          <small>{{ predictionSnapshotDescription }}</small>
        </div>
      </div>

      <div class="scheme-diff-toolbar">
        <el-radio-group v-model="schemeDiffMode" size="small">
          <el-radio-button label="baseline-recommendation">比较方案 → 推荐</el-radio-button>
          <el-radio-button label="recommendation-working">推荐 → 人工稿</el-radio-button>
          <el-radio-button label="baseline-working">比较方案 → 人工稿</el-radio-button>
        </el-radio-group>
        <el-switch
          v-model="schemeChangedOnly"
          active-text="只看变化项"
          inactive-text="全部参数"
        />
        <el-tag type="info">变化 {{ schemeDiffChangedCount }} 项</el-tag>
        <div class="scheme-actions">
          <el-button size="small" @click="restoreSchemeSnapshot('baseline')">恢复比较方案</el-button>
          <el-button size="small" @click="restoreSchemeSnapshot('recommendation')">恢复算法推荐</el-button>
          <el-button
            size="small"
            type="success"
            :loading="predictionLoading"
            :disabled="predictionLoading"
            @click="predictWorkingScheme"
          >
            试算当前方案
          </el-button>
        </div>
      </div>

      <el-table
        :data="visibleSchemeDiffRows"
        border
        stripe
        max-height="320"
        empty-text="当前对比范围内没有参数变化"
      >
        <el-table-column prop="groupLabel" label="参数组" width="110" />
        <el-table-column prop="label" label="参数" min-width="220" show-overflow-tooltip />
        <el-table-column label="对比前" min-width="130">
          <template #default="scope">{{ formatSchemeValue(scope.row.before) }}</template>
        </el-table-column>
        <el-table-column label="对比后" min-width="130">
          <template #default="scope">{{ formatSchemeValue(scope.row.after) }}</template>
        </el-table-column>
        <el-table-column label="变化" width="120">
          <template #default="scope">
            <el-tag v-if="!scope.row.changed" type="success" size="mini">未变化</el-tag>
            <el-tag v-else-if="scope.row.numericChange !== null" type="warning" size="mini">
              {{ formatNumericChange(scope.row.numericChange) }}
            </el-tag>
            <el-tag v-else type="warning" size="mini">已修改</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <el-form ref="taskInfoForm" label-width="100px" class="form" label-position="top" style="align-items: center"
      v-if="showResult">
      <el-form-item prop="participants">
        <template slot="label">
          <div style="display: flex; align-items: center; justify-content: space-between; width: 80vw;">
            <div>
              <span class="lineStyle">▍</span>
              <span class="parameterLabel">当前人工工作稿（可编辑）</span>
            </div>
            <div class="result-actions">
              <el-button
                type="success"
                plain
                size="small"
                :loading="predictionLoading"
                :disabled="predictionLoading"
                @click="predictWorkingScheme"
              >
                试算当前方案
              </el-button>
              <el-button type="primary" @click="saveParams" size="small">保存参数方案</el-button>
            </div>
          </div>
        </template>
        <div style="width: 100%;">
          <Params
            :value="parameterForm"
            :errors="parameterErrors"
            @input="handleParameterFormInput"
          />
        </div>
      </el-form-item>
      <el-form-item prop="participants">
        <template slot="label">
          <span class="lineStyle">▍</span>
          <span class="parameterLabel">第一组推荐参数（预测产品质量）</span>
          <br>
          <span>A-3,A-5,B-3,B-5,A边变形 离中值的20%以下；B-1,B-2,C边变形,D边变形,I边变形 离中值的20%-40%；B-4 离中值的40%-60%；A-1, B边变形
            离中值的60%-80%</span>
          <br>
          <span>{{ qualityResultOriginLabel }}</span>
          <span v-if="loss !== null && loss !== undefined">；标签离中值的平均误差：{{ loss }}</span>
        </template>
        <el-row :gutter="20">
          <el-col v-for="(value, key, index) in qualityData" :key="index" :span="4" class="table-cell">
            <div class="fixed-width">
              <span class="label" :title="key">{{ key }}：</span>
              <span class="value" :title="value">{{ value }}</span>
            </div>
          </el-col>
        </el-row>
      </el-form-item>
      <!-- <el-form-item prop="participants">
        <template slot="label">
          <span class="lineStyle">▍</span>
          <span class="parameterLabel">第二组推荐参数（推荐参数取值）</span>
        </template>
        <el-table :data="tableData6" border style="width: 100%">
          <el-table-column prop="label1" label="项目" align="center">
            <template #default="scope">
              <div>{{ scope.row.label1 }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="value1" label="内容" align="center">
            <template #default="scope">
              <div>{{ scope.row.value1 }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="label2" label="项目" align="center">
            <template #default="scope">
              <div>{{ scope.row.label2 }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="value2" label="内容" align="center">
            <template #default="scope">
              <div>{{ scope.row.value2 }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="label3" label="项目" align="center">
            <template #default="scope">
              <div>{{ scope.row.label3 }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="value3" label="内容" align="center">
            <template #default="scope">
              <div>{{ scope.row.value3 }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="label4" label="项目" align="center">
            <template #default="scope">
              <div>{{ scope.row.label4 }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="value4" label="内容" align="center">
            <template #default="scope">
              <div>{{ scope.row.value4 }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="label4" label="项目" align="center">
            <template #default="scope">
              <div>{{ scope.row.label5 }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="value4" label="内容" align="center">
            <template #default="scope">
              <div>{{ scope.row.value5 }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="label4" label="项目" align="center">
            <template #default="scope">
              <div>{{ scope.row.label6 }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="value4" label="内容" align="center">
            <template #default="scope">
              <div>{{ scope.row.value6 }}</div>
            </template>
          </el-table-column>
        </el-table>
      </el-form-item> -->
      <!-- <el-form-item prop="participants">
        <template slot="label">
          <span class="lineStyle">▍</span>
          <span class="parameterLabel">第二组推荐参数（预测产品质量）</span>
          <br>
          <span>标签离中值的平均误差：0.2</span>
        </template>
        <el-table :data="tableData7" border style="width: 100%">
          <el-table-column prop="label1" label="项目" align="center">
            <template #default="scope">
              <div>{{ scope.row.label1 }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="value1" label="内容" align="center">
            <template #default="scope">
              <div>{{ scope.row.value1 }}</div>
              <span style="color: red" v-if="scope.$index === 1">314.50（偏高,建议调整XX为XX）</span>
            </template>
          </el-table-column>
          <el-table-column prop="label2" label="项目" align="center">
            <template #default="scope">
              <div>{{ scope.row.label2 }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="value2" label="内容" align="center">
            <template #default="scope">
              <div>{{ scope.row.value2 }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="label3" label="项目" align="center">
            <template #default="scope">
              <div>{{ scope.row.label3 }}</div>

            </template>
          </el-table-column>
          <el-table-column prop="value3" label="内容" align="center">
            <template #default="scope">
              <div>{{ scope.row.value3 }}</div>
              <span style="color: blue" v-if="scope.$index === 3">1.2（偏低,建议调整XX为XX）</span>
            </template>
          </el-table-column>
          <el-table-column prop="label4" label="项目" align="center">
            <template #default="scope">
              <div>{{ scope.row.label4 }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="value4" label="内容" align="center">
            <template #default="scope">
              <div>{{ scope.row.value4 }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="label4" label="项目" align="center">
            <template #default="scope">
              <div>{{ scope.row.label5 }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="value4" label="内容" align="center">
            <template #default="scope">
              <div>{{ scope.row.value5 }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="label4" label="项目" align="center">
            <template #default="scope">
              <div>{{ scope.row.label6 }}</div>
            </template>
          </el-table-column>
          <el-table-column prop="value4" label="内容" align="center">
            <template #default="scope">
              <div>{{ scope.row.value6 }}</div>
            </template>
          </el-table-column>
        </el-table>
      </el-form-item> -->
    </el-form>
    <div class="info">
      <span>输入参数</span>
      <br />
    </div>
    <div class="button-container">
      <!-- 左侧按钮组 -->
      <div class="left-controls">
        <div class="upload-button">
          <el-upload
            action=""
            ref="uploadRef"
            :auto-upload="false"
            :on-change="handleFileChange"
            :file-list="fileList"
            accept=".csv"
          >
            <el-button slot="trigger" size="small" type="primary">上传 CSV 文件</el-button>
          </el-upload>
        </div>
        <el-button v-if="demoMode" size="small" type="success" plain @click="loadDemoScenario">
          一键载入演示场景
        </el-button>
        <div class="delete-button">
          <el-button size="small" type="danger" @click="clearFileAndTable">删除文件</el-button>
        </div>
      </div>

      <!-- 右侧内容组 -->
      <div class="right-controls">
        <!-- 预测模型 -->
        <div class="form-item">
          <span>选择产品系列+质量预测模型：</span>
          <el-select v-model="selectedModel" placeholder="选择产品系列+质量预测模型" size="small" style="width: 150px"
            @change="handleKeyChange">
            <el-option v-for="(value, index) in modelOptions" :key="index" :label="value" :value="value" />
          </el-select>
        </div>
        <div class="form-item">
          <span>选择任务名：</span>
          <el-select v-model="selectedTask" placeholder="选择任务名" size="small" style="width: 150px">
            <el-option v-for="(value, index) in taskOptions" :key="index" :label="value" :value="value" />
          </el-select>
        </div>
        <!-- 参数推荐算法 -->
        <div class="form-item">
          <span>选择参数推荐算法：</span>
          <el-select v-model="selectedAlg" placeholder="选择参数推荐算法" style="width: 150px" size="small">
            <el-option v-for="item in algOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </div>
        <!-- 输入框 -->
        <div class="form-item">
          <span>标准范围比例设定：</span>
          <el-input v-model="reductionRatio" placeholder="（0.1~0.9）" size="small" style="width: 100px"
            @blur="checkRatio" />
        </div>

        <!-- 按钮 -->
        <div class="form-item">
          <el-button type="primary" @click="navigateToModelTraining" size="small" :loading="recommendLoading"
            :disabled="recommendLoading">参数推荐</el-button>
        </div>
      </div>
    </div>

    <div class="dataset-import-feedback" v-if="importStatus !== 'idle'">
      <el-progress
        v-if="importStatus === 'parsing'"
        :percentage="importProgress"
        :stroke-width="8"
      />
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

    <div class="table-container">
      <div class="table-wrapper">
        <el-table v-if="tableData.length" :data="tableData" height="650" border style="
              overflow-x: hidden;
              margin-top: 20px;
              min-width: 800px;
              /* height: 500px;
            overflow: auto;*/
              overflow-x: scroll;
            ">
          <!-- 动态生成表头 -->
          <el-table-column v-for="(column, index) in columns" :key="index" :prop="column" :label="column"
            align="center"></el-table-column>
        </el-table>
      </div>
    </div>
    <el-form ref="taskInfoForm" label-width="100px" class="form" label-position="top" style="align-items: center">
      <el-collapse v-model="activeNames">
        <el-collapse-item name="1">
          <template slot="title">
            <span class="lineStyle">▍</span>
            <span class="parameterLabel">输入机台信息</span>
            <!-- 机台选择框 -->
            <DebouncedSelect v-model="selectedMachine" api-url="/machine/list" placeholder="请选择机台" @change="onMachineChange" />
            <!-- 多选框 -->
            <!-- <el-select v-model="selectedItems" multiple filterable placeholder="请选择" style="width: 300px" size="small"
              @change="handleSelectionChange">
              <el-option v-for="item in moldOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select> -->

            <!-- 选中项标签 -->
            <!-- <div class="tags">
              <el-tag v-for="item in selectedItems" :key="item" closable @click="showDetails(item)"
                @close="removeTag(item)" class="tag-item">
                {{ getLabel(item) }}
              </el-tag>
            </div> -->
          </template>
          <el-row :gutter="20" v-loading="detailRequestState.machine.status === 'loading'">
            <el-col v-for="(value, key, index) in machineData" :key="index" :span="4" class="table-cell">
              <div class="fixed-width">
                <span class="label" :title="key">{{ key }}：</span>
                <span class="value" :title="value">{{ value }}</span>
              </div>
            </el-col>
          </el-row>
        </el-collapse-item>
        <el-collapse-item name="2">
          <template slot="title">
            <span class="lineStyle">▍</span>
            <span class="parameterLabel">输入模具信息</span>
            <DebouncedSelect v-model="selectedMold" api-url="/mold/list" placeholder="请选择模具" @change="onMoldChange" />
          </template>
          <el-row :gutter="20" v-loading="detailRequestState.mold.status === 'loading'">
            <el-col v-for="(value, key, index) in moldData" :key="index" :span="4" class="table-cell">
              <div class="fixed-width">
                <span class="label" :title="key">{{ key }}：</span>
                <span class="value" :title="value">{{ value }}</span>
              </div>
            </el-col>
          </el-row>
        </el-collapse-item>
        <el-collapse-item name="3">
          <template slot="title">
            <span class="lineStyle">▍</span>
            <span class="parameterLabel">输入材料信息</span>
            <DebouncedSelect v-model="selectedMaterial" api-url="/material/list" placeholder="请选择材料" @change="onMaterialChange" />
          </template>
          <el-row :gutter="20" v-loading="detailRequestState.material.status === 'loading'">
            <el-col v-for="(value, key, index) in materialData" :key="index" :span="4" class="table-cell">
              <div class="fixed-width">
                <span class="label" :title="key">{{ key }}：</span>
                <span class="value" :title="value">{{ value }}</span>
              </div>
            </el-col>
          </el-row>
        </el-collapse-item>
        <el-collapse-item name="4">
          <template slot="title">
            <span class="lineStyle">▍</span>
            <span class="parameterLabel">输入产品设计标准</span>
            <DebouncedSelect v-model="selectedProduct" api-url="/product/list" placeholder="请选择产品" @change="onProductChange" />
          </template>
          <el-row :gutter="20" v-loading="detailRequestState.product.status === 'loading'">
            <el-col v-for="(value, key, index) in productData" :key="index" :span="4" class="table-cell">
              <div class="fixed-width">
                <span class="label" :title="key">{{ key }}：</span>
                <span class="value" :title="value">{{ value }}</span>
              </div>
            </el-col>
          </el-row>
        </el-collapse-item>
        <el-collapse-item name="5">
          <template slot="title">
            <span class="lineStyle">▍</span>
            <span class="parameterLabel">推荐前比较方案</span>
            <el-tag size="mini" type="info">{{ baselineSourceLabel }}</el-tag>
          </template>
          <div class="baseline-source-panel">
            <el-alert
              title="比较方案不会自动代表设备实时参数。可从 CSV 明确选择一条样本载入，也可在推荐前手工确认和修改。"
              type="info"
              :closable="false"
              show-icon
            />
            <div class="baseline-source-controls">
              <span>CSV 样本行：</span>
              <el-input-number
                v-model="baselineSampleNumber"
                :min="1"
                :max="datasetDescriptor ? datasetDescriptor.rowCount : 1"
                :disabled="importStatus !== 'ready' || Boolean(recommendationSnapshot)"
                size="small"
              />
              <el-button
                type="primary"
                plain
                size="small"
                :disabled="importStatus !== 'ready' || Boolean(recommendationSnapshot)"
                @click="loadDatasetBaseline"
              >
                载入该样本
              </el-button>
              <el-tag v-if="baselineMappingReport" type="warning" size="small">
                已映射 {{ baselineMappingReport.matchedCount }}/{{ baselineMappingReport.totalCount }} 项参数
              </el-tag>
            </div>
            <p class="baseline-source-note">{{ baselineSourceDescription }}</p>
            <Params
              v-if="!recommendationSnapshot"
              :value="parameterForm"
              :errors="parameterErrors"
              @input="handleParameterFormInput"
            />
            <el-alert
              v-else
              title="推荐前比较方案已经冻结；请在上方人工工作稿继续编辑，或恢复比较方案后修改。"
              type="success"
              :closable="false"
            />
          </div>
        </el-collapse-item>
      </el-collapse>
      <!-- <div class="save-button">
          <el-button @click="saveDataDialogVisible = true" type="primary">保存</el-button>
        </div> -->
    </el-form>

  </div>
</template>

<script>
import vuex_mixin from "@/components/mixins/vuex_mixin";
import rawData from "@/assets/data/parameter.json"
import Params from "@/components/tab/Params.vue";
import defaultParameters from "@/assets/data/params"
import mapName from "@/assets/data/fieldMaps.json"
import { parameterRecommend, predictQuality } from "@/api/useAlgorithm"
import { addParameterHistory } from "@/api/parameterHistory"
import { getModelFilterObject } from "@/api/model"
import DebouncedSelect from "@/components/DebouncedSelect.vue";
import { getRequest } from "@/api/user";
import {
  API_ERROR_KIND,
  ApiError,
  getApiErrorMessage,
  isCanceledError,
  parseJsonResponse,
} from "@/utils/http";
import {
  createLatestRequestCoordinator,
  isRequestCanceled,
} from "@/utils/requestCoordinator";
import {
  fromLegacyParameterDto,
  fromDatasetParameterRow,
  fromRecommendationParameterDto,
  getParameterErrorSummary,
  toLegacyParameterDto,
  toPredictionParameterDto,
  validateParameterForm,
} from "@/domain/parameter/parameterTransform";
import {
  compareParameterStates,
  createParameterSnapshot,
  getParameterSnapshotStaleReasons,
  isParameterSnapshotStale,
  restoreParameterSnapshot,
} from "@/domain/parameter/parameterScenario";
import { PARAMETER_FIELDS } from "@/domain/parameter/parameterSchema";
import {
  createCsvImportTask,
  getDatasetImportErrorMessage,
  isDatasetImportCancelled,
} from "@/domain/dataset/datasetImporter";
import { PARAMETER_TUNING_DATASET_SCHEMA } from "@/domain/dataset/datasetSchema";
import {
  getDatasetRows,
  registerDataset,
  releaseDataset,
} from "@/domain/dataset/datasetRepository";
import { createDemoUploadFile } from "@/demo/demoDataset";
import { getDemoDefaults } from "@/demo/demoBackend";
import { isDemoMode } from "@/demo/demoMode";

export default {
  name: "TaskInfo",
  // mixins: [resetForm, vuex_mixin],
  mixins: [vuex_mixin],
  props: {
    moduleName: {
      type: String,
      default: "modelTraining",
    },
  },
  components: {
    Params,
    DebouncedSelect
  },
  data() {
    return {
      demoMode: isDemoMode,
      parameterForm: fromLegacyParameterDto(defaultParameters).form,
      parameterErrors: {},
      baselineSnapshot: null,
      recommendationSnapshot: null,
      predictionSnapshot: null,
      baselineSampleNumber: 1,
      baselineSource: {
        type: "template",
        label: "默认参数模板（待人工确认）",
        modified: false,
      },
      baselineMappingReport: null,
      schemeDiffMode: "baseline-recommendation",
      schemeChangedOnly: true,
      predictionLoading: false,
      qualityData: null,
      loss: null,
      loadText: "拼命加载中",
      activeNames: ["1", "2", "3", "4"], // 默认展开的面板,
      tableData: [], // 表格内容
      columns: [], // 表头
      fileList: [],
      importStatus: "idle",
      importProgress: 0,
      importError: "",
      datasetDescriptor: null,
      reductionRatio: 0.1,
      recommendLoading: false,
      showWarning: false,
      showResult: false,
      classifiedData: null,
      parameterData: rawData,
      machineData: null,
      moldData: null,
      materialData: null,
      productData: null,
      detailRequestState: {
        machine: { status: "idle", errorMessage: "" },
        mold: { status: "idle", errorMessage: "" },
        material: { status: "idle", errorMessage: "" },
        product: { status: "idle", errorMessage: "" },
      },
      machineName: null,
      moldName: null,
      materialName: null,
      productName: null,
      algOptions: [
        { label: "粒子群", value: "pso" },
        { label: "差分+遗传", value: "evo" },
        { label: "二分搜索", value: "bin" },
      ],
      selectedModel: "",
      selectedAlg: "",
      selectedTask: "",
      // 产品系列选择
      modelOptions: [],
      taskOptions: [],
      modelFilterObj: {},
      selectedItems: [],
      dialogVisible: false,
      selectedDetail: "",
      // 输入信息列表
      selectedMold: null,
      selectedMaterial: null,
      selectedMachine: null,
      selectedProduct: null,
      tableData6: [
        {
          label1: "注射压力一段",
          value1: "2",
          label2: "注射压力二段",
          value2: "0",
          label3: "注射压力三段",
          value3: "FALSE",
          label4: "注射速度一段",
          value4: "500",
          label5: "注射速度二段",
          value5: "200",
          label6: "注射速度三段",
          value6: "500",
        },
        {
          label1: "注射时间一段",
          value1: "0",
          label2: "注射时间二段",
          value2: "0",
          label3: "注射时间三段",
          value3: "80",
          label4: "保压压力一段",
          value4: "0",
          label5: "保压压力二段",
          value5: "TRUE",
          label6: "保压压力三段",
          value6: "120.0",
        },
        {
          label1: "保压速度一段",
          value1: "0",
          label2: "保压速度二段",
          value2: "0",
          label3: "保压速度三段",
          value3: "35.0",
          label4: "保压时间一段",
          value4: "0",
          label5: "保压时间二段",
          value5: "0",
          label6: "保压时间三段",
          value6: "15",
        },
        {
          label1: "喷嘴温度",
          value1: "269.64807",
          label2: "1段温度",
          value2: "261.68832",
          label3: "2段温度",
          value3: "253.31857",
          label4: "3段温度",
          value4: "0",
          label5: "4段温度",
          value5: "0",
          label6: "5段温度",
          value6: "0",
        },
        {
          label1: "模温机母模状态",
          value1: "0.2",
          label2: "模温机母模出水口温度",
          value2: "260.2",
          label3: "模温机公模状态",
          value3: "0.2",
          label4: "模温机公模出水口温度",
          value4: "89.35",
          label5: "",
          value5: "",
          label6: "",
          value6: "",
        },
      ],
      tableData7: [
        {
          label1: "重量（标准（单重））",
          value1: "",
          label2: "重量（标准（料头））",
          value2: "",
          label3: "重量（差异（标准））",
          value3: "",
          label4: "A-1",
          value4: "313.615",
          label5: "A-2",
          value5: "",
          label6: "A-3",
          value6: "313.676",
        },
        {
          label1: "A-4",
          value1: "",
          label2: "A-5",
          value2: "313.709",
          label3: "B-1",
          value3: "225.247",
          label4: "B-2",
          value4: "225.343",
          label5: "B-3",
          value5: "225.373",
          label6: "B-4",
          value6: "225.361",
        },
        {
          label1: "B-5",
          value1: "225.262",
          label2: "A边变形",
          value2: "0.485",
          label3: "B边变形",
          value3: "0.879",
          label4: "C边变形",
          value4: "0.499",
          label5: "D边变形",
          value5: "0.238",
          label6: "E边变形",
          value6: "",
        },
        {
          label1: "F边变形",
          value1: "",
          label2: "G边变形",
          value2: "",
          label3: "H边变形",
          value3: "",
          label4: "I边变形",
          value4: "0.119",
          label5: "1号变形",
          value5: "",
          label6: "2号变形",
          value6: "",
        },
        {
          label1: "3号变形",
          value1: "",
          label2: "4号变形",
          value2: "",
          label3: "5号变形",
          value3: "",
          label4: "6号变形",
          value4: "",
          label5: "7号变形",
          value5: "",
          label6: "8号变形",
          value6: "",
        },
        {
          label1: "9号变形",
          value1: "",
          label2: "",
          value2: "",
          label3: "",
          value3: "",
          label4: "",
          value4: "",
          label5: "",
          value5: "",
          label6: "",
          value6: "",
        },
      ],
    };
  },
  computed: {
    schemeDiffRows() {
      if (!this.baselineSnapshot || !this.recommendationSnapshot) return []
      if (this.schemeDiffMode === "recommendation-working") {
        return compareParameterStates(this.recommendationSnapshot, this.parameterForm)
      }
      if (this.schemeDiffMode === "baseline-working") {
        return compareParameterStates(this.baselineSnapshot, this.parameterForm)
      }
      return compareParameterStates(this.baselineSnapshot, this.recommendationSnapshot)
    },
    visibleSchemeDiffRows() {
      if (!this.schemeChangedOnly) return this.schemeDiffRows
      return this.schemeDiffRows.filter(row => row.changed)
    },
    schemeDiffChangedCount() {
      return this.schemeDiffRows.filter(row => row.changed).length
    },
    predictionIsStale() {
      return isParameterSnapshotStale(
        this.predictionSnapshot,
        this.parameterForm,
        this.buildSchemeContext()
      )
    },
    predictionStaleReasons() {
      return getParameterSnapshotStaleReasons(
        this.predictionSnapshot,
        this.parameterForm,
        this.buildSchemeContext()
      )
    },
    predictionStaleMessage() {
      const labels = []
      if (this.predictionStaleReasons.includes("parameters-changed")) labels.push("参数")
      if (this.predictionStaleReasons.includes("context-changed")) labels.push("生产上下文")
      const changed = labels.length ? labels.join("和") : "当前输入"
      return `${changed}已发生变化，现有质量结果仍属于上一次提交，请重新试算后再保存。`
    },
    baselineSourceLabel() {
      const suffix = this.baselineSource.modified ? "，已手工调整" : ""
      return `${this.baselineSource.label}${suffix}`
    },
    baselineSourceDescription() {
      if (!this.baselineMappingReport) {
        return "当前参数由默认模板初始化；请在推荐前逐项确认，它不是所选机台的实时参数。"
      }
      const report = this.baselineMappingReport
      return `样本中识别出 ${report.matchedCount} 项工艺参数，未映射字段保持为空；其余 ${report.unmatchedCount} 个数据列仅作为训练或质量数据，不会被误当作工艺参数。`
    },
    baselineSnapshotDescription() {
      if (!this.baselineSnapshot) return "暂无快照"
      const label = this.baselineSnapshot.source && this.baselineSnapshot.source.label
        ? this.baselineSnapshot.source.label
        : "来源未记录"
      return `${label} · ${this.formatSnapshotTime(this.baselineSnapshot)}`
    },
    predictionSnapshotDescription() {
      if (!this.predictionSnapshot || !this.qualityData) return "暂无结果"
      const origin = this.predictionSnapshot.result && this.predictionSnapshot.result.origin === "working-trial"
        ? "人工工作稿试算"
        : "算法推荐附带结果"
      return `${origin} · 输入版本 ${this.predictionSnapshot.sourceRevision} · ${Object.keys(this.qualityData).length} 项指标`
    },
    qualityResultOriginLabel() {
      if (!this.predictionSnapshot) return "暂无质量结果"
      return this.predictionSnapshot.result && this.predictionSnapshot.result.origin === "working-trial"
        ? "当前质量结果来自人工工作稿的独立试算"
        : "当前质量结果由算法推荐同时返回"
    },
  },
  // TODO:初始化两遍，还可把数据放到localStorage里解决这个问题
  created() {
    this._destroyedByRoute = false
    this._requestCoordinator = createLatestRequestCoordinator()
    this._recommendController = null
    this._predictionController = null
    this._datasetImportTask = null
    this._activeDatasetImportId = ""
    this.classifiedData = this.classifyData(rawData)
    this.machineName = mapName["机器信息"]  
    this.moldName = mapName['模具信息']
    this.materialName = mapName['材料信息']
    this.productName = mapName['产品信息']
    this.getOptions()
  },
  beforeDestroy() {
    this._destroyedByRoute = true
    this._requestCoordinator.dispose()
    if (this._recommendController) {
      this._recommendController.abort()
    }
    if (this._predictionController) {
      this._predictionController.abort()
    }
    this.cancelDatasetImport()
    releaseDataset(this._activeDatasetImportId)
  },
  methods: {
    async loadDemoScenario() {
      const upload = createDemoUploadFile("参数调优演示数据.csv")
      await this.handleFileChange(upload, [upload])
      if (this.importStatus !== "ready") return
      this.baselineSampleNumber = 1
      this.loadDatasetBaseline()

      if (!this.modelOptions.length) await this.getOptions()
      const defaults = getDemoDefaults()
      this.selectedModel = this.modelOptions.includes(defaults.model)
        ? defaults.model
        : this.modelOptions[0]
      this.handleKeyChange()
      this.selectedTask = this.taskOptions.includes(defaults.task)
        ? defaults.task
        : this.taskOptions[0]
      this.selectedAlg = defaults.algorithm

      try {
        const [machine, mold, material, product] = await Promise.all([
          getRequest("/machine/list"),
          getRequest("/mold/list"),
          getRequest("/material/list"),
          getRequest("/product/list"),
        ])
        this.selectedMachine = machine.data[0]
        this.selectedMold = mold.data[0]
        this.selectedMaterial = material.data[0]
        this.selectedProduct = product.data[0]
        await Promise.all([
          this.onMachineChange(this.selectedMachine),
          this.onMoldChange(this.selectedMold),
          this.onMaterialChange(this.selectedMaterial),
          this.onProductChange(this.selectedProduct),
        ])
        this.$message.success("演示 CSV、模型和生产上下文已载入，请点击参数推荐")
      } catch (error) {
        this.$message.error(getApiErrorMessage(error, "演示场景加载失败"))
      }
    },
    getColStyle(category) {
      const perRow = this.categorySettings[category] || this.defaultItemsPerRow;
      return `flex: 0 0 calc(${100 / perRow}% - 16px);`;  // 计算宽度
    },
    classifyData(data) {
      let classData = {
        "注射": [],
        "保压": [],
        "温度设置": [],
        "模温机状态": [],
        "温控箱温度": []
      }
      console.log(data)
      Object.entries(data).forEach(([key, value]) => {
        for (const category in this.prefixes) {
          if (key.includes(this.prefixes[category])) {
            let label = key
            classData[category].push({ label, value })
            break
          }
        }
      })
      let label = "喷嘴（温度）"
      let value = data[label]
      classData['温度设置'].push({ label, value })
      return classData
    },
    // 根据 columnsPerRow 分组数据，生成 tableRows
    tableRows(data) {
      const rows = [];
      const groupSize = this.columnsPerRow;
      for (let i = 0; i < data.length; i += groupSize) {
        const row = {};
        // 将每组数据映射为 labelX 和 valueX
        data.slice(i, i + groupSize).forEach((item, index) => {
          row[`label${index + 1}`] = item.label;
          row[`value${index + 1}`] = item.value;
        });
        rows.push(row);
      }
      return rows;
    },
    handleParameterFormInput(form) {
      this.parameterForm = form
      this.parameterErrors = {}
      if (!this.recommendationSnapshot) {
        this.baselineSource = { ...this.baselineSource, modified: true }
      }
    },
    resetBaselineEditor() {
      this.parameterForm = fromLegacyParameterDto(defaultParameters).form
      this.parameterErrors = {}
      this.baselineSampleNumber = 1
      this.baselineSource = {
        type: "template",
        label: "默认参数模板（待人工确认）",
        modified: false,
      }
      this.baselineMappingReport = null
    },
    loadDatasetBaseline() {
      const rows = getDatasetRows(this._activeDatasetImportId)
      const rowNumber = Number(this.baselineSampleNumber)
      const row = rows && rows[rowNumber - 1]
      if (!row) {
        this.$message.warning("请选择数据集范围内的样本行")
        return
      }

      const converted = fromDatasetParameterRow(row)
      if (!converted.matchedFieldIds.length) {
        this.$message.warning("该样本没有匹配当前参数 Schema 的字段，不能作为比较方案")
        return
      }

      this.resetSchemeLab()
      this.parameterForm = converted.form
      this.parameterErrors = validateParameterForm(converted.form).errors
      this.baselineMappingReport = {
        matchedCount: converted.matchedFieldIds.length,
        totalCount: PARAMETER_FIELDS.length,
        unmatchedCount: converted.unmatchedColumns.length,
        issueCount: converted.issues.length,
      }
      this.baselineSource = {
        type: "dataset-row",
        label: `CSV 第 ${rowNumber} 行`,
        datasetImportId: this._activeDatasetImportId,
        rowNumber,
        matchedFieldCount: converted.matchedFieldIds.length,
        totalFieldCount: PARAMETER_FIELDS.length,
        modified: false,
      }
      if (converted.issues.length) {
        this.$message.warning(`样本已载入，但有 ${converted.issues.length} 项字段值需要检查`)
      } else {
        this.$message.success(`已从第 ${rowNumber} 行载入 ${converted.matchedFieldIds.length} 项工艺参数`)
      }
    },
    normalizeContextOption(option) {
      if (!option || typeof option !== "object") return null
      return {
        id: option.id === undefined ? null : option.id,
        value: option.value === undefined ? "" : String(option.value),
      }
    },
    buildSchemeContext() {
      return {
        machine: this.normalizeContextOption(this.selectedMachine),
        mold: this.normalizeContextOption(this.selectedMold),
        material: this.normalizeContextOption(this.selectedMaterial),
        product: this.normalizeContextOption(this.selectedProduct),
        model: this.selectedModel || "",
        task: this.selectedTask || "",
        algorithm: this.selectedAlg || "",
        reductionRatio: this.reductionRatio,
        dataset: this.datasetDescriptor
          ? {
              importId: this._activeDatasetImportId,
              rowCount: this.datasetDescriptor.rowCount,
              columnCount: this.datasetDescriptor.columnCount,
            }
          : null,
      }
    },
    resetSchemeLab() {
      this.baselineSnapshot = null
      this.recommendationSnapshot = null
      this.predictionSnapshot = null
      this.schemeDiffMode = "baseline-recommendation"
      this.schemeChangedOnly = true
      this.qualityData = null
      this.loss = null
      this.showResult = false
    },
    restoreSchemeSnapshot(kind) {
      const snapshot = kind === "baseline"
        ? this.baselineSnapshot
        : this.recommendationSnapshot
      if (!snapshot) {
        this.$message.warning("当前没有可恢复的方案快照")
        return
      }
      this.parameterForm = restoreParameterSnapshot(snapshot, this.parameterForm)
      this.parameterErrors = validateParameterForm(this.parameterForm).errors
      this.schemeDiffMode = kind === "baseline"
        ? "baseline-working"
        : "recommendation-working"
      this.$message.success(kind === "baseline" ? "已恢复调参基线" : "已恢复算法原始推荐")
    },
    formatSnapshotTime(snapshot) {
      if (!snapshot) return "暂无快照"
      return new Date(snapshot.createdAt).toLocaleString()
    },
    formatSchemeValue(value) {
      if (value === null || value === undefined || value === "") return "空"
      if (typeof value === "boolean") return value ? "是" : "否"
      return String(value)
    },
    formatNumericChange(value) {
      if (!Number.isFinite(value)) return "已修改"
      const normalized = Number(value.toFixed(6))
      return normalized > 0 ? `+${normalized}` : String(normalized)
    },
    async predictWorkingScheme() {
      if (this.predictionLoading) return
      if (!this.selectedModel) {
        this.$message.warning("请选择质量预测模型")
        return
      }

      const validation = validateParameterForm(this.parameterForm, {
        target: "prediction",
      })
      this.parameterErrors = validation.errors
      if (!validation.valid) {
        this.$message.warning(
          getParameterErrorSummary(validation) || "请检查工艺参数"
        )
        return
      }

      const context = this.buildSchemeContext()
      const submittedSnapshot = createParameterSnapshot(
        "prediction-input",
        validation.value,
        { context }
      )
      const processedData = toPredictionParameterDto(validation.value)
      const controller = new AbortController()
      this._predictionController = controller
      this.predictionLoading = true

      try {
        const parts = this.selectedModel.split("+")
        const res = await predictQuality(parts[0], parts[1], processedData, {
          signal: controller.signal,
        })
        if (this._destroyedByRoute || controller.signal.aborted) return
        const result = parseJsonResponse(res, {
          service: "algorithm",
          message: "质量预测响应格式不正确",
        })
        if (!Array.isArray(result) || !result[0]) {
          throw new ApiError({
            kind: API_ERROR_KIND.INVALID_RESPONSE,
            service: "algorithm",
            message: "质量预测结果为空",
          })
        }

        this.qualityData = result[0]
        this.loss = null
        this.predictionSnapshot = createParameterSnapshot(
          "prediction",
          submittedSnapshot,
          {
            context: submittedSnapshot.context,
            result: { quality: result[0], origin: "working-trial" },
          }
        )
        this.showResult = true
        this.$message.success("当前人工方案已完成质量试算")
      } catch (error) {
        if (isCanceledError(error) || this._destroyedByRoute) return
        console.error("质量试算失败", error)
        this.$message.error(getApiErrorMessage(error, "质量试算失败，请稍后重试"))
      } finally {
        if (this._predictionController === controller) {
          this._predictionController = null
        }
        if (!this._destroyedByRoute) {
          this.predictionLoading = false
        }
      }
    },
    async saveParams() {
      const validation = validateParameterForm(this.parameterForm)
      this.parameterErrors = validation.errors
      if (!validation.valid) {
        this.$message.warning(
          getParameterErrorSummary(validation) || "请检查工艺参数"
        )
        return
      }

      if (this.predictionIsStale) {
        this.$message.warning("当前参数或生产上下文尚未重新试算，请先试算当前方案")
        return
      }

      const requiredContext = [
        [this.selectedMachine, "机台"],
        [this.selectedMold, "模具"],
        [this.selectedMaterial, "材料"],
        [this.selectedProduct, "产品"],
      ]
      const missingLabels = requiredContext
        .filter(([value]) => !value || !value.value)
        .map(([, label]) => label)
      if (missingLabels.length) {
        this.$message.warning(`保存方案前请补充：${missingLabels.join("、")}`)
        return
      }

      const paramsHistory = {
        parameter2: String(this.selectedMachine.value),
        mouldfiles: String(this.selectedMold.value),
        itemdesc: String(this.selectedProduct.value),
        productcode: String(this.selectedMaterial.value),
        paramsJson: JSON.stringify(toLegacyParameterDto(validation.value))
      }
      const res = await addParameterHistory(paramsHistory)
      this.$message.success(res.msg);
    },
    async getOptions() {
      try {
        const res = await this._requestCoordinator.run("model-options", ({ signal }) =>
          getModelFilterObject({ signal })
        )
        if (!res || !res.data || typeof res.data !== "object") {
          throw new ApiError({
            kind: API_ERROR_KIND.INVALID_RESPONSE,
            service: "business",
            message: "模型列表响应格式不正确",
          })
        }
        this.modelFilterObj = res.data
        this.modelOptions = Object.keys(res.data)
      } catch (error) {
        if (isRequestCanceled(error) || this._destroyedByRoute) return
        console.error("获取模型列表失败", error)
        this.$message.error(getApiErrorMessage(error, "获取模型列表失败"))
      }
    },
    // 处理第一个选择框的变化
    handleKeyChange() {
      // 根据选中的键更新第二个选择框的值
      this.taskOptions = this.modelFilterObj[this.selectedModel];
      // 清空当前选中的值
      this.selectedTask = this.taskOptions[0];
    },
    async loadDetail(type, val, dataKey, keyMap, label) {
      const state = this.detailRequestState[type]
      if (!val || val.id === undefined || val.id === null) {
        this._requestCoordinator.cancel(type)
        this[dataKey] = null
        state.status = "idle"
        state.errorMessage = ""
        return
      }

      this[dataKey] = null
      state.status = "loading"
      state.errorMessage = ""

      try {
        const res = await this._requestCoordinator.run(type, ({ signal }) =>
          getRequest(`/${type}/detail/${val.id}`, undefined, { signal })
        )
        if (!res || !res.data || typeof res.data !== "object") {
          throw new ApiError({
            kind: API_ERROR_KIND.INVALID_RESPONSE,
            service: "business",
            message: `${label}详情响应格式不正确`,
          })
        }

        this[dataKey] = this.translateKeysToChinese(res.data, keyMap)
        state.status = "success"
      } catch (error) {
        if (isRequestCanceled(error) || this._destroyedByRoute) return
        this[dataKey] = null
        state.status = "error"
        state.errorMessage = getApiErrorMessage(error, `获取${label}信息失败`)
        console.error(`获取${label}信息失败`, error)
        this.$message.error(state.errorMessage)
      }
    },
    onMachineChange(val) {
      return this.loadDetail("machine", val, "machineData", this.machineName, "机台")
    },
    onMoldChange(val) {
      return this.loadDetail("mold", val, "moldData", this.moldName, "模具")
    },
    onMaterialChange(val) {
      return this.loadDetail("material", val, "materialData", this.materialName, "材料")
    },
    onProductChange(val) {
      return this.loadDetail("product", val, "productData", this.productName, "产品")
    },
    translateKeysToChinese(data, keyMap) {
      const result = {};
      for (const [key, value] of Object.entries(data)) {
        result[keyMap[key] || key] = value;
      }
      return result;
    },
    async navigateToModelTraining() {
      if (this.recommendLoading) return
      const datasetRows = getDatasetRows(this._activeDatasetImportId)
      if (!datasetRows || datasetRows.length === 0) {
        this.$message.warning("请选择数据！");
        return;
      }
      if (this.selectedModel === "" || this.selectedAlg === "") {
        this.$message.warning("请选择相应模型和算法！");
      } else {
        const baselineValidation = validateParameterForm(this.parameterForm)
        this.parameterErrors = baselineValidation.errors
        if (!baselineValidation.valid) {
          this.$message.warning(
            getParameterErrorSummary(baselineValidation) || "请检查推荐前比较方案"
          )
          return
        }
        this.parameterForm = baselineValidation.value
        const recommendationContext = this.buildSchemeContext()
        const baselineSnapshot = createParameterSnapshot(
          "baseline",
          this.parameterForm,
          { context: recommendationContext, source: this.baselineSource }
        )
        if (this._predictionController) this._predictionController.abort()
        this.recommendLoading = true
        this.showResult = false
        const controller = new AbortController()
        this._recommendController = controller
        const loadingInstance = this.$loading({
          lock: true,
          text: "拼命运算中...",
          spinner: "el-icon-loading",
          background: "rgba(0, 0, 0, 0.2)",
        });
        try {
          const submittedImportId = this._activeDatasetImportId
          const parts = this.selectedModel.split("+");
          const res = await parameterRecommend(
            parts[0],
            parts[1],
            this.reductionRatio,
            this.selectedAlg,
            datasetRows,
            { signal: controller.signal }
          )
          if (
            this._destroyedByRoute ||
            controller.signal.aborted ||
            submittedImportId !== this._activeDatasetImportId
          ) return

          const parameter = parseJsonResponse(res.recommend_data, {
            service: "algorithm",
            message: "推荐参数响应格式不正确",
          })
          const quality = parseJsonResponse(res.recommend_label, {
            service: "algorithm",
            message: "推荐质量响应格式不正确",
          })
          if (!parameter[0] || !quality[0]) {
            throw new ApiError({
              kind: API_ERROR_KIND.INVALID_RESPONSE,
              service: "algorithm",
              message: "参数推荐结果为空",
            })
          }

          this.parameterData = this.updateParameter(rawData, parameter[0])
          const convertedParameters = fromRecommendationParameterDto(
            this.parameterData,
            this.parameterForm
          )
          this.parameterForm = convertedParameters.form
          const parameterValidation = validateParameterForm(this.parameterForm)
          this.parameterErrors = parameterValidation.errors
          if (convertedParameters.issues.length > 0) {
            console.warn("推荐参数包含未识别字段", convertedParameters.issues)
          }
          this.classifiedData = this.classifyData(this.parameterData)
          this.qualityData = quality[0]
          this.loss = res.loss
          this.baselineSnapshot = baselineSnapshot
          this.recommendationSnapshot = createParameterSnapshot(
            "recommendation",
            this.parameterForm,
            {
              context: recommendationContext,
              source: { type: "algorithm", label: "算法原始推荐" },
            }
          )
          this.predictionSnapshot = createParameterSnapshot(
            "prediction",
            this.parameterForm,
            {
              context: recommendationContext,
              result: { quality: quality[0], loss: res.loss, origin: "recommendation" },
            }
          )
          this.schemeDiffMode = "baseline-recommendation"
          this.schemeChangedOnly = true
          this.showResult = true;
        } catch (error) {
          if (isCanceledError(error) || this._destroyedByRoute) return
          console.error("参数推荐失败", error)
          this.$message.error(getApiErrorMessage(error, "参数推荐失败，请稍后重试"))
        } finally {
          loadingInstance.close()
          if (this._recommendController === controller) {
            this._recommendController = null
          }
          if (!this._destroyedByRoute) {
            this.recommendLoading = false
          }
        }
      }
      // this.$router.push("/sideBar/RecommendedParameter");
    },
    updateParameter(original, newValues) {
      return { ...original, ...newValues };
    },
    cancelDatasetImport() {
      const task = this._datasetImportTask
      this._datasetImportTask = null
      if (task) task.cancel()
    },
    releaseActiveDataset() {
      releaseDataset(this._activeDatasetImportId)
      this._activeDatasetImportId = ""
      this.datasetDescriptor = null
    },
    clearFileAndTable() {
      this.cancelDatasetImport()
      this.releaseActiveDataset()
      if (this._recommendController) this._recommendController.abort()
      if (this._predictionController) this._predictionController.abort()
      this.fileList = [];
      this.tableData = [];
      this.columns = [];
      this.importStatus = "idle"
      this.importProgress = 0
      this.importError = ""
      this.resetSchemeLab()
      this.resetBaselineEditor()
      if (this.$refs.uploadRef) {
        this.$refs.uploadRef.clearFiles();
      }
    },
    async handleFileChange(file, fileList) {
      this.cancelDatasetImport()
      this.releaseActiveDataset()
      if (this._recommendController) this._recommendController.abort()
      if (this._predictionController) this._predictionController.abort()

      this.fileList = Array.isArray(fileList) ? fileList.slice(-1) : [file]
      this.tableData = []
      this.columns = []
      this.importStatus = "parsing"
      this.importProgress = 0
      this.importError = ""
      this.resetSchemeLab()
      this.resetBaselineEditor()

      let task = null
      task = createCsvImportTask(file && file.raw, {
        schema: PARAMETER_TUNING_DATASET_SCHEMA,
        maxFileBytes: Number(process.env.VUE_APP_DATASET_MAX_FILE_SIZE_MB) * 1024 * 1024,
        maxRows: Number(process.env.VUE_APP_DATASET_MAX_ROWS),
        maxCells: Number(process.env.VUE_APP_DATASET_MAX_CELLS),
        previewRows: Number(process.env.VUE_APP_DATASET_PREVIEW_ROWS),
        onProgress: progress => {
          if (task && this._datasetImportTask === task) this.importProgress = progress.percent
        },
      })
      this._datasetImportTask = task

      try {
        const result = await task.promise
        if (this._datasetImportTask !== task) return
        registerDataset(result)
        this._activeDatasetImportId = result.importId
        this.datasetDescriptor = result.descriptor
        this.columns = result.columns
        this.tableData = result.previewRows
        this.importProgress = 100
        this.importStatus = "ready"
      } catch (error) {
        if (this._datasetImportTask !== task || isDatasetImportCancelled(error)) return
        this.importStatus = "failed"
        this.importError = getDatasetImportErrorMessage(error)
        this.$message.error(this.importError)
      } finally {
        if (this._datasetImportTask === task) this._datasetImportTask = null
      }
    },
    // 多选组件  适用多机台
    getLabel(value) {
      const option = this.options.value?.find((o) => o.value === value);
      return option ? option.label : value;
    },

    handleSelectionChange() {
      console.log("当前选中:", this.selectedItems);
    },

    showDetails(value) {
      const option = this.options.value?.find((o) => o.value === value);
      if (option) {
        this.selectedDetail.value = option.detail;
        this.dialogVisible.value = true;
      }
    },

    removeTag(value) {
      this.selectedItems.value = this.selectedItems.value.filter((item) => item !== value);
    },
    checkRatio() {
      // 将输入值转换为数字
      const value = parseFloat(this.reductionRatio.trim());
      // 判断输入值是否在 0.1 到 0.9 之间
      if (!isNaN(value) && value >= 0.1 && value <= 0.9) {
        // this.$message.success("输入有误！");
      } else {
        this.$message.warning("标准范围比例设定不在区间范围内！！！");
      }
    },
  }
};
</script>

<style scoped>
.demo-scenario-tip {
  width: 94%;
  margin: 0 auto 12px;
}
.dataset-import-feedback {
  width: 96%;
  margin: 0 auto 12px;
}
.baseline-source-panel {
  padding: 8px 18px 18px;
}

.baseline-source-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin: 14px 0 8px;
}

.baseline-source-note {
  margin: 0 0 14px;
  color: #606266;
  line-height: 1.6;
}
#mainBox {
  margin: 0 auto;
  /* overflow: auto; */
  /* height: 80vh; */
}

.info {
  /* height: 4rem; */
  background-color: rgba(139, 187, 233, 0.2);
  line-height: 2rem;
  text-align: center;
  /* margin-bottom: 20px; */
  /* margin-left: 20%; */
  /* width: 48vw; */
}

.info span:first-child {
  font-size: 18px;
  font-weight: bold;
  /* margin-left: 5px; */
}

.form {
  /* width: 60vw; */
  align-content: center;
  /* margin-left: 20%; */
}

.form .inputBox {
  width: 35%;
}

.form .shortItem {
  display: inline-block;
  /* margin-right: 12vh; */
}

.form .inputBox:last-child {
  width: 50%;
}

.lineStyle {
  color: rgb(100, 172, 231);
}

/* 这里是最后的两个按钮固定在页面上 */
.buttonGroup {
  position: fixed;
  /* bottom: 2%; 距离页面底部 10px */
  left: 50%;
  transform: translateX(-50%);
  /* 水平居中 */
  width: 200px;
  z-index: 9999;
  /* 置于最顶层 */
  margin-left: 5%;
}

::v-deep .el-textarea__inner {
  height: 400px;
  width: 48vw;
}

::v-deep .el-textarea__inner:focus {
  height: 400px;
  transition: all 0.5s ease;
}

.button-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  padding: 20px;

  .left-controls {
    display: flex;
    gap: 10px;
  }

  .right-controls {
    display: flex;
    align-items: center;
    gap: 20px;

    .form-item {
      display: flex;
      align-items: center;
      gap: 5px;
      /*控制 span 和控件间的间距*/
    }
  }
}


/* 让 label 和输入框在一行显示 */
.form-item-group {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.parameterLabel {
  font-size: 16px;
  margin-right: 10px;
}

.category-section {
  margin-bottom: 10px;
}

h3 {
  margin-bottom: 10px;
  font-size: 15px;
}

.label {
  white-space: nowrap;
  margin-right: 10px;
  font-size: 15px;
  width: 150px;
}

.table-container {
  position: relative;
  max-height: 800px;
  /* 表格容器高度 */
  overflow-y: auto;
  /* 垂直滚动条 */
}

.table-wrapper {
  overflow-x: auto;
  /* 启用水平滚动条 */
  overflow-y: hidden;
  /* 禁止内部垂直滚动条 */
}

.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  /* 列与列之间的间距 */
}

.field {
  /*flex: 1 1 200px;  每列最小宽度为 200px，允许伸缩 */
  display: flex;
  flex-direction: row;
  gap: 8px;
}

.field-label {
  font-size: 15px;
  /* color: #606266; */
  /* margin-bottom: 8px; */
  white-space: nowrap;
  /* 防止 key 换行 */
  width: 180px;
}

.narrow-input {
  width: 100%;
  /* 输入框宽度占满父容器 */
  max-width: 186.6px;
  flex: 1;
}

.save-button {
  text-align: center;
  margin-bottom: 50px;
}

.el-input>>>.el-input__inner {
  background-color: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  color: #606266;
  cursor: default;
  padding: 8px 12px;
  /* 调整内边距 */
}

/* 设置每个单元格固定宽度 */
.fixed-width {
  display: flex;
  /* width: 200px; 整个 label + value 的宽度 */
  /* border: 1px solid #ddd; */
  padding: 5px;
  margin-bottom: 5px;
  align-items: center;
}

/* label 占 40% */
.fixed-width .label {
  flex: 0 0 50%;
  /* label 不能缩小，但可以超出 40% */
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  /* 鼠标变成指示状态 */
  /* text-align: center; */
  /* padding-right: 5px; */
}

/* value 占 60% */
.fixed-width .value {
  flex: 1;
  /* 剩余空间全给 value */
  /* text-align: left; */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
  /* 鼠标变成指示状态 */
}

.scheme-lab-card {
  width: 94%;
  margin: 18px auto;
  border: 1px solid #d9ecff;
}

.scheme-lab-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.scheme-lab-header h3 {
  margin: 0 0 8px;
  color: #303133;
  font-size: 18px;
}

.scheme-lab-header p {
  margin: 0;
  color: #606266;
}

.scheme-alert {
  margin-top: 14px;
}

.snapshot-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 12px;
  margin: 16px 0;
}

.snapshot-card {
  padding: 12px 14px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #f8fafc;
}

.snapshot-card span,
.snapshot-card strong,
.snapshot-card small {
  display: block;
}

.snapshot-card span {
  color: #606266;
}

.snapshot-card strong {
  margin: 6px 0;
  color: #409eff;
  font-size: 17px;
}

.snapshot-card small {
  color: #909399;
  line-height: 18px;
}

.snapshot-card.working {
  border-color: #b3d8ff;
  background: #ecf5ff;
}

.snapshot-card.stale {
  border-color: #f5dab1;
  background: #fdf6ec;
}

.snapshot-card.stale strong {
  color: #e6a23c;
}

.scheme-diff-toolbar {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.scheme-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.result-actions {
  display: flex;
  gap: 8px;
}

@media (max-width: 1100px) {
  .snapshot-grid {
    grid-template-columns: repeat(2, minmax(150px, 1fr));
  }

  .scheme-actions {
    width: 100%;
    margin-left: 0;
  }
}
</style>
