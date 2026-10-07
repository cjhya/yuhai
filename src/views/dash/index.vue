<template>
  <div>
    <div class="topStatistic">
      <el-card class="quickAccess-card">
        <div slot="header" class="clearfix">
          <span class="lineStyle">▍</span><span>快捷入口</span>
        </div>
        <div class="quickAccess">
          <div v-for="item in quickAccessItems" :key="item.route" @click="goToPage(item.route)"
            style="cursor: pointer; text-align: center; justify-content: center" slot="refrence">
            <el-popover placement="top" trigger="hover">
              <div>点击跳转到{{ item.text }}</div>
              <div slot="reference">
                <img :src="item.imageSrc" :alt="item.altText" class="imgStyle" />
                <div>{{ item.text }}</div>
              </div>
            </el-popover>
          </div>
        </div>
      </el-card>
      <el-card class="statisticalInformation-card">
        <div slot="header" class="clearfix">
          <span class="lineStyle">▍</span> <span>统计信息</span>
        </div>
        <div class="statisticalInformation">
          <div class="datasetsNuber">
            <el-icon class="el-icon-s-grid" style="font-size: 15px; margin-right: 5px"></el-icon>调参方案总数: <span>{{
              parameterNums }}</span>个
          </div>
          <div class="tasksNumber">
            <el-icon class="el-icon-s-order" style="font-size: 15px; margin-right: 5px"></el-icon>任务总数:<span>{{
              modelNums }}</span> 个
          </div>
          <!-- <div class="featuresNumber">
            <el-icon
              class="el-icon-s-data"
              style="font-size: 15px; margin-right: 5px"
            >
            </el-icon
            >知识条数:<span> {{ knowledge_num }}</span
            >个
          </div> -->
          <!-- <div class="predictDiseaseAccess"></div> -->
        </div>
      </el-card>
    </div>

    <div class="midStatistic">
      <el-card class="mid_statistic_card">
        <el-card>
          <div slot="header" class="clearfix">
            <span class="lineStyle">▍</span><span>近期新建训练任务数</span>
          </div>

          <div id="chartBox" style="height: 50vh; width: 40vw; margin: 0 auto">
            <LineChartVue :x="LineChartVue_x" :y="LineChartVue_y" v-if="LineChartVue_x.length && LineChartVue_y.length">
            </LineChartVue>
          </div>
        </el-card>

        <el-card>
          <div slot="header" class="clearfix">
            <span class="lineStyle">▍</span><span>算法使用频次</span>
          </div>
          <div id="chartBox">
            <Bar style="height: 50vh; width: 39vw; margin: 0 auto" :data="Bar_data" :date="Bar_date" :algNames="algNames"
              v-if="Bar_data.length">
            </Bar>
          </div>
        </el-card>
      </el-card>
    </div>
  </div>
</template>

<script>
import { getModelNums, getModelNearlyDays, getAlgoNearlyDays } from "@/api/model";
import { getParameterNums } from "@/api/parameterHistory";
import LineChartVue from "@/components/tab/subcomponents/LineChart.vue";
import Bar from "@/components/tab/subcomponents/Bar.vue";
export default {
  name: "index",
  components: { LineChartVue, Bar },
  data() {
    return {
      quickAccessItems: [
        {
          route: "/dataManage",
          imageSrc: require("../../assets/数据管理（快捷入口）.png"),
          altText: "数据管理（快捷入口)",
          text: "数据管理",
        },
        {
          route: "/ParameterTuning",
          imageSrc: require("../../assets/参数调优（快捷入口）.png"),
          altText: "参数调优（快捷入口)",
          text: "参数调优",
        },
        {
          route: "/ModelTraining",
          imageSrc: require("../../assets/模型训练（快捷入口）.png"),
          altText: "模型训练（快捷入口)",
          text: "模型训练",
        },
        {
          route: "/qualityPredict",
          imageSrc: require("../../assets/质量预测（快捷入口）.png"),
          altText: "质量预测（快捷入口)",
          text: "质量预测",
        },
      ],
      parameterNums: 0,
      modelNums: 0,
      LineChartVue_x: [],
      LineChartVue_y: [],
      table_value: "",
      table_value_options: [],
      sprit_values: [],

      Bar_date: [],
      Bar_data: [],
      algNames: [],

      chartLegend: [],
    };
  },

  created() {
    this.init();
    this.getChartData()
  },

  methods: {
    async init() {
      const resModel = await getModelNums()
      this.modelNums = resModel.data;
      console.log("nums", this.modelNums);
      const resParameter = await getParameterNums()
      this.parameterNums = resParameter.data;
      console.log("nums", this.parameterNums);
    },
    async getChartData() {
      const resLine = await getModelNearlyDays(10)
      this.LineChartVue_x = resLine.data.date;
      this.LineChartVue_y = resLine.data.number;
      const resBar = await getAlgoNearlyDays(10)
      console.log('resBar', resBar);
      this.getPastDays()
      // 初始化目标结构
      const result = {};
      const algoSet = new Set(resBar.data.map(item => item.algo));
      algoSet.forEach(algo => {
        result[algo] = this.Bar_date.map(date => {
          const found = resBar.data.find(item => item.algo === algo && item.date === date);
          return found ? found.number : 0;
        });
      });
      Object.keys(result).forEach((key) => {
        this.algNames.push(key);
        this.Bar_data.push({
          name: key,
          type: "bar",
          tooltip: {
            valueFormatter: function (value) {
              return value + " 次";
            },
          },
          data: result[key],
        });
      });
      console.log("Bar_data res", this.Bar_data, result);
    },
    getPastDays() {
      const days = [];
      const today = new Date();
      for (let i = 10; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const formatted = d.toISOString().split('T')[0]; // "YYYY-MM-DD"
        days.push(formatted);
      }
      this.Bar_date = days;
    },
    goToPage(route) {
      this.$router.push(route); // 使用 Vue Router 的 push 方法进行页面跳转
    },
  },
};
</script>

<style scoped>
.topStatistic {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 20px;
  width: 100%;
}

.quickAccess {
  margin-top: 10px;
}

.quickAccess,
.statisticalInformation {
  display: flex;
  justify-content: space-evenly;
  align-items: center;
}

.quickAccess img {
  position: relative;
  top: 0;
}

.quickAccess img:hover {
  top: -2px;
  box-shadow: 0 0 20px rgb(122, 122, 122, 0.7);
  background-color: rgba(102, 102, 102, 0.2);
}

.datasetsNuber,
.tasksNumber,
.featuresNumber {
  flex: 1;
  text-align: center;
  justify-content: center;
}

.datasetsNuber span,
.tasksNumber span,
.featuresNumber span {
  font-size: 30px;
  color: rgba(51, 109, 185, 0.9);
  margin: 0 1rem;
  font-weight: bold;
}

.imgStyle {
  width: 15%;
}

.datasetsNuber,
.tasksNumber,
.featuresNumber {
  padding: 10px;
  border: 1px solid #fff;
  border-radius: 10px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.2);
  background: rgba(255, 255, 255, 0.1);
  margin: 10px;
}

.clearfix:before,
.clearfix:after {
  display: table;
  content: "";
}

.clearfix:after {
  clear: both;
}

.lineStyle {
  color: rgb(100, 172, 231);
  font-weight: 40;
}

.card {
  padding: 0;
  height: 100%;
}

#chartBox {
  width: 100%;
  height: 100%;
}

.chartSelect {
  width: 100px;
  margin-left: 25px;
}

.chartDateSelect {
  width: 100px;
  margin-left: 25px;
}

.top_statistic_card {
  text-align: center;
  margin-top: 10px;
  margin-bottom: 10px;
  width: 95%;
  height: 33%;
}

.top_statistic_card .el-card {
  display: inline-block;
  width: 21%;
  height: 100px;
  margin: 1%;
  padding: 10px;
  border: 1px solid #fff;
  border-radius: 10px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.2);
  /* 修正阴影的颜色和透明度 */
  background: rgba(255, 255, 255, 0.1);
}

.midStatistic {
  width: 100%;
}

.mid_statistic_card,
.bottom_statistic_card {
  margin-top: 10px;
  margin-bottom: 10px;
  width: 100%;
  height: 65vh;
}

.mid_statistic_card .el-card,
.bottom_statistic_card .el-card {
  display: inline-block;
  width: 48%;
  height: 60vh;
  /* margin: 0.5% 1.3% 0.5% 1.3%; */
  margin: 0 1%;
  border: 1px solid #fff;
  border-radius: 10px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.2);
  background: rgba(255, 255, 255, 0.1);
}
</style>
