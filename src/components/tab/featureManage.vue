<template>
  <el-container style="height: 100%;">
    <!-- 左侧关系图 -->
    <el-aside width="60%" style="height: 100%; background: #f5f5f5;">
      <div ref="relationChart" style="width: 100%; height: 100%;overflow: hidden;"></div>
    </el-aside>

    <!-- 右侧内容 -->
    <el-main style="height: 100%; padding: 10px;overflow: hidden;">
      <el-row style="height: 40%;">
        <!-- 雷达图 -->
        <el-col :span="24" style="height: 100%;">
          <div ref="radarChart" style="width: 100%; height: 100%;"></div>
        </el-col>
      </el-row>
      <el-row style="height: 60%; overflow-y: hidden">

        <el-col :span="24" style="height: 85%; ">
          <!-- 表格标题 -->
          <h3 style="text-align: left; margin: 10px 0;">特征与标签相关性表</h3>
          <!-- 表格 -->
          <el-table :data="relatedData" border style="width: 110%; height: 100%;margin-right: 10px;" height="300">
            <el-table-column prop="featureType" label="特征类型" width="80%" align="center"></el-table-column>
            <el-table-column prop="feature" label="标签" width="85%" align="center"></el-table-column>
            <el-table-column prop="indicator" label="特征" width="170%" align="center"></el-table-column>
            <el-table-column prop="value" label="相关性值" width="100%" align="center"></el-table-column>
            <el-table-column prop="type" label="相关类型" width="80%" align="center"></el-table-column>
            <el-table-column prop="level" label="重要程度" width="80%" align="center"></el-table-column>
          </el-table>
        </el-col>
      </el-row>
    </el-main>
  </el-container>
</template>

<script>
import * as echarts from "echarts";
// import jsonData from './data.json';
export default {
  data() {
    return {
      chart: null,
      radarChart: null,
      selectedNode: null,
      categories: [
        // { name: '基本信息' },
        { name: '可调参数' },
        { name: '标签' }
      ],
      nodes: [],
      edges: [],
      jsonData: [],
      relatedData: [], // 新增的用于存储关联数据的数组
      rawCorrelationData: [{
        "target_1": 0.0329200293,
        "target_2": 0.0240949146,
        "target_3": 0.000108183,
        "target_4": 0.001227485,
        "target_5": 0.000197017,
        "target_6": 0.0016802828,
        "target_7": 0.0001975276,
        "target_8": 0.0006207079,
        "target_9": 0.0004876704,
        "target_10": 0.0081284187,
        "target_11": 0.0005394239,
        "target_12": 0.0019067308,
        "target_13": 0.0003000684
      },
      {
        "target_1": 0.0146799841,
        "target_2": 0.0047458826,
        "target_3": 0.0028065937,
        "target_4": 0.0072762828,
        "target_5": 0.0018955165,
        "target_6": 0.0035258484,
        "target_7": 0.0040562327,
        "target_8": 0.0034928376,
        "target_9": 0.0322900247,
        "target_10": 0.0310209117,
        "target_11": 0.0198667654,
        "target_12": 0.0163931189,
        "target_13": 0.0193759416
      },
      {
        "target_1": 0.0080953185,
        "target_2": 0.0052819304,
        "target_3": 0.0028665228,
        "target_4": 0.0037809851,
        "target_5": 0.0014052844,
        "target_6": 0.0024114697,
        "target_7": 0.0029052218,
        "target_8": 0.0011365994,
        "target_9": 0.0198036588,
        "target_10": 0.0308608507,
        "target_11": 0.0065210013,
        "target_12": 0.0079667403,
        "target_13": 0.0119511589
      },
      {
        "target_1": 0.0080514846,
        "target_2": 0.0028437644,
        "target_3": 0.0014091599,
        "target_4": 0.0021904686,
        "target_5": 0.000644865,
        "target_6": 0.0053716706,
        "target_7": 0.0084274621,
        "target_8": 0.0008301343,
        "target_9": 0.0131944433,
        "target_10": 0.0173147676,
        "target_11": 0.0230030954,
        "target_12": 0.0114032786,
        "target_13": 0.0043484604
      },
      {
        "target_1": 0.0069337754,
        "target_2": 0.009942295,
        "target_3": 0.0044088856,
        "target_4": 0.0009653998,
        "target_5": 0.0028975674,
        "target_6": 0.003193349,
        "target_7": 0.0032010084,
        "target_8": 0.0008262337,
        "target_9": 0.0160565582,
        "target_10": 0.0071267285,
        "target_11": 0.0130000179,
        "target_12": 0.0129602408,
        "target_13": 0.0049378688
      },
      {
        "target_1": 0.0038171477,
        "target_2": 0.0039675349,
        "target_3": 0.002002144,
        "target_4": 0.002199539,
        "target_5": 0.0013318717,
        "target_6": 0.0013262065,
        "target_7": 0.0019814608,
        "target_8": 0.0003964147,
        "target_9": 0.0273786692,
        "target_10": 0.0262557871,
        "target_11": 0.0118468344,
        "target_12": 0.0091094042,
        "target_13": 0.0073849781
      },
      {
        "target_1": 0.0017012745,
        "target_2": 0.0007859736,
        "target_3": 0.001118732,
        "target_4": 0.0000866988,
        "target_5": 0.000071797,
        "target_6": 0.0000099535,
        "target_7": 0.000156405,
        "target_8": 0.0000374929,
        "target_9": 0.0421779065,
        "target_10": 0.0005391719,
        "target_11": 0.0003547406,
        "target_12": 0.005370293,
        "target_13": 0.0000387013
      }]
    };
  },
  mounted() {
    this.$notify({
        title: "提示",
        message: "您可在此页面查看特征与标签的关系",
        type: "success",
      });
    this.jsonData = this.convertCorrelationData(this.rawCorrelationData);
    this.initCharts();
    // this.initRelationChart();
    // this.initRadarChart();
  },
  methods: {
    convertCorrelationData(rawData) {
      const indicators = [
        "保压（压力三段）", "温度（2段）", "喷嘴（温度）", "模温机公模出水口温度", "温度（1段）",
        "模温机母模出水口温度", "保压（速度三段）"
      ];

      const features = [
        "实测值A-1", "实测值A-3", "实测值A-5", "实测值B-1", "实测值B-2", "实测值B-3",
        "实测值B-4", "实测值B-5", "实测A边变形", "实测B边变形", "实测C边变形", "实测D边变形", "实测I边变形"
      ];

      const result = [];

      rawData.forEach((row, rowIndex) => {
        for (let i = 1; i <= 13; i++) {
          const value = row[`target_${i}`] * 10;
          let level = "中";

          if (value >= 0.1) level = "高";
          else if (value < 0.01) level = "低";

          result.push({
            Feature: features[rowIndex],
            Indicator: indicators[Math.floor((i - 1) % indicators.length)],
            Value: parseFloat(value.toFixed(6)),
            Type: "正相关", // 你可以根据需要判断正负
            Level: level
          });
        }
      });

      return {
        "Adjustable Parameters": result
      };
    },
    initCharts() {
      this.chart = echarts.init(this.$refs.relationChart);
      this.radarChart = echarts.init(this.$refs.radarChart);

      this.prepareData(this.jsonData);
      const option = this.getOption();
      this.chart.setOption(option);

      // Add click event listener to the graph
      this.chart.on('click', (params) => {
        if (params.dataType === 'node') {
          this.selectedNode = params.data;
          this.updateRadarChart(params.data.name);
          this.updateRelatedData(params.data.name);
        } else {
          this.selectedNode = null;
          this.relatedData = [];
        }
      });
    },
    prepareData(data) {
      // data['Basic Information'].forEach(item => {
      //   if (!this.nodes.find(node => node.name === item.Feature)) {
      //     this.nodes.push({ name: item.Feature, category: 0 });
      //   }
      //   if (!this.nodes.find(node => node.name === item.Indicator)) {
      //     this.nodes.push({ name: item.Indicator, category: 2 });
      //   }
      //   this.edges.push({
      //     source: item.Feature,
      //     target: item.Indicator,
      //     value: Math.abs(item.Value),
      //     lineStyle: {
      //       color: item.Value > 0 ? 'red' : 'blue',
      //       width: Math.abs(item.Value) * 5 // Adjust the multiplier for desired thickness
      //     }
      //   });
      // });

      data['Adjustable Parameters'].forEach(item => {
        if (!this.nodes.find(node => node.name === item.Feature)) {
          this.nodes.push({ name: item.Feature, category: 0 });
        }
        if (!this.nodes.find(node => node.name === item.Indicator)) {
          this.nodes.push({ name: item.Indicator, category: 1 });
        }
        this.edges.push({
          source: item.Feature,
          target: item.Indicator,
          value: Math.abs(item.Value),
          lineStyle: {
            color: item.Value > 0 ? 'red' : 'blue',
            width: Math.abs(item.Value) * 5 // Adjust the multiplier for desired thickness
          }
        });
      });
    },
    getOption() {
      return {
        title: {
          text: '特征-标签关系图'
        },
        tooltip: {},
        legend: [
          {
            orient: 'vertical', // 图例垂直显示
            x: 'right',         // 图例位置在右侧
            y: 'top',           // 图例位置在顶部
            data: this.categories.map(category => category.name)
          }
        ],
        series: [
          {
            type: 'graph',
            layout: 'circular',
            symbolSize: 60,
            initLayout: 'circular', // 初始布局为圆形，更有序
            roam: true,
            label: {
              show: true
            },
            edgeSymbol: [null, null], // 移除边的符号（包括箭头）
            edgeLabel: {
              fontSize: 20
            },
            emphasis: {
              focus: 'adjacency',
              lineStyle: {
                width: 10
              }
            },
            force: {
              repulsion: 2000,
              edgeLength: 300,
              layoutAnimation: false, // 关闭动画，防止初始化弹跳
            },
            lineStyle: {
              width: 500,
            },
            layoutAnimation: false,
            categories: this.categories,
            nodes: this.nodes,
            edges: this.edges
          }
        ]
      };
    },

    updateRadarChart(selectedNodeName) {
      const relatedFeatures = [];
      const nameSet = new Set();
      let max = 0;
      this.jsonData['Adjustable Parameters'].forEach(item => {
        if (item.Indicator === selectedNodeName || item.Feature === selectedNodeName) {
          const other = item.Indicator === selectedNodeName ? item.Feature : item.Indicator;
          const value = Math.abs(item.Value);

          if (!nameSet.has(other)) {
            if (value > max) {
              max = value
            }
            relatedFeatures.push({ name: other, value: value });
            nameSet.add(other);
          }
        }
      });

      const isFeature = selectedNodeName.includes('实测') || selectedNodeName.includes('变形');
      const radarOption = {
        title: {
          text: `${selectedNodeName} 与其他${isFeature ? '特征' : '标签'}的关系`
        },
        tooltip: {
          trigger: 'item',
          position: 'bottom'
        },
        radar: {
          indicator: relatedFeatures.map(feat => ({ name: feat.name, max: max })),
        },
        series: [
          {
            type: 'radar',
            tooltip: {
              trigger: 'item'
            },
            areaStyle: {},
            data: [
              {
                value: relatedFeatures.map(feat => feat.value),
                name: selectedNodeName
              }
            ]
          }
        ]
      };

      this.radarChart.setOption(radarOption);
    },

    updateRelatedData(selectedNodeName) {
      this.relatedData = [];

      const node = this.nodes.find(n => n.name === selectedNodeName);
      if (!node) return;

      const isFeature = node.category === 0;

      this.jsonData['Adjustable Parameters'].forEach(item => {
        if (item.Indicator === selectedNodeName || item.Feature === selectedNodeName) {
          const featureType = '可调参数';
          const value = item.Value;
          const type = item.Type;
          const level = item.Level;

          if (isFeature) {
            this.relatedData.push({
              featureType,
              feature: selectedNodeName,
              indicator: item.Indicator,
              value,
              type,
              level
            });
          } else {
            this.relatedData.push({
              featureType,
              feature: item.Feature,
              indicator: selectedNodeName,
              value,
              type,
              level
            });
          }
        }
      });

      // ✅ 根据 value 从大到小排序
      this.relatedData.sort((a, b) => b.value - a.value);

      console.log('相关表格数据:', this.relatedData);
    }

  },
};
</script>

<style scoped>
/* 确保页面和容器高度设置正确 */
html,
body,
#app {
  height: 100%;
  margin: 0;
}

#relation-chart,
#radar-chart {
  width: 100%;
  height: 100%;
}

/* 添加滚动条样式 */
.el-table__body-wrapper {
  overflow-y: auto !important;
  /* 强制表格内部滚动条 */
}
</style>
