# 宇海注塑工艺智能决策系统：项目事实摘要

本文只保留项目定位、已实现能力、真实性边界和源码入口。详细面试稿见 `docs/19_IMPLEMENTED_EXPERIENCE_AND_RESUME_FINAL.md`，实现原理见 `docs/20_PROJECT_PROCESS_AND_IMPLEMENTATION_DETAILS.md`。

## 1. 项目定位

这是一个面向注塑工艺试验与质量分析的 Vue 2 前端工作台。它把生产数据查看、CSV 导入、模型训练、参数推荐、人工调参、质量预测和历史方案管理组织在同一套交互中。

系统用于辅助工艺决策，不是 MES、设备实时控制系统或完整 MLOps 平台。仓库默认使用纯前端演示数据，不能据此宣称算法精度、线上规模或生产收益。

## 2. 技术与运行方式

- Vue 2、Vue Router 3、Vuex 3、Element UI
- Axios 双请求客户端：业务服务与算法服务分开配置
- ECharts、Papa Parse、SheetJS、jsPDF/html2canvas
- Vue CLI 5、Node Test Runner

默认运行：

```bash
npm install
npm run serve
```

关闭演示模式并连接真实服务时，配置：

```dotenv
VUE_APP_DEMO_MODE=false
VUE_APP_BUSINESS_API_BASE_URL=http://127.0.0.1:8083
VUE_APP_ALGORITHM_API_BASE_URL=http://127.0.0.1:5000
VUE_APP_TRAINING_JOB_MODE=legacy
```

## 3. 核心业务流程

```text
查看或导入生产数据
→ 创建模型训练任务
→ 获取参数推荐
→ 人工调整并比较方案
→ 执行质量试算
→ 保存或复用历史方案
```

主要页面入口位于 `src/router/index.js`，业务 API 位于 `src/api/`，演示适配位于 `src/demo/`。

## 4. 四项核心实现

### 4.1 高维工业参数探索

- 问题：单条记录可包含大量字段，横向表格难以查找和比较。
- 实现：字段目录、搜索分组、纵向详情、按任务投影、多记录差异比较。
- 入口：`src/views/dataManage.vue`、`src/domain/data/highDimensionalExplorer.js`。
- 验证：`tests/highDimensionalExplorer.test.js`。

### 4.2 工艺方案实验室

- 问题：算法原始推荐、人工修改稿和质量结果容易互相覆盖或错配。
- 实现：76 项参数 Schema、外部 DTO 转换、校验、快照、差异比较和结果过期判断。
- 入口：`src/views/ParameterTuning.vue`、`src/domain/parameter/`。
- 验证：`tests/parameterDomain.test.js`、`tests/parameterScenario.test.js`。

### 4.3 资源受控的 CSV 导入

- 问题：用户文件的大小、表头、类型和坏行不可控。
- 实现：文件/行/列/单元格预算、分块解析、有限预览、结构化错误、取消和非响应式完整数据仓库。
- 入口：`src/domain/dataset/`、模型训练与参数调优的数据选择页面。
- 验证：`tests/datasetImporter.test.js`。

### 4.4 可恢复的训练工作流

- 问题：多步骤训练存在刷新恢复、重复提交、轮询乱序和取消语义。
- 实现：显式状态机、草稿边界、幂等键、状态单调更新、轮询退避和取消入口。
- 入口：`src/domain/training/`、`src/store/taskModule.js`、模型训练页面。
- 验证：`tests/trainingWorkflow.test.js`。

## 5. 横切支撑能力

- `src/utils/http.js`：统一请求元数据、响应契约和错误模型。
- `src/utils/requestCoordinator.js`：同一资源只允许最新请求提交结果。
- `src/components/DebouncedSelect.vue`：远程选择的防抖、缓存、取消和销毁保护。
- `src/demo/demoBackend.js`：无需后端即可复现主要前端流程。

这些能力适合作为核心流程的实现依据，不必拆成独立简历亮点。

## 6. 表达边界

可以说：

- 实现了可运行、可测试的前端领域流程和演示链路。
- 设计了真实后端接口模式，并对异步任务、请求竞态和文件导入做了防护。
- 通过自动化测试验证关键状态和边界条件。

不要说：

- 已上线完整异步训练中心、设备实时控制、完整 RBAC 或数据血缘。
- 分块解析等于恒定内存或支持任意大文件。
- 演示结果代表真实模型精度或生产收益。
- 未经测量的性能提升比例、用户量或业务规模。

## 7. 文档入口

- 当前事实摘要：本文件
- 运行和演示：`README.md`
- 简历与真实性边界：`docs/19_IMPLEMENTED_EXPERIENCE_AND_RESUME_FINAL.md`
- 业务过程与实现原理：`docs/20_PROJECT_PROCESS_AND_IMPLEMENTATION_DETAILS.md`
- 文档导航：`docs/README.md`
- 已实现证据：`docs/evidence/09_COMPLETED_HIGHLIGHTS_EVIDENCE.md`
- `docs/archive/`：阶段性审计、方案和历史稿，仅在追溯决策时查阅

## 8. 验证

```bash
npm test
npm run build
```
