<template>
    <div ref="treemapChart" style="width: 100%; height: 100%"></div>
  </template>
  
  <script>
  
  import * as echarts from "echarts";
  
  export default {
    name: "treemapChart",
    props: {
      title_text: {
        type: String,
        default: "混淆矩阵",
      },
      TP: {
        type: Number,
        required:true,
      },
      FN: {
        type: Number,
        required:true,
      },
      FP: {
        type: Number,
        required:true,
      },
      TN: {
        type: Number,
        required:true,
      },
    },
    mounted() {
      this.initTreemapChart();
    },
  
    methods: {
      initTreemapChart() {
        var chartDom = this.$refs.treemapChart;
        var myChart = echarts.init(chartDom);
        var option;
        
        var xs = ['0', '1'];
        var ys = ['1', '0'];

        var data = [[0, 0, this.FP], [0, 1, this.TP], [1, 0, this.TN], [1, 1, this.FN]];

        var min = 0;
        var max = 10;
        data.forEach((m) => {
          min = Math.min(min, m[2]);
          max = Math.max(max, m[2]);
        });
        max *= 1.1;
  
        option = {
          title: {
            text: this.title_text,
            left: 'center', // 标题居中显示
          },
          tooltip: {
            trigger: 'item',
          },
          grid: {
              height: '50%',
              width: '50%',
              // top: '10%'
          },
          xAxis: {
              type: 'category',
              name: '实际值',
              nameLocation: 'center',
              data: xs,
              axisLine: {
                show: false
              },
              axisTick: {
                show: false,
              },
          },
          yAxis: {
              type: 'category',
              name: '预测值',
              nameLocation: 'center',
              data: ys,
              axisLine: {
                show: false
              },
              axisTick: {
                show: false,
              },
          },
          visualMap: {
              min: min,
              max: max,
              right: '10%',
              top: 'center',
              itemHeight: '100%',
              inRange: {
              color: ['#F8FAFB', '#DCE3EC', '#D2DCE7', '#5075A1'],
              // colorLightness: 0.8,
              // colorSaturation: 1,
              // colorHue: 180,
              },
          },
          series: [{
              name: 'Punch Card',
              type: 'heatmap',
              data: data,
              label: {
                  show: true
              },
              emphasis: {
                  itemStyle: {
                      shadowBlur: 10,
                      shadowColor: 'rgba(0, 0, 0, 0.5)'
                  }
              }
          }]
      };
        option && myChart.setOption(option);
      },
    },
  };
  </script>
  
  <style>
  /* 可选的样式 */
  </style>
  
  