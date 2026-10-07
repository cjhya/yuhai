<template>
  <div class="main">
    <el-alert
      title="当前步骤用于查看特征相关性与重要性；当前训练接口尚未接收人工筛选的特征清单。"
      type="info"
      :closable="false"
      show-icon
      class="feature-scope-alert"
    />
    <!---------------------------------------------------------- 特征重要性拖动滑块 -------------------------------------------------->
    <!------- 下拉框得到默认值 ----------------->
    <!-- 使用transition-group包裹动态列表 -->
    <div>
      <span class="lineStyle">▍</span>
      <span class="featureTitle">1、特征相关性分析：</span>
      <div id="heatChart" style="width: 100%; height: 400px"></div>
    </div>
    <div v-loading="compute_loading" class="reward-degree">
      <div style="margin-bottom: 10px">
        <div>
          <span class="lineStyle">▍</span><span class="featureTitle">2、特征重要性分析</span>
          <!-- <el-icon class="el-icon-warning-outline"></el-icon>
          <span id="tipText" :style="tipTextStyle"
            >选择一个算法初步计算各特征的特征重要性并获取相应的饼图：</span
          >
          <el-select
            v-model="value"
            style="margin: 20px"
            default-first-option
            @change="computeFeaturesImport(value)"
            :disabled="isDisabled"
          >
            <el-option
              v-for="item in options"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            >
            </el-option>
          </el-select>
          <el-button @click="clearFilter">清除</el-button> -->
        </div>
        <div id="pieChart" style="width: 100%; height: 400px"></div>
      </div>
    </div>

    <div class="buttonGroup">
      <el-button @click="backStep()" round>上一步</el-button>
      <el-button type="primary" @click="next()" round>下一步</el-button>
    </div>
  </div>
</template>

<script>
import { getRequest } from "@/api/user.js";
import vuex_mixin from "@/components/mixins/vuex_mixin";
import * as echarts from "echarts"; // 引入 ECharts
import chroma from "chroma-js"; //引入 chroma.js
import { getDatasetRows } from "@/domain/dataset/datasetRepository";
import { TRAINING_EVENT } from "@/domain/training/trainingWorkflow";

// import { treeData } from "@/components/tab/treeData.js";

export default {
  name: "FeatureSelect",
  props: {
    moduleName: {
      type: String,
      default: "modelTraining",
    },
  },
  mixins: [vuex_mixin],
  computed: {
    // 字体提示颜色
    tipTextStyle() {
      return {
        color: this.isDisabled ? "red" : "green",
      };
    },
  },
  data() {
    return {
      // 热力图数据
      heatCol: [],
      heatData: [],
      hashMap: { XGB: "XGBoost", RF: "随机森林" },
      // 所有特征计算重要性
      compute_loading: false,
      tableData: [], // 存储表格数据
      value: "",
      chart: null, // 存储 ECharts 实例
      showChart: false,
      chartData: [],
      isDisabled: false,
      options: [
        {
          value: "XGB",
          label: "XGBoost",
        },
        {
          value: "RF",
          label: "随机森林",
        },
      ],
      // 热力图示例数据
      x: [
        "注射（压力三段）", "注射（速度三段）", "注射（时间三段）", "保压（压力三段）", "保压（速度三段）",
        "保压（时间三段）", "喷嘴（温度）", "温度（1段）", "温控箱1卡板1温度", "温控箱1卡板2温度"
      ],
      y: [
        "实测值A-1", "实测值A-3", "实测值A-5", "实测值B-1", "实测值B-3",
        "实测B边变形", "实测C边变形", "实测D边变形", "实测I边变形", "实际（单重）"
      ],
      data: [
        [0, 0, 313.601], [0, 1, 313.677], [0, 2, 313.705], [0, 3, 225.270], [0, 4, 225.377],
        [1, 0, 0.899], [1, 1, 0.529], [1, 2, 0.293], [1, 3, 0.078], [1, 4, 0.0],
        [2, 0, 500.0], [2, 1, 520.0], [2, 2, 530.0], [2, 3, 540.0], [2, 4, 550.0],
        [3, 0, 125.0], [3, 1, 130.0], [3, 2, 120.0], [3, 3, 110.0], [3, 4, 115.0],
        [4, 0, 35.0], [4, 1, 40.0], [4, 2, 30.0], [4, 3, 25.0], [4, 4, 20.0],
        [5, 0, 8.0], [5, 1, 7.5], [5, 2, 8.2], [5, 3, 7.8], [5, 4, 7.9],
        [6, 0, 269.1], [6, 1, 270.0], [6, 2, 268.5], [6, 3, 267.0], [6, 4, 265.5],
        [7, 0, 262.4], [7, 1, 260.0], [7, 2, 258.0], [7, 3, 256.5], [7, 4, 255.0],
        [8, 0, 148.5], [8, 1, 150.0], [8, 2, 152.0], [8, 3, 153.5], [8, 4, 155.0],
        [9, 0, 270.0], [9, 1, 272.0], [9, 2, 274.0], [9, 3, 275.5], [9, 4, 278.0]
      ].map(function (item) {
        return [item[1], item[0], item[2] || '-'];
      })
      // 饼图示例数据

    };
  },

  created() { },
  mounted() {
    this.init()
  },
  methods: {
    init() {
      this.drawAcdtEcharts();
      this.initChart();
      if (this.m_train_model.nodeId && this.m_train_model.dataset) {
        this.getPearsonCorrelation(
          this.m_train_model.nodeId,
          this.m_train_model.dataset
        );
      }
    },

    // 初始化图表
    initChart() {
      const chartDom = document.getElementById("pieChart");
      console.log(chartDom);
      this.chart = echarts.init(chartDom);
      this.updateChart()
    },
    // 更新图表
    updateChart() {
      const option = {
        title: {
          text: "计算得到的各特征的特征重要性饼图",
          left: "center",
        },
        tooltip: {
          trigger: "item",
          formatter: "{a} <br/>{b}: {c} ({d}%)",
        },
        series: [
          {
            name: "特征重要度",
            type: "pie",
            radius: "50%",
            // data: this.chartData, // 使用动态数据
            data: [
              { value: 2.0, name: "注射（压力一段）" },
              { value: 500.0, name: "注射（速度三段）" },
              { value: 200.0, name: "注射（速度二段）" },
              { value: 55.0, name: "注射（时间三段）" },
              { value: 125.0, name: "保压（压力三段）" },
              { value: 35.0, name: "保压（速度三段）" },
              { value: 8.0, name: "保压（时间三段）" },
              { value: 269.12, name: "喷嘴（温度）" },
              { value: 262.42, name: "温度（1段）" },
              { value: 251.33, name: "温度（2段）" }
            ],
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowOffsetY: 0,
                shadowColor: "rgba(0, 0, 0, 0.5)",
              },
            },
          },
        ],
      };

      this.chart.setOption(option);
    },
    // 绘制热力图
    drawAcdtEcharts() {
      // 初始化 ECharts 实例，指定要渲染图表的 DOM 容器
      const chartDom = document.getElementById("heatChart");
      const myChart = echarts.init(chartDom);
      // 定义x数据
      // const x = this.heatCol
      const x = this.x
      // 定义y数据
      // const y = this.heatCol
      const y = this.y
      // 定义热力图数据，并转换数据格式
      // const data = this.heatData.map(function (item) {
      //   // 交换数据的前两项，用于适应 ECharts 的数据格式
      //   return [item[1], item[0], item[2] || "-"];
      // });
      const data = this.data
      // 定义颜色
      // const colors = ["#008CFF", "#d07071"]; // 定义热力图的颜色

      const gradientColors = chroma
        .scale(["#FFA500", "#008CFF"]) // 橘黄色到蓝色
        .mode("lab") // 使用 Lab 色彩空间来平滑过渡
        .colors(100); // 生成100个渐变色

      // 配置 ECharts 选项
      var option = {
        // 标题
        title: {
          text: "各特征的之间的皮尔逊相关系数热力图",
          left: "center",
        },
        // 提示框
        tooltip: {
          position: "top", // 提示框显示在顶部
        },
        // 网格配置
        grid: {
          height: "50%", // 网格高度为容器高度的50%
          top: "10%", // 网格距离顶部的距离
        },
        // X轴配置
        xAxis: {
          type: "category", // X轴为类目轴
          data: x, // X轴的数据为小时数据
          splitArea: {
            show: true, // 显示网格区域
          },
          axisLabel: {
            fontSize: 10, // 设置字体大小
          },
        },
        // Y轴配置
        yAxis: {
          type: "category", // Y轴为类目轴
          data: y, // Y轴的数据为星期数据
          splitArea: {
            show: true, // 显示网格区域
          },
          axisLabel: {
            fontSize: 10, // 设置字体大小
          },
        },
        // 视觉映射配置
        visualMap: {
          min: -1, // 视觉映射的最小值
          max: 1, // 视觉映射的最大值
          calculable: true, // 允许视觉映射组件可以交互
          orient: "horizontal", // 水平放置视觉映射组件
          left: "center", // 视觉映射组件居中
          bottom: "15%", // 视觉映射组件距离底部15%
          color: gradientColors,
        },
        // 系列配置
        series: [
          {
            // name: "特征", // 系列名称
            type: "heatmap", // 系列类型为热力图
            data: data, // 系列的数据
            label: {
              show: true, // 显示标签
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10, // 阴影模糊度
                shadowColor: "rgba(0, 0, 0, 0.5)", // 阴影颜色
              },
            },
          },
        ],
      };

      // 使用配置项设置 ECharts 实例
      option && myChart.setOption(option);

      // 添加窗口大小改变时的重绘监听器
      window.addEventListener("resize", () => {
        myChart.resize(); // 重新调整图表大小
      });
    },
    // 计算特征重要性，选择算法，返回最重要的几个特征饼图数据
    computeFeaturesImport(model) {
      console.log("模型名", model)
      console.log(
        "表格数据",
        getDatasetRows(this.m_train_model.dataImportId) || this.m_train_model.dataSet
      );
      this.showChart = true;
      // (this.compute_loading = true),
      //   postRequest("/runtime_bus/submitBus", {
      //     tableName: this.m_train_model.dataset,
      //     features: this.computeFeatures,
      //     labels: this.labelFeatures,
      //     tableId: this.m_train_model.nodeId,
      //     alg: model,
      //     mode: "software10",
      //   }).then((res) => {
      //     console.log(res);
      //     this.compute_loading = false;
      //     this.chartData = [];
      //     for (let i = 0; i < this.allFeatures.length; i++) {
      //       let data = new Object();
      //       data.value = this.allFeatures[i]["doctorRate"];
      //       data.name = this.allFeatures[i]["riskFactor"];
      //       this.chartData.push(data);
      //     }
      //     console.log(this.chartData);
      //     this.showChart = true;
      //   });
    },

    async next() {
      // if (this.labelFeatures.length < 1) {
      //   this.$message({
      //     message: "请选择标签特征！",
      //     type: "warning",
      //   });
      //   return;
      // }
      // if (this.computeFeatures.length < 1) {
      //   this.$message({
      //     type: "warning",
      //     message: "请选择至少1个特征参与运算",
      //   });
      //   return;
      // }
      // this.m_changeModelTrain({
      //   // known_features: this.knownFeatures,
      //   target_feature: this.labelFeatures,
      //   use_features: this.computeFeatures,
      //   all_features: this.allFeatures,
      //   use_labels: this.labelFeatures,
      // });

      // 发送后端请求
      // postRequest("", this.allFeatures).then((res) => {
      //   console.log(res);
      // });

      const rows = getDatasetRows(this.m_train_model.dataImportId);
      try {
        await this.m_transitionTraining({
          type: TRAINING_EVENT.CONFIRM_FEATURES,
          payload: { hasDataset: Boolean(rows && rows.length) },
        });
      } catch (error) {
        this.$message.error(error.message || "特征配置确认失败");
      }
    },
    clearFilter() {
      for (let i = 0; i < this.allFeatures.length; i++) {
        this.allFeatures[i]["doctorRate"] = 0;
      }
      this.value = "";
      console.log("this.allFeatures2", this.allFeatures);
    },

    backStep() {
      this.m_transitionTraining({ type: TRAINING_EVENT.BACK }).catch(error => {
        this.$message.error(error.message || "无法返回上一步");
      });
    },
    // 获取特征相关性的热力图数据   预留接口，传入数据为数据表单
    getPearsonCorrelation(tableId, tableName) {

      console.log(
        "表格数据",
        getDatasetRows(this.m_train_model.dataImportId) || this.m_train_model.dataSet
      );
      getRequest("/api/feature/getPearsonCorrelation", { tableId, tableName })
        .then((response) => {
          let data = response.data;
          let i = 0;
          let hashTable = {};
          for (let k of data) {
            let x = k.left,
              y = k.middle,
              value = k.right;
            if (!(x in hashTable)) {
              this.heatCol.push(x);
              hashTable[x] = i;
              i++;
            }
            if (!(y in hashTable)) {
              this.heatCol.push(y);
              hashTable[y] = i;
              i++;
            }
            let d = [hashTable[x], hashTable[y], value];
            // console.log(d);
            this.heatData.push(d);
          }
          // console.log(this.heatCol);
          // console.log(this.heatData);
          // 在数据加载完后后调用绘制函数
          this.drawAcdtEcharts();
        })
        .catch((error) => {
          console.log(error);
        });
    },
  },
};
</script>

<style scoped>
.feature-scope-alert {
  margin-bottom: 16px;
}

.main {
  height: auto;
  width: 80%;
  margin: 0 auto;
}

.main .info {
  height: 2rem;
  background-color: rgb(143, 144, 144, 0.3);
  line-height: 2rem;
  text-align: center;
}

.main .reward-degree {
  width: 100%;
}

.featureTitle {
  font-size: 20px;
  margin-right: 30px;
  margin-bottom: 20px;
}

.featureTitle2 {
  font-size: 25px;
  margin-right: 30px;
  margin-bottom: 20px;
}

.text-clip {
  margin-top: 5px;
  width: 150px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.text-clip:hover {
  text-overflow: none;
}

.lineStyle {
  color: rgb(100, 172, 231);
  font-weight: 100;
  font-size: 25px;
}

.lineTitleStyle {
  color: rgb(0, 140, 255);
  font-weight: 100;
  font-size: 25px;
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
.el-input {
  width: 100px;
  margin-left: 30px;
}

::v-deep .el-input input:focus {
  width: 200px;
  transition: all 0.5s ease;
}

::v-deep .el-pagination input:focus {
  width: 100px;
}

::v-deep .el-select input:focus {
  width: 100%;
}

.checkbox-item {
  opacity: 0;
  transform: translateY(100%);
  animation: fadeInUp 0.5s ease forwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(100%);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.slide-item {
  transition: all 1s ease;
  position: relative;
}

/* 进入和离开动画 */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.5s cubic-bezier(0.55, 0.085, 0.68, 0.53);
}

.slide-enter,
.slide-leave-to {
  /* 使用opacity和transform来模拟向上或向下滑动 */
  opacity: 0;
  transform: translateY(20px);
  /* 这里控制向上偏移的距离 */
}
</style>
