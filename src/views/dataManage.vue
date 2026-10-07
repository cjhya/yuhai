<template>
  <div class="main">
    <div class="selector-bar">
      <el-form inline>
        <el-form-item label="请选择数据表：">
          <el-select
            v-model="category"
            placeholder="请选择"
            size="small"
            @change="selectTable"
          >
            <el-option
              v-for="item in categories"
              :key="item"
              :label="item"
              :value="item"
            />
          </el-select>
        </el-form-item>
        <el-button
          type="success"
          icon="el-icon-download"
          size="small"
          :disabled="!tableData.length"
          @click="downloadExcel"
        >
          导出 Excel
        </el-button>
      </el-form>
    </div>

    <el-card v-if="isShow" v-loading="loading" class="main-card">
      <div class="explorer-header">
        <div>
          <h3>{{ category }}探索</h3>
          <p>先定位字段，再查看记录或比较差异，避免在超宽表中反复横向滚动。</p>
        </div>
        <div class="metric-list">
          <div class="metric-item">
            <strong>{{ tableData.length }}</strong>
            <span>条记录</span>
          </div>
          <div class="metric-item">
            <strong>{{ fieldCatalog.length }}</strong>
            <span>目录字段</span>
          </div>
          <div class="metric-item">
            <strong>{{ availableFieldCount }}</strong>
            <span>实际字段</span>
          </div>
          <div class="metric-item">
            <strong>{{ fieldGroups.length }}</strong>
            <span>业务分组</span>
          </div>
        </div>
      </div>

      <el-alert
        v-if="fieldCatalog.length > availableFieldCount"
        :title="`字段目录包含 ${fieldCatalog.length} 项，本批数据实际出现 ${availableFieldCount} 项；未采集字段仍可检索，但不会作为默认展示项。`"
        type="info"
        show-icon
        :closable="false"
        class="catalog-alert"
      />

      <div class="field-toolbar">
        <el-input
          v-model="fieldQuery"
          clearable
          size="small"
          prefix-icon="el-icon-search"
          placeholder="搜索中文名称、原始字段或分组"
        />
        <el-select
          v-model="fieldGroup"
          clearable
          size="small"
          placeholder="全部业务分组"
        >
          <el-option
            v-for="group in fieldGroups"
            :key="group"
            :label="group"
            :value="group"
          />
        </el-select>
        <el-checkbox v-model="availableOnly">只看本批数据已有字段</el-checkbox>
        <el-tag type="info">当前匹配 {{ filteredFieldCatalog.length }} 项</el-tag>
      </div>

      <el-tabs v-model="activeExplorerTab" type="border-card">
        <el-tab-pane label="记录概览" name="overview">
          <div class="tab-toolbar">
            <span class="toolbar-label">摘要字段（最多 6 项）：</span>
            <el-select
              v-model="summaryFieldIds"
              multiple
              collapse-tags
              filterable
              :multiple-limit="6"
              size="small"
              placeholder="选择摘要字段"
            >
              <el-option-group
                v-for="group in availableCatalogGroups"
                :key="group.label"
                :label="group.label"
              >
                <el-option
                  v-for="field in group.fields"
                  :key="field.id"
                  :label="field.label"
                  :value="field.id"
                />
              </el-option-group>
            </el-select>
          </div>

          <el-table
            :data="pagedRecordSummaries"
            border
            stripe
            highlight-current-row
            @row-click="openRecord"
          >
            <el-table-column prop="recordLabel" label="记录" width="100" fixed />
            <el-table-column
              v-for="field in summaryFields"
              :key="field.id"
              :label="field.label"
              min-width="160"
              show-overflow-tooltip
            >
              <template #default="scope">
                {{ formatRecordField(scope.row.record, field) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="190" fixed="right">
              <template #default="scope">
                <el-button type="text" @click.stop="openRecord(scope.row)">纵向详情</el-button>
                <el-button type="text" @click.stop="addRecordToComparison(scope.row.recordIndex)">
                  加入对比
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-container">
            <el-pagination
              layout="total, prev, pager, next"
              :total="tableData.length"
              :page-size="pageSize"
              :current-page.sync="currentPage"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane label="纵向详情" name="detail">
          <div class="tab-toolbar detail-toolbar">
            <span class="toolbar-label">当前记录：</span>
            <el-select v-model="currentRecordIndex" size="small">
              <el-option
                v-for="(_, index) in tableData"
                :key="index"
                :label="getRecordOptionLabel(index)"
                :value="index"
              />
            </el-select>
            <span class="toolbar-hint">详情沿用上方搜索和分组条件，每页最多展示 {{ detailPageSize }} 项。</span>
          </div>

          <el-table :data="pagedDetailRows" border stripe>
            <el-table-column prop="group" label="业务分组" width="180" />
            <el-table-column prop="label" label="字段名称" min-width="220" />
            <el-table-column prop="rawKey" label="原始字段" min-width="220" show-overflow-tooltip />
            <el-table-column label="当前值" min-width="180" show-overflow-tooltip>
              <template #default="scope">
                {{ formatFieldValue(scope.row.value, scope.row.present) }}
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-container">
            <el-pagination
              layout="total, prev, pager, next"
              :total="detailRows.length"
              :page-size="detailPageSize"
              :current-page.sync="detailCurrentPage"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane label="选列对比" name="compare">
          <div class="compare-toolbar">
            <div class="compare-control">
              <span class="toolbar-label">对比记录（最多 3 条）：</span>
              <el-select
                v-model="comparisonRecordIndexes"
                multiple
                collapse-tags
                :multiple-limit="3"
                size="small"
                placeholder="选择记录"
              >
                <el-option
                  v-for="(_, index) in tableData"
                  :key="index"
                  :label="getRecordOptionLabel(index)"
                  :value="index"
                />
              </el-select>
            </div>
            <div class="compare-control field-select-control">
              <span class="toolbar-label">对比字段（最多 30 项）：</span>
              <el-select
                v-model="comparisonFieldIds"
                multiple
                collapse-tags
                filterable
                :multiple-limit="30"
                size="small"
                placeholder="选择字段"
              >
                <el-option-group
                  v-for="group in availableCatalogGroups"
                  :key="group.label"
                  :label="group.label"
                >
                  <el-option
                    v-for="field in group.fields"
                    :key="field.id"
                    :label="field.label"
                    :value="field.id"
                  />
                </el-option-group>
              </el-select>
              <el-button size="small" @click="useFilteredFieldsForComparison">
                使用当前筛选
              </el-button>
            </div>
            <el-checkbox v-model="comparisonChangedOnly">只看变化项</el-checkbox>
          </div>

          <el-alert
            v-if="comparisonRecordIndexes.length < 2 || !comparisonFieldIds.length"
            title="至少选择两条记录和一个字段后才能比较。"
            type="info"
            :closable="false"
            show-icon
          />
          <el-table v-else :data="comparisonRows" border stripe>
            <el-table-column prop="group" label="业务分组" width="180" />
            <el-table-column prop="label" label="字段名称" min-width="220" />
            <el-table-column
              v-for="(recordIndex, valueIndex) in comparisonRecordIndexes"
              :key="recordIndex"
              :label="getRecordOptionLabel(recordIndex)"
              min-width="180"
              show-overflow-tooltip
            >
              <template #default="scope">
                {{ formatComparedValue(scope.row.values[valueIndex]) }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="scope">
                <el-tag :type="scope.row.changed ? 'warning' : 'success'" size="mini">
                  {{ scope.row.changed ? "有变化" : "一致" }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script>
import * as XLSX from "xlsx";
import { getRequest } from "@/api/user";
import fieldMaps from "@/assets/data/fieldMaps.json";
import {
  buildFieldCatalog,
  compareRecords,
  filterFieldCatalog,
  getRecordFieldCell,
  groupFieldCatalog,
  pickFieldIdsByGroup,
  projectRecord,
} from "@/domain/data/highDimensionalExplorer";
import {
  createLatestRequestCoordinator,
  isRequestCanceled,
} from "@/utils/requestCoordinator";
import { getApiErrorMessage } from "@/utils/http";

export default {
  name: "DataManage",
  data() {
    return {
      isShow: false,
      loading: false,
      category: "",
      categories: ["机器信息", "模具信息", "材料信息", "产品信息", "机台参数"],
      tableData: [],
      fieldCatalog: [],
      activeExplorerTab: "overview",
      fieldQuery: "",
      fieldGroup: "",
      availableOnly: true,
      currentPage: 1,
      pageSize: 5,
      currentRecordIndex: 0,
      detailCurrentPage: 1,
      detailPageSize: 50,
      summaryFieldIds: [],
      comparisonRecordIndexes: [],
      comparisonFieldIds: [],
      comparisonChangedOnly: true,
    };
  },
  computed: {
    availableFieldCount() {
      return this.fieldCatalog.filter(field => field.available).length;
    },
    fieldGroups() {
      return [...new Set(this.fieldCatalog.map(field => field.group))];
    },
    filteredFieldCatalog() {
      return filterFieldCatalog(this.fieldCatalog, {
        query: this.fieldQuery,
        group: this.fieldGroup,
        availableOnly: this.availableOnly,
      });
    },
    availableCatalogGroups() {
      return groupFieldCatalog(this.fieldCatalog, { availableOnly: true });
    },
    summaryFields() {
      const selected = new Set(this.summaryFieldIds);
      return this.fieldCatalog.filter(field => selected.has(field.id));
    },
    recordSummaries() {
      return this.tableData.map((record, recordIndex) => ({
        record,
        recordIndex,
        recordLabel: `记录 ${recordIndex + 1}`,
      }));
    },
    pagedRecordSummaries() {
      const start = (this.currentPage - 1) * this.pageSize;
      return this.recordSummaries.slice(start, start + this.pageSize);
    },
    detailRows() {
      const currentRecord = this.tableData[this.currentRecordIndex] || {};
      return projectRecord(
        currentRecord,
        this.filteredFieldCatalog,
        this.filteredFieldCatalog.map(field => field.id)
      );
    },
    pagedDetailRows() {
      const start = (this.detailCurrentPage - 1) * this.detailPageSize;
      return this.detailRows.slice(start, start + this.detailPageSize);
    },
    comparisonRows() {
      if (this.comparisonRecordIndexes.length < 2 || !this.comparisonFieldIds.length) {
        return [];
      }
      const records = this.comparisonRecordIndexes.map(index => this.tableData[index] || {});
      return compareRecords(records, this.fieldCatalog, this.comparisonFieldIds, {
        changedOnly: this.comparisonChangedOnly,
      });
    },
  },
  watch: {
    fieldQuery() {
      this.detailCurrentPage = 1;
    },
    fieldGroup() {
      this.detailCurrentPage = 1;
    },
    availableOnly() {
      this.detailCurrentPage = 1;
    },
    currentRecordIndex() {
      this.detailCurrentPage = 1;
    },
  },
  created() {
    this._requestCoordinator = createLatestRequestCoordinator();
  },
  beforeDestroy() {
    this._requestCoordinator.dispose();
  },
  methods: {
    resetExplorer() {
      this.isShow = false;
      this.tableData = [];
      this.fieldCatalog = [];
      this.fieldQuery = "";
      this.fieldGroup = "";
      this.currentPage = 1;
      this.currentRecordIndex = 0;
      this.detailCurrentPage = 1;
      this.summaryFieldIds = [];
      this.comparisonRecordIndexes = [];
      this.comparisonFieldIds = [];
      this.activeExplorerTab = "overview";
    },
    async selectTable() {
      const categoryToType = {
        机器信息: "machine_info",
        模具信息: "mold_info",
        材料信息: "material_info",
        产品信息: "product_info",
        机台参数: "machine_params",
      };
      const type = categoryToType[this.category];
      this.resetExplorer();
      if (!type) {
        this.$message.error("未知的数据类别");
        return;
      }

      this.loading = true;
      try {
        const res = await this._requestCoordinator.run("data-list", ({ signal }) =>
          getRequest(`/data/list?type=${encodeURIComponent(type)}`, undefined, { signal })
        );
        if (!res || res.code !== 200 || !Array.isArray(res.data)) {
          throw new TypeError("数据列表响应格式不正确");
        }

        this.tableData = res.data;
        this.fieldCatalog = buildFieldCatalog({
          category: this.category,
          fieldMap: fieldMaps[this.category] || {},
          records: this.tableData,
        });
        this.summaryFieldIds = pickFieldIdsByGroup(this.fieldCatalog, 4);
        this.comparisonFieldIds = pickFieldIdsByGroup(this.fieldCatalog, 12);
        this.comparisonRecordIndexes = this.tableData.slice(0, 2).map((_, index) => index);
        this.isShow = true;
      } catch (error) {
        if (isRequestCanceled(error)) return;
        console.error("获取数据失败", error);
        this.$message.error(getApiErrorMessage(error, "获取数据失败"));
      } finally {
        this.loading = false;
      }
    },
    openRecord(row) {
      this.currentRecordIndex = row.recordIndex;
      this.activeExplorerTab = "detail";
    },
    addRecordToComparison(recordIndex) {
      if (this.comparisonRecordIndexes.includes(recordIndex)) {
        this.activeExplorerTab = "compare";
        return;
      }
      if (this.comparisonRecordIndexes.length >= 3) {
        this.$message.warning("一次最多比较 3 条记录");
        return;
      }
      this.comparisonRecordIndexes = [...this.comparisonRecordIndexes, recordIndex];
      this.activeExplorerTab = "compare";
    },
    useFilteredFieldsForComparison() {
      const ids = this.filteredFieldCatalog
        .filter(field => field.available)
        .slice(0, 30)
        .map(field => field.id);
      if (!ids.length) {
        this.$message.warning("当前筛选条件下没有可对比字段");
        return;
      }
      this.comparisonFieldIds = ids;
      if (this.filteredFieldCatalog.length > 30) {
        this.$message.info("为控制页面信息量，已选择前 30 个匹配字段");
      }
    },
    getRecordOptionLabel(index) {
      const record = this.tableData[index] || {};
      const firstField = this.summaryFields[0];
      if (!firstField) return `记录 ${index + 1}`;
      const value = this.formatRecordField(record, firstField);
      return value && value !== "未采集" ? `记录 ${index + 1} · ${value}` : `记录 ${index + 1}`;
    },
    formatRecordField(record, field) {
      const cell = getRecordFieldCell(record, field);
      return this.formatFieldValue(cell.value, cell.present);
    },
    formatComparedValue(cell) {
      if (!cell) return "未采集";
      return this.formatFieldValue(cell.value, cell.present);
    },
    formatFieldValue(value, present = true) {
      if (!present) return "未采集";
      if (value === null || value === undefined || value === "") return "空";
      if (typeof value === "object") {
        try {
          return JSON.stringify(value);
        } catch (error) {
          return String(value);
        }
      }
      return String(value);
    },
    downloadExcel() {
      if (!this.tableData.length) return;
      const fieldMap = fieldMaps[this.category] || {};
      const columns = [...new Set(this.tableData.flatMap(item => Object.keys(item || {})))];
      const sheetData = [
        columns.map(column => fieldMap[column] || column),
        ...this.tableData.map(item => columns.map(column => item[column])),
      ];
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      XLSX.writeFile(workbook, `${this.category}.xlsx`);
    },
  },
};
</script>

<style scoped>
.main {
  width: 100%;
}

.selector-bar {
  width: 96%;
  margin: 12px auto 0;
}

.main-card {
  width: 94%;
  margin: 0 auto 20px;
  border-radius: 10px;
}

.explorer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 16px;
}

.explorer-header h3 {
  margin: 0 0 8px;
  color: #303133;
}

.explorer-header p {
  margin: 0;
  color: #606266;
}

.metric-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(84px, 1fr));
  gap: 10px;
}

.metric-item {
  min-width: 84px;
  padding: 10px 12px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #f7f9fc;
  text-align: center;
}

.metric-item strong,
.metric-item span {
  display: block;
}

.metric-item strong {
  color: #409eff;
  font-size: 20px;
}

.metric-item span {
  margin-top: 4px;
  color: #909399;
  font-size: 12px;
}

.catalog-alert {
  margin-bottom: 14px;
}

.field-toolbar,
.tab-toolbar,
.compare-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.field-toolbar {
  margin-bottom: 14px;
}

.field-toolbar .el-input {
  width: 320px;
}

.field-toolbar .el-select {
  width: 220px;
}

.tab-toolbar,
.compare-toolbar {
  margin-bottom: 14px;
}

.tab-toolbar .el-select {
  width: 520px;
  max-width: 70vw;
}

.detail-toolbar .el-select {
  width: 280px;
}

.toolbar-label {
  color: #303133;
  font-weight: 600;
}

.toolbar-hint {
  color: #909399;
  font-size: 13px;
}

.compare-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.compare-control .el-select {
  width: 300px;
}

.field-select-control .el-select {
  width: 420px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

@media (max-width: 1100px) {
  .explorer-header {
    flex-direction: column;
  }

  .metric-list {
    width: 100%;
  }

  .field-toolbar .el-input,
  .field-toolbar .el-select,
  .tab-toolbar .el-select,
  .compare-control .el-select {
    width: 100%;
    max-width: none;
  }

  .compare-control {
    width: 100%;
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
