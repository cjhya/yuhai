<template>
  <div id="lineChart" ref="lineChart"></div>
</template>

<script>
import * as echarts from "echarts";
export default {
  name: "lineChart",
  props: {
    x: {
      type: Array,
      default: () => [],
    },
    y: {
      type: Array,
      default: () => [],
    },
  },

  data() {
    return {};
  },

  mounted() {
    this.initMyChart();
  },

  methods: {
    initMyChart() {
      var chartDom = this.$refs.lineChart;
      var myChart = echarts.init(chartDom);
      var option;

      option = {
        // legend: {
        //   data: ["任务数"],
        // },
        grid: {
          left: "2%",
          right: "4%",
          bottom: "10%",
          top: "10%",
          containLabel: true,
        },
        tooltip: {
          trigger: "axis",
        },
        xAxis: {
          type: "category",
          data: this.x,
          // data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        },
        yAxis: {
          type: "value",
        },
        // series: this.statistic,
        series: [
          {
            name:"任务数", 
            // data: [1, 2, 0, 7, 8, 12, 3],
            data: this.y,
            type: "line",
            smooth: true,
          },
        ],
      };

      option && myChart.setOption(option);
    },
  },
};
</script>

<style scoped>
#lineChart {
  width: 100%;
  height: 100%;
}
</style>
