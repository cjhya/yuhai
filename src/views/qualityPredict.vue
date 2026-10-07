<template>
  <div id="mainBox">
    <div class="info">
      <span>输入参数</span>
      <br />
      <!-- <span
          >在进行预测任务之前您需要训练模型, 通过训练好的模型进行下一步预测</span
        > -->
    </div>
    <el-form ref="taskInfoForm" :model="taskInfoForm" label-width="100px" class="form" label-position="top"
      style="align-items: center">
      <el-collapse v-model="activeNames">
        <el-collapse-item name="1">
          <template slot="title">
            <span class="lineStyle">▍</span>
            <span class="parameterLabel">输入机台信息</span>
            <DebouncedSelect v-model="selectedMachine" api-url="/machine/list" placeholder="请选择机台" @change="onMachineChange" />
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
            <span class="parameterLabel">输入工艺参数</span>
          </template>
          <div style="width: 100%;">
            <Params
              :value="parameterForm"
              :errors="parameterErrors"
              :disabled="predictLoading"
              @input="handleParameterFormInput"
            />
          </div>
        </el-collapse-item>
      </el-collapse>
    </el-form>

    <div class="button-container">
      <div class="form-item">
        <span>选择产品系列+质量预测模型：</span>
        <el-select v-model="selectedModel" placeholder="选择产品系列+质量预测模型" size="small" style="width: 200px"
          @change="handleKeyChange">
          <el-option v-for="(value, index) in modelOptions" :key="index" :label="value" :value="value" />
        </el-select>
      </div>
      <div class="form-item">
        <span>选择任务名：</span>
        <el-select v-model="selectedTask" placeholder="选择任务名" size="small" style="width: 200px">
          <el-option v-for="(value, index) in taskOptions" :key="index" :label="value" :value="value" />
        </el-select>
      </div>
      <div class="form-item">
        <span>操作：</span>
        <el-button type="primary" @click="predictClick" size="small" :loading="predictLoading"
          :disabled="predictLoading">预测产品质量</el-button>
        <!-- <el-button type="primary" @click="submitData">提交</el-button> -->
      </div>

    </div>

    <div class="info" v-if="showResult">
      <span>产品质量预测结果</span>
      <br />
      <!-- <span
          >在进行预测任务之前您需要训练模型, 通过训练好的模型进行下一步预测</span
        > -->
    </div>
    <el-form ref="predictResult" label-width="100px" class="form" label-position="top" style="align-items: center"
      v-if="showResult">
      <el-form-item prop="participants">
        <template slot="label">
          <span class="lineStyle">▍</span>
          <span class="parameterLabel">产品质量预测结果及分析</span>
          <!-- <span>标签离中值的平均误差：{{ loss }}</span> -->
        </template>
        <el-row :gutter="20">
          <el-col v-for="(value, key, index) in predictData" :key="index" :span="4" class="table-cell">
            <div class="fixed-width">
              <span class="label" :title="key">{{ key }}：</span>
              <span class="value" :title="value">{{ value }}</span>
            </div>
          </el-col>
        </el-row>
      </el-form-item>
    </el-form>
  </div>
</template>

<script>
import vuex_mixin from "@/components/mixins/vuex_mixin";
// import { tableData } from "./TableData";
import rawData from "@/assets/data/parameter.json";
import Params from "@/components/tab/Params"
import defaultParameters from "@/assets/data/params"
import mapName from "@/assets/data/fieldMaps.json"
import { predictQuality } from "@/api/useAlgorithm"
import { getModelFilterObject } from '@/api/model'
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
  getParameterErrorSummary,
  toLegacyParameterDto,
  toPredictionParameterDto,
  validateParameterForm,
} from "@/domain/parameter/parameterTransform";
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
      taskInfoForm: {
        taskName: "",
        responsiber: "",
        participants: "",
        remark: "",
      },
      activeNames: ["1", "2", "3", "4", "5"], // 默认展开的面板,
      showResult: false,
      predictLoading: false,
      selectedModel: "", // 存储多选器的值
      selectedTask: "",
      // 产品系列选择
      modelOptions: [],
      taskOptions: [],
      modelFilterObj: {},
      showWarning: false,
      taskNameUnique: 0,
      columnsPerRow: 6, // 每行最多展示 6 组
      defaultItemsPerRow: 5, // 默认每行显示4个输入框
      parameterForm: fromLegacyParameterDto(defaultParameters).form,
      parameterErrors: {},
      lastPredictionSnapshot: null,
      predictData:{},
      loss: null,
      categorySettings: {
        "注射": 5, // 注射类一行显示5个
        "保压": 5, // 保压类一行显示4个
        "温度设置": 6, // 温度类一行显示3个
        "模温机状态": 2, // 模温机类一行显示2个
        "温控箱温度": 6
      },
      classifiedData: {
        "注射": [],
        "保压": [],
        "温度设置": [],
        "模温机状态": [],
        "温控箱温度": []
      },
      // 定义每个分类的字段前缀
      prefixes: {
        "注射": "注射（",
        "保压": "保压（",
        "温度设置": "温度（",
        "模温机状态": "模温机",
        "温控箱温度": "温控箱"
      },
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
      // 输入信息列表
      selectedMold: null,
      selectedMaterial: null,
      selectedMachine: null,
      selectedProduct: null,
      tableData1: [
        { label: "模号", value: "YH24136" },
        { label: "模具穴数", value: "1" },
        { label: "吨位", value: "90T" },
        { label: "复制模", value: "1" },
        { label: "是否有logo", value: "有" },
        { label: "模具长", value: 313.7 },
        { label: "模具宽", value: 225.3 },
        { label: "模具高", value: 19.9 },
        { label: "几版模", value: "两版模" },
        { label: "成型进胶方式", value: "一点扇形倒灌" },
        { label: "进胶点数量", value: "针阀*1" },
        { label: "与母模表面距离（小）", value: 8.5 },
        { label: "与母模表面距离（大）", value: 24.46 },
        { label: "与公模表面距离（小）", value: 23.4 },
        { label: "与公模表面距离（大）", value: 34.5 },
        { label: "", value: "" },
        { label: "", value: "" },
      ],
      tableData2: [
        { label: "原材料编码", value: "20241030002" },
        { label: "材质", value: "PC+ABS 15%talc" },
        { label: "等级", value: "GN5151RFA" },
        { label: "色号", value: "K3059" },
        { label: "密度（g/cm）", value: 0.9 },
        { label: "射出速度", value: "中等" },
        { label: "性质", value: "非结晶" },
        { label: "原料/改进配比", value: "原料" },
      ],
      tableData3: [
        { label: "产品编号", value: "130101002865" },
        { label: "标准（单重）", value: 169.6 },
        { label: "标准（料头）", value: 167.4 },
        { label: "差异（标准）", value: -2.2 },
        { label: "A-1(下限)", value: 313.55 },
        { label: "A-1(上限)", value: 313.85 },
        { label: "A-2(下限)", value: null },
        { label: "A-2(上限)", value: null },
        { label: "A-3(下限)", value: 313.55 },
        { label: "A-3(上限)", value: 313.85 },
        { label: "A-4(下限)", value: null },
        { label: "A-4(上限)", value: null },
        { label: "A-5(下限)", value: 313.55 },
        { label: "A-5(上限)", value: 313.85 },
        { label: "B-1(下限)", value: 225.15 },
        { label: "B-1(上限)", value: 225.45 },
        { label: "B-2(下限)", value: 225.15 },
        { label: "B-2(上限)", value: 225.45 },
        { label: "B-3(下限)", value: 225.25 },
        { label: "B-3(上限)", value: 225.55 },
        { label: "B-4(下限)", value: 225.15 },
        { label: "B-4(上限)", value: 225.45 },
        { label: "B-5(下限)", value: 225.15 },
        { label: "B-5(上限)", value: 225.45 },
        { label: "A边(下限)", value: 0 },
        { label: "A边(上限)", value: 1 },
        { label: "B边(下限)", value: 0 },
        { label: "B边(上限)", value: 1 },
        { label: "C边(下限)", value: 0 },
        { label: "C边(上限)", value: 1 },
        { label: "D边(下限)", value: 0 },
        { label: "D边(上限)", value: 1 },
        { label: "E边(下限)", value: null },
        { label: "E边(上限)", value: null },
        { label: "F边(下限)", value: null },
        { label: "F边(上限)", value: null },
        { label: "G边(下限)", value: null },
        { label: "G边(上限)", value: null },
        { label: "H边(下限)", value: null },
        { label: "H边(上限)", value: null },
        { label: "I边(下限)", value: 0 },
        { label: "I边(上限)", value: 0.2 },
        { label: "1(下限)", value: 0 },
        { label: "1(上限)", value: 0.5 },
        { label: "2(下限)", value: 0 },
        { label: "2(上限)", value: 0.5 },
        { label: "3(下限)", value: 0 },
        { label: "3(上限)", value: 0.5 },
        { label: "4(下限)", value: 0 },
        { label: "4(上限)", value: 0.5 },
        { label: "5(下限)", value: 0 },
        { label: "5(上限)", value: 0.5 },
        { label: "6(下限)", value: 0 },
        { label: "6(上限)", value: 0.5 },
        { label: "7(下限)", value: 0 },
        { label: "7(上限)", value: 0.5 },
        { label: "8(下限)", value: 0 },
        { label: "8(上限)", value: 0.5 },
        { label: "9(下限)", value: 0.3 },
        { label: "9(上限)", value: 0.8 },
      ],
      tableData5: [
        // { label: "重量（实际（单重））", value: "5.7" },
        // { label: "重量（实际（料头））", value: "6.3" },
        // { label: "重量（差异（实际））", value: "0.6" },
        { label: "A-1", value: 313.62 },
        { label: "A-2", value: null },
        { label: "A-3", value: 313.68 },
        { label: "A-4", value: null },
        { label: "A-5", value: 313.71 },
        { label: "B-1", value: 225.24 },
        { label: "B-2", value: 225.34 },
        { label: "B-3", value: 225.37 },
        { label: "B-4", value: 225.36 },
        { label: "B-5", value: 225.26 },
        { label: "A边", value: 0.4851 },
        { label: "B边", value: 0.8791 },
        { label: "C边", value: 0.4993 },
        { label: "D边", value: 0.2372 },
        { label: "E边", value: null },
        { label: "F边", value: null },
        { label: "G边", value: null },
        { label: "G边", value: null },
        { label: "H边", value: null },
        { label: "I边", value: 0.1192 },
        { label: "1号", value: null },
        { label: "2号", value: null },
        { label: "3号", value: null },
        { label: "4号", value: null },
        { label: "5号", value: null },
        { label: "6号", value: null },
        { label: "7号", value: null },
        { label: "8号", value: null },
        { label: "9号", value: null },
      ],
    };
  },
  // TODO:初始化两遍，还可把数据放到localStorage里解决这个问题
  created() {
    this._destroyedByRoute = false
    this._requestCoordinator = createLatestRequestCoordinator()
    this._predictController = null
    this.classifyData(rawData)
    this.machineName = mapName["机器信息"]  
    this.moldName = mapName['模具信息']
    this.materialName = mapName['材料信息']
    this.productName = mapName['产品信息']
    this.getOptions()
    // console.log(this.groupedData)
  },
  beforeDestroy() {
    this._destroyedByRoute = true
    this._requestCoordinator.dispose()
    if (this._predictController) {
      this._predictController.abort()
    }
  },
  mounted() {
    // console.log(this.tableData3);  // 获取当前的数据并打印
    this.tableData3 = this.tableRows(this.tableData3);
    this.tableData1 = this.tableRows(this.tableData1);
    this.tableData2 = this.tableRows(this.tableData2);
    this.tableData5 = this.tableRows(this.tableData5);
  },
  methods: {
    getColStyle(category) {
      const perRow = this.categorySettings[category] || this.defaultItemsPerRow;
      return `flex: 0 0 calc(${100 / perRow}% - 16px);`;  // 计算宽度
    },
    classifyData(data) {
      console.log(data);
      Object.entries(data).forEach(([key, value]) => {
        for (const category in this.prefixes) {
          if (key.includes(this.prefixes[category])) {
            let label = key
            this.classifiedData[category].push({ label, value })
            break
          }
        }
      })
      let label = "喷嘴（温度）"
      let value = data[label]
      this.classifiedData['温度设置'].push({ label, value })
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
    getCurrentTableData() {
      console.log(this.tableData3); // 获取当前的数据并打印
      alert(JSON.stringify(this.tableData3)); // 显示表格数据
    },
    handleParameterFormInput(form) {
      this.parameterForm = form
      this.parameterErrors = {}
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
    async predictClick() {
      if (this.predictLoading) return
      if (this.selectedModel === "") {
        this.$message.warning("请选择相应模型！");
      } else {
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

        const processedData = toPredictionParameterDto(validation.value)
        const requestSnapshot = Object.freeze({
          schemaVersion: validation.value.schemaVersion,
          formRevision: this.parameterForm.revision,
          selectedModel: this.selectedModel,
          selectedTask: this.selectedTask,
          parameters: Object.freeze({ ...toLegacyParameterDto(validation.value) }),
        })
        this.predictLoading = true
        this.showResult = false
        const controller = new AbortController()
        this._predictController = controller
        try {
          const parts = this.selectedModel.split("+");
          const pro = parts[0]
          const alg = parts[1]
          const res = await predictQuality(pro, alg, processedData, {
            signal: controller.signal,
          })
          if (this._destroyedByRoute || controller.signal.aborted) return
          // const res = await this.$axios.post(`/predict/${pro}/${alg}`, processedData);
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
          this.predictData = result[0];
          this.lastPredictionSnapshot = requestSnapshot

          // this.tableGet(result, rawData);

          // 设置结果展示标志，确保是最后一步
          this.showResult = true;
        } catch (error) {
          if (isCanceledError(error) || this._destroyedByRoute) return
          console.error("提交失败:", error);
          this.$message.error(getApiErrorMessage(error, "数据提交失败，请检查！"));
        } finally {
          if (this._predictController === controller) {
            this._predictController = null
          }
          if (!this._destroyedByRoute) {
            this.predictLoading = false
          }
        }
      }

    }
  },
};
</script>

<style scoped>
#mainBox {
  margin: 0 auto;
  /* overflow: auto; */
}

.info {
  /* height: 4rem; */
  background-color: rgba(139, 187, 233, 0.2);
  line-height: 2rem;
  text-align: center;
}

.info span:first-child {
  font-size: 20px;
  font-weight: bold;
  /* margin-left: 5px; */
}

/* .info span:nth-child(3) {
    /* margin-left: 2rem; */
/* } */
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
  font-size: 16px;
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
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 20px;

  .form-item {
    display: flex;
    align-items: center;
    gap: 5px;
    /*控制 span 和控件间的间距*/
  }
}


/* 让 label 和输入框在一行显示 */
.form-item-group {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

h3 {
  margin-bottom: 10px;
}

.label {
  white-space: nowrap;
  margin-right: 10px;
  font-size: 15px;
  width: 150px;
}

.parameterLabel {
  font-size: 16px;
  margin-right: 10px;
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
</style>
