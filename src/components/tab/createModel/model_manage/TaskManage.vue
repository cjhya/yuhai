<template>
  <div class="main">
    <div class="container">
      <!--==========================     头部搜索框     ==============================================================-->
      <div class="search-input">
        <div>
          本页面可进行历史任务的查看和删除，您可根据所用算法、产品系列、任务名称、负责人等条件筛选任务，筛选结果由创建时间由远及近排列
        </div>
        <div>
          <span id="search-algorithm">
            <i class="el-icon-price-tag"></i> 产品系列：
            <el-autocomplete v-model="productSeries" placeholder="请输入产品系列" clearable style="width: auto"
              :fetch-suggestions="searchProductSeries" @select="handleSelect" size="small"></el-autocomplete>
          </span>
          <span id="search-algorithm">
            <i class="el-icon-news"></i> 所用算法：
            <el-autocomplete v-model="algorithm" placeholder="请输入所用算法" clearable style="width: auto"
              :fetch-suggestions="searchModelnames" @select="handleSelect" size="small"></el-autocomplete>
          </span>
          <span id="search-taskName">
            <i class="el-icon-edit-outline"></i> 任务名称：
            <el-autocomplete v-model="taskName" placeholder="请输入任务名称" clearable style="width: auto"
              :fetch-suggestions="searchTasknames" @select="handleSelect" size="small"></el-autocomplete>
          </span>
          <span id="search-responsiber">
            <i class="el-icon-user"></i> 任务创建人：
            <el-autocomplete v-model="responsiber" placeholder="请输入任务创建人" clearable style="width: auto"
              :fetch-suggestions="searchLeaders" @select="handleSelect" size="small"></el-autocomplete>
          </span>

          <el-button @click="clearFilter" size="small">清除</el-button>
          <div style="float: right">
            <el-popover placement="bottom" trigger="hover">
              <div>跳转到模型训练进行新建任务</div>
              <el-button type="success" @click="navigateToModelTraining" slot="reference" size="small">新建任务</el-button>
            </el-popover>
          </div>
        </div>
        <div style="margin-top: 10px">
          筛选结果：
          <span style="color: red">{{ filteredTaskList.length }} </span>
          个任务
        </div>
      </div>

      <!--===============================    卡片组     ==============================================================-->
      <div class="cardGroup">
        <!-- 任务卡片循环，现在基于分页后的数据 -->
        <el-card v-for="item in displayedTasks" :key="item.id" class="taskCard taskCard-item" shadow="always">
          <div class="cardInfo">
            <div>
              <span class="ttl">任务名称：</span>
              <span v-html="highlightMatch(item.taskName, taskName)"></span>
            </div>
            <div>
              <span class="ttl">任务创建人：</span>
              <span v-html="highlightMatch(item.responsiber, responsiber)"></span>
            </div>
            <div>
              <span class="ttl">产品系列：</span>
              <span v-html="highlightMatch(item.productSeries, productSeries)"></span>
            </div>
            <div>
              <span class="ttl">所用模型：</span>
              <span v-html="highlightMatch(item.algorithm, algorithm)"></span>
            </div>
            <div>
              <span class="ttl">数据表：</span><span v-html="highlightMatch(item.dataSet, dataSet)"></span>
            </div>
            <div><span class="ttl">创建时间：</span><span v-html="highlightMatch(item.createTime, createTime)"></span></div>
          </div>
          <div class="buttonGroup">
            <el-popover placement="top" trigger="hover">
              <div>点击查看任务详情</div>
              <el-button slot="reference" type="primary" @click="handleCheck(item)">查看</el-button>
            </el-popover>
            <span style="margin: 10px"></span>

            <el-popconfirm confirm-button-text="确认" cancel-button-text="取消" icon="el-icon-info" icon-color="red"
              title="确定删除该模型吗？" @confirm="handleDelete(item)" @cancel="onCancel">
              <el-button type="danger" slot="reference" v-if="role == 0 || item.uid == uid">删除</el-button>
            </el-popconfirm>
          </div>
        </el-card>
      </div>
      <!-- 分页组件 -->
      <el-pagination @size-change="handleSizeChange" @current-change="handlePageChange" :current-page="currentPage"
        :page-sizes="[10, 15, 20, 30]" :page-size="pageSize" layout="total, sizes, prev, pager, next, jumper"
        :total="filteredTaskList.length" />
    </div>
  </div>
</template>

<script>

import { getALLModel, delModel } from "@/api/model"

export default {
  name: "TaskManage",
  computed: {
    filteredTaskList() {
      // 进行筛选
      let filteredList = this.taskList.filter((task) => {
        const matchesProductSeries = !this.productSeries || task.productSeries === this.productSeries;
        const matchesAlgorithm = !this.algorithm || task.algorithm === this.algorithm;
        const matchesLeader = !this.responsiber || new RegExp(this.responsiber, "i").test(task.responsiber);
        const matchesTask = !this.taskName || new RegExp(this.taskName, "i").test(task.taskName);

        return matchesProductSeries && matchesAlgorithm && matchesLeader && matchesTask;
      });
      // 进行排序
      return filteredList.sort((a, b) => {
        return new Date(b.createTime) - new Date(a.createTime);
      });
    },
    displayedTasks() {
      // 筛选和排序逻辑合并一处
      let filteredAndSortedList = this.taskList.filter((task) => {
        const matchesProductSeries = !this.productSeries || task.productSeries === this.productSeries;
        const matchesAlgorithm = !this.algorithm || task.algorithm === this.algorithm;
        const matchesLeader = !this.responsiber || new RegExp(this.responsiber, "i").test(task.responsiber);
        const matchesTask = !this.taskName || new RegExp(this.taskName, "i").test(task.taskName);
        return matchesProductSeries && matchesAlgorithm && matchesLeader && matchesTask;
      })
        .sort((a, b) => new Date(b.createTime) - new Date(a.createTime));

      // 分页
      const startIndex = (this.currentPage - 1) * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      return filteredAndSortedList.slice(startIndex, endIndex);
    },
  },

  created() {
    this.init();
    // this.getTreeData();
  },
  data() {
    return {
      uid: sessionStorage.getItem("userid"),
      role: sessionStorage.getItem("userrole"),
      moduluName: "TaskManage",
      taskList: [],
      algorithms: "",
      algorithm: "",
      productSeries: "",
      productSeriesList: "",
      dataSet: "",
      createTime: "",
      responsibers: "",
      responsiber: '',
      taskNames: "",
      taskName: "",
      resultDialogShow: false,
      result: {},
      dialogDiseaseVisible: false,
      currentPage: 1, // 当前页码
      pageSize: 15, // 默认每页显示的数量
    };
  },

  methods: {
    async init() {
      console.log("进入到模型管理查看界面");
      this.$notify({
        title: "提示",
        message: "您可在此页面查看和删除历史任务",
        type: "success",
      });
      const res = await getALLModel();
      this.taskList = res.data;
      this.getTasknames();
      this.getLeaders();
      this.getmodelnames();
      this.getProductSeries();
    },

    filterNode(value, data) {
      if (!value) return true;
      return data.label.indexOf(value) !== -1;
    },

    navigateToModelTraining() {
      // 使用 $router.push() 方法导航到目标路由路径
      this.$router.push("/ModelTraining");
    },
    handleCheck(row) {
      console.log("查看", row);
      // 跳转页面
      this.$router.push(`/TaskCheck/${row.id}`);
    },

    async handleDelete(row) {
      console.log("row", row);
      console.log("token:", sessionStorage.getItem("token"));
      // 发送删除请求到服务器
      const res = await delModel(row.id);
      this.$message.success(res.msg);
      this.taskList = this.taskList.filter(item => item.id !== row.id);

    },
    onCancel() {
      this.$message.info("已取消删除");
    },
    getUniqueValues(propertyName) {
      const unique = [...new Set(this.taskList.map(task => task[propertyName]))];
      return unique.map(value => ({ value }));
    },

    // 处理页码改变
    handlePageChange(val) {
      this.currentPage = val;
    },
    // 处理每页显示数量改变
    handleSizeChange(size) {
      this.pageSize = size;
      this.currentPage = 1; // 页码重置为1，因为换了每页显示数量
    },

    getTasknames() {
      this.taskNames = this.getUniqueValues("taskName");
    },

    getLeaders() {
      this.responsibers = this.getUniqueValues("responsiber");
    },

    getmodelnames() {
      this.algorithms = this.getUniqueValues("algorithm");
    },
    getProductSeries() {
      this.productSeriesList = this.getUniqueValues("productSeries");
    },
    clearFilter() {
      this.productSeries = "";
      this.responsiber = "";
      this.taskName = "";
      this.algorithm = "";
    },

    searchData(queryString, data, cb) {
      var results = queryString
        ? data.filter(this.createFilter(queryString))
        : data;
      // 调用 callback 返回建议列表的数据
      cb(results);
    },
    createFilter(queryString) {
      return (data) => {
        return (
          data.value.toLowerCase().indexOf(queryString.toLowerCase()) === 0
        );
      };
    },
    searchTasknames(queryString, cb) {
      this.searchData(queryString, this.taskNames, cb);
    },
    searchLeaders(queryString, cb) {
      this.searchData(queryString, this.responsibers, cb);
    },
    searchModelnames(queryString, cb) {
      this.searchData(queryString, this.algorithms, cb);
    },
    searchProductSeries(queryString, cb) {
      this.searchData(queryString, this.productSeriesList, cb);
    },
    highlightMatch(text, query) {
      if (typeof text !== "string") return "";
      if (text.length > 10) text = text.substring(0, 10) + "...";
      if (!query) return text; // 如果查询字符串为空，则返回原始文本
      const regex = new RegExp(query, "gi");
      return text.replace(
        regex,
        (match) => `<span style="color:red;">${match}</span>`
      );
    },
    handleSelect(item) {
      // 处理选中联想项的逻辑
      console.log("选中的任务项:", item);
    },
  },
};
</script>

<style scoped>
.main {
  /* display: grid;
  grid-template-columns: 15% 85%; */
  height: 100%;
  /* overflow-y: auto; */
}

.tipInfo {
  background-color: rgba(124, 124, 124, 0.1);
  height: 50px;
  text-align: center;
  border-radius: 5px;
}

.tipInfo .statistic {
  font-size: 13px;
  color: #585858;
}

.container {
  margin-left: 3%;
  width: 95%;
}

.container .el-select {
  margin-right: 20px;
}

.custom-tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 16px;
  padding-right: 8px;
  overflow: hidden;
}

.custom-tree-node .left_span {
  width: 12em;
  overflow: hidden;
}

.nodeLabel,
.scrolling-nodeLabel {
  display: inline-block;
  white-space: nowrap;
  /* 禁止文本换行 */
  box-sizing: border-box;
  /* 边框和内填充的宽度也包含在width内 */
}

/* 文本滚动 */
.scrolling-nodeLabel:hover {
  position: relative;
  overflow: hidden;
  vertical-align: text-bottom;
  animation: scrollText 3s linear infinite;
  /* 动画持续时间和循环方式 */
}

@keyframes scrollText {
  0% {
    transform: translateX(0px);
  }

  12% {
    transform: translateX(0px);
  }

  75% {
    transform: translateX(calc(-100% + 12em));
  }

  100% {
    transform: translateX(calc(-100% + 12em));
  }
}

.search-input {
  margin-bottom: 20px;
}

.search-input div:first-child {
  background-color: rgba(99, 97, 97, 0.1);
  margin-bottom: 10px;
  padding: 10px;
  height: 40px;
  text-align: center;
}

.search-input div:nth-child(2) span,
.search-input div:nth-child(2) .el-button {
  margin-right: 10px;
  margin-bottom: 10px;
}

#top_buttons>* {
  display: inline-block;
}

#task_disease {
  margin-right: 40px;
}

#table {
  margin-top: 10px;
}

.lineStyle {
  color: rgb(100, 172, 231);
}

.featureTitle {
  font-weight: 800;
}

.cardGroup {
  padding-top: 10px;
  width: 100%;
  overflow: auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-gap: 20px;
  overflow-y: scroll;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.cardGroup .card {
  max-height: 400px;
  overflow-y: auto;
}

.cardGroup::-webkit-scrollbar {
  display: none;
}

.cardGroup .el-pagination {
  margin-top: 10px;
  margin-left: 10px;
}

.cardInfo {
  display: grid;
  grid-template-columns: 4fr 4fr;
  grid-template-rows: auto auto auto auto;
  gap: 18px;
}

.cardInfo>div:nth-child(9),
.cardInfo>div:nth-child(10) {
  grid-column: 1 / span 2;
  /* 这两个元素跨越两列 */
}

.buttonGroup {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 10px;
  margin-bottom: 0;
}

.el-pagination {
  margin-top: 10px;
  float: right;
}

.ttl {
  font-weight: 600;
  color: #071135;
}

.icon {
  justify-self: end;
}

.taskCard {
  margin-bottom: 10px;
  margin-left: 10px;
  width: 95%;
  height: auto;
  overflow-y: scroll;
  scrollbar-width: none;
  -ms-overflow-style: none;
  position: relative;
  transition: all 0.2s ease;
  top: 0%;
}

.taskCard:hover {
  top: -5px;
}

.el-card {
  border: 1px solid #fff !important;
  border-radius: 10px !important;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.4) !important;
  background: rgba(255, 255, 255, 0.1) !important;
}


.taskCard-item {
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
</style>
