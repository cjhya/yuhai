# STEP 1：项目源码普查

> 普查日期：2026-08-19  
> 普查范围：项目根目录配置、`public/`、`src/` 下的入口、路由、状态、请求、页面、组件、静态数据与资源。  
> 排除范围：`node_modules/`、`dist/`、`.git/`、`.history/`、缓存与自动生成内容。  
> 判断原则：本报告只记录当前源码能够证明的事实。页面上出现某个入口，不等同于对应业务已形成可运行闭环；下文会区分“源码已接接口”“使用静态数据”“代码存在但未挂载”“当前调用链存在断点”。

## 一、总体结论

这是一个面向注塑制造场景的前后端分离 Web 管理系统前端，页面标题和主框架将其命名为“注塑机生产工艺参数的多粒度智能决策模型系统”。系统围绕注塑生产数据、质量预测模型和工艺参数方案，组织了数据查看、模型训练、参数调优、质量预测、特征关系分析、历史方案管理、模型管理及用户管理等页面。

当前项目不是纯静态展示站，也不是完整全栈仓库。它是一个 Vue 2 单页应用，依赖两个仓库外服务：

- 业务后端：`http://10.16.24.23:8083`，承载用户、数据、模型记录、历史调参方案等接口；证据见 `src/utils/request.js:7`、`src/utils/api.js:7`。
- 算法服务：`http://10.16.76.111:5000`，承载训练、质量预测和参数推荐接口；证据见 `src/utils/requestAlg.js:6`、`src/api/useAlgorithm.js`。

源码中各模块完成度不同：数据管理、首页统计、用户管理、模型记录和历史方案页面已经编写实际接口调用；特征分析主要使用前端内置数据；模型训练虽然有五步页面，但数据选择和特征工程存在未定义调用，部分图表为硬编码示例数据，当前源码不能证明五步流程已经完整闭环。参数调优和质量预测已经接入算法接口，但部分界面输入没有进入最终请求，需按“当前真实传参”理解其行为。

主要判断依据：`src/components/sideBar/index.vue`、`src/router/index.js`、`src/views/ParameterTuning.vue`、`src/views/qualityPredict.vue`、`src/components/tab/createModel/model_training/`、`src/api/`。

---

## 1. 项目主要用途

项目服务于注塑机生产工艺参数与产品质量相关的数据查看和辅助决策。当前源码表达出的业务对象包括：

- 机台、模具、材料、产品与机台参数；
- 模型训练任务、产品系列、训练算法和 MAPE 结果；
- 注射、保压、温度、模温机和温控箱等工艺参数；
- 产品尺寸、变形度等质量指标；
- 参数推荐方案及其历史记录；
- 用户、角色和账号状态。

系统名称可直接定位到 `src/components/tab/user/Login.vue:12` 附近和 `src/components/sideBar/index.vue`。字段语义可定位到 `src/components/tab/Params.vue`、`src/assets/data/fieldMaps.json`、`src/assets/data/params.js`。

当前可见功能意图为：

1. 查看和导出基础生产数据；
2. 上传 CSV 训练数据并按步骤创建模型任务；
3. 调用算法服务训练模型；
4. 选择已有模型进行质量预测；
5. 上传 CSV 并调用算法服务生成参数推荐结果；
6. 保存和回看历史参数方案；
7. 查看、筛选和删除模型任务；
8. 查看特征与质量标签之间的关系；
9. 管理用户账号、角色和状态。

以上是源码中存在的功能范围，不代表每条流程均已完成端到端验证。具体完成状态见第 6、7 节。

## 2. 项目类型

| 维度 | 实际判断 | 源码证据 |
| --- | --- | --- |
| 业务类型 | 工业制造数据与算法辅助决策后台 | `src/components/sideBar/index.vue`、`src/assets/data/fieldMaps.json` |
| 应用形态 | 浏览器端 B/S 管理系统 | `public/index.html`、`src/main.js` |
| 前端架构 | Vue 2 单页应用（SPA） | `src/main.js`、`src/App.vue`、`src/router/index.js` |
| 开发范式 | JavaScript + Vue Options API + 单文件组件 | 全部 `.vue` 页面及组件 |
| 数据来源 | 业务 REST 接口、算法 REST 接口、CSV 本地文件、前端静态数据 | `src/api/`、`src/views/ParameterTuning.vue`、`src/assets/data/` |
| 渲染方式 | 客户端渲染，无 SSR 代码 | `src/main.js`、`public/index.html` |
| 终端取向 | 桌面端后台布局，未发现移动端适配体系 | `src/components/sideBar/index.vue`、主要页面固定宽高样式 |

全仓扫描未发现微前端、WebSocket、SSE、Service Worker、PWA、SSR、Web Worker、GraphQL 或 TypeScript 实现。

## 3. 技术栈

| 层次 | 技术 | 当前用法 | 源码证据 |
| --- | --- | --- | --- |
| 框架 | Vue 2.6.14 | 根实例、Options API、SFC | `package.json:30`、`src/main.js` |
| 路由 | Vue Router 3.5.1 | 默认 hash 路由、嵌套路由 | `package.json:32`、`src/router/index.js` |
| 状态 | Vuex 3.6.2 | 根状态 + `modelTraining` 命名空间模块 | `package.json:33`、`src/store/index.js` |
| UI | Element UI 2.15.13 | 表单、表格、菜单、步骤条、弹窗、通知等 | `src/main.js:14`、各 `.vue` 模板 |
| HTTP | Axios 1.4.0 | 三套请求入口连接业务服务和算法服务 | `src/utils/request.js`、`src/utils/requestAlg.js`、`src/utils/api.js` |
| 可视化 | ECharts 5.5.1 | 折线图、柱状图、关系图、雷达图、饼图、热力图 | `src/views/dash/index.vue`、`src/components/tab/featureManage.vue`、图表组件目录 |
| 颜色计算 | chroma-js 3.1.2 | 为相关性热力图生成渐变色 | `src/components/tab/createModel/model_training/FeatureSelect.vue:51` |
| CSV | Papa Parse 5.5.1 | 浏览器读取并解析 CSV | `src/views/ParameterTuning.vue:759`、`src/components/tab/createModel/model_training/DataSelect.vue:228` |
| Excel | xlsx 0.15.1 | 将表格数据导出 `.xlsx` | `src/views/dataManage.vue:44,129-132` |
| PDF/截图 | jsPDF + html2canvas | 模型详情页面 DOM 截图并生成 PDF | `src/components/tab/createModel/model_manage/TaskCheck.vue`、`Result.vue` |
| 工具库 | Lodash | 防抖；另有少量未使用导入 | `src/components/DebouncedSelect.vue`、用户注册/找回密码页面 |
| 样式 | CSS + Sass 依赖 | 全局样式、scoped 样式，`App.vue` 使用 SCSS | `src/App.vue`、`package.json` |
| 构建 | Vue CLI 5 + Babel | 开发服务器、生产构建、ESLint | `package.json:5-8`、`vue.config.js`、`babel.config.js` |

项目没有 TypeScript 源码；`jsconfig.json` 仅配置 JavaScript 编辑器/模块解析，并声明 `@/* -> src/*`。

## 4. 核心依赖及用途

### 4.1 源码中实际使用的主要依赖

| 依赖 | 实际用途 | 主要文件 |
| --- | --- | --- |
| `vue` | 页面和组件运行时 | `src/main.js`、全部 `.vue` |
| `vue-router` | 登录页、主框架和业务页面导航 | `src/router/index.js` |
| `vuex` | 模型训练步骤和跨步骤表单状态 | `src/store/taskModule.js`、`src/components/mixins/vuex_mixin.js` |
| `element-ui` | 全局 UI 组件库和消息提示 | `src/main.js`、各页面模板、`src/utils/api.js` |
| `axios` | 业务 API、算法 API、全局 `$axios` | `src/utils/`、`src/api/`、`src/main.js` |
| `echarts` | 首页统计图、特征关系图、训练结果图组件 | `src/views/dash/index.vue`、`src/components/tab/featureManage.vue`、`src/components/tab/**/eCharts/` |
| `chroma-js` | 热力图渐变色 | `src/components/tab/createModel/model_training/FeatureSelect.vue` |
| `papaparse` | 参数调优和模型训练数据选择中的 CSV 解析 | `src/views/ParameterTuning.vue`、`DataSelect.vue` |
| `xlsx` | 数据管理页导出 Excel | `src/views/dataManage.vue` |
| `jspdf`、`html2canvas` | 模型详情/结果页面导出 PDF | `TaskCheck.vue`、`Result.vue` |
| `lodash` | 远程下拉和用户名检查防抖 | `src/components/DebouncedSelect.vue`、`src/components/tab/user/register.vue`、`forget.vue` |

### 4.2 已声明但当前源码未形成有效使用的依赖

在 `package.json` 中存在、但全仓未找到有效导入或挂载的依赖包括：

- `@antv/g2plot`
- `@vue-office/docx`
- `@vue-office/excel`
- `@vue-office/pdf`
- `file-saver`
- `html-entities`
- `html2pdf.js`
- `vue-echarts`

`jquery` 被列为依赖，但没有在入口或组件中导入。两个 `PredictLineChart.vue` 文件直接使用全局 `$`，因此这些组件一旦实际挂载会遇到 `$ is not defined`；当前 ESLint 也报告了该错误。证据见 `src/components/tab/subcomponents/PredictLineChart.vue:37`、`src/components/tab/createModel/model_eCharts/PredictLineChart.vue:37`。

## 5. 项目目录结构

```text
yuhai_frontend/
├─ public/
│  ├─ index.html                 # SPA HTML 模板
│  └─ favicon.ico
├─ src/
│  ├─ api/
│  │  ├─ user.js                 # 通用业务 GET/POST 封装
│  │  ├─ model.js                # 模型记录与首页模型统计
│  │  ├─ parameterHistory.js     # 历史参数方案
│  │  └─ useAlgorithm.js         # 训练、预测、参数推荐算法接口
│  ├─ assets/
│  │  ├─ data/                   # 字段映射、默认参数、算法说明及多组样例数据
│  │  └─ *.png/*.jpg/*.jpeg      # 登录、首页快捷入口及历史遗留图片
│  ├─ components/
│  │  ├─ sideBar/index.vue       # 主框架：顶部、侧栏、内容区、页脚
│  │  ├─ DebouncedSelect.vue     # 带防抖和接口加载的远程选择器
│  │  ├─ AppMain.vue             # 未被当前主框架使用的路由出口封装
│  │  ├─ mixins/                 # 通用表单方法与 Vuex 映射
│  │  ├─ login/                  # 未被当前路由使用的旧登录模块
│  │  └─ tab/
│  │     ├─ Params.vue           # 工艺参数编辑表格
│  │     ├─ featureManage.vue    # 特征关系分析
│  │     ├─ createModel/         # 模型训练、模型管理、模型图表
│  │     ├─ sysManage/           # 用户管理及未挂载的通知/日志/数据管理
│  │     ├─ user/                # 当前路由使用的登录、注册、找回、个人中心
│  │     └─ subcomponents/       # 首页图表及较多旧/未使用图表组件
│  ├─ router/index.js            # 全部当前路由
│  ├─ store/
│  │  ├─ index.js                # Vuex 根 store
│  │  └─ taskModule.js           # 模型训练命名空间状态
│  ├─ utils/
│  │  ├─ request.js              # 业务 Axios 实例
│  │  ├─ requestAlg.js           # 算法 Axios 实例
│  │  ├─ api.js                  # 另一套全局 Axios 请求封装
│  │  └─ storage.js              # sessionStorage 简单封装
│  ├─ views/
│  │  ├─ dash/index.vue          # 首页仪表盘
│  │  ├─ dataManage.vue          # 数据管理
│  │  ├─ ParameterTuning.vue     # 参数调优
│  │  ├─ qualityPredict.vue      # 质量预测
│  │  ├─ historyParameter.vue    # 历史参数方案
│  │  └─ LogIn.vue               # 未挂载的旧入口页
│  ├─ App.vue                    # 根组件
│  └─ main.js                    # 应用入口
├─ .eslintrc.js
├─ babel.config.js
├─ jsconfig.json
├─ package.json
├─ README.md
└─ vue.config.js
```

`src/assets/data/` 中只有以下文件被当前可达代码直接导入：`fieldMaps.json`、`parameter.json`、`params.js`、`model.js`。其余 `machine_parameter.js`、`machineInfo.js`、`machineData.js`、`*_data.js`、`quality.json` 等是已打包进仓库但当前未被导入的样例/历史数据。

## 6. 主要页面

### 6.1 当前路由可达页面

| 路由 | 页面源码 | 当前源码中的实际功能与状态 |
| --- | --- | --- |
| `/login` | `src/components/tab/user/Login.vue` | 用户名、密码、验证码登录；调用 `/user/login`，成功后写入 sessionStorage 并跳转 `/dash`。 |
| `/register` | `src/components/tab/user/register.vue` | 用户名异步查重、密码规则、三组密保问题，调用 `/user/signUp`；新用户提交为普通用户且状态为待激活。 |
| `/forget` | `src/components/tab/user/forget.vue` | 三步式找回密码：查询密保问题、校验答案、更新密码。 |
| `/userCenter` | `src/components/tab/user/userCenter.vue` | 按 sessionStorage 中的用户 ID 查询个人信息，可修改用户名和密保答案。 |
| `/updatePassword` | `src/components/tab/user/updatePassword.vue` | 校验原密码、更新新密码，成功后清空会话。 |
| `/dash` | `src/views/dash/index.vue` | 快捷入口、调参方案数、模型任务数、近期任务折线图、算法使用频次柱状图；数据来自后端统计接口。 |
| `/dataManage` | `src/views/dataManage.vue` | 按机台/模具/材料/产品/机台参数类型查询列表，用字段映射转成中文列名，客户端分页并导出 Excel。 |
| `/ParameterTuning` | `src/views/ParameterTuning.vue` | 上传并解析 CSV，选择产品系列+预测模型、任务、参数推荐算法和范围比例，调用算法推荐接口，展示预测质量并允许保存参数历史。存在输入与最终显示/保存不完全一致的问题，见第 7 节。 |
| `/qualityPredict` | `src/views/qualityPredict.vue` | 选择机台、模具、材料、产品，编辑工艺参数，选择模型后调用质量预测接口并展示结果。当前真正发送的是组件内硬编码 `tableData4` 转换结果，不是 `Params` 组件刚提交的 `paramsData`。 |
| `/featureManage` | `src/components/tab/featureManage.vue` | 基于内置相关性数组生成关系图；点击节点更新雷达图和相关性表。当前没有后端请求。 |
| `/TaskManage` | `src/components/tab/createModel/model_manage/TaskManage.vue` | 获取全部模型记录，按产品系列/算法/任务名/创建人筛选，客户端分页，支持查看和删除。 |
| `/ModelTraining` | `src/components/tab/createModel/model_training/ModelTraining.vue` | 五步式训练容器：任务创建、数据选择、特征工程、模型训练、结果。存在明确调用断点，不能按完整闭环认定。 |
| `/TaskCheck/:id` | `src/components/tab/createModel/model_manage/TaskCheck.vue` | 按路由 ID 获取模型详情、展示 MAPE、提供 PDF 导出。图表 DOM 已注释但 `mounted` 仍初始化图表，存在空 DOM 初始化问题。 |
| `/UserManage` | `src/components/tab/sysManage/UserManage.vue` | 用户列表、角色/状态筛选、分页、添加、编辑角色和状态、删除用户。侧栏仅管理员显示入口，但路由本身没有守卫。 |

路由定义集中在 `src/router/index.js:31-126`。

### 6.2 存在源码但当前路由不可达的页面/模块

| 文件/目录 | 源码内容 | 当前集成状态 |
| --- | --- | --- |
| `src/components/tab/sysManage/AdminDataManage.vue` | 管理数据表、CSV 上传、分类、编辑、删除、下载审批、预览 | 未在路由注册，侧栏对应入口被注释/禁用；内部还存在未定义的 `getTableData`。 |
| `src/components/tab/sysManage/Inform.vue` | 通知查询、发布、修改、删除 | 未注册路由；侧栏入口已注释。 |
| `src/components/tab/sysManage/LogManage.vue` | 日志查询、筛选、分页 | 未注册路由；侧栏入口已注释。 |
| `src/components/login/` | 一套旧的登录、注册、找回密码和 404 页面 | 当前路由使用的是 `src/components/tab/user/` 下的同类页面。旧页面仍包含医学项目文案和旧路径。 |
| `src/views/LogIn.vue` | “用户界面/管理员界面”二选一跳转页 | 未注册；目标路径也不在当前路由表中。 |
| `src/components/AppMain.vue` | 带 transition 的 `router-view` | 主框架中导入和使用均被注释。 |
| `src/views/dash/test.html` | 独立测试 HTML | 不在 Vue 路由和构建入口中。 |

## 7. 主要业务模块

### 7.1 首页统计

- 获取模型总数：`GET /model/modelNums`。
- 获取历史调参方案总数：`GET /parameterHistory/parameterNums`。
- 获取近期模型任务数：`GET /model/getModelNearlyDays?nearlyDays=10`。
- 获取近期算法使用频次：`GET /model/getAlgoNearlyDays?nearlyDays=10`。
- 页面将接口数据转换为 ECharts 折线图和多系列柱状图。

证据：`src/views/dash/index.vue:128-185`、`src/api/model.js`、`src/api/parameterHistory.js`。

### 7.2 基础数据管理

- 页面提供五种数据类别：机器信息、模具信息、材料信息、产品信息、机台参数。
- 类别被映射为 `machine_info`、`mold_info`、`material_info`、`product_info`、`machine_params`，请求 `GET /data/list?type=...`。
- 后端英文字段通过 `src/assets/data/fieldMaps.json` 转为中文表头。
- 表格分页完全在前端用 `slice` 完成，默认每页 5 条。
- Excel 导出包含当前类别已经加载的全部 `tableData`，不只是当前页。

证据：`src/views/dataManage.vue:55-133`。

### 7.3 参数调优

源码已经连接以下数据和接口：

- 通过 `DebouncedSelect` 请求 `/machine/list`、`/mold/list`、`/material/list`、`/product/list`；选中后请求对应 `/detail/:id`。
- 通过 `GET /model/modelFilterObject` 获取“产品系列+模型”到任务列表的映射。
- 使用 `FileReader` + Papa Parse 读取 CSV，第一行为表头并启用动态类型转换。
- 调用 `POST /recommend/{产品系列}/{模型}/{范围比例}/{推荐算法}`，请求体为 `{ data: CSV表格数组 }`。
- 解析算法服务返回的 `recommend_data`、`recommend_label` 和 `loss`。
- 调用 `POST /parameterHistory` 保存参数方案。

同时存在以下“当前真实行为”边界：

- 任务选择 `selectedTask` 只用于界面选择，没有进入参数推荐请求；证据见 `src/views/ParameterTuning.vue:399,658,720`。
- 算法返回值被合并到 `parameterData`，但结果区的 `Params` 仍绑定初始 `params`，不是 `parameterData`；证据见模板顶部和 `src/views/ParameterTuning.vue:724-729`。
- 保存历史方案时，机台 IP、模号、产品料号、物料代码是固定字符串，只有 `paramsJson` 来自参数组件；证据见 `src/views/ParameterTuning.vue:628-646`。
- 机台、模具、材料和产品详情会展示在页面，但没有并入参数推荐请求体。

因此，当前可确认的是“CSV + 产品/模型 + 范围比例 + 推荐算法”已经接入推荐服务；不能把所有可见选择项都认定为算法输入。

### 7.4 质量预测

源码已经连接以下接口：

- 机台、模具、材料、产品列表和详情接口；
- `GET /model/modelFilterObject`；
- `POST /predict/{产品系列}/{算法}`。

当前真实传参链路为：

1. 点击预测时调用 `Params.emitParamsToParent()`，把表单值写入 `paramsData`；
2. 随后没有使用 `paramsData`，而是把组件内初始化的 `tableData4` 转成 `{label, value}` 数组；
3. 将该数组发给 `predictQuality`；
4. 对服务返回的 JSON 字符串执行两次 `JSON.parse` 相关处理并展示第一条结果。

证据：`src/views/qualityPredict.vue:543-562`。`selectedTask` 及机台/模具/材料/产品详情没有进入最终预测请求。

### 7.5 模型训练

训练容器由 `src/components/tab/createModel/model_training/ModelTraining.vue` 组合五个步骤，并通过 Vuex `modelTraining.step` 切换：

1. **任务创建**：填写任务名、创建人、产品系列、备注，调用 `/model/existTaskName` 查重。产品系列是前端固定的 `001`～`004`。
2. **数据选择**：用 FileReader + Papa Parse 上传和预览 CSV，并计划写入 Vuex。
3. **特征工程**：展示皮尔逊相关性热力图和特征重要性饼图。
4. **模型训练**：从 `src/assets/data/model.js` 加载 `ro`、`smoter`、`smogn`、`gsogb-smoter`，调用算法服务 `/train/{productSeries}/{algorithm}`。
5. **结果**：展示任务信息和 MAPE，并调用 `POST /model` 保存模型记录。

但源码中存在会阻断或削弱流程的事实：

- `DataSelect.vue` 在初始化中访问未定义的 `this.nodeId`，随后可能调用不存在的 `getTableDescribe`，并递归调用自身 `getTableData`；证据见 `DataSelect.vue:181-191`。
- 数据下一步调用 `m_reset_train_select_data()`，对应 Vuex mutation 未在 `taskModule.js` 定义；证据见 `DataSelect.vue:258`、`src/components/mixins/vuex_mixin.js:137-138`。
- `FeatureSelect.vue` 先绘制硬编码热力图和饼图数据，随后调用未导入、未定义的 `getPearsonCorrelation`；ESLint 也报告 `no-undef`；证据见 `FeatureSelect.vue:105-111,132,146-184,358-365`。
- 训练请求只携带 URL 中的产品系列和算法，没有携带上传的 CSV、任务名、特征选择或算法参数；证据见 `AlgorithmSelect.vue:239` 和 `src/api/useAlgorithm.js:13-15`。
- 算法参数编辑表单在模板中被注释，当前切换逻辑只允许保留一个算法为选中状态。
- 结果页的 `dlModel`、`mlModel` 固定返回空数组，因此模型详情图表区不会显示；页面实际可见结果主要是任务信息和 MAPE。证据见 `Result.vue:251-276`。

所以模型训练应认定为“已搭建五步页面、部分接口和保存模型记录，但当前源码存在明确断点”，不能认定为完整可运行训练闭环。

### 7.6 模型管理

- `TaskManage.vue` 调用 `GET /model/list`，在浏览器内按产品系列、算法、创建人、任务名筛选和排序，再分页展示。
- 删除调用 `DELETE /model/{id}`。
- 普通用户只显示自己创建记录的删除按钮，管理员显示全部删除按钮；这是 UI 层判断。
- 查看跳转 `/TaskCheck/:id`，详情调用 `GET model/checkModel/{id}` 并解析 `resultJson`。
- 详情页提供 jsPDF + html2canvas 导出。

证据：`src/components/tab/createModel/model_manage/TaskManage.vue:96-199`、`TaskCheck.vue:135-185,408-450`。

详情页模板中的图表 DOM 已被注释，但 `mounted()` 仍调用 `initEcharts()`，会向 `echarts.init` 传入空 DOM。当前生产构建不会捕获这种运行期问题。

### 7.7 历史调参方案

- 调用 `GET /parameterHistory/list` 获取全部历史方案。
- 查看时解析 `row.paramsJson`，交给 `Params` 组件展示。
- 删除调用 `DELETE /parameterHistory/{id}`。
- 页面编写了机台 IP、产品编号筛选和分页 computed。

但表格实际绑定的是 `tableData`，不是 `displayedParameters`；因此当前模板不会应用 computed 中的筛选和分页。证据见 `src/views/historyParameter.vue:24`、`:72-110`。

### 7.8 特征关系分析

- 不请求后端；原始相关性值内置在组件 `rawCorrelationData`。
- 前端把数组转换为“标签—可调参数”关系，生成 ECharts circular graph。
- 点击节点后更新雷达图和右侧相关性明细表，并按相关值降序排列。

证据：`src/components/tab/featureManage.vue:54-164,167-357`。

### 7.9 用户与系统管理

- 注册、登录、密保找回、个人信息、修改密码均调用业务后端用户接口。
- 管理员用户页支持服务端分页取用户列表，并在前端做当前页角色/状态/名称筛选。
- 管理员可新增用户、修改用户角色和状态、删除用户。
- 通知、日志和管理员数据集管理虽有较完整页面源码，但当前均未挂载到路由。

证据：`src/components/tab/user/`、`src/components/tab/sysManage/UserManage.vue`、`Inform.vue`、`LogManage.vue`、`AdminDataManage.vue`。

## 8. 公共组件

### 8.1 当前业务实际复用的组件

| 组件 | 用途 | 使用位置 |
| --- | --- | --- |
| `src/components/sideBar/index.vue` | 主布局、导航、用户菜单、角色菜单显示、路由出口 | 根路由 `/` |
| `src/components/DebouncedSelect.vue` | 300ms 防抖远程选择；首次聚焦加载全部，之后本地筛选 | 参数调优、质量预测 |
| `src/components/tab/Params.vue` | 在扁平参数对象与五类工艺参数表格之间双向转换，并向父组件提交 | 参数调优、质量预测、历史方案查看 |
| `src/components/tab/subcomponents/LineChart.vue` | 近期任务数折线图 | 首页 |
| `src/components/tab/subcomponents/Bar.vue` | 算法使用频次柱状图 | 首页 |
| 五个训练步骤组件 | 共享 `modelTraining` Vuex 状态组成训练向导 | `ModelTraining.vue` |

### 8.2 Mixins

- `src/components/mixins/mixin.js`：tab 切换、Element 表单重置、自定义 debounce。
- `src/components/mixins/vuex_mixin.js`：把 `modelTraining` 模块的大量状态和 mutation 包装为 `m_*` computed/method。

### 8.3 图表与遗留组件

`src/components/tab/createModel/model_eCharts/` 包含关系图、特征饼图、Loss/Reward 曲线、预测折线图、混淆矩阵。它们被结果或详情页注册，但多个对应模板区块已注释或由空数组控制，不应全部视为当前可见功能。

`src/components/tab/subcomponents/` 还包含同名图表副本及 `AlgorithmSelect.vue`、`Table.vue`、`Tree.vue`、`Sprit.vue`、`Pie.vue`、`PlusAndMinusBar.vue`、`doubleLineChart.vue` 等。除 `LineChart.vue` 和 `Bar.vue` 外，当前路由调用链未发现这些组件被导入。

项目没有通过 `Vue.component` 注册全局业务组件；只有 Element UI 通过 `Vue.use(ElementUI)` 全局安装。

## 9. 状态管理

### 9.1 Vuex 根状态

`src/store/index.js` 定义：

- `dataList`
- `taskList`
- `modelList`

并提供获取数据表、任务和模型列表的 actions，以及按疾病、创建人、负责人等去重的 getters。可是 `src/App.vue` 中三个初始化 action 调用都被注释，当前可达登录页也没有 dispatch 它们。因此根列表在正常启动后默认仍为空，相关旧 mixin/旧组件不能依赖其已加载。

### 9.2 `modelTraining` 命名空间模块

`src/store/taskModule.js` 保存：

- 当前训练步骤 `step`；
- 一组旧结构字段，如 taskName、dataset、features、models；
- 当前训练结构 `train_model`，包含任务信息、CSV 数据、算法选择和结果。

训练步骤主要通过 `ChangeStep`、`ChangeModelTrain`、`reset_state_train_model` 修改状态。`src/components/mixins/vuex_mixin.js` 对它们做统一包装。

当前状态层存在旧结构和新结构并存：mixin 暴露了 `SF_DRMB`、`SVM`、`KNN`、预测相关字段等，但 `taskModule.js` 并未定义其中一部分；mixin 也包装了模块中不存在的 `reset_state_from_datasets`、`reset_train_select_data` mutation。

### 9.3 页面本地状态

除模型训练向导外，首页、数据管理、参数调优、质量预测、模型管理、历史方案、用户页都主要使用组件 `data()` 保存状态。没有发现 Pinia、RxJS 或其他状态库。

## 10. 路由体系

- 路由器：Vue Router 3，未显式设置 `mode`，因此使用默认 hash 模式。
- 所有页面使用静态 `import`，没有路由级动态导入。
- `/` 使用 `sideBar` 作为布局组件并重定向到 `/dash`。
- 首页及主要业务页面是 `sideBar` 的 children；实际 URL 为 `/dash`、`/dataManage` 等。
- `/login`、`/register`、`/forget`、`/userCenter`、`/updatePassword` 是布局外顶级路由。
- `/TaskCheck/:id` 使用动态参数读取模型 ID。
- 没有 catch-all 路由，也没有当前生效的 404 路由。

`meta.roles` 已写入路由，但全局 `beforeEach` 整段被注释；证据见 `src/router/index.js:133-155`。此外，注释中的普通用户限制路径使用 `"/UserManage"`，但实际路由守卫并未运行。

## 11. 网络请求体系

### 11.1 三套请求入口

| 请求入口 | 基础地址/行为 | 实际使用 |
| --- | --- | --- |
| `src/utils/request.js` | Axios 实例；`http://10.16.24.23:8083`；5 秒超时；响应返回 `response.data` | `src/api/user.js`、`model.js`、`parameterHistory.js` |
| `src/utils/requestAlg.js` | Axios 实例；`http://10.16.76.111:5000`；无超时；响应返回 `response.data` | `src/api/useAlgorithm.js` |
| `src/utils/api.js` | 修改全局 Axios defaults；同一业务地址；无超时；响应成功时触发 Element Message | 当前用户登录、注册、个人中心、用户管理 |

`src/main.js` 还把原始 Axios 挂到 `Vue.prototype.$axios`。当前可达代码中主要只有未挂载的 `AdminDataManage.vue` 直接使用它。

### 11.2 API 模块

- `src/api/user.js`：通用 GET/POST 和用户列表。
- `src/api/model.js`：模型新增、删除、列表、分页、任务名查重、模型筛选对象、首页统计。
- `src/api/parameterHistory.js`：历史参数方案增删查、分页和统计。
- `src/api/useAlgorithm.js`：参数推荐、质量预测、训练。

### 11.3 当前请求层事实

- 业务服务和算法服务地址硬编码，没有从 `.env` 读取。
- 两套业务请求封装并存，超时、响应结构和消息处理不一致。
- `utils/api.js` 的 GET 包装把参数放在 Axios 的 `data` 字段，不是 `params`；嵌入 URL 的查询参数不受影响。
- 请求拦截器中的 Authorization 逻辑全部被注释。登录虽保存 `token`，前端后续请求并不会主动携带它。
- 未发现 refresh token、请求取消、重试、统一业务错误码跳转或并发去重。

### 11.4 开发代理

`vue.config.js` 配置：

- `/api` -> `http://10.16.24.23:8083`，并移除 `/api` 前缀；
- `/echarts` -> `https://echarts.apache.org/examples`，并移除 `/echarts` 前缀。

但绝大部分接口通过硬编码绝对 `baseURL` 发出，会绕过 Vue DevServer 代理。当前登录验证码使用相对地址 `/api/common/kaptcha`，会走开发代理。

## 12. 数据存储方式

| 存储位置 | 实际数据 | 生命周期 | 源码证据 |
| --- | --- | --- | --- |
| `sessionStorage` | `username`、`userid`、`userrole`、`token` | 当前浏览器标签页会话 | `Login.vue:231-234`、`sideBar/index.vue` |
| Vuex 内存 | 根列表、模型训练跨步骤状态 | 页面刷新即丢失 | `src/store/` |
| 组件内存 | 表格、筛选条件、CSV 解析结果、图表数据 | 组件销毁即丢失 | 各页面 `data()` |
| 静态打包数据 | 字段映射、默认工艺参数、算法介绍、相关性示例 | 随前端构建发布 | `src/assets/data/` |
| 后端持久化 | 用户、数据、模型记录、历史参数方案 | 由仓库外后端控制 | `src/api/` 与页面接口调用 |

`src/utils/storage.js` 只是 sessionStorage 的 set/get/remove 包装，当前业务组件没有导入它，而是直接访问 `window.sessionStorage` 或 `sessionStorage`。

未发现 localStorage、IndexedDB、Cache Storage 或前端数据库使用。

## 13. 用户登录/身份相关逻辑

### 13.1 登录

- 登录字段：用户名、密码、验证码。
- 验证码图片：`/api/common/kaptcha?timestamp=...`，点击刷新时间戳。
- 登录接口：`POST user/login`。
- 只有 `resp.code == 200` 且 `resp.data.userStatus === "1"` 时写入会话并跳转。
- 保存字段：用户名、用户 ID、角色、后端 `resp.msg` 中的 token。

证据：`src/components/tab/user/Login.vue:120-255`。

### 13.2 注册与找回密码

- 注册有用户名后端查重、密码复杂度校验、重复密码校验和三组密保问题。
- 注册请求固定 `role: 1`、`userStatus: 0`，即普通用户、待激活。
- 找回密码先请求密保问题，再校验三组答案，最后调用更新密码接口。

证据：`src/components/tab/user/register.vue`、`forget.vue`。

### 13.3 个人资料与修改密码

- 个人中心使用 sessionStorage 中的用户 ID 请求 `/user/getmessage/{id}`。
- 可修改用户名和密保答案，并刷新 sessionStorage 中的用户名。
- 修改密码页调用 `/user/VerifyPas` 校验原密码，调用 `/user/updatePas` 更新密码，成功后清空会话。

证据：`src/components/tab/user/userCenter.vue`、`updatePassword.vue`。

### 13.4 退出

侧栏退出直接 `sessionStorage.clear()` 并跳转 `/login`；证据见 `src/components/sideBar/index.vue:208-212`。

## 14. 权限逻辑

项目存在角色数据和若干 UI 级权限判断，但不存在当前生效的前端路由鉴权闭环。

当前角色约定：

- `"0"`：管理员；
- `"1"`：普通用户。

已存在的权限表现：

- 侧栏只有 `userRole === "0"` 时显示“系统管理”；`src/components/sideBar/index.vue`。
- `/UserManage` 的 route meta 为 `roles: ["0"]`；`src/router/index.js:121-124`。
- 模型管理中，管理员或记录创建者可见删除按钮；`TaskManage.vue` 模板。
- 用户管理页面可以修改角色和账号状态；`UserManage.vue`。

未生效或缺失的部分：

- `router.beforeEach` 整段被注释，未登录用户可以直接访问业务路由。
- `meta.roles` 没有任何代码消费。
- 普通用户可以手工输入 `/UserManage`，前端路由不会阻止。
- token 没有附加到请求头。
- 没有指令级、组件级或按钮级统一权限系统；当前判断散落在模板中。

因此，只能认定项目“有用户角色字段和部分角色 UI”，不能认定已经实现可靠的前端鉴权/权限控制。

## 15. 特殊浏览器 API 或第三方 SDK

### 15.1 浏览器 API

- `FileReader`：读取本地 CSV；`ParameterTuning.vue`、`DataSelect.vue`。
- `sessionStorage`：保存登录会话和角色；登录、侧栏、用户页、模型管理页。
- DOM API：`document.getElementById`、`document.createElement`、`getBoundingClientRect`；图表初始化、文本测量、下载链接。
- Canvas/Data URL：html2canvas 把页面节点转为 Canvas/Image，用于 PDF 或图片下载。
- `window.addEventListener("resize")`：部分 ECharts 响应窗口变化。
- `location.reload()`：个人资料修改后刷新页面。
- `Intl.DateTimeFormat`：登录旧通知逻辑和未挂载通知管理页的北京时间格式化。

### 15.2 第三方 SDK/库

- ECharts：所有可视化；没有使用 `vue-echarts` 包装组件。
- Papa Parse：CSV 解析。
- SheetJS `xlsx`：Excel 文件生成和下载。
- jsPDF + html2canvas：PDF 导出。
- Element UI：UI 组件和全局消息。

当前路由使用的注册页会加载 `img.benmu-health.com` 的远程图片；证据见 `src/components/tab/user/register.vue:13-17`。找回密码页保留了同域名图片代码，但对应模板区块已经注释，不会实际加载；见 `src/components/tab/user/forget.vue:15-23`。

未发现 WebSocket、EventSource/SSE、WebRTC、Geolocation、Web Worker、Service Worker、Notification API 或第三方登录 SDK。

## 16. 工程化配置

### 16.1 Vue CLI

`vue.config.js` 的当前配置：

- `productionSourceMap: false`；
- `transpileDependencies: true`；
- `lintOnSave: false`；
- 开发服务监听 `0.0.0.0:8080`；
- 启动后自动打开浏览器；
- 关闭开发错误 overlay；
- 配置 `/api` 和 `/echarts` 两个代理。

### 16.2 Babel 与模块解析

- Babel 仅使用 `@vue/cli-plugin-babel/preset`；`babel.config.js`。
- `jsconfig.json` target 为 ES5，模块为 ESNext，配置 DOM/ESNext lib 和 `@` 路径别名。
- 浏览器目标为 `> 1%`、最近两个版本、非 dead；`package.json`。

### 16.3 ESLint

- `package.json` 和 `.eslintrc.js` 都声明 Vue Essential + ESLint Recommended。
- `.eslintrc.js` 额外关闭多词组件名规则，并按生产环境控制 console/debugger。
- `vue.config.js` 又设置 `lintOnSave: false`，所以开发和生产编译不会因 lint 错误中断。

### 16.4 当前未发现的工程配置

- 没有 `.env` 或 `.env.*` 实际文件；只有 `.gitignore` 中的忽略规则。
- 没有 TypeScript 配置。
- 没有单元测试、端到端测试或测试脚本。
- 没有 Prettier 配置。
- 没有 Docker、Nginx、CI/CD 或云部署配置。
- 没有独立 webpack/vite 配置，构建完全依赖 Vue CLI。
- README 仍是 Vue CLI 默认运行说明，没有业务架构、接口或部署说明。

### 16.5 本次静态与构建验证结果

本次实际执行了 `npm run lint`：失败，共 26 个 error。主要类型包括：

- `FeatureSelect.vue` 的 `getPearsonCorrelation` 未定义；
- `AdminDataManage.vue` 的 `getTableData` 未定义；
- 两个 `PredictLineChart.vue` 的 `$` 未定义；
- 重复 watch key、computed 中修改原数组；
- 多个未使用导入和已注册但模板未使用的组件；
- Vuex reset mutation 中无效的局部 `state` 重新赋值警告。

本次也将生产构建输出到系统临时目录，未修改项目 `dist`。构建成功，但有 3 组警告：

1. `src/main.js` 使用 `import echarts from "echarts"`，ECharts 5 没有该 default export；
2. `login_bg.png` 为约 670 KiB，`chunk-vendors` 为约 3.47 MiB；
3. 入口资源合计约 3.92 MiB，超过 webpack 推荐阈值。

此外构建过程提示 Browserslist 数据过期和 Node `fs.Stats` API 弃用。这里的体积数值来自本次真实构建输出，不是业务性能数据。

## 17. 构建运行流程

### 17.1 安装

```bash
npm install
```

依赖锁定文件为 npm lockfile v3：`package-lock.json`。

### 17.2 本地开发

```bash
npm run serve
```

实际执行 `vue-cli-service serve`。开发服务器默认：

- 地址：`0.0.0.0`
- 端口：`8080`
- 自动打开浏览器
- 页面路由为 hash 模式

要完整使用页面，还需要网络能够访问：

- `10.16.24.23:8083` 业务后端；
- `10.16.76.111:5000` 算法服务；
- 注册/找回页面所用的外部图片域名。

### 17.3 生产构建

```bash
npm run build
```

实际执行 `vue-cli-service build`，默认产物为 `dist/`，生产 source map 被关闭。本次临时目录验证中构建成功，但源码中的运行时断点不会被 webpack 构建发现。

### 17.4 代码检查

```bash
npm run lint
```

实际执行 `vue-cli-service lint`。截至本次普查，该命令失败并报告 26 个错误。

### 17.5 部署

仓库中没有部署配置。仅根据当前源码可以确定：部署端需要提供 SPA 静态资源，并处理 hash 路由；但 API 地址已经硬编码为内网 HTTP 地址，生产环境不会自动使用开发代理。

## 18. 值得下一步重点阅读的文件

以下排序只基于理解项目“真实业务和数据流”的重要性，不代表亮点评价或改造建议。

| 优先级 | 文件 | 下一步需要读清的原因 |
| --- | --- | --- |
| 1 | `src/router/index.js` | 确定所有可达页面、布局边界、角色 meta 和当前失效的守卫。 |
| 2 | `src/components/sideBar/index.vue` | 确定业务导航、管理员入口和会话退出逻辑。 |
| 3 | `src/utils/request.js`、`requestAlg.js`、`api.js` | 理清三套 Axios 行为、两个后端地址、响应结构和 token 未接入事实。 |
| 4 | `src/api/model.js`、`parameterHistory.js`、`useAlgorithm.js`、`user.js` | 建立完整接口清单和页面—接口对应关系。 |
| 5 | `src/views/ParameterTuning.vue` | 当前最复杂的 CSV、模型选择、算法推荐、结果展示与历史保存组合流程。 |
| 6 | `src/views/qualityPredict.vue` | 需要继续核对 UI 输入、工艺参数结构和真正发送给算法服务的数据差异。 |
| 7 | `src/components/tab/Params.vue` | 工艺参数领域模型及扁平/表格格式转换的核心组件。 |
| 8 | `src/components/tab/createModel/model_training/ModelTraining.vue` | 五步训练流程的总装入口。 |
| 9 | `src/store/taskModule.js`、`src/components/mixins/vuex_mixin.js` | 训练流程跨步骤状态、旧字段和当前字段并存的来源。 |
| 10 | `TaskInfo.vue`、`DataSelect.vue`、`FeatureSelect.vue`、`AlgorithmSelect.vue`、`Result.vue` | 逐步确认训练流程每一步的输入、输出、接口和断点。 |
| 11 | `src/components/tab/createModel/model_manage/TaskManage.vue`、`TaskCheck.vue` | 理清模型记录持久化、查看、删除和 PDF 导出。 |
| 12 | `src/views/dataManage.vue`、`src/assets/data/fieldMaps.json` | 理清五类业务数据与中英文字段映射。 |
| 13 | `src/components/tab/featureManage.vue` | 区分静态演示数据与真实接口数据，理解关系图交互。 |
| 14 | `src/components/tab/user/`、`src/components/tab/sysManage/UserManage.vue` | 理清注册激活、登录、角色、状态和管理接口。 |
| 15 | `vue.config.js`、`package.json`、`.eslintrc.js` | 理清构建、代理、依赖、lint 和当前构建警告。 |

---

## 附录 A：当前接口分组

### 业务后端 `10.16.24.23:8083`

- 用户：登录、注册、密保问题、密保验证、密码更新、个人信息、用户名查重、用户列表、角色/状态更新、添加/删除用户。
- 数据：五类数据列表，机台/模具/材料/产品列表与详情。
- 模型：新增、删除、列表、详情、任务名查重、模型筛选对象、数量及近期统计。
- 参数历史：新增、删除、列表、分页、数量。
- 未挂载模块：通知、日志、管理员数据集及下载审批。

### 算法服务 `10.16.76.111:5000`

- `POST /recommend/{pro}/{alg}/{ra}/{p_alg}`：参数推荐。
- `POST /predict/{pro}/{alg}`：质量预测。
- `GET /train/{productSeries}/{algorithm}`：模型训练。

接口定义证据集中在 `src/api/`，页面实际调用证据见第 7 节。

## 附录 B：当前明确不存在或未启用的能力

根据本次全仓扫描，当前不能认定项目已经实现：

- 生效的登录路由守卫；
- 生效的基于 route meta 的角色权限；
- 请求 token 自动注入和 refresh token；
- WebSocket、SSE 或其他实时通信；
- SSR、PWA、Service Worker、Web Worker、微前端；
- 单元测试、E2E 测试和 CI/CD；
- 环境变量驱动的多环境 API 配置；
- 路由懒加载；
- 完整可运行的五步模型训练闭环。

这些结论均是对当前仓库状态的描述，不是对后端或其他未提供仓库能力的推断。
