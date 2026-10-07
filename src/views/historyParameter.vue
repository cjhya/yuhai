<template>
  <div class="main">
    <div class="container">
      <div class="search-input">
        <div>
          本页面可进行历史调参方案的查看和删除，您可根据机台IP，产品系列等条件筛选任务
        </div>
        <div>
          <span id="search-algorithm">
            <i class="el-icon-discount"></i> 机台IP：
            <el-autocomplete v-model="parameter" placeholder="请输入机台IP" clearable style="width: auto"
              :fetch-suggestions="searchParameter" @select="handleSelect" size="small"></el-autocomplete>
          </span>
          <span id="search-algorithm">
            <i class="el-icon-price-tag"></i> 产品编号：
            <el-autocomplete v-model="productCode" placeholder="请输入产品编号" clearable style="width: auto"
              :fetch-suggestions="searchProductCode" @select="handleSelect" size="small"></el-autocomplete>
          </span>
          <el-button @click="clearFilter" size="small">清除</el-button>
        </div>
      </div>
      <el-card class="tableCard">
        <div class="table">
          <el-table :data="displayedParameters" border style="width: 100%" :cell-style="{ textAlign: 'center' }"
            :header-cell-style="{ textAlign: 'center' }">
            <el-table-column label="时间" prop="createTime" />
            <el-table-column label="成型机台IP" prop="parameter2" />
            <el-table-column label="模号" prop="mouldfiles" />
            <el-table-column label="产品料号" prop="itemdesc" />
            <el-table-column label="物料代码" prop="productcode" />
            <el-table-column label="操作" align="right">
              <template #default="scope">
                <el-button  type="primary" @click="handleView(scope.$index, scope.row)" icon="el-icon-search">
                  查看
                </el-button>
                <el-button type="danger" @click="handleDelete(scope.$index, scope.row)" icon="el-icon-delete">
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        <!-- 分页组件 -->
        <div style="display: flex; justify-content: right">
          <el-pagination @size-change="handleSizeChange" @current-change="handlePageChange" :current-page="currentPage"
            :page-sizes="[15, 30, 60, 120]" :page-size="pageSize" layout="total, sizes, prev, pager, next, jumper"
            :total="filteredParameterList.length" />
        </div>
      </el-card>



    </div>
    <el-dialog :visible.sync="dialogTableVisible" title="注塑机调参方案" width="90vw" top="5vh">
      <div style="margin-top: -10px;">
        <!-- 这部分就是内容，距离 header 会有 30px -->
        <Params
          :value="parameterForm"
          :errors="parameterErrors"
          disabled
        />
      </div>
    </el-dialog>
  </div>
</template>

<script>
import defaultParameters from "@/assets/data/params"
import { getParameterHistory, delParameterHistory } from "@/api/parameterHistory";
import Params from "@/components/tab/Params";
import {
  fromLegacyParameterDto,
  validateParameterForm,
} from "@/domain/parameter/parameterTransform";

export default {
  components: {
    Params
  },
  computed: {
    filteredParameterList() {
      // 进行筛选
      let filteredList = this.tableData.filter((task) => {
        const matchesparameter = !this.parameter || task.parameter2 === this.parameter;
        const matchesproductcode = !this.productCode || task.productcode === this.productCode;

        return matchesparameter && matchesproductcode;
      });
      // 进行排序
      return filteredList
    },
    displayedParameters() {
      // 筛选和排序逻辑合并一处
      let filteredAndSortedList = this.tableData.filter((task) => {
        const matchesparameter = !this.parameter || task.parameter2 === this.parameter;
        const matchesproductcode = !this.productCode || task.productcode === this.productCode;

        return matchesparameter && matchesproductcode;
      })
      // 分页
      const startIndex = (this.currentPage - 1) * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      return filteredAndSortedList.slice(startIndex, endIndex);
    },
  },
  data() {
    return {
      dialogTableVisible: false,
      parameterForm: fromLegacyParameterDto(defaultParameters).form,
      parameterErrors: {},
      currentPage: 1, // 当前页码
      pageSize: 15, // 默认每页显示的数量
      parameter: "", // 机台IP
      productCode: "", // 产品编号
      parameters: "", // 机台IP
      productCodes: "", // 产品编号
      tableData: [],
    };
  },
  created() {
    this.init();
  },
  watch: {
    parameter() {
      this.currentPage = 1;
    },
    productCode() {
      this.currentPage = 1;
    },
  },
  methods: {
    async init() {
      this.$notify({
        title: "提示",
        message: "您可在此页面查看和删除历史调参方案",
        type: "success",
      });
      const res = await getParameterHistory();
      console.log(res.data);
      this.tableData = res.data;
      this.getParameters()
      this.getProductCodes()
      console.log("parameters", this.parameters);
      console.log("productCodes", this.productCodes);

    },
    handleView(id, row) {
      try {
        const parsed = typeof row.paramsJson === "string"
          ? JSON.parse(row.paramsJson)
          : row.paramsJson
        const converted = fromLegacyParameterDto(parsed)
        const invalidSource = converted.issues.some(issue =>
          issue.code === "INVALID_SOURCE" || issue.code === "UNSUPPORTED_SCHEMA_VERSION"
        )
        if (invalidSource) {
          this.$message.error("历史参数版本或结构不受支持")
          return
        }

        this.parameterForm = converted.form
        this.parameterErrors = validateParameterForm(converted.form).errors
        if (converted.issues.length > 0) {
          this.$message.warning("历史方案包含当前版本无法识别的字段，已忽略")
        }
        this.dialogTableVisible = true
      } catch (error) {
        console.error("历史参数解析失败", error)
        this.$message.error("历史参数数据已损坏，无法查看")
      }
    },
    async handleDelete(id, row) {
      console.log(id, row);
      const res = await delParameterHistory(row.id)
      this.tableData = this.tableData.filter(item => item.id !== row.id);
      this.$message.success(res.msg);
    },
    getUniqueValues(propertyName) {
      const unique = [
        ...new Set(
          this.tableData
            .map(task => task[propertyName])
            .filter(value => value !== null && value !== undefined && value !== "")
            .map(value => String(value))
        ),
      ];
      return unique.map(value => ({ value }));
    },
    getParameters() {
      this.parameters = this.getUniqueValues("parameter2");
    },

    getProductCodes() {
      this.productCodes = this.getUniqueValues("productcode");
    },
    searchData(queryString, data, cb) {
      var results = queryString
        ? data.filter(this.createFilter(queryString))
        : data;
      // 调用 callback 返回建议列表的数据
      cb(results);
    },
    searchParameter(queryString, cb) {
      this.searchData(queryString, this.parameters, cb);
    },
    searchProductCode(queryString, cb) {
      this.searchData(queryString, this.productCodes, cb);
    },
    createFilter(queryString) {
      return (data) => {
        return (
          data.value.toLowerCase().indexOf(queryString.toLowerCase()) === 0
        );
      };
    },
    clearFilter() {
      this.parameter = "";
      this.productCode = "";
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
    handleSelect(item) {
      // 处理选中联想项的逻辑
      console.log("选中的任务项:", item);
    },
  },
};
</script>

<style scoped>
.el-table th,
.el-table td {
  text-align: center;
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

.container {
  margin-left: 3%;
  width: 95%;
}

.container .el-select {
  margin-right: 20px;
}

.table {
  /* height: 70vh; */
  width: 80vw;
  /* 你也可以用固定宽度或 max-width */
  margin-bottom: 10px;
}

.main {
  height: auto;
  width: 100%;
}
</style>
