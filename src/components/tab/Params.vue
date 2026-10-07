<template>
  <div class="parameter-editor">
    <div
      v-for="layoutRow in parameterLayoutRows"
      :key="layoutRow[0].layoutRow"
      class="table-container"
    >
      <el-table
        v-for="(group, groupIndex) in layoutRow"
        :key="group.id"
        :data="group.rows"
        :style="getGroupStyle(groupIndex, layoutRow.length)"
      >
        <el-table-column prop="label" :label="group.title" align="center">
          <template #header>
            <span class="header-bold">{{ group.title }}</span>
          </template>
          <template #default="{ row }">
            <span class="content-bold">{{ row.label }}</span>
          </template>
        </el-table-column>

        <el-table-column
          v-for="column in group.columns"
          :key="column.id"
          :label="column.label"
          align="center"
        >
          <template #header>
            <span class="header-bold">{{ column.label }}</span>
          </template>
          <template #default="{ row }">
            <el-input
              :value="formatValue(getFieldValue(row.fieldIds[column.id]))"
              :disabled="disabled"
              @input="value => handleInput(row.fieldIds[column.id], value)"
              @blur="handleBlur(row.fieldIds[column.id])"
            />
            <div
              v-if="getFieldErrors(row.fieldIds[column.id]).length"
              class="field-error"
            >
              {{ getFieldErrors(row.fieldIds[column.id])[0].message }}
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script>
import { PARAMETER_RENDER_GROUPS } from "@/domain/parameter/parameterSchema";
import {
  fromLegacyParameterDto,
  toLegacyParameterDto,
  updateParameterForm,
  validateParameterForm,
} from "@/domain/parameter/parameterTransform";

export default {
  name: "Params",
  props: {
    value: {
      type: Object,
      default: null,
    },
    // 兼容尚未迁移的调用方；新页面应通过 value/input 使用受控表单。
    params: {
      type: Object,
      default: null,
    },
    errors: {
      type: Object,
      default: () => ({}),
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      touchedFields: Object.create(null),
      showInternalErrors: false,
    };
  },
  computed: {
    currentForm() {
      if (this.value && this.value.values) return this.value;
      return fromLegacyParameterDto(this.params || {}).form;
    },
    localValidation() {
      return validateParameterForm(this.currentForm);
    },
    parameterLayoutRows() {
      const rows = [];
      PARAMETER_RENDER_GROUPS.forEach(group => {
        if (!rows[group.layoutRow]) rows[group.layoutRow] = [];
        rows[group.layoutRow].push(group);
      });
      return rows.filter(Boolean);
    },
  },
  methods: {
    getGroupStyle(index, groupCount) {
      if (groupCount === 1) return { width: "48%" };
      return {
        width: "48%",
        marginRight: index === 0 ? "2%" : "0",
        marginLeft: index === 0 ? "0" : "2%",
      };
    },
    getFieldValue(fieldId) {
      return this.currentForm.values[fieldId];
    },
    formatValue(value) {
      return value === null || value === undefined ? "" : String(value);
    },
    handleInput(fieldId, rawValue) {
      if (this.disabled) return;
      const nextForm = updateParameterForm(this.currentForm, fieldId, rawValue);
      this.$emit("input", nextForm);
      this.$emit("change", { fieldId, rawValue, form: nextForm });
    },
    handleBlur(fieldId) {
      this.$set(this.touchedFields, fieldId, true);
    },
    getFieldErrors(fieldId) {
      const externalErrors = this.errors[fieldId];
      if (externalErrors && externalErrors.length) return externalErrors;
      if (!this.showInternalErrors && !this.touchedFields[fieldId]) return [];
      return this.localValidation.errors[fieldId] || [];
    },
    validate(target = null) {
      this.showInternalErrors = true;
      const validation = validateParameterForm(this.currentForm, { target });
      this.$emit("validation", validation);
      return validation;
    },
    // 保留旧命令式入口，避免尚未迁移的页面立即失效。
    emitParamsToParent() {
      const validation = this.validate();
      if (!validation.valid) return { valid: false, errors: validation.errors };
      const data = toLegacyParameterDto(validation.value);
      this.$emit("submitParams", data);
      return { valid: true, data };
    },
  },
};
</script>

<style scoped>
.parameter-editor {
  width: 100%;
}

.table-container {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.el-table,
.el-input {
  width: 100%;
}

.el-input >>> .el-input__inner {
  background-color: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 8px 12px;
}

.header-bold,
.content-bold {
  color: #000;
  font-size: 16px;
  font-weight: bold;
}

.field-error {
  color: #f56c6c;
  font-size: 12px;
  line-height: 18px;
  margin-top: 2px;
  text-align: left;
}
</style>
