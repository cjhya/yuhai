<template>
  <div id="bar" ref="bar"></div>
</template>

<script>
import * as echarts from "echarts";
export default {
  name: "Bar",
  props: {
    title_text: {
      type: String,
      default: "柱状图",
    },
    data: {
      type: Array,
      default: () => [ ],
    },
    algNames: {
      type: Array,
      default: () => [ ],
    },
    date: {
      type: Array,
      default: () => [ ],
    },
  },
  data() {
    return {

    };
  },
  created() {


  },
  mounted() {
    this.initMyChart();
  },

  methods: {
    initMyChart() {
      console.log("Bar", this.data)
      var chartDom = document.getElementById('bar');
      var myChart = echarts.init(chartDom);
      var option;

      myChart.showLoading();


      option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross',
            crossStyle: {
              color: '#999'
            }
          }
        },
        toolbox: {
          feature: {
            // dataView: { show: true, readOnly: false },
            magicType: { show: true, type: ['line', 'bar'] },
            restore: { show: true },
            // saveAsImage: { show: true }
          }
        },
        legend: {
          data: this.algNames
        },
        xAxis: [
          {
            type: 'category',
            data: this.date,
            axisPointer: {
              type: 'shadow'
            }
          }
        ],
        yAxis: [
          {
            type: 'value',
            name: '次数',
            min: 0,
            max: 15,
            interval: 1,
            axisLabel: {
              formatter: '{value}'
            }
          }
          ,
          {
            type: 'value',
            name: '次数',
            min: 0,
            max: 15,
            interval: 5,
            axisLabel: {
              formatter: '{value} 次'
            }
          }
        ],
        series: this.data
      };
      option && myChart.setOption(option);
      myChart.hideLoading();
    },
  },
};
</script>

<style scoped>
#sprit {
  width: 100%;
  height: 100%;
}
</style>
