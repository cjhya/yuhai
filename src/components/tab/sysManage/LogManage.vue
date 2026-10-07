<template>
  <div>
    <div style="margin-bottom: 20px">
      <el-row :gutter="20">
        <div class="grid-content">
          <el-select
            v-model="type"
            class="search_input"
            default-first-option
            placeholder="请选择搜索类型"
          >
            <el-option
              v-for="item in searchTypes"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            >
            </el-option>
          </el-select>

          <el-input
            placeholder="输入信息进行模糊搜索"
            v-model="searchByName"
            class="search_input"
            clearable
            @clear="load()"
          >
            <i slot="prefix" class="el-input__icon el-icon-search"></i>
          </el-input>

          <el-button
            icon="el-icon-search"
            circle
            class="search_btn"
            @click="searchByInput()"
          ></el-button>
        </div>
      </el-row>
    </div>
    <el-card class="user_list_card">
      <div slot="header" class="clearfix">
        <span>日志信息</span>
      </div>
      <el-table
        :header-cell-style="{
          backgroundColor: '#e8e5e5',
          color: 'black',
          fontWeight: 'bold',
        }"
        :data="displayedLogManageList"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="id" width="150"> </el-table-column>
        <el-table-column prop="uid" label="uid" width="150"> </el-table-column>
        <el-table-column prop="username" label="操作人" width="150">
        </el-table-column>
        <el-table-column prop="operation" label="操作日志"> </el-table-column>
        <el-table-column prop="opTime" label="操作时间" width="150">
        </el-table-column>
        <el-table-column prop="role" label="操作身份" width="150">
          <template slot-scope="scope">
            <el-tag type="success" v-if="scope.row.role == '0'">管理员</el-tag>
            <el-tag v-if="scope.row.role == '1'">普通用户</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
        :current-page="this.params.page"
        :page-sizes="[6, 9, 12, 15, 24]"
        :page-size="this.params.size"
        layout="total, sizes, prev, pager, next, jumper"
        :total="this.total"
      >
      </el-pagination>
    </el-card>
    <!-- <div style="text-align: center;margin-top: 20px">
        
         <el-pagination
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
            :current-page="pageNum"
            :page-sizes="[10, 30, 50, 100]"
            :page-size="pageSize"
            layout="total, sizes, prev, pager, next, jumper"
            :total="total">
        </el-pagination> 
      </div> -->
  </div>
</template>
  
  <script>
import { getRequest } from "@/api/user";

export default {
  name: "logManage",
  computed: {
    displayedLogManageList() {
      const startIndex = (this.params.page - 1) * this.params.size;
      const endIndex = startIndex + this.params.size;
      return this.logManageList.slice(startIndex, endIndex);
    },
  },
  data() {
    return {
      logManageList: [],
      // pageNum:1,
      // pageSize:10,

      type: "",
      searchByName: "",
      tableName: "",
      searchTypes: [
        {
          value: "username",
          label: "用户名称",
        },
        {
          value: "operation",
          label: "操作日志",
        },
      ],

      total: 0,
      params: {
        page: 1,
        size: 9,
      },
    };
  },
  created() {
    this.load();
  },
  methods: {
    load() {
      getRequest(`/log/getAllLogs`).then((res) => {
        this.logManageList = res.data;
        // console.log("this.logManageList:", this.logManageList)
        this.total = this.logManageList.length;
      });
    },
    searchByInput() {
      if (this.type === "") {
        this.$message({
          type: "warning",
          message: "请在下拉框中选择一个搜索类型",
        });
        return;
      }
      if (this.searchByName === "") {
        this.$message({
          type: "warning",
          message: "请输入内容进行搜索",
        });
        return;
      }

      getRequest(`/log/searchLog`, {
        searchType: this.type,
        name: this.searchByName,
      }).then((res) => {
        console.log(res);
        this.logManageList = res.data.list;
        // console.log("this.logManageList:", this.logManageList)
        this.total = res.data.total;
      });
    },

    handleSizeChange(val) {
      this.params.size = val;
    },

    handleCurrentChange(val) {
      this.params.page = val;
    },
    clean() {
      this.searchByName = "";
      this.load();
    },
  },
};
</script>
  <style scoped>
.grid-content {
  border-radius: 4px;
  min-height: 36px;
}
.search_input {
  margin-left: 5%;
  width: 20%;
}

.search_btn {
  margin-left: 1%;
}
.el-pagination {
  display: flex;
  justify-content: right;
  margin-top: 10px;
}
</style>