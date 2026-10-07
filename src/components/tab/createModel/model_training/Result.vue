<template>
  <div>
    <div id="pdf_1">
      <div class="taskBox1">
        <div>
          <span class="lineStyle">▍</span
          ><span class="featureTitle">任务信息：</span>
        </div>
        <div></div>
        <div></div>
        <div class="taskInfoBox taskname">
          <el-icon class="el-icon-edit-outline el-icon"></el-icon>
          <span>任务名称：</span>
          <span>{{ m_train_model.taskName }}</span>
        </div>
        <div class="taskInfoBox principal">
          <el-icon class="el-icon-user el-icon"></el-icon
          ><span>任务创建人：</span>
          <span>{{ m_train_model.responsiber }}</span>
        </div>
        <div class="taskInfoBox productSeries">
          <el-icon class="el-icon-user-solid el-icon"></el-icon
          ><span>产品系列：</span>
          <span>{{ m_train_model.productSeries }}</span>
        </div>
        <div class="taskInfoBox algorithm">
          <el-icon class="el-icon-cpu el-icon"></el-icon><span>所用算法：</span>
          <span>{{  m_train_model.algorithm.selected_algorithm }}</span>
        </div>
        <div class="taskInfoBox dataset">
          <el-icon class="el-icon-coin el-icon"></el-icon
          ><span>所用数据：</span>
          <span>{{ m_train_model.dataName }}</span>
        </div>
        <div class="taskInfoBox use_features">
          <el-icon class="el-icon-notebook-2 el-icon"></el-icon
          ><span>MAPE：</span>
          <span>{{ m_train_model.result.mape_val }}</span>
        </div>
        <div class="taskInfoBox createTime">
          <el-icon class="el-icon-notebook-2 el-icon"></el-icon
          ><span>创建时间：</span>
          <span>{{ m_train_model.createTime }}</span>
        </div>
        <div class="taskInfoBox comment">
          <el-icon class="el-icon-edit el-icon"></el-icon
          ><span>任务备注：</span>
          <span>{{ m_train_model.remark }}</span>
        </div>
      </div>
    </div>
    <div id="pdf_2" v-if="dlModel.length > 0">
      <div class="taskBox2" v-for="(item, index) in dlModel" :key="index">
        <div>
          <span class="lineStyle">▍</span
          ><span class="featureTitle">{{ item.modelname }}模型信息：</span>
        </div>
        <div></div>
        <div></div>
        <div></div>
        <div class="algorithm_info">
          <div class="taskInfoBox disease">
            <el-icon class="el-icon-s-data el-icon"></el-icon
            ><span>测试集上平均绝对误差MAE：</span>
            <span v-if="checkMae" style="color: green">{{ mae }}</span>
            <span v-else style="color: red">{{ mae }}</span>
          </div>
          <div class="taskInfoBox dataset">
            <el-icon class="el-icon-s-claim el-icon"></el-icon
            ><span>测试集上均方误差RMSE：</span>
            <span v-if="checkRmse" style="color: green">{{ rmse }}</span>
            <span v-else style="color: red">{{ rmse }}</span>
          </div>
          <div
            v-if="
              m_train_model.responsiber === 'wzl' ||
              m_train_model.responsiber === 'zj'
            "
            class="taskInfoBox algorithm"
          >
            <el-icon class="el-icon-s-order el-icon"></el-icon
            ><span>测试集上皮尔逊相关系数R：</span>
            <span v-if="checkR" style="color: green">{{ r }}</span>
            <span v-else style="color: red">{{ r }}</span>
          </div>
          <div v-else></div>
          <br />
          <div class="taskInfoBox disease">
            <el-icon class="el-icon-s-data el-icon"></el-icon
            ><span>平均绝对误差MAE指标要求：</span>
            <span>{{ requireMae }}</span>
          </div>
          <div class="taskInfoBox dataset">
            <el-icon class="el-icon-s-claim el-icon"></el-icon
            ><span>均方误差RMSE指标要求：</span>
            <span>{{ requireRmse }}</span>
          </div>
          <div
            v-if="
              m_train_model.responsiber === 'wzl' ||
              m_train_model.responsiber === 'zj'
            "
            class="taskInfoBox algorithm"
          >
            <el-icon class="el-icon-s-order el-icon"></el-icon
            ><span>皮尔逊相关系数R指标要求：</span>
            <span>{{ requireR }}</span>
          </div>
          <div class="taskInfoBox use_features">
            <el-icon class="el-icon-s-grid el-icon"></el-icon>
            <span style="color: green">绿色</span>
            <span>表示达标，</span>
            <span style="color: red">红色</span>
            <span>表示未达标</span>
          </div>
        </div>

        <div class="taskInfoBox result">
          <el-icon class="el-icon-s-promotion el-icon"></el-icon
          ><span>任务结果可视化：</span>
        </div>

        <div class="graphBox">
          <div class="echart" id="lossEchart" :style="myChartStyle"></div>
          <!-- <div
            :id="'RewardCurve_' + index"
            ref="RewardCurve"
            style="width: 100%; height: 400px"
          ></div> -->
        </div>

        <div class="graphBox">
          <div class="echart" id="compareEchart" :style="myChartStyle"></div>
          <!-- <featuresPie :data="transToPie(item.res.avg_shapvalue)"></featuresPie>
          <treeMap
            :TP="transTONumber(item.res.TP)"
            :FN="transTONumber(item.res.FN)"
            :FP="transTONumber(item.res.FP)"
            :TN="transTONumber(item.res.TN)"
          ></treeMap> -->
        </div>
      </div>
    </div>

    <div id="pdf_3" v-if="mlModel.length > 0">
      <div class="taskBox2" v-for="(item, index) in mlModel" :key="index">
        <div>
          <span class="lineStyle">▍</span
          ><span class="featureTitle">{{ item.modelname }}模型信息：</span>
        </div>
        <div></div>
        <div></div>
        <div></div>
        <div class="algorithm_info">
          <div class="taskInfoBox disease">
            <el-icon class="el-icon-s-data el-icon"></el-icon
            ><span>精确率acc：</span>
            <span>{{ transTOPercent(item.res.accuracy) }}</span>
          </div>
          <div class="taskInfoBox dataset">
            <el-icon class="el-icon-s-claim el-icon"></el-icon
            ><span>准确率precision：</span>
            <span>{{ transTOPercent(item.res.precision) }}</span>
          </div>
          <div class="taskInfoBox algorithm">
            <el-icon class="el-icon-s-order el-icon"></el-icon
            ><span>召回率recall：</span>
            <span>{{ transTOPercent(item.res.recall) }}</span>
          </div>
          <div class="taskInfoBox use_features">
            <el-icon class="el-icon-s-grid el-icon"></el-icon
            ><span>f1-score：</span>
            <span>{{ transTOPercent(item.res.f1) }}</span>
          </div>
        </div>

        <div class="taskInfoBox result">
          <el-icon class="el-icon-s-promotion el-icon"></el-icon
          ><span>任务结果可视化：</span>
        </div>

        <div class="graphBox">
          <featuresPie :data="transToPie(item.res.avg_shapvalue)"></featuresPie>
          <treeMap
            :TP="transTONumber(item.res.TP)"
            :FN="transTONumber(item.res.FN)"
            :FP="transTONumber(item.res.FP)"
            :TN="transTONumber(item.res.TN)"
          ></treeMap>
        </div>
      </div>
    </div>

    <div class="buttonGroup">
      <el-button @click="backStep()" round>上一步</el-button>
      <!-- <el-button type="success" @click="exportRes()" round>导出结果</el-button> -->
      <el-button type="primary" @click="next()" :loading="saving" :disabled="saving" round>
        {{ isAsyncJobMode ? "完成" : "保存任务" }}
      </el-button>
    </div>
  </div>
</template>

<script>
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import vuex_mixin from "@/components/mixins/vuex_mixin";
import treeMap from "@/components/tab/subcomponents/treeMap.vue";
import featuresPie from "@/components/tab/subcomponents/featuresPie.vue";

import { addModel } from "@/api/model";
import { mapMutations } from "vuex";
import {
  hasDataset,
  releaseDataset,
} from "@/domain/dataset/datasetRepository";
import {
  TRAINING_EVENT,
  TRAINING_JOB_MODE,
} from "@/domain/training/trainingWorkflow";
import { getApiErrorMessage } from "@/utils/http";

import * as echarts from "echarts";

export default {
  name: "Result",
  mixins: [vuex_mixin],
  components: {
    featuresPie,
    treeMap,
  },
  props: {
    moduleName: {
      type: String,
      default: "modelTraining",
    },
  },
  computed: {
    isAsyncJobMode() {
      return this.m_training_workflow.mode === TRAINING_JOB_MODE.ASYNC;
    },
    rlModel() {
      console.log("rl result", this.m_train_model);
      // 根据条件筛选 editableTabs 数组
      const algorithmInfos = Array.isArray(this.m_train_model.algorithm.algorithm_infos)
        ? this.m_train_model.algorithm.algorithm_infos
        : [];
      const filteredModels =
        algorithmInfos.filter(
          (item) => item.modelType === "rl" && item.isSelect === true
        );
      console.log("rl length:", filteredModels.length, filteredModels);
      if (filteredModels.length > 0) {
        return filteredModels;
      } else {
        // 如果数组为空，则返回一个空数组或者执行其他操作
        return [];
      }
    },
    mlModel() {
      // 根据条件筛选 editableTabs 数组
      const filteredModels = []
        // this.m_train_model.algorithm.algorithm_infos.filter(
        //   (item) => item.isSelect === true
        // );
      console.log("mlModel length:", filteredModels.length, filteredModels);
      if (filteredModels.length > 0) {
        return filteredModels;
      } else {
        // 如果数组为空，则返回一个空数组或者执行其他操作
        return [];
      }
    },
    dlModel() {
      const filteredModels = []
        // this.m_train_model.algorithm.algorithm_infos.filter(
        //   (item) => item.isSelect === true
        // );
      console.log("dlModel length:", filteredModels.length, filteredModels);
      if (filteredModels.length > 0) {
        return filteredModels;
      } else {
        // 如果数组为空，则返回一个空数组或者执行其他操作
        return [];
      }
    },
    filteredModels() {
      // 根据条件筛选 editableTabs 数组
      const algorithmInfos = Array.isArray(this.m_train_model.algorithm.algorithm_infos)
        ? this.m_train_model.algorithm.algorithm_infos
        : [];
      return algorithmInfos.filter(
        (item) => item.isSelect
      );
    },
  },
  data() {
    return {
      initFlag: false,
      graphTitile: "",
      node: [],
      links: [],
      data: {},
      type: "",
      hashMap1: {
        zj: ["MAE<=15", "RMSE<=25", "R>0.7"],
        wzl: ["MAE<=15", "RMSE<=25", "R>0.7"],
        hx: ["MAE<=3", "RMSE<=4"],
        cx: ["MAE<=8", "RMSE<=10"],
        llxRH: ["MAE<5", "RMSE<5"],
        llxTEMP: ["MAE<0.5", "RMSE<1"],
      },
      hashMap2: {
        zj: [
          [15, "<="],
          [25, "<="],
          [0.7, ">"],
        ],
        wzl: [
          [15, "<="],
          [25, "<="],
          [0.7, ">"],
        ],
        hx: [
          [3, "<="],
          [4, "<="],
        ],
        cx: [
          [8, "<="],
          [10, "<="],
        ],
        llxRH: [
          [5, "<"],
          [5, "<"],
        ],
        llxTEMP: [
          [0.5, "<"],
          [1, "<"],
        ],
      },
      hashMap3: {
        zj: "",
        wzl: "",
        hx: "",
        cx: "",
        llx: "",
      },
      trainLossList: [],
      valLossList: [],
      yPred: [],
      yReal: [],
      xLoss: [],
      xCompare: [],
      lossEchart: {},
      compareEchart: {},
      myChartStyle: { float: "left", width: "100%", height: "400px" }, //图表样式
      mae: 0,
      rmse: 0,
      r: 0,
      checkMae: false,
      checkRmse: false,
      checkR: false,
      requireMae: "",
      requireRmse: "",
      requireR: "",
      saving: false,
    };
  },

  mounted() {
    // this.printInfos();
    // this.initData();
    // this.init_reward_loss("reward");
    // this.init_reward_loss("loss");
    this.initFlag = true;
    // this.initEcharts();
  },

  methods: {
    initData() {
      this.mae = this.transTOPercent(this.m_train_model.res.mae);
      this.rmse = this.transTOPercent(this.m_train_model.res.rmse);
      this.r = this.transTOPercent(this.m_train_model.res.r);
      this.checkMae = this.frontColor(
        this.mae,
        this.hashMap2[this.hashMap3[this.m_train_model.responsiber]][0][0],
        this.hashMap2[this.hashMap3[this.m_train_model.responsiber]][0][1]
      );
      this.checkRmse = this.frontColor(
        this.rmse,
        this.hashMap2[this.hashMap3[this.m_train_model.responsiber]][1][0],
        this.hashMap2[this.hashMap3[this.m_train_model.responsiber]][1][1]
      );
      if (
        this.m_train_model.responsiber == "zj" ||
        this.m_train_model.responsiber == "wzl"
      ) {
        this.checkR = this.frontColor(
          this.r,
          this.hashMap2[this.hashMap3[this.m_train_model.responsiber]][2][0],
          this.hashMap2[this.hashMap3[this.m_train_model.responsiber]][2][1]
        );
      }
      this.requireMae =
        this.hashMap1[this.hashMap3[this.m_train_model.responsiber]][0];
      this.requireRmse =
        this.hashMap1[this.hashMap3[this.m_train_model.responsiber]][1];
      if (
        this.m_train_model.responsiber == "zj" ||
        this.m_train_model.responsiber == "wzl"
      ) {
        this.requireR =
          this.hashMap1[this.hashMap3[this.m_train_model.responsiber]][2];
      }
    },

    initEcharts() {
      const lossOption = {
        title: {
          text: "训练集以及验证集上的loss曲线", // 设置图表的标题
          left: "center", // 标题的位置，可以是 'left', 'center', 'right'
        },
        grid: {
          show: false, // 隐藏整个网格
        },
        xAxis: {
          data: this.xLoss,
        },
        legend: {
          // 图例
          // data: ["训练集上的loss", "验证集上的loss"],
          bottom: "-1%",
        },
        yAxis: {},
        series: [
          {
            name: "训练集上的loss",
            data: this.trainLossList,
            type: "line", // 类型设置为折线图
            label: {
              show: false,
              position: "top",
              textStyle: {
                fontSize: 16,
              },
            },
            symbol: "none", // 不显示数据点
          },
          {
            name: "测试集上的loss",
            data: this.valLossList,
            type: "line", // 类型设置为折线图
            label: {
              show: false,
              position: "bottom",
              textStyle: {
                fontSize: 16,
              },
            },
            symbol: "none", // 不显示数据点
          },
        ],
      };
      const compareOption = {
        title: {
          text: "测试集上真实值与预测值的曲线", // 设置图表的标题
          left: "center", // 标题的位置，可以是 'left', 'center', 'right'
        },
        grid: {
          show: false, // 隐藏整个网格
        },
        xAxis: {
          data: this.xCompare,
        },
        legend: {
          // 图例
          // data: ["测试集上的真实值", "测试集上的预测值"],
          bottom: "-1%",
        },
        yAxis: {},
        series: [
          {
            name: "测试集上的真实值",
            data: this.yReal,
            type: "line", // 类型设置为折线图
            label: {
              show: false,
              position: "top",
              textStyle: {
                fontSize: 16,
              },
            },
            symbol: "none", // 不显示数据点
          },
          {
            name: "测试集上的预测值",
            data: this.yPred,
            type: "line", // 类型设置为折线图
            label: {
              show: false,
              position: "bottom",
              textStyle: {
                fontSize: 16,
              },
            },
            symbol: "none", // 不显示数据点
          },
        ],
      };
      this.lossEchart = echarts.init(document.getElementById("lossEchart"));
      this.lossEchart.setOption(lossOption);
      this.compareEchart = echarts.init(
        document.getElementById("compareEchart")
      );
      this.compareEchart.setOption(compareOption);
      //随着屏幕大小调节图表
      window.addEventListener("resize", () => {
        this.lossEchart.resize();
      });
      //随着屏幕大小调节图表
      window.addEventListener("resize", () => {
        this.compareEchart.resize();
      });
    },

    ...mapMutations(["SetTaskList"]),

    printInfos() {
      this.$notify({
        title: "运算成功",
        message: "您可根据需要保存任务或导出结果",
        type: "success",
      });
      this.getTrainLossList(this.m_train_model.res.train_loss_list);
      this.getValLossList(this.m_train_model.res.val_loss_list);
      this.getYPred(this.m_train_model.res.y_pred);
      this.getYReal(this.m_train_model.res.y_test);
      if (this.m_train_model.responsiber == "llx") {
        this.hashMap3[this.m_train_model.responsiber] =
          this.m_train_model.responsiber +
          this.m_train_model.target_features[0].riskFactor;
      } else {
        this.hashMap3[this.m_train_model.responsiber] =
          this.m_train_model.responsiber;
      }
    },

    getTrainLossList(data) {
      let cur = "";
      let cnt = 1;
      for (let op of data) {
        if (op == "-") {
          if (cur.length) {
            this.trainLossList.push(parseFloat(cur));
            this.xLoss.push(cnt++);
          }
          cur = "";
          continue;
        }
        cur += op;
      }
      // console.log(this.trainLossList);
    },

    getValLossList(data) {
      let cur = "";
      for (let op of data) {
        if (op == "-") {
          if (cur.length) {
            this.valLossList.push(parseFloat(cur));
          }
          cur = "";
          continue;
        }
        cur += op;
      }
      // console.log(this.valLossList);
    },

    getYPred(data) {
      let cur = "";
      for (let op of data) {
        if (op == "-") {
          if (cur.length) {
            this.yPred.push(parseFloat(cur));
          }
          cur = "";
          continue;
        }
        cur += op;
      }
      // console.log(this.yPred);
    },

    getYReal(data) {
      let cur = "";
      let cnt = 1;
      for (let op of data) {
        if (op == "-") {
          if (cur.length) {
            this.yReal.push(parseFloat(cur));
            this.xCompare.push(cnt++);
          }
          cur = "";
          continue;
        }
        cur += op;
      }
      // console.log(this.yReal);
    },

    transTONumber(confusion) {
      return parseInt(confusion);
    },

    frontColor(data, target, operator) {
      if (operator == "<=") {
        return data <= target;
      } else if (operator == "<") {
        return data < target;
      } else if (operator == ">=") {
        return data >= target;
      }
      return data > target;
    },

    transTOPercent(rate) {
      let n = rate.length;
      let newRate = rate.substring(1, n - 2);
      return parseFloat(newRate).toFixed(4);
    },
    transToPie(shapeValueStr) {
      console.log("shapeValueStr", shapeValueStr);
      // 将字符串按逗号分割成对象数组
      const objectArray = shapeValueStr.split("},{").map((item) => {
        // 去除大括号，然后按照键值对分割
        const keyValuePairs = item.replace(/[{}]/g, "").split(",");
        // console.log()
        // 构建对象
        const obj = {};
        keyValuePairs.forEach((pair) => {
          const [key, value] = pair.split(":");
          const trimmedKey = key.trim();
          const trimmedValue = value.trim();
          if (trimmedKey === "value") {
            obj[trimmedKey] = parseFloat(trimmedValue);
          } else {
            obj[trimmedKey] = trimmedValue;
          }

          // // 如果值是数值，则转换为浮点数，否则保持为字符串
          // obj[trimmedKey] = !isNaN(parseFloat(trimmedValue)) ? parseFloat(trimmedValue) : trimmedValue;
        });
        return obj;
      });

      // 构建期望的 data 数组
      const dataArray = objectArray.map((obj) => {
        return { value: obj.value, name: obj.name };
      });

      // 返回转换后的数据
      console.log("dataArray", dataArray);
      return dataArray;
    },

    init_reward_loss(curve) {
      let models = [];
      console.log(
        "initrewardloss",
        this.m_train_model.algorithm.algorithm_infos
      );
      for (
        var i = 0;
        i < this.m_train_model.algorithm.algorithm_infos.length;
        i++
      ) {
        if (
          this.m_train_model.algorithm.algorithm_infos[i][
            "modelType"
          ] === "rl"
        ) {
          models.push(this.m_train_model.algorithm.algorithm_infos[i]);
          break;
        }
      }
      console.log("models:", models);
      console.log("rlModel:", this.rlModel);
      // 假设您的数据存储在 dqnModel 中，并且您希望遍历它们来初始化每个图表
      this.rlModel.forEach((item, index) => {
        console.log("rl item", item);
        let str = "";
        let text = "Reward curve";
        let chartDom = this.$refs.RewardCurve[index];
        if (curve === "reward") {
          str = item.res.total_rewards;
          text = "Reward curve";
        } else if (curve === "loss") {
          str = item.res.total_losses;
          text = "Losses curve";
          chartDom = this.$refs.LossCurve[index];
        }
        console.log("当前curve:", curve, text, str);

        // 使用正则表达式匹配每个子数组中的数字和字符串，并构建二维数组
        const regex = /\['([^']*)',(-?\d+\.?\d+)\]/g;
        const result = [];
        let match;

        while ((match = regex.exec(str)) !== null) {
          result.push([match[1], parseFloat(match[2])]);
        }

        console.log("result:", result);
        const data = result;
        console.log("data", data);
        const dateList = data.map((item) => item[0]);
        const valueList = data.map((item) => item[1]);

        var myChart = echarts.init(chartDom);
        var option;

        option = {
          visualMap: [
            {
              show: false,
              type: "continuous",
              seriesIndex: 0,
              min: 0,
              max: 400,
            },
            {
              show: false,
              type: "continuous",
              seriesIndex: 1,
              dimension: 0,
              min: 0,
              max: dateList.length - 1,
            },
          ],
          title: [{ left: "center", text: text }],
          tooltip: { trigger: "axis" },
          xAxis: [{ data: dateList }, { data: dateList, gridIndex: 1 }],
          yAxis: [{}, { gridIndex: 1 }],
          grid: [{}, { top: "100%" }],
          series: [{ type: "line", showSymbol: false, data: valueList }],
        };
        console.log("option", option);
        option && myChart.setOption(option);
      });
    },

    async next() {
      if (this.saving) return;
      this.saving = true;
      try {
        // 异步 job 成功时由服务端持久化模型记录；兼容模式保留原来的二次保存接口。
        if (!this.isAsyncJobMode) {
          const payload = {
            taskName: this.m_train_model.taskName,
            responsiber: this.m_train_model.responsiber,
            productSeries: this.m_train_model.productSeries,
            algorithm: this.m_train_model.algorithm.selected_algorithm,
            resultJson: JSON.stringify(this.m_train_model.result),
            createTime: this.m_train_model.createTime,
            remark: this.m_train_model.remark,
          };
          await addModel(payload);
        }

        releaseDataset(this.m_train_model.dataImportId);
        await this.$store.dispatch(`${this.moduleName}/resetTraining`);
        await this.$router.push("/TaskManage");
      } catch (error) {
        this.$message.error(getApiErrorMessage(error, "任务保存失败，请稍后重试"));
      } finally {
        this.saving = false;
      }
    },

    async exportRes() {
      const divsToExport = ["pdf_1", "pdf_2", "pdf_3"];
      const pdf_positions = [
        { x: 5, y: 5 },
        { x: 5, y: 35 },
        { x: 5, y: 160 },
        // { x: 5, y: 210 },
      ];
      const pdf = new jsPDF();

      const renderPromises = divsToExport.map((divId, index) => {
        const div = document.getElementById(divId);
        return html2canvas(div).then((canvas) => {
          const imgData = canvas.toDataURL("image/png");
          const imgProps = pdf.getImageProperties(imgData);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          const position = pdf_positions[index] || { x: 0, y: 0 };
          pdf.addImage(
            imgData,
            "PNG",
            position.x,
            position.y,
            pdfWidth,
            pdfHeight
          );
        });
      });

      await Promise.all(renderPromises);
      pdf.save(`${this.m_taskName}.pdf`);
    },

    async backStep() {
      if (!hasDataset(this.m_train_model.dataImportId)) {
        await this.$store.dispatch(`${this.moduleName}/invalidateDataset`, {
          code: "LOCAL_DATASET_EXPIRED",
          message: "本地数据集已释放，请重新上传后再训练",
        });
        return;
      }
      try {
        await this.m_transitionTraining({ type: TRAINING_EVENT.BACK });
        this.m_changeModelTrain({ result: { mape_val: 0 } });
      } catch (error) {
        this.$message.error(error.message || "无法返回上一步");
      }
    },
  },
};
</script>

<style scoped>
#pdf_1{
  display: flex;
  justify-content: center; /* 水平居中 */
}
#pdf_2{
  display: flex;
  justify-content: center; /* 水平居中 */
}
.taskBox1 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin-bottom: 20px;
  width: 85%;
  height: auto;
  padding: 20px;
  border: 1px solid #fff;
  border-radius: 10px;
  background: rgba(118, 118, 118, 0.1);
}

.taskBox1 div:nth-child(10),
.taskBox1 div:nth-child(11),
.taskBox1 div:nth-child(12) {
  grid-column: span 3;
}

.taskBox2 {
  margin-bottom: 20px;
  width: 85%;
  padding: 20px;
  border: 1px solid #fff;
  border-radius: 10px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.4); /* 修正阴影的颜色和透明度 */
  background: rgba(118, 118, 118, 0.1);
}

.taskBox2 .algorithm_info {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

.taskInfoBox {
  font-size: 20px;
  margin-top: 8px;
}

.lineStyle {
  color: rgb(100, 172, 231);
  font-weight: 100;
  font-size: 25px;
}

.featureTitle {
  font-size: 25px;
  margin-right: 30px;
  margin-bottom: 20px;
}

h3 {
  display: inline;
  margin-right: 15%;
}

.graphBox {
  display: grid;
  /* grid-template-columns: repeat(2, 1fr); 两列，每列宽度相等 */
  width: 90%; /* 设置宽度 */
  height: 400px; /* 设置高度 */
  padding: 20px; /* 设置内边距 */
  background-color: #ffffff; /* 设置背景颜色为白色 */
  border-radius: 10px; /* 设置圆角半径 */
  border: 1px solid #ccc; /* 设置边框 */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* 设置阴影效果 */
  margin-bottom: 30px;
  margin-left: 60px;
}

.treeBox {
  width: 100%;
  height: 50vh;

  margin-top: 20px;
}

.buttonGroup {
  position: fixed;
  bottom: 3%;
  left: 50%;
  transform: translateX(-50%); /* 水平居中 */
  width: 300px;
  z-index: 9999; /* 置于最顶层 */
  margin-left: 5%;
}
span {
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
