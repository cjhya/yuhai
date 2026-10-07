<template>
  <div style="padding: 10px">
    <el-page-header style="float: left" @back="goBack" content="任务详情页面" class="custom-page-header"></el-page-header>
    <div class="buttonGroup">
      <el-button type="success" @click="exportToPDF()">导出PDF</el-button>
    </div>
    <div class="taskBox1" id="pdf_1">
      <div>
        <span class="lineStyle">▍</span><span class="featureTitle">任务信息：</span>
      </div>
      <div></div>
      <div></div>
      <div></div>
      <div class="taskInfoBox taskname">
        <el-icon class="el-icon-edit-outline el-icon"></el-icon>
        <span>任务名称：</span>
        <span>{{ this.taskData.taskName }}</span>
      </div>
      <div class="taskInfoBox principal">
        <el-icon class="el-icon-user el-icon"></el-icon><span>任务创建人：</span>
        <span>{{ this.taskData.responsiber }}</span>
      </div>
      <div class="taskInfoBox disease">
        <el-icon class="el-icon-price-tag el-icon"></el-icon><span>所属产品系列：</span>
        <span>{{ this.taskData.productSeries }}</span>
      </div>
      <div></div>
      <div class="taskInfoBox dataset el-icon" :title="taskData.dataSet">
        <el-icon class="el-icon-coin el-icon"></el-icon><span>所用数据：</span>
        <span>{{ this.taskData.dataName }}</span>
      </div>
      <div class="taskInfoBox algorithm">
        <el-icon class="el-icon-cpu el-icon"></el-icon><span>所用算法：</span>
        <span>{{ this.taskData.algorithm }}</span>
      </div>
      <div class="taskInfoBox use_features">
        <el-icon class="el-icon-date el-icon"></el-icon><span>创建时间：</span>
        <span>{{ this.taskData.createTime }}</span>
      </div>
      <div></div>
      <div class="taskInfoBox comment">
        <el-icon class="el-icon-edit el-icon"></el-icon><span>任务备注：</span>
        <span>{{ this.taskData.remark }}</span>
      </div>
    </div>

    <div class="taskBox2" id="pdf_2">
      <div>
        <span class="lineStyle">▍</span><span class="featureTitle">{{ this.taskData.modelname }}模型信息：</span>
      </div>
      <div></div>
      <div></div>
      <div></div>

      <div class="taskInfoBox">
        <el-icon class="el-icon-s-data el-icon"></el-icon><span>平均绝对百分误差MAPE：</span>
        <span>{{ this.result.mape_val }}</span>
        <!-- <span v-if="this.checkRmse" style="color: green">{{
          transTOPercent(this.taskData.rmse)
        }}</span>
        <span v-else style="color: red">{{
          transTOPercent(this.taskData.rmse)
        }}</span> -->
      </div>
      <div></div>
      <div></div>
      <!-- <div class="taskInfoBox use_features">
        <el-icon class="el-icon-s-grid el-icon"></el-icon>
        <span style="color: green">绿色</span>
        <span>表示达标，</span>
        <span style="color: red">红色</span>
        <span>表示未达标</span>
      </div> -->

      <div></div>
      <div class="taskInfoBox">
        <el-icon class="el-icon-s-promotion el-icon"></el-icon><span>任务结果可视化：</span>
      </div>
      <!-- <div></div>
      <div></div>
      <div></div>
      <div class="graphBox">
        <div class="echart" id="lossEchart" :style="myChartStyle"></div>
      </div>

      <div class="graphBox">
        <div class="echart" id="compareEchart" :style="myChartStyle"></div>
      </div>
      <div></div>
      <div></div>
      <div></div> -->

      <!-------------------------- loss曲线图和reward曲线图 ----------------------------->

      <!-- <div
        ref="graphBox"
        class="graphBox"
        v-if="this.taskData.totalrewards && this.taskData.totallosses"
      >
        <div>
          <RewardCurve :rewardData="rewardData" />
        </div>

        <div>
          <LossCurve :lossData="lossData" />
        </div>
      </div> -->
    </div>
  </div>
</template>

<script>
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { getRequest } from "@/api/user";

import * as echarts from "echarts";

export default {
  name: "TaskCheck",
  mounted() {
    this.initEcharts();
  },
  computed: {
    modelId() {
      return this.$route.params.id
    }
  },
  created() {
    this.init();
  },
  data() {
    return {
      usedData: "",
      mae: "",
      rmse: "",
      r: "",
      checkMae: false,
      checkRmse: false,
      checkR: false,
      taskData: {},
      result: {},
      rewardData: [],
      lossData: [],
      trainLossList: [],
      valLossList: [],
      yPred: [],
      yReal: [],
      xLoss: [],
      xCompare: [],
      myChartStyle: { float: "left", width: "100%", height: "400px" }, //图表样式
      hashMap1: {
        zj: ["MAE<=15", "RMSE<=25", "R>0.7"],
      },
      hashMap2: {
        zj: [
          [15, "<="],
          [25, "<="],
          [0.7, ">"],
        ],
      },
      hashMap3: {
        zj: "zj",
      },
    };
  },

  methods: {
    async init() {
      // 发送请求
      const { data } = await getRequest(`model/checkModel/${this.modelId}`)
      // 隐藏 loading
      this.$loading().close();
      // 从路由参数中获取 result 数据
      this.taskData = data;
      console.log("this.taskData", this.taskData);
      this.result = JSON.parse(data.resultJson)
      // this.getTrainLossList(this.taskData.trainloss);
      // this.getValLossList(this.taskData.valloss);
      // this.getYPred(this.taskData.predlist);
      // this.getYReal(this.taskData.reallist);
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
    getTrainLossList(data) {
      data = data.split("-");
      let cnt = 1;
      for (let op of data) {
        this.trainLossList.push(parseFloat(op));
        this.xLoss.push(cnt++);
      }
      // console.log(this.trainLossList);
    },

    frontColor(data, target, operator) {
      data = parseFloat(data);
      target = parseFloat(target);
      if (operator == "<=") {
        return data <= target;
      } else if (operator == "<") {
        return data < target;
      } else if (operator == ">=") {
        return data >= target;
      }
      return data > target;
    },

    getValLossList(data) {
      data = data.split("-");
      for (let op of data) {
        this.valLossList.push(parseFloat(op));
      }
      // console.log(this.valLossList);
    },

    getYPred(data) {
      data = data.split("-");
      for (let op of data) {
        this.yPred.push(parseFloat(op));
      }
      // console.log(this.yPred);
    },

    getYReal(data) {
      data = data.split("-");
      let cnt = 1;
      for (let op of data) {
        this.yReal.push(parseFloat(op));
        this.xCompare.push(cnt++);
      }
      // console.log(this.yReal);
    },
    goBack() {
      this.$router.push("/TaskManage");
    },
    transTOPercent(rate) {
      return parseFloat(rate).toFixed(2);
    },
    init_reward_and_loss() {
      // 使用正则表达式匹配每个子数组中的数字和字符串，并构建二维数组
      const regex = /\['([^']*)',(-?\d+\.?\d+)\]/g;
      let reward_match;
      let loss_match;
      while ((reward_match = regex.exec(this.taskData.totalrewards)) !== null) {
        this.rewardData.push([reward_match[1], parseFloat(reward_match[2])]);
      }
      while ((loss_match = regex.exec(this.taskData.totallosses)) !== null) {
        this.lossData.push([loss_match[1], parseFloat(loss_match[2])]);
      }
      console.log("this.rewardData", this.rewardData);
      console.log("this.lossData", this.lossData);
    },
    transTONumber(confusion) {
      return parseInt(confusion);
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

    async exportToPDF() {
      const divsToExport = ["pdf_1", "pdf_2"];
      const pdf_positions = [];

      const pdf = new jsPDF();

      // 初始位置相对于顶部的偏移量
      let offsetY = 10;

      // 遍历每个要导出的div
      for (const divId of divsToExport) {
        const div = document.getElementById(divId);
        // 获取div相对于父元素的位置信息
        const parentRect = div.parentElement.getBoundingClientRect();
        const divRect = div.getBoundingClientRect();
        const relativeX = divRect.left - parentRect.left;
        const relativeY = divRect.top - parentRect.top - offsetY;
        // 计算div在PDF页面中的位置
        const pdfX =
          relativeX * (pdf.internal.pageSize.getWidth() / parentRect.width);
        const pdfY =
          relativeY * (pdf.internal.pageSize.getHeight() / parentRect.height);
        // 将位置信息添加到pdf_positions数组中
        pdf_positions.push({ x: pdfX, y: pdfY });

        // 更新下一个div相对于顶部的偏移量
        offsetY += 20;

        // 使用html2canvas将div转换为图片并添加到PDF中
        const canvas = await html2canvas(div, { dpi: 300, scale: 2 });
        const imgData = canvas.toDataURL("image/png");
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, "PNG", pdfX, pdfY, pdfWidth, pdfHeight);
      }

      // 保存PDF文件
      pdf.save(`${this.taskData.taskname}.pdf`);
    },

    downloadIMG() {
      console.log("111111");
      // 获取要下载的元素的 DOM 节点
      const graphBox = this.$refs.graphBox;
      console.log("graphBox", graphBox);

      // 使用 html2canvas 将 DOM 节点转换为 canvas
      html2canvas(graphBox).then((canvas) => {
        // 创建一个新的 Image 对象
        const img = new Image();

        // 将 canvas 的数据赋值给 Image 对象
        img.src = canvas.toDataURL();

        // 创建一个下载链接
        const link = document.createElement("a");
        link.href = img.src;

        // 设置下载链接的属性
        link.download = "graph.png";

        // 触发点击下载
        link.click();
      });
    },
  },
};
</script>

<style scoped>
.custom-page-header {
  padding: 20px;
}

.taskBox1,
.taskBox2 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin-bottom: 20px;
  width: 99%;
  height: auto;
  padding: 20px;
  border: 1px solid #fff;
  border-radius: 10px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.4);
  background: rgba(118, 118, 118, 0.1);
}

.taskBox1>span:first-child,
.taskBox2>span:first-child {
  font-size: 30px;
  margin-bottom: 20px;
}

.taskBox1 div:nth-child(n + 13):nth-child(-n + 16),
.taskBox2 div:nth-child(n + 13):nth-child(-n + 16) {
  grid-column: span 4;
}

.el-icon {
  margin-right: 5px;
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

.taskInfoBox {
  font-size: 20px;
  margin-top: 8px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  position: relative;
}

.graphBox {
  display: flex;
  /* 使用 flex 布局 */
  width: 97%;
  /* 设置宽度 */
  height: 400px;
  /* 设置高度 */
  padding: 20px;
  /* 设置内边距 */
  background-color: #ffffff;
  /* 设置背景颜色为白色 */
  border-radius: 10px;
  /* 设置圆角半径 */
  border: 1px solid #ccc;
  /* 设置边框 */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  /* 设置阴影效果 */
  margin-bottom: 30px;
  margin-left: 10px;
  margin-top: 10px;
}

.graphBox>div {
  flex: 1;
  /* 子元素平均占据可用空间 */
}

.buttonGroup {
  float: right;
  margin-right: 50px;
}
</style>
