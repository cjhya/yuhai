# 已完成核心亮点证据总表

> 整理日期：2026-08-26  
> 证据来源：当前源码、自动化测试、定向 ESLint、生产构建。  
> 口径：只把已经落地并可复核的内容列为成果；未执行的性能测试只记录方案，不填写结果。

## 一、完成状态

原计划保留 4 个最终亮点，当前 4 个都已达到各自前端范围内的“源码实现 + 自动化测试 + 构建验证”标准。训练亮点的异步后端接口仍需联调，因此完成状态必须写清边界。

| 最终亮点 | 当前状态 | 能否写成已实现 | 判断依据 |
| --- | --- | --- | --- |
| Schema 驱动的工艺参数域模型与可验证转换 | 最小完整版本已完成 | 可以 | 76 字段 Schema、受控表单、三类 DTO 适配、历史回显、8 个参数域测试 |
| 多服务请求可靠性与高频交互竞态治理 | 第一阶段已完成 | 可以，需说明范围 | Client 工厂、结构化错误、latest-wins、下拉 single-flight/缓存、10 个专项测试 |
| 可恢复的模型训练工作流与异步任务状态机 | 前端最小完整版本已完成 | 可以，需说明异步后端边界 | 事件驱动迁移、job 状态版本、幂等键、草稿恢复、可恢复轮询、legacy 兼容和 9 个专项测试；异步后端端点不在本仓库 |
| 可验证、可控内存的数据集导入管线 | 浏览器内最小完整版本已完成 | 可以，需说明范围 | 统一 File 分块 importer、可扩展列 Schema、有限预览、非响应式仓库、资源预算与 9 个专项测试；尚无浏览器性能基准和服务端数据集化 |

四项都可以作为已经完成的前端工程优化；其中训练亮点应表述为“完成前端状态机与异步协议接入层”，不能表述为“异步训练后端已生产上线”。

---

## 二、亮点 1：Schema 驱动的工艺参数域模型与可验证转换

### 1. 问题

同一套注塑工艺参数在当前系统中存在多种表示：

- 历史保存使用 `ip1stPressure` 等英文扁平字段；
- 推荐算法返回“注射（压力一段）”等中文键对象；
- 质量预测接口接收 `{ label, value }[]`；
- UI 按注射、保压、温度、模温机和温控箱分组展示。

必须保证用户看到的值、算法收到的值和历史回显值一致，否则预测结果缺乏可信度。

### 2. 原方案

原 `Params.vue` 分别维护五组局部数组：

```text
英文扁平对象
→ transformToOldFormat
→ 五组表格数组
→ 用户编辑
→ 父页面通过 $refs 触发子组件
→ transformToFlatFormat
→ 英文扁平对象
```

质量预测页面又维护一套独立静态 `tableData4`，参数推荐页面同时维护英文 `params` 和中文 `parameterData`，历史页通过修改组件 `key` 强制重新初始化。

### 3. 原方案缺陷

已在旧实现中定位到可复现问题：

1. 四、五段注射时间读取 `is4rdTime/is5rdTime`，输出却使用 `it4rdTime/it5rdTime`；
2. 温控箱 6 读取温控箱 5 的字段；
3. `parseFloat("12abc")` 会静默得到 `12`；
4. 质量预测先取得用户参数，随后却发送静态 `tableData4`；
5. 推荐结果更新中文对象，但结果组件仍绑定初始英文参数；
6. 组件只在 `created` 中读取 prop，历史回显只能通过 `key` 强制重建；
7. 没有字段集合、别名唯一性、往返转换或边界值测试。

这些是业务正确性缺陷，不是样式或抽象层次问题。

### 4. 新方案

建立面向当前参数域的单一 Schema，每个字段同时描述：

```js
{
  id: "injection.pressure.stage1",
  legacyKey: "ip1stPressure",
  recommendationKey: "注射（压力一段）",
  predictionLabel: "注射（压力一段）",
  groupId: "injection",
  rowId: "pressure",
  columnId: "stage1",
  types: ["number"]
}
```

父页面持有唯一 `parameterForm`，`Params` 根据 Schema 渲染并通过 `input` 事件提交新状态。转换层提供：

- `fromLegacyParameterDto`：历史/默认英文 DTO → canonical form；
- `fromRecommendationParameterDto`：中文推荐 DTO → canonical form；
- `validateParameterForm`：严格解析和目标操作校验；
- `toLegacyParameterDto`：canonical parameter set → 历史 DTO；
- `toPredictionParameterDto`：canonical parameter set → 26 项预测 DTO。

### 5. 技术原理

#### 单向数据流

Vue 2 采用 props down / events up：父页面持有唯一可信状态，子组件不再持有第二份独立参数副本。推荐结果或历史记录替换父状态后，组件会随 prop 更新，不需要强制 remount。

#### 稳定领域身份与传输别名

领域 `id` 不依赖中文文案或历史拼写。`ip4rdPressure` 等兼容字段只存在于传输别名中，避免接口历史包袱进入 UI 和规则层。

#### 运行时校验

浏览器输入本质是字符串。转换层用完整数字格式匹配、`Number` 和 `Number.isFinite` 拒绝部分可解析字符串、`NaN` 和 `Infinity`；`0`、`false`、空字符串、`null` 分别处理。

#### 纯函数与转换不变量

转换函数不修改输入对象。核心不变量是：

```text
toLegacyParameterDto(
  validate(fromLegacyParameterDto(dto))
)
=== normalize(dto)
```

此外使用“单字段隔离”测试验证修改一个领域字段时，预测 DTO 只能有对应的一项发生变化。

#### Schema 自校验

模块初始化时检查 76 个领域 ID、历史别名、推荐别名和预测别名是否重复，并检查每个 UI 布局位置是否恰好对应一个字段。Schema 配置错误会在开发、测试或构建阶段尽早暴露。

### 6. 实现位置

| 职责 | 实现位置 |
| --- | --- |
| 76 字段定义、布局、别名和 Schema 自检 | `src/domain/parameter/parameterSchema.js` |
| 输入适配、严格解析、校验、历史/推荐/预测 DTO 转换 | `src/domain/parameter/parameterTransform.js` |
| Schema 驱动表格、受控输入和错误展示 | `src/components/tab/Params.vue` |
| 用户输入 → 校验 → 26 项预测 DTO → 请求快照 | `src/views/qualityPredict.vue` |
| 推荐响应 → canonical form → 编辑 → 历史 DTO | `src/views/ParameterTuning.vue` |
| 历史 JSON 安全解析、未知字段和版本处理 | `src/views/historyParameter.vue` |
| 参数域自动化测试 | `tests/parameterDomain.test.js` |

### 7. 完整调用链

#### 质量预测

```text
默认英文 DTO
→ fromLegacyParameterDto
→ parameterForm
→ Params 按 Schema 渲染
→ input/updateParameterForm
→ validateParameterForm(target="prediction")
→ toPredictionParameterDto（26 项）
→ 请求快照
→ POST /predict/{product}/{algorithm}
```

#### 推荐与历史

```text
recommend_data 中文对象
→ fromRecommendationParameterDto
→ parameterForm
→ 用户确认/编辑
→ validateParameterForm
→ toLegacyParameterDto（76 项）
→ paramsJson
→ 历史页 JSON.parse + fromLegacyParameterDto
→ Params 只读回显
```

### 8. 测试方式

专项命令：

```bash
node --test tests/parameterDomain.test.js
```

2026-08-26 实际结果：**8/8 通过，0 失败**。

| 测试项 | 实际结果 |
| --- | --- |
| Schema 字段数量 | 76 |
| 唯一领域 ID | 76/76 |
| 唯一历史别名 | 76/76 |
| 唯一推荐别名 | 76/76 |
| Schema 布局覆盖 | 76/76，重复或缺失为 0 |
| 当前默认英文对象 | 64 个源字段进入 76 字段 form；补齐 12 个缺失字段 |
| canonical 空值 | 18 个，其中原对象已有 6 个空值，Schema 补齐 12 个缺失值 |
| 当前中文推荐样例 | 76 个字段全部识别，unknown issue 为 0 |
| 英文 DTO 往返 | 76 个字段 mismatch 为 0 |
| 已知串位反例 | `it4rdTime/it5rdTime`、温控箱 5/6 均保持独立 |
| 非法输入 | `12abc`、`Infinity` 被拒绝；`0`、`false` 保留 |
| 预测 DTO | 26 项，与原算法接口形态一致 |
| 单字段隔离 | 修改一段注射压力后，26 项预测 DTO 中变化项数量为 1 |
| 未知历史字段 | 被报告并忽略，进入 canonical values 的数量为 0 |

项目全量命令：

```bash
npm test
```

实际结果：**36/36 通过，0 失败**。本亮点相关文件定向 ESLint 为 **0 error**，`npm run build` 退出码为 0。

### 9. 实际效果

现在有证据可以陈述：

- 参数表单、推荐回填、预测请求和历史回显共享同一份字段契约；
- 三个业务页面不再通过 `$refs` 拉取参数值；
- 质量预测不再使用独立静态 `tableData4`，用户编辑会进入预测 DTO；
- 两个已知字段串位错误被修复并成为永久回归用例；
- 对当前完整 DTO 的往返测试中字段 mismatch 为 0；
- Schema 的 76 个字段、布局位置和两类传输别名均有唯一性检查；
- 非法数字在请求前被阻止，未知外部字段不能进入 canonical form。

当前不能陈述：

- 不能声称表单渲染速度、FPS、内存或首屏得到提升；
- 不能声称实际预测准确率提高；
- 不能声称已经实现真实工艺范围、单位和跨字段规则；源码没有可靠规则来源；
- 不能声称历史接口已经持久化 Schema 版本；为兼容现有后端，当前 `paramsJson` 仍保持扁平结构。

### 10. 可执行的后续量化测试

#### 请求体一致性 E2E

使用浏览器测试或代理 mock，准备固定的 26 项初始参数，每轮只修改一个字段并点击预测。记录：

```text
round_count            = 执行轮数
expected_change_count  = 预期变化字段数
actual_change_count    = 请求体实际变化字段数
mismatch_count         = label 或 value 不符合预期的轮数
```

建议覆盖 26 个预测字段，每个字段至少一次，并保留每轮请求体。只有执行后才能填写 mismatch rate。

#### 渲染与输入性能

若后续字段规模增加，可在固定浏览器和设备上分别构造 76、200、500、1,000 字段 Schema，使用 Chrome Performance 记录：

- Params mount scripting time；
- DOM 节点数；
- 单字段输入到界面更新的延迟；
- Long Task 数量；
- 50 次固定输入后的 JS heap。

必须保存相同代码、相同浏览器配置下的原始 trace。当前没有执行，因此不填写性能结论。

---

## 三、亮点 2：多服务请求可靠性与高频交互竞态治理

详细证据见 `docs/evidence/08_REQUEST_RELIABILITY_EVIDENCE.md`。以下是与本总表相同口径的摘要。

### 1. 问题

项目同时访问业务服务和长耗时算法服务，并存在远程下拉、设备详情联动、推荐、预测和训练请求。快速切换选择、重复点击、路由离开和异常响应可能导致重复 API、旧响应覆盖、Loading 不关闭或销毁后继续提交状态。

### 2. 原方案

- 多套 Axios 包装分别维护超时、返回值和错误处理；
- 错误通常直接 `console.error` 或显示通用消息；
- 下拉只有 debounce，没有原始列表缓存、single-flight 和销毁取消；
- 详情联动没有 latest-only 保护；
- 推荐、预测和训练缺少统一响应契约和完整 `finally` 收口。

### 3. 原方案缺陷

- Promise 按完成时间回调，旧请求可能晚返回并覆盖当前选择；
- debounce 只能减少触发次数，不能保证响应顺序；
- 对已经过滤的 options 再过滤会导致候选越筛越少；
- 取消传输不等于阻止已经完成的旧 Promise 提交；
- timeout、network、HTTP、cancel 和响应格式错误无法稳定区分。

### 4. 新方案

- `createHttpClient` 为业务和算法服务生成独立实例，共享错误模型和请求元数据；
- `ApiError` 区分 cancel、timeout、network、HTTP、business 和 invalid-response；
- `createLatestRequestCoordinator` 组合 `AbortController` 与 Map entry 身份校验；
- `DebouncedSelect` 使用不可变 `allOptions`、pending Promise 合并和销毁清理；
- 推荐、预测和训练增加重复点击 guard、响应校验、取消与 `finally` Loading 收口。

### 5. 技术原理

- AbortController 尝试取消客户端传输，entry/序号校验保证旧 Promise 即使完成也不能提交；
- latest-wins 依据资源 key 只允许当前 entry 返回；
- single-flight 合并正在进行的相同加载，缓存复用已经完成的数据，两者语义不同；
- Axios interceptor 将底层错误归一化，但保留 service、requestId 和 retryable 等上下文；
- Vue `beforeDestroy` 中取消 debounce、Controller 和协调器，避免销毁后回写。

### 6. 实现位置

| 职责 | 实现位置 |
| --- | --- |
| HTTP Client 工厂、ApiError、request ID、响应校验 | `src/utils/http.js` |
| 业务/算法服务实例 | `src/utils/request.js`、`src/utils/requestAlg.js` |
| latest-wins 和生命周期取消 | `src/utils/requestCoordinator.js` |
| 下拉 single-flight、原始列表缓存、取消 | `src/components/DebouncedSelect.vue` |
| 详情联动、推荐和预测接入 | `src/views/ParameterTuning.vue`、`src/views/qualityPredict.vue` |
| 训练请求 guard 和取消 | `src/components/tab/createModel/model_training/AlgorithmSelect.vue` |
| 请求专项测试 | `tests/http.test.js`、`tests/requestCoordinator.test.js`、`tests/debouncedSelect.test.js` |

### 7. 测试方式

```bash
node --test tests/http.test.js tests/requestCoordinator.test.js tests/debouncedSelect.test.js
```

2026-08-26 实际结果：**10/10 通过，0 失败**。

| 可量化场景 | 输入 | 实际结果 |
| --- | --- | --- |
| 并发首次下拉 | 响应前重叠调用 2 次 | 列表 API 调用 1 次；重复调用 0 次 |
| 列表加载后本地筛选 | `"" → alpha → beta → ""` 共 4 次调用 | 列表 API 累计 1 次；新增调用 0 次 |
| latest-wins | A 先发，B 后发先完成 | B 返回；A 状态提交次数 0 |
| 旧失败晚到 | B 成功后 A 失败 | A 当前错误提交次数 0 |
| 组件销毁 | pending 时执行 beforeDestroy | signal.aborted 为 true；列表提交次数 0 |
| 协调器销毁 | pending 时 dispose | signal.aborted 为 true；旧结果及 dispose 后请求提交次数 0 |
| 错误分类 | timeout/network/HTTP503/cancel | kind、service、requestId、retryable 断言全部通过 |

### 8. 实际效果

现在有证据可以陈述：

- 自动化重叠加载场景中，2 次调用只产生 1 次列表 API；
- 列表加载完成后的 3 次继续筛选/清空不增加 API 调用；
- 两类可控乱序场景中，旧成功和旧失败的状态提交次数均为 0；
- 组件和协调器销毁后 signal 已中止，旧结果提交次数为 0；
- 业务服务与算法服务保留不同 timeout，但使用统一错误语义和响应校验；
- 请求可靠性专项 10/10、项目全量 36/36 测试通过。

当前不能陈述：

- 不能声称线上请求量下降了某个百分比；
- 不能声称 AbortController 已停止服务端计算；
- 不能声称已经实现跨组件 TTL/LRU、写后失效或自动重试；
- 不能声称首屏、FPS、内存或构建体积得到改善。

### 9. 可执行的后续量化测试

#### 浏览器真实请求次数

在固定浏览器、网络和后端环境下，对同一 `apiUrl` 执行固定输入序列并导出 HAR。每轮统计：

```text
interaction_count
list_api_count
unique_load_count
duplicate_count = max(0, list_api_count - unique_load_count)
cancel_count
```

建议重复 20 轮并保留每轮原始值，报告中使用中位数、P95 和完整样本，不只报告最好的一轮。

#### 乱序响应提交率

用代理或 mock 固定 A 慢、B 快，快速选择 A 后选择 B：

```text
stale_commit_rate = stale_commit_count / round_count
```

建议执行 100 轮，记录选择 ID、request ID、响应时间和最终 UI ID。执行前不填写目标结果。

#### 生命周期内存

强制 GC 后获取 Heap Snapshot A；在 pending 请求期间进出相关路由 30 次后获取 B，再执行一轮获得 C。记录：

- JS heap；
- Detached DOM 数量；
- `DebouncedSelect`、`AbortController`、协调器存活数量；
- retained path。

只有 B、C 在相同条件下持续增长且存在无法释放的保留路径，才能判断泄漏。

---

## 四、亮点 3：可恢复的模型训练工作流与异步任务状态机

### 1. 问题

模型训练不是普通的同步表单提交。用户需要依次完成任务信息、数据集、特征和算法配置，训练本身还可能经历排队、运行、结果保存、失败或取消。页面刷新、断网重连、重复点击、创建响应丢失和轮询乱序都可能发生，但后端任务可能仍在继续。

业务上真正需要保证的是：步骤不能越级；同一次提交不能因为重试创建多个训练任务；旧响应不能让状态倒退；刷新后能够找到正在运行的 job；本地数据已经释放时不能假装仍可继续训练。

### 2. 原方案

原流程以 Vuex 中可直接修改的数字 `step` 为核心：

```text
子组件校验自己的表单
→ m_changeStep(step + 1)
→ 第 4 步 GET /train/{productSeries}/{algorithm}
→ 浏览器等待单次长请求
→ 成功后写 result 并进入结果页
```

任务信息、数据集和算法参数保存在运行期 Vuex；刷新即丢失。训练请求没有 jobId、服务端状态、状态版本、幂等键、恢复查询和取消协议。

### 3. 原方案缺陷

1. `step` 只表达“显示第几个组件”，不能表达 submitting、queued、running、failed、cancelled 等业务状态；
2. 任意组件都可以直接改数字步骤，没有统一迁移守卫，非法跳步和跨步骤残留难以阻止；
3. 单次长连接中断后，前端无法区分“后端没创建任务”和“任务已创建但响应丢失”；直接重试可能重复训练；
4. 页面刷新、路由离开或浏览器恢复网络后，没有 jobId 可继续查询，只能重新开始；
5. 没有状态版本和迁移矩阵，晚到的 queued 响应可能覆盖 running/succeeded；
6. `setInterval` 式轮询若请求耗时超过间隔会重叠，后台标签页和故障期间还可能产生无意义请求；
7. 把完整 CSV 放入 localStorage 会产生同步序列化、容量和隐私风险，而只保存本地 `importId` 又无法跨刷新继续使用；
8. 缺少取消失败、终态重试、草稿过期和组件销毁后的专门回归测试。

### 4. 新方案

新增两层状态模型：前端工作流 `phase` 与远程训练任务 `job.status`。

```text
phase:
taskInfo → dataset → features → algorithm → submitting → tracking → result

job.status:
queued → running → finalizing → succeeded | failed | cancelled
```

所有迁移统一经过 `transitionTrainingWorkflow(state, event)`；Vuex 的数字 `step` 只由 `phase` 派生，用于兼容现有五步 UI。核心事件包括保存任务信息、确认数据集、确认特征、提交、job 创建/更新、创建结果未知、轮询失败、取消和重置。

异步模式新增：

- `POST /training-jobs`，使用 `Idempotency-Key`；
- `GET /training-jobs/{jobId}` 查询状态；
- `GET /training-jobs/by-idempotency-key/{key}` 恢复“创建结果未知”的提交；
- `POST /training-jobs/{jobId}/cancel` 请求取消；
- 递归 `setTimeout` 轮询、退避、抖动、后台降频、online/visibility 唤醒和旧请求令牌隔离；
- 按用户、Schema 版本和 7 天 TTL 保存草稿，但排除完整数据行和只在当前页面有效的 `importId`。

为保证已有功能正常，`.env.example` 默认 `VUE_APP_TRAINING_JOB_MODE=legacy`。legacy 模式仍调用原训练接口，但步骤迁移、异常收口和结果进入也统一经过新状态机；只有后端实现异步端点并把开关改为 `async` 后才启用远程 job 链路。

### 5. 技术原理

#### 事件驱动状态机与派生状态

`transitionTrainingWorkflow` 是同步纯状态转换函数：输入旧状态和事件，返回新状态或抛出带错误码的 `TrainingWorkflowError`。UI 不能直接决定下一步，`step = trainingPhaseToStep(phase)` 只是展示投影。这样迁移规则可以脱离 Vue 组件进行确定性测试。

#### job 迁移矩阵与乐观并发版本

远程状态使用允许迁移集合约束。例如 running 可以进入 finalizing/终态，但不能回到 queued。`statusVersion` 小于当前值时直接忽略；相同版本却返回不同状态、进度或阶段时判定冲突；更高版本仍必须符合迁移矩阵。版本解决乱序，迁移矩阵解决服务端异常回退，两者缺一不可。

#### 幂等键与“结果未知”语义

首次明确提交生成幂等键。若请求得到明确业务失败，回到 algorithm 并清除 key；若 timeout/network 等可重试错误导致结果未知，状态保持 submitting，重新确认提交复用同一个 key。已失败或取消的终态重新训练则生成新 key 和新 job。是否真正去重仍依赖服务端按 key 建立唯一约束，前端只能正确传递语义。

#### 可恢复轮询

轮询在上一次请求完成后才通过递归 `setTimeout` 安排下一次，避免固定 `setInterval` 产生天然重叠。正常间隔可读取服务端 `pollAfterMs` 并加入 jitter；瞬时故障指数退避，标签页隐藏时降频，恢复 online/visible 时立即唤醒。

`AbortController` 尽力取消传输，递增 `token` 再从提交资格上废弃旧请求。即使底层忽略 abort，旧 Promise 完成后也会因为 token 不匹配而退出。

#### 版本化草稿与不可恢复资源边界

Vuex 插件订阅 `modelTraining/*` mutation，将带 `schemaVersion`、`savedAt`、workflow 和可序列化表单字段的快照写入 localStorage。读取时校验 JSON、版本和 TTL，坏数据或过期数据会清理。

完整数据集仍在内存 repository 中，不能跨刷新恢复，因此草稿明确把 `dataSet` 和 `dataImportId` 置空。普通本地流程刷新后回退到 dataset 并报告 `LOCAL_DATASET_EXPIRED`；异步 job 已经由服务端接管后，即使本地数据释放，仍可凭 jobId 恢复 tracking。

### 6. 实现位置

| 职责 | 实现位置 |
| --- | --- |
| phase/event、迁移守卫、job 状态矩阵、版本冲突和幂等键语义 | `src/domain/training/trainingWorkflow.js` |
| 草稿 Schema、按用户 key、TTL、清洗、恢复和 Vuex 持久化插件 | `src/domain/training/trainingDraftStorage.js` |
| 递归轮询、退避、jitter、后台降频、网络唤醒和旧请求隔离 | `src/domain/training/trainingJobPoller.js` |
| 异步 job API、响应契约和提交 payload | `src/api/trainingJob.js` |
| 状态机接入、step 派生、恢复/重置和数据失效动作 | `src/store/taskModule.js` |
| 全局草稿持久化插件注册 | `src/store/index.js` |
| 页面恢复、结果未知查询、轮询启停和草稿放弃 | `src/components/tab/createModel/model_training/ModelTraining.vue` |
| legacy/async 提交、重复点击 guard、创建、取消和终态重试 | `src/components/tab/createModel/model_training/AlgorithmSelect.vue` |
| 前三步事件接入 | `src/components/tab/createModel/model_training/TaskInfo.vue`、`DataSelect.vue`、`FeatureSelect.vue` |
| 结果保存、返回重训和流程完成清理 | `src/components/tab/createModel/model_training/Result.vue` |
| 兼容模式配置 | `.env.example` |
| 状态机、持久化和轮询测试 | `tests/trainingWorkflow.test.js` |

### 7. 完整调用链

#### 正常异步提交

```text
TaskInfo / DataSelect / FeatureSelect
→ 分别 dispatch SAVE_TASK_INFO / SELECT_DATASET / CONFIRM_FEATURES
→ transitionTrainingWorkflow
→ Vuex SetTrainingWorkflow
→ phase 派生 step，持久化插件保存安全草稿
→ AlgorithmSelect dispatch SUBMIT_JOB
→ 生成或复用 idempotencyKey
→ buildTrainingJobPayload（任务、数据描述、已校验 rows、算法参数）
→ POST /training-jobs + Idempotency-Key
→ JOB_CREATED
→ ModelTraining watch jobId/status
→ TrainingJobPoller
→ GET /training-jobs/{jobId}
→ JOB_UPDATED + statusVersion/迁移守卫
→ succeeded 后写入 result 并进入结果页
```

#### 刷新与创建结果未知

```text
任意 modelTraining mutation
→ Vuex persistence plugin
→ localStorage 安全快照
→ 页面重新 created
→ restoreTrainingDraft
→ 若已有非终态 job：按 jobId 恢复轮询
→ 若 submitting + idempotencyKey + 无 job：按 key 查询已创建任务
→ 查到：JOB_CREATED 并恢复轮询
→ 明确 404：数据句柄已失效，回退 dataset
→ 临时查询失败：保留 CREATE_UNCERTAIN，允许同 key 再确认
```

#### legacy 兼容链路

```text
前三步仍通过相同工作流事件
→ SUBMIT_JOB
→ GET /train/{productSeries}/{algorithm}
→ 校验响应
→ LEGACY_SUCCEEDED
→ result phase
```

### 8. 测试方式

专项命令：

```bash
node --test tests/trainingWorkflow.test.js
```

2026-08-26 实际结果：**9/9 通过，0 失败**。

| 可验证场景 | 测试输入/时序 | 实际结果 |
| --- | --- | --- |
| 工作流守卫 | 从初始状态越级确认特征；随后按合法事件执行完整链路 | 越级抛出 `ILLEGAL_TRANSITION`；合法链路进入 result |
| job 乱序与冲突 | 当前 running v2，依次输入 queued v1、queued v3、同版本不同进度 | v1 状态提交 0 次；v3 回退被拒绝；同版本冲突被拒绝 |
| 创建幂等语义 | 创建结果未知后重试；failed 终态后重训 | 未知重试复用原 key；明确重训使用新 key 且清除旧 job |
| 取消失败 | queued → 请求取消 → running 更新 → 取消接口失败 | running 期间保持 cancelRequested；失败后复位并保留错误 |
| 结果页返回 | succeeded 后执行 BACK | 回到 algorithm；旧 job 和 idempotencyKey 均为 null |
| 本地草稿边界 | 草稿中放入 1 行完整数据和 importId 后保存/恢复 | 持久化完整数据行数为 0，importId 为空；恢复后回退 dataset |
| 异步 job 恢复和 TTL | 保存 running job；再用超过 TTL 的时间读取 | jobId 和 tracking 被恢复；过期读取返回 null 且存储被删除 |
| 轮询竞态 | 旧 queued 请求 pending 时 online 唤醒并让新 running 请求先完成 | 共发起 2 个 mock 查询；只提交 1 个 running 更新，旧 queued 提交 0 次 |
| 故障恢复 | 连续 2 次 retryable error；另测 non-retryable error | 达到阈值后仍保留 1 个后续 timer；不可重试错误后 timer 为 0 |

项目全量结果为 **36/36 通过，0 失败**；四项亮点相关文件定向 ESLint 为 **0 error**；生产构建退出码为 0。

### 9. 实际效果

现在有证据可以陈述：

- 五步训练 UI 不再由组件任意递增数字步骤，所有有效迁移都通过统一事件和守卫；
- submitting/tracking/failed/cancelled 等状态成为可持久化、可检查的业务状态，而不是临时 Loading；
- 两类旧状态反例中，过期响应的状态提交次数为 0，非法回退和同版本冲突会被拒绝；
- 创建结果未知时复用幂等键，明确重训生成新 key，语义已由测试固定；
- 草稿不会持久化完整数据行或本地 importId；普通本地流程刷新后不会误用失效句柄；
- 远程 job 草稿可以恢复 jobId 和 tracking，轮询唤醒的旧响应不能覆盖新状态；
- 默认 legacy 模式保留现有后端调用，因此新增异步协议不会强制破坏已有功能；
- 9 个训练专项测试和项目 36 个全量测试当前全部通过。

当前不能陈述：

- 不能声称异步训练后端已经实现或生产联调；本仓库只有前端端点契约，默认开关仍是 legacy；
- 不能声称幂等键已经阻止服务端重复 job；这需要后端唯一约束和端到端故障注入验证；
- 不能声称刷新恢复使训练成功率或用户留存提高；没有业务数据；
- 不能声称轮询 API 请求量、恢复耗时、localStorage 写入耗时或内存下降了某个比例；尚无真实浏览器基准；
- 不能声称多标签页并发编辑已解决；当前同一用户 key 仍可能 last-write-wins；
- 不能声称当前直接提交完整 rows 适合大规模数据；规模扩大应改为服务端 datasetId。

### 10. 可执行的后续量化测试

#### 刷新恢复与重复创建 E2E

使用 Playwright + 可记录请求的 mock server，令 job 在至少 10 秒内保持 running。提交后刷新页面，记录：

```text
create_api_count_before_reload
create_api_count_after_reload
resolve_by_key_count
status_api_count
unique_backend_job_count
resume_to_visible_status_ms
```

再注入“服务端已创建、POST 响应连接被断开”的故障，点击重新确认并重复刷新。原始报告必须同时保存幂等键和全部 jobId；未实际执行前不填写重复任务率。

#### 轮询频率与重叠请求

分别在前台、后台、offline → online、接口连续 503 四种场景运行固定 5 分钟，导出 HAR 并记录：

```text
poll_request_count
max_inflight_poll_count
poll_interval_samples_ms
aborted_poll_count
terminal_extra_poll_count
```

用服务端 `pollAfterMs` 固定不同档位，并分别注入 0.5 倍、1 倍和 2 倍于轮询间隔的响应延迟。报告中使用中位数、P95 和完整间隔样本。

#### 草稿体积与同步写入成本

构造相同 metadata、但完整数据分别为 0、1,000、10,000、100,000 行的四个草稿，执行相同 mutation 序列，记录：

```text
serialized_draft_bytes
local_storage_write_duration_ms
long_task_count
heap_after_gc_bytes
```

测试必须在相同 Chrome 版本和设备上预热后重复至少 20 轮。当前源码从快照排除了 rows，但在浏览器执行前不能填写字节和耗时结论。

#### 多标签页一致性

用同一用户打开两个标签页，分别编辑不同 revision，交错触发保存、刷新、放弃和终态更新。记录每次 `draftId/revision/updatedAt/jobId` 以及最终恢复结果，验证是否发生旧标签覆盖新草稿。若业务需要多标签一致性，再据实选择 BroadcastChannel、storage event 或服务端草稿版本控制。

---

## 五、亮点 4：可验证、可控内存的数据集导入管线

### 1. 问题

参数推荐和模型训练都允许用户导入 CSV。该入口接收的是用户本地的不可信数据，既要保证列名、类型和错误位置可解释，也要防止文件过大、行列过多、单元格异常或连续换文件时让浏览器主线程和内存失控。

这里的目标不是宣称“浏览器可以处理任意大文件”，而是在明确预算内完成可验证导入，并在超过预算时尽早、可解释地终止。

### 2. 原方案

两个页面分别维护一套近似逻辑：

```text
File
→ FileReader.readAsText
→ 完整 CSV 字符串
→ Papa.parse(..., header=true, dynamicTyping=true)
→ 完整对象数组
→ 页面表格 / Vuex
→ 后续业务请求
```

- `ParameterTuning.vue` 读取完整文本、全量解析和展示，并直接把完整数组发给参数推荐接口；
- `DataSelect.vue` 同样全量读取、解析和渲染，再把完整对象数组写入 Vuex；
- 两处缺少共享列契约、统一资源上限、结构化错误和可取消导入会话。

### 3. 原方案缺陷

1. 同一数据可能同时以 `File`、完整字符串、Papa 中间结构、完整对象数组和 Vue 响应式对象存在，峰值内存不可控；
2. `FileReader.readAsText` 必须先构造完整解码字符串，解析开始前就产生与文件规模相关的大对象；
3. 全量数组进入 Vue 2 响应式状态后会被递归观测，额外增加对象包装、依赖收集和遍历成本；
4. Element 表格没有虚拟化，全量渲染会让 DOM 数随行列规模增长；
5. `dynamicTyping: true` 缺少业务语义，可能把前导零编号转成数字，也无法提供字段级范围和枚举错误；
6. 没有文件、行、列、单元格、单元格长度、预览和错误样本预算，异常输入只能在资源已经消耗后失败；
7. 重复表头、空表头、危险对象键、缺少必填列等问题没有统一错误码和行列定位；
8. 快速换文件或离开页面时，旧解析可能继续完成并覆盖当前状态；
9. 两个入口重复实现，修复规则容易只覆盖其中一个页面。

### 4. 新方案

新增共享领域层，将“解析、校验、资源治理、展示和完整数据生命周期”拆开：

```text
File
→ createCsvImportTask
→ Papa.parse(File, chunk)
→ 表头规范化与 Schema 校验
→ 逐行类型转换、问题收集和统计
→ 资源预算检查
→ 有限 preview + descriptor + 完整有效 rows
→ 完整 rows 注册到非响应式 repository
→ 页面 / Vuex 仅保存 preview、importId 和 metadata
```

当前默认预算为：

| 资源 | 默认上限 |
| --- | ---: |
| 文件大小 | 20 MiB |
| 数据行数 | 100,000 |
| 单元格总数 | 2,000,000 |
| 列数 | 256 |
| 单个单元格字符数 | 10,000 |
| 预览行数 | 200 |
| 问题样本数 | 200 |
| Papa 分块大小 | 1 MiB |

文件大小、行数、单元格数和预览行数可通过环境变量调整；其余上限保留在导入器默认配置中。上限是当前工程保护值，不代表已经用目标用户设备完成容量认证。

### 5. 技术原理

#### 直接解析 File 与分块回调

`Papa.parse` 直接接收浏览器 `File`，内部按块读取并通过 `chunk` 回调交付结果。这样不再由业务代码先创建完整 CSV 字符串，也能在每个分块后检查累计资源预算并调用 `parser.abort()`。

分块不等于多线程：当前没有启用 Web Worker，解析回调仍可能占用主线程。因此可以陈述“取消了业务层完整文本副本、支持分块中止”，不能在未测量前陈述主线程耗时下降比例。

#### Schema 驱动的表头与类型验证

`createDatasetSchema` 描述字段名、别名、是否必填/可空、字符串/数字/整数/布尔/枚举/日期类型及范围。导入器先把 BOM、空白和别名规范化，再检查重复、缺失、未知、空和危险表头。

当前业务仓库没有权威的训练/推荐必填列文档，因此两个线上 Schema 使用保守的结构校验，没有虚构具体工艺列约束；测试使用显式 fixture Schema 验证严格模式的能力。

#### 保守类型转换

有 Schema 时按字段规则转换；没有字段规则时只转换语义明确的布尔和安全数字。`00123` 这类前导零标识符和 ISO 日期保持字符串，`NaN`、`Infinity` 和超出安全整数语义的数据不会被静默接受为普通数字。

#### 有限诊断与统计

每列只维护计数、缺失数、非法数和可用的最小/最大值，问题总数与问题样本分开累计。错误样本达到上限后停止保留详细对象，但继续维护计数，并优先保留 error，避免“错误报告本身”随坏数据无限增长。

#### 响应式边界和显式生命周期

完整有效行保存在模块级 `Map<importId, rows>` 中，不放入 Vuex 和页面 data；响应式层只持有最多 200 行预览、列信息和描述对象。这样完整数组不会被 Vue 2 递归观测。

`Map` 不是自动缓存淘汰器。它通过换文件、删除文件、流程完成和页面销毁时调用 `releaseDataset(importId)` 解除强引用，使数据具备被垃圾回收的条件。是否真正回收以及回收时点由 JavaScript GC 决定，需要 Heap Snapshot 验证，不能仅凭调用 `delete` 声称内存已经下降。

#### 取消与旧会话隔离

每次导入都有唯一 `importId` 和 `cancel()`。开始新导入时先取消旧任务并释放旧数据；异步完成后还会比较当前提交的 `importId`，旧会话即使晚完成也不能发布到页面或触发推荐结果回写。

### 6. 实现位置

| 职责 | 实现位置 |
| --- | --- |
| 数据集 Schema、字段别名和规则定义 | `src/domain/dataset/datasetSchema.js` |
| File 分块解析、校验、类型转换、预算、统计、取消 | `src/domain/dataset/datasetImporter.js` |
| 完整有效行的非响应式注册、读取和显式释放 | `src/domain/dataset/datasetRepository.js` |
| 参数推荐上传、预览、取消、释放和推荐请求接入 | `src/views/ParameterTuning.vue` |
| 模型训练上传、有限预览和数据描述写入 Vuex | `src/components/tab/createModel/model_training/DataSelect.vue` |
| 训练特征选择阶段按 `importId` 读取完整数据 | `src/components/tab/createModel/model_training/FeatureSelect.vue` |
| 训练流程离开/完成时释放数据 | `src/components/tab/createModel/model_training/ModelTraining.vue`、`src/components/tab/createModel/model_training/Result.vue` |
| Vuex 中的预览、`dataImportId` 和 metadata | `src/store/taskModule.js` |
| 可配置资源上限示例 | `.env.example` |
| 导入管线自动化测试 | `tests/datasetImporter.test.js` |

### 7. 完整调用链

#### 参数推荐

```text
用户选择 CSV
→ ParameterTuning.handleFileChange
→ 取消旧 import task / release 旧 importId / abort 旧推荐请求
→ createCsvImportTask(file, parameterTuningDatasetSchema)
→ 表头校验 + 分块逐行转换 + 预算检查
→ registerDataset(import result)
→ 页面只保存 descriptor / columns / preview
→ 用户确认推荐
→ getDatasetRows(activeImportId)
→ POST recommend_data
→ 校验 submittedImportId 仍是当前版本
→ 推荐参数转换为 canonical parameterForm
```

#### 模型训练数据选择

```text
用户选择 CSV
→ DataSelect.handleFileChange
→ 取消并释放旧数据，清空旧 Vuex 描述
→ createCsvImportTask(file, modelTrainingDatasetSchema)
→ registerDataset(import result)
→ 页面展示有限 preview
→ 下一步把 preview / importId / metadata 写入 Vuex
→ FeatureSelect 使用 importId 从 repository 读取完整 rows
→ 删除、流程完成或离开训练页面时 releaseDataset
```

异步模式的 `buildTrainingJobPayload` 已把已校验 rows 和数据描述纳入创建任务请求；默认 legacy 模式仍沿用既有 GET 训练接口。由于异步后端不在本仓库，当前只能证明“浏览器导入到前端异步协议 payload”的链路，不能证明生产后端已经消费或持久化该数据集。

### 8. 测试方式

专项命令：

```bash
node --test tests/datasetImporter.test.js
```

2026-08-26 实际结果：**9/9 通过，0 失败**。

| 可验证场景 | 测试输入 | 实际结果 |
| --- | --- | --- |
| Schema 类型转换与有限预览 | 2 行合法数据，`previewRows=1` | 导入 2 行；预览 1 行；数字、布尔按 Schema 转换 |
| 通用保守推断 | 编号 `00123`、数字 `12.5`、布尔 `true`、ISO 日期 | 编号和日期保持字符串；数字和布尔按预期转换 |
| 表头验证 | 重复表头并缺少必填列 | 返回结构化 duplicate/missing-required 问题 |
| 行错误和样本预算 | 2 行非法值，问题样本上限 1 | 错误总数 2；保留问题样本 1；包含行列定位 |
| 跨 chunk 物理行号 | 引号内换行的 CSV | 后续错误定位到物理第 3 行 |
| 资源预算 | 分别超过文件、行和单元格上限 | 三种情况均被拒绝并中止 |
| 不安全表头 | 空表头、`__proto__` 等危险键 | 均被结构化拒绝 |
| 异步取消 | 解析 pending 时执行 `cancel()` | Promise 拒绝；parser aborted 为 true；结果未发布 |
| 仓库生命周期 | 完整 2 行、预览 1 行的数据集 | repository 可读完整 2 行；release 返回 true；释放后读取为 null |

项目全量命令：

```bash
npm test
```

实际结果：**36/36 通过，0 失败**。数据集新增/改动文件的定向 ESLint 为 **0 error**，`npm run build` 退出码为 0。

### 9. 实际效果

现在有证据可以陈述：

- 参数推荐和模型训练不再各自维护 `FileReader.readAsText + Papa.parse` 的重复导入实现；
- 业务代码不再先创建完整 CSV 文本副本，解析可以在分块边界检查预算并中止；
- 默认预览上限为 200 行，Vuex 只保存有限预览和数据描述，不保存完整数组；
- 完整有效行有明确的 `importId`、读取入口和释放时机；
- 文件、行、列、单元格、单元格长度和错误样本均存在确定性上限；
- 重复、缺失、空和危险表头，以及行列级类型错误都有结构化诊断；
- 9 个专项测试覆盖了类型、错误定位、资源中止、取消和释放，当前均通过。

当前不能陈述：

- 不能声称 JS heap、Long Task、FPS 或导入耗时已经下降某个比例；尚未执行同设备、同数据、同浏览器的改造前后基准；
- 不能声称分块解析运行在 Web Worker；当前仍可能占用主线程；
- 不能声称支持超过默认预算的超大文件；超过上限会主动拒绝；
- 不能声称 `Map` 释放后内存会立即下降；实际回收取决于 GC 和其他引用；
- 不能声称后端已经持久化 dataset version 或训练接口已经消费完整数据集；
- 不能把默认 20 MiB / 100,000 行写成已验证的设备容量结论，它们目前是保护阈值。

### 10. 可执行的后续量化测试

#### 改造前后导入基准

选择包含原实现的基线 commit 和当前实现 commit，在同一设备、Chrome 版本、无插件窗口和固定 CPU throttling 下，使用同一生成脚本准备 1、5、10、20 MiB CSV；每档固定列数、字段分布、引号和换行比例。

每个版本先预热 3 次，再正式执行至少 10 次，保存 Performance trace 和原始表格：

```text
file_size
row_count
column_count
import_duration_ms
long_task_count
long_task_total_ms
long_task_max_ms
peak_js_heap_bytes
preview_dom_node_count
```

分别报告中位数和 P95。只有基线和当前版本都有原始样本后，才能计算耗时或内存变化比例。

#### 生命周期内存与泄漏检查

在 Chrome 开启可控 GC，依次执行：

```text
Snapshot A：进入页面、未上传
循环 30 次：上传 → 等待成功 → 换文件或删除
GC 后 Snapshot B
再循环 30 次
GC 后 Snapshot C
```

记录 JS heap、`Array`/row 对象、repository `Map`、Vue `Observer`、Detached DOM 的 retained size 和 retained path，并计算：

```text
retained_growth_per_round = (heap_C - heap_B) / 30
```

只有 B 到 C 在多次复测中持续增长，且保留路径指向无法释放的业务对象，才报告为泄漏；单次 GC 后 heap 波动不能直接下结论。

#### 预览渲染与 DOM 规模

在基线和当前版本导入同一个验证通过的数据集，分别记录：

- 表格行和单元格 DOM 数；
- 页面总 DOM 节点数；
- 导入完成到预览稳定的 scripting/rendering 时间；
- 预览滚动期间 FPS 和 Long Task；
- Vue `Observer` 关联的数据行数量。

当前实现还应验证 `rendered_row_count <= min(valid_row_count, preview_limit)`。这项测试可证明有限预览是否真正落实，但在执行前不填写 DOM 或 FPS 改善比例。

#### 正确性与预算边界矩阵

把 UTF-8 BOM、CRLF、引号内逗号/换行、重复列、缺少必填列、空列名、危险键、前导零编号、非法数字，以及文件/行/单元格上限的“刚好等于、超过 1”做成固定 fixture。逐项记录：

```text
accepted
issue_code
physical_row
column
valid_row_count
preview_row_count
repository_row_count_after_release
```

这组结果衡量的是正确性和资源不变量，不包装为性能提升。

---

## 六、公共验证结果与量化边界

### 当前已执行

| 检查 | 实际结果 |
| --- | --- |
| 参数域专项测试 | 8/8 通过 |
| 请求可靠性专项测试 | 10/10 通过 |
| 训练工作流专项测试 | 9/9 通过 |
| 数据集导入专项测试 | 9/9 通过 |
| `npm test` | 36/36 通过 |
| 四项亮点相关文件定向 ESLint | 0 error |
| `npm run build` | 退出码 0，构建成功；Vue CLI 汇总 3 类 warning（ECharts 默认导入、asset size、entrypoint size） |
| 全项目 `npm run lint` | 16 errors / 0 warnings，均位于四项亮点定向检查范围外；主要是未使用代码、旧图表全局变量、computed 副作用和未定义旧接口 |

### 当前构建产物快照

本次构建得到：

| 文件 | 大小 | gzip |
| --- | ---: | ---: |
| `dist/js/chunk-vendors.7a1b99a8.js` | 3558.05 KiB | 1121.24 KiB |
| `dist/js/app.3e6d1aa3.js` | 281.40 KiB | 92.00 KiB |

这些数字只能作为当前基线。没有保存同一代码、同一依赖、同一构建配置下的改造前产物，因此不能把差值写成优化效果。

构建日志还提示 Browserslist 数据过期和 Node `fs.Stats` deprecation。它们不影响本次退出码，但应作为后续工程债记录，不能隐藏为“无 warning 构建”。

### 量化报告规则

后续任何性能数字都必须同时记录：

1. 测试代码或操作脚本；
2. 基线版本与优化版本的 commit；
3. 浏览器、Node、设备、网络和 CPU throttling；
4. 冷启动/热启动条件；
5. 预热次数、正式轮数、原始样本；
6. 中位数、P95，而不是单次最好值；
7. 构建警告、失败样本和异常值处理方式。

没有以上证据时，只描述“采用了什么机制、解决了什么可复现问题”，不写性能提升比例。

---

## 七、面试可用的证据化表述

### 参数 Schema

> 针对 76 个注塑工艺参数在 UI、推荐算法、预测接口和历史记录中存在多种 DTO、手写映射已经发生串位的问题，我建立了带稳定领域 ID 和端点别名的参数 Schema，由父页面维护唯一受控表单状态，并将历史、推荐和预测转换抽为纯函数。当前有 8 个参数域测试：76 个字段往返 mismatch 为 0，四/五段时间和温控箱 5/6 的反例已固化，修改一个参数时 26 项预测 DTO 中只有对应 1 项变化。没有真实工艺规则来源的范围和单位没有虚构加入。

### 请求可靠性

> 项目同时访问业务服务和算法服务，我用 Client 工厂统一错误和请求元数据，同时以 AbortController 加 entry 身份校验实现 latest-wins。远程下拉使用 single-flight 和原始列表缓存，页面销毁统一取消。10 个专项测试中，2 个重叠列表调用只产生 1 次 API，加载后的 3 次筛选不增加调用，旧成功和旧失败的状态提交次数都是 0。没有浏览器 HAR 或线上基线的数据，我不会写成线上请求量下降百分比。

### 训练工作流

> 原训练页用一个可直接递增的数字 step 驱动五个组件，并把长耗时训练当作单次 GET。现在我把前端 phase 和远程 job status 分层，所有迁移经过事件、守卫、状态版本和迁移矩阵；创建结果未知时复用幂等键，明确重训才生成新 key。草稿按用户、Schema 版本和 TTL 恢复，但主动排除完整数据和本地句柄；递归轮询支持退避、后台降频、网络唤醒，并以 AbortController 加 token 阻止旧响应提交。9 个专项测试中，两次重叠轮询只接受 1 个新状态，旧状态提交 0 次。默认仍走 legacy 接口，异步后端未在本仓库实现，所以我只把它描述为前端状态机和异步协议接入层已经完成。

### 数据集导入

> 参数推荐和模型训练原先分别把 CSV 一次性读取成字符串，再全量解析、渲染并写入响应式状态。我抽出共享导入管线，直接针对 File 分块解析，以版本化 Schema 完成表头和类型校验，并用文件、行数、单元格、列数、单元格长度、预览行和错误样本七类预算限制资源。完整有效行保存在显式释放的非响应式仓库，页面和 Vuex 只持有有限预览与数据集描述；换文件、删除和离开流程都会取消旧会话。9 个专项测试覆盖重复/缺失/危险表头、行列错误定位、预算中止、取消和仓库释放。尚未完成浏览器 Long Task/Heap 基准，因此不声称具体性能提升比例，也不声称已经支持超大文件或服务端数据集版本。
