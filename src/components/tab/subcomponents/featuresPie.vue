<template>
  <div ref="featuresPie" :style="{ width: '100%', height: '100%' }"></div>
</template>

<script>
import * as echarts from 'echarts';

export default {
  name: 'FeaturesPie',
  props: {
    titleText: {
      type: String,
      default: '特征饼图',
    },
    data: {
      type: Array,
      required:true
    },
  },
  mounted() {
    this.initMyChart();
  },
  methods: {
    initMyChart() {
      const chartDom = this.$refs.featuresPie;
      const myChart = echarts.init(chartDom);
      const option = {
        title: {
          text: this.titleText,
          left: 'center', // 标题居中显示
        },
        tooltip: {
          trigger: 'item',
        },
        legend: {
          orient: 'vertical',
          left: 'left',
        },
        series: [
          {
            name: this.titleText,
            type: 'pie', // 使用饼图类型
            radius: '50%',
            data: this.data,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
          },
        ],
      };
      myChart.setOption(option);
    },
  },
};
</script>

<style scoped>
#featuresPie {
  width: 100%;
  height: 100%;
}
</style>
