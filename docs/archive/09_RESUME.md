# 前端实习简历项目描述

## 项目名称

**注塑工艺参数与质量决策工作台**

## 一句话项目介绍

面向注塑工艺与质量人员的内部 Web 工作台，集中承载生产基础数据查询、模型训练、参数推荐、质量预测和历史方案管理，帮助业务人员在统一界面完成数据校验、算法交互与结果沉淀。

## 技术栈

Vue 2、Vue Router、Vuex、Element UI、Axios、Papa Parse、ECharts、SheetJS、Vue CLI、Node.js Test Runner

## 简历项目经历

负责前端核心业务链路梳理与工程化增强，重点完成工艺参数建模、多服务请求治理、训练流程状态管理和数据集导入重构；算法计算由独立后端服务提供。

- 针对 76 项工艺参数在 UI、推荐、预测和历史记录间存在多套 DTO、手写映射易串位的问题，设计 Schema 驱动的领域模型与受控表单，将历史、推荐、预测 DTO 的转换和校验抽为纯函数；8 项测试验证 76 个字段往返无差异，并保证用户编辑准确进入 26 项预测请求参数。
- 针对快速切换时旧响应覆盖新状态、多服务错误语义分散的问题，封装业务服务与算法服务的 HTTP Client 工厂，统一 `ApiError` 和请求标识；通过 `AbortController` 与请求身份校验实现 latest-wins，并为远程下拉加入 single-flight 和原始列表缓存，10 项请求可靠性测试中旧结果提交次数为 0、重叠加载仅发起 1 次 API。
- 针对五步训练流程仅由数字 `step` 驱动、刷新丢失状态且长耗时任务难恢复的问题，实现前端工作流/远程任务双层状态机与异步任务协议适配层，以迁移守卫和状态版本防止越级与状态倒退，通过幂等键降低重复创建风险，并加入递归退避轮询和按用户、版本、TTL 管理的轻量草稿；9 项测试覆盖乱序、重试、取消与恢复边界。
- 针对两处 CSV 导入重复实现、一次性完整文本解析和完整数据数组进入响应式层后缺少资源边界的问题，抽取共享分块导入管线，以 Dataset Schema 完成表头、类型及行列级错误校验；设置文件、行数、单元格等保护预算，将完整数据置于可显式释放的非响应式仓库，页面仅保留最多 200 行预览，9 项测试覆盖超限中止、异步取消和数据释放。

## 每条简历描述对应的源码或实现依据

### 项目定位与本人工作范围

- 页面体系：`src/router/index.js:61-123` 注册仪表盘、数据管理、参数调优、质量预测、模型训练、任务管理和历史参数等业务路由。
- 算法交互：`src/views/ParameterTuning.vue:828-905` 完成数据集到参数推荐结果的页面链路；`src/views/qualityPredict.vue:534-598` 完成参数校验、预测 DTO 组装、请求与结果展示。
- 数据与结果管理：`src/views/dataManage.vue:44-132` 提供业务数据查询和 Excel 导出；`src/views/historyParameter.vue` 提供历史调参方案查询、查看和删除。
- 前端增强范围：四项核心实现分别集中在 `src/domain/parameter/`、`src/utils/http.js` 与 `src/utils/requestCoordinator.js`、`src/domain/training/`、`src/domain/dataset/`，并已接入现有 Vue 页面和 Vuex。

### 1. Schema 驱动的工艺参数域模型

| 证据类型 | 源码或验证依据 |
| --- | --- |
| 单一字段契约 | `src/domain/parameter/parameterSchema.js:1-326` 定义 Schema 版本、76 个稳定领域字段、UI 布局及端点别名，并在模块初始化时执行唯一性和布局覆盖自检。 |
| 纯函数转换与校验 | `src/domain/parameter/parameterTransform.js:64-265` 实现历史 DTO、推荐 DTO、canonical form 和预测 DTO 间的转换，以及严格数字解析、未知字段隔离和目标操作校验。 |
| 受控表单 | `src/components/tab/Params.vue:55-145` 由 Schema 渲染分组表格并采用 props down / events up；父页面分别在 `src/views/ParameterTuning.vue:713-739,881-886` 和 `src/views/qualityPredict.vue:539-556` 持有并提交唯一表单状态。 |
| 自动化验证 | `tests/parameterDomain.test.js:49-180` 共 8 项测试，覆盖 76 字段唯一性与往返、四/五段注射时间和温控箱 5/6 隔离、非法数字、26 项预测 DTO 及单字段变更隔离。 |

可解释的价值：消除了参数在页面显示、算法请求和历史回显之间各自维护映射的风险，并把已经出现过的字段串位问题固化为回归测试。这里的“往返无差异”是针对当前测试 DTO 的断言，不代表模型预测准确率得到提升。

### 2. 多服务请求可靠性与竞态治理

| 证据类型 | 源码或验证依据 |
| --- | --- |
| 多服务 Client | `src/utils/http.js:14-228` 实现 `ApiError`、错误归一化、请求标识、响应解包和契约校验；`src/utils/request.js:1-8` 与 `src/utils/requestAlg.js:1-8` 保留业务/算法服务各自配置。 |
| latest-wins | `src/utils/requestCoordinator.js:12-104` 将 `AbortController` 与当前请求 entry 身份校验组合，旧请求即使晚完成也没有状态提交资格。 |
| 下拉请求合并 | `src/components/DebouncedSelect.vue:54-190` 保留不可变原始列表、合并 pending Promise，并在组件销毁时取消防抖和在途请求。 |
| 页面接入 | `src/views/ParameterTuning.vue:650-667,747-905`、`src/views/qualityPredict.vue:385-398,454-598` 接入详情联动、重复点击保护、取消和 `finally` 状态收口。 |
| 自动化验证 | `tests/http.test.js:43-127`、`tests/requestCoordinator.test.js:23-89`、`tests/debouncedSelect.test.js:110-174` 共 10 项测试，覆盖错误分类、乱序成功/失败、销毁取消、single-flight 和列表复用。 |

可解释的价值：在可控乱序测试中，旧成功与旧失败的状态提交次数均为 0；两个重叠的首次列表加载只产生一次 API 调用。该结果来自自动化场景，不包装成线上请求量或故障率下降比例。

### 3. 可恢复的模型训练工作流

| 证据类型 | 源码或验证依据 |
| --- | --- |
| 事件状态机 | `src/domain/training/trainingWorkflow.js:2-452` 定义前端 `phase`、远程 `job.status`、事件、合法迁移、状态版本及恢复降级规则；数字步骤仅作为 UI 投影。 |
| 草稿恢复 | `src/domain/training/trainingDraftStorage.js:9-140` 按用户和 Schema 版本保存带 TTL 的轻量草稿，排除完整数据行和刷新后失效的本地数据句柄。 |
| 可恢复轮询 | `src/domain/training/trainingJobPoller.js:22-174` 使用递归 `setTimeout`、退避和前后台/网络状态感知，并通过请求令牌隔离晚到响应。 |
| 异步协议接入层 | `src/api/trainingJob.js:24-55` 实现创建、按 jobId 查询、按幂等键恢复和取消请求；`src/components/tab/createModel/model_training/AlgorithmSelect.vue:332-472` 完成前端提交、跟踪和取消接入。 |
| 自动化验证 | `tests/trainingWorkflow.test.js:53-398` 共 9 项测试，覆盖合法迁移、状态防倒退、幂等键复用/更新、取消失败、草稿恢复、轮询乱序和故障退避。 |

可解释的价值：将“显示第几步”和“训练任务处于什么状态”分离，使异常、恢复和取消拥有明确状态语义。`.env.example:7` 当前默认仍为 `legacy` 模式，异步训练后端不在本仓库内，因此简历只写“前端状态机与异步协议适配层”，不写“异步训练服务已上线”。

### 4. 有资源边界的数据集导入管线

| 证据类型 | 源码或验证依据 |
| --- | --- |
| Schema 与导入器 | `src/domain/dataset/datasetSchema.js:35-78` 定义可扩展列规则；`src/domain/dataset/datasetImporter.js:4-11,373-647` 直接解析 File/输入流，按 chunk 校验并支持中止。 |
| 确定性预算 | `src/domain/dataset/datasetImporter.js:4-11,379-386` 设置文件、行、单元格、列、单元格长度、预览和错误样本上限；超限时在分块边界终止解析。 |
| 响应式边界 | `src/domain/dataset/datasetRepository.js:3-40` 以 `importId` 管理完整有效行并显式释放；`src/store/taskModule.js:13-49` 与 `src/components/tab/createModel/model_training/DataSelect.vue:356-377` 使 Vuex 只接收有限预览、描述和句柄。 |
| 业务接入 | `src/views/ParameterTuning.vue:920-972` 与 `src/components/tab/createModel/model_training/DataSelect.vue:268-377` 统一使用共享导入任务，换文件和离开流程时取消旧任务、释放旧数据。 |
| 自动化验证 | `tests/datasetImporter.test.js:44-206` 共 9 项测试，覆盖保守类型转换、重复/缺失/危险表头、物理行定位、预算中止、异步取消和仓库释放。 |

可解释的价值：业务层不再先创建完整 CSV 文本副本，完整行也不进入 Vue 2 响应式状态；预览和错误样本具有固定上限，异常文件可以提前中止。当前实现未启用 Web Worker，默认 20 MiB、10 万行等数值是保护阈值而非设备容量或性能结论。

## 表述准确性与面试风险检查

| 检查项 | 结论 | 简历中的安全边界 |
| --- | --- | --- |
| 项目定位 | 低风险 | 使用“内部工作台”，不使用暗示生产治理、设备控制和完整闭环的“工业互联网平台”或“自动控制系统”。 |
| 个人职责 | 低风险 | 可表述为负责上述四项前端增强；不声称独立完成后端算法、训练调度或全部原始业务页面。 |
| 参数 Schema | 低风险 | 76 字段、26 项预测 DTO 和 8 项测试均有源码。Schema 是项目内自定义 JavaScript 领域配置，不应回答成 JSON Schema；当前未加入缺乏权威来源的单位、范围和跨字段工艺规则。 |
| 请求治理 | 低风险 | latest-wins、single-flight 和错误模型均已实现并测试；`AbortController` 只能取消客户端等待/传输，不能保证停止服务端已经开始的计算。当前也没有全局 TTL/LRU 缓存和自动重试。 |
| 训练工作流 | 中风险，边界可控 | 前端状态机、轮询器、幂等请求头和协议调用已经实现；默认仍走 legacy 接口，异步后端待联调。幂等性最终必须由后端按 key 去重，不能把前端生成 key 等同于端到端幂等。 |
| 数据集导入 | 中风险，边界可控 | 可说“分块解析、有限预览、预算中止、非响应式存储”；不可说“Web Worker 解析”“支持任意大文件”或“内存下降 X%”。`Map.delete` 只解除仓库引用，实际回收时机由 GC 决定。 |
| 性能与业务收益 | 不可量化 | 当前没有相同设备和数据下的前后性能基准，也没有模型准确率、缺陷率、DAU、QPS 或生产收益数据，不写任何提升比例。 |
| 登录与权限 | 不作为亮点 | 项目存在登录、菜单角色判断和用户管理页面，但缺少完整 Router 守卫、统一 token 注入及后端权限证据，不能描述为完整 RBAC/鉴权体系。 |
| 项目完成度 | 需诚实说明 | 核心增强有测试且可构建，但遗留模块仍有 lint 与构建警告；不能声称全项目达到生产级质量或零告警。 |

## 本次复核结果

- `npm test`：36/36 通过，0 失败；四项亮点分别对应 8、10、9、9 项测试。
- `npm run build`：退出码 0；仍有 ECharts 默认导入、资源体积和入口体积 3 类 warning。
- `npm run lint`：全项目仍有 16 个遗留 error，集中在未使用代码、旧图表全局变量、computed 副作用和未定义旧接口；因此简历不写“全项目 lint 零错误”。

## 最终结论

上述四条可以作为“已经实现”的前端项目经历，其中参数 Schema 和请求竞态治理风险最低，适合优先讲；训练工作流必须强调前端实现边界，数据集导入必须强调资源保护而非未经测量的性能提升。整套表述没有虚构业务规模、模型效果、线上收益或生产部署状态。
