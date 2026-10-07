# STEP 8：项目增强实施计划

> 制定日期：2026-08-19  
> 输入依据：`docs/archive/06_SELECTED_HIGHLIGHTS.md` 与当前源码。  
> 本轮边界：只制定计划，不修改 `src`、配置或依赖。本文列出的新增文件均为后续实施建议，目前不存在不代表遗漏。

## 一、A/B/C/D 分类

本轮按“交付层级”分类，而不是给整个亮点强行贴一个互斥标签。同一个亮点可以有已经存在的 A 层基础、近期实施的 B/C 层和暂缓的 D 层。这样能够明确哪些可以整理、哪些必须真正编码、哪些只能作为方案讨论。

| 核心亮点 | A：已有，只需理解整理 | B：小型重构 | C：最小真实实现 | D：暂作设计方案 | 本轮决策 |
| --- | --- | --- | --- | --- | --- |
| 参数 Schema | 已有分组参数表格及手写双向映射 | 先修复字段错映射，改成受控数据流 | 建立参数 Schema、转换/校验纯函数和自动化测试 | 通用低代码表单引擎、复杂 Schema 迁移平台 | **优先实施 B + C** |
| 请求可靠性 | 已有两个 Axios 实例、API 文件和防抖选择器 | 统一环境、错误模型、Loading、latest-wins 和销毁清理 | 按真实需要增加请求去重、有限缓存和幂等重试 | Refresh Token 编排、全局离线队列等无后端契约能力 | **先实施 B，再按测试结果选做 C** |
| 训练工作流 | 已有五步 UI、Vuex 状态和同步训练调用 | 清理 Store 结构、修复缺失/含混 mutation | 实现显式状态机、步骤守卫、版本化草稿与恢复 | job ID、服务端幂等创建、取消、后台运行；SSE/WebSocket 更后置 | **实施前端 C；后端协议暂列 D** |
| 数据集导入 | 已有 FileReader、Papa Parse、CSV 预览和算法提交 | 抽出重复解析逻辑，增加文件边界和有限预览 | 实现导入状态、列 Schema、行列级错误和分级性能基准 | Worker 仅在测量证明需要时实现；后端数据集化暂作方案 | **实施 B + C；D 设置触发条件** |

### A 类结论

四个方向都有真实源码基础，但没有任何一个已经完整达到核心亮点标准。A 类内容可以用于解释“原实现是什么”，不能直接整理成“已完成 Schema、竞态治理、状态机或大文件优化”。

### B/C 类结论

以下内容开发成本可控、简历价值较高，应优先真实实现：

1. 请求层最小统一和远程选择竞态修复；
2. 参数 Schema 与可验证双向转换；
3. 数据集导入校验、有限预览和性能基准；
4. 训练流程显式状态机与版本化草稿。

### D 类结论

以下能力暂时只保留接口设计、状态图或决策记录，不应写成已实现：

- 依赖后端配合的异步训练任务协议；
- 没有性能证据前的 Web Worker；
- 大文件分片上传与 dataset ID 生命周期；
- SSE/WebSocket 训练进度推送；
- 通用动态表单平台和复杂数据迁移中心。

---

## 二、实施总原则

1. **先建立基线，再重构。** 先用测试锁定当前应该成立的行为，修复确定错误，再改变结构。
2. **按业务切片迁移。** 不一次替换全部 API、页面或 Vuex；每个切片都要能独立运行和回滚。
3. **纯函数优先。** 参数转换、数据校验、状态迁移和错误归一化尽量从 Vue 组件中抽出，先测试再接 UI。
4. **不预先选择高级技术。** Worker、重试、缓存、SSE/WebSocket 必须有业务条件和测量证据。
5. **不虚构效果。** 文档只规定测量方法，最终耗时、内存和改进比例在实施后填写。
6. **每个亮点都要有证据。** 至少对应源码、自动化测试、手工验收记录；性能亮点还要有固定样本和基准结果。

---

## 三、公共前置任务：建立可验证基线

这不是独立简历亮点，但它决定后续四项改造是否可信。

### 修改目标

让核心逻辑可以被自动化验证，并为重构前后对比保留固定基线。

### 当前实现

- `package.json` 只有 `serve`、`build`、`lint`，没有测试脚本和测试依赖；
- `vue.config.js` 设置 `lintOnSave: false`，开发过程不会阻止明显错误；
- 参数转换、请求竞态、CSV 解析和训练状态均无自动化测试；
- STEP 4 已确认当前 lint 未通过，不能把“构建成功”当作质量通过。

### 新方案

选择与 Vue 2 兼容的单元/组件测试方案。优先考虑 Vue CLI 生态下的 Jest 与 Vue Test Utils 1.x；在真正安装前先核对版本兼容性。E2E 可在核心流程稳定后再加入，不阻塞第一轮纯函数测试。

### 涉及文件

- `package.json`
- `babel.config.js`
- `vue.config.js`
- 后续各核心逻辑文件

### 是否需要新增文件

建议新增：

- `jest.config.js`（若所选脚手架不能自动生成配置）
- `tests/unit/`
- `tests/fixtures/`
- `docs/benchmarks/README.md`
- CI 配置文件：只有确认仓库托管平台后再创建对应文件

### 数据流变化

业务运行数据流不变化。新增的是验证链路：

```text
固定输入/Mock 响应
→ 纯函数或组件
→ 可断言输出/状态/副作用
→ lint + test + build
→ 可重复验收结果
```

### 实现步骤

1. 选择并安装 Vue 2 兼容测试依赖，添加 `test:unit` 脚本；
2. 建立测试目录、公共 factory 和最小示例测试；
3. 保存参数 DTO、CSV 和延迟响应的脱敏夹具；
4. 只清理即将改造范围内的 lint 问题，避免无关大面积格式化；
5. 建立本地质量命令：lint → unit test → build；
6. 待命令稳定后，再接入实际托管平台的 CI。

### 边界情况

- Vue 2.6、Vue Test Utils 和测试转换器的版本必须匹配；
- Element UI 组件可能依赖 DOM API，需要合理 mock，但不能把核心业务逻辑全部 mock 掉；
- 真实工业数据和内部接口地址不能进入公开测试夹具；
- 当前存量 lint 问题应分批清理，避免与功能改造混成一个不可审查提交。

### 测试方式

- 跑通一个纯函数测试、一个 Vue 组件测试和一个失败用例；
- 验证测试失败会返回非零退出码；
- 验证生产构建仍然成功；
- 验证 fixture 不含账号、token、内网数据或敏感样本。

### 如何证明优化有效

- 改造前记录 lint/test/build 状态；
- 改造后保留可重复执行的质量命令输出；
- 每个后续缺陷至少有一个先失败、修复后通过的回归测试。

### 完成标准

- [ ] 存在可重复的单元测试命令；
- [ ] 测试失败能阻止质量命令通过；
- [ ] 四个亮点均有确定的测试落点；
- [ ] 相关 lint、测试和生产构建通过；
- [ ] 所有 fixture 已脱敏。

预计工作量：**1～2 个工作日**，不含清理全仓库所有历史问题。

---

## 四、实施项 1：多服务请求可靠性与高频交互竞态治理

分类：**B 小型重构优先；C 缓存/重试按需追加。**

### 1. 修改目标

统一业务服务与算法服务的公共请求行为，首先解决远程选择和详情联动中的乱序覆盖、组件销毁后回写、错误不可区分及 Loading 不能可靠收口问题。

第一轮不追求一次迁移所有 API，也不实现没有后端协议的 Refresh Token。

### 2. 当前实现

- `src/utils/api.js` 修改 Axios 全局默认值并注册一套响应处理；
- `src/utils/request.js` 创建业务服务实例，硬编码内网地址并设置 5 秒超时；
- `src/utils/requestAlg.js` 创建算法服务实例，硬编码另一地址且没有超时；
- `src/main.js` 又把原始 Axios 挂到 `Vue.prototype.$axios`；
- `src/api/user.js`、`model.js`、`parameterHistory.js`、`useAlgorithm.js` 分别使用不同封装；
- `src/components/DebouncedSelect.vue` 有 300ms 防抖，但没有请求取消、请求序号、原始选项缓存和销毁清理；
- `src/views/ParameterTuning.vue`、`src/views/qualityPredict.vue` 的机台/模具/材料/产品详情请求可能乱序回写。

### 3. 新方案

建立一个轻量请求基础层：

- `createHttpClient(config)` 负责创建不同 baseURL/timeout 的实例；
- `ApiError` 统一 timeout、cancel、network、HTTP、business、invalid-response 错误；
- 服务地址来自 `VUE_APP_BUSINESS_API_BASE_URL` 和 `VUE_APP_ALGORITHM_API_BASE_URL`；
- 页面通过明确的 request state 管理 idle/loading/success/error；
- 远程选择使用不可变 `allOptions`；详情联动使用 `AbortController`/Axios `signal` 或序号实现 latest-wins；
- 第一轮只给稳定字典提供可失效的 Promise 去重，不默认建设复杂全局缓存；
- 自动重试仅作为第二切片，对满足幂等条件的瞬时错误开放。

### 4. 涉及文件

第一切片必须修改：

- `src/utils/api.js`
- `src/utils/request.js`
- `src/utils/requestAlg.js`
- `src/main.js`
- `src/api/user.js`
- `src/components/DebouncedSelect.vue`
- `src/views/ParameterTuning.vue`
- `src/views/qualityPredict.vue`
- `vue.config.js`
- `package.json`

后续渐进迁移：

- `src/api/model.js`
- `src/api/parameterHistory.js`
- `src/api/useAlgorithm.js`
- 仍直接使用 `$axios` 或旧 `getRequest` 的页面

### 5. 是否需要新增文件

建议新增：

- `src/services/http/createHttpClient.js`
- `src/services/http/ApiError.js`
- `src/services/http/requestCoordinator.js`（仅放 latest-wins/去重等与视图无关逻辑）
- `.env.example`
- `.env.development.local`（不提交真实内网地址）
- `tests/unit/services/http/`
- `tests/unit/components/DebouncedSelect.spec.js`

如果三个文件内容很少，可以先合并为 `src/services/http.js`，不要为了目录形式过度拆分。

### 6. 数据流变化

当前：

```text
组件事件
→ 某个 API/全局 Axios
→ 三套不同拦截器之一
→ 原始响应或异常
→ 页面各自 try/catch
→ 不校验时序地更新 UI
```

改造后：

```text
组件事件
→ 业务 API 函数
→ 对应服务 Client
→ 统一错误归一化
→ request coordinator 判断是否仍为最新请求
→ 当前请求才提交状态
→ UI 根据统一 request state 渲染
```

### 7. 实现步骤

1. 统计三套请求入口和响应形状，形成迁移清单；
2. 新增环境变量示例，保持现有接口地址可在本地配置但不写死进源码；
3. 建立业务/算法两个 Client，先保持现有 API 返回形状，避免同时改所有页面；
4. 定义 `ApiError` 和取消判定，统一 `finally` 收口规则；
5. 先迁移 `DebouncedSelect`：保存 `allOptions`、取消 debounce、处理卸载和乱序；
6. 再迁移 ParameterTuning/qualityPredict 的四类详情联动；
7. 用延迟 Mock 写出 A 请求晚于 B 返回的回归测试；
8. 迁移推荐、预测和训练 API，分别设置合理 timeout；
9. 评估稳定字典是否存在重复请求，再决定是否加入 Promise 去重/TTL；
10. 只有失败类型和接口幂等语义明确后，再增加有限重试。

### 8. 边界情况

- 防抖回调尚未执行时组件已经销毁；
- 请求已经到达服务端，但浏览器执行了取消；
- A 请求被取消后服务端仍可能完成，前端只能阻止旧结果提交；
- 搜索词清空、大小写、空格和无结果时必须能恢复全量候选；
- 同时有多个请求时，不能由任意一个 `finally` 提前关闭公共 Loading；
- 取消不是错误提示场景，不能弹“网络失败”；
- 业务 HTTP 200 但业务 code 失败；
- 算法响应时间超过普通业务接口，timeout 不能一刀切；
- GET 重试和 POST 幂等不能只按方法名粗暴判断；
- 后续接入 token 时，多请求 401 的并发处理必须另行设计。

### 9. 测试方式

- 单元测试 `ApiError` 对不同 Axios 错误的归类；
- fake timers 验证快速输入只触发预期调用；
- 延迟 Promise 验证 A 后返回不会覆盖 B；
- 组件销毁测试验证 debounce 和请求被清理；
- 测试清空搜索后从 `allOptions` 恢复；
- 测试取消不弹错误、失败一定关闭对应 Loading；
- 测试两个服务实例使用不同 baseURL/timeout；
- 推荐、预测、训练和详情联动各做一次手工回归。

### 10. 如何证明优化有效

- 用同一组可控延迟用例对比改造前后：改造前可以复现旧响应覆盖，改造后断言最终始终为最新选择；
- 记录快速连续输入时的实际请求次数，验证防抖和去重行为；
- 通过测试断言组件卸载后没有状态提交；
- 保存错误类型与 UI 展示映射表，验证 timeout/cancel/network/business 不再混为一类；
- Network 面板确认服务地址来自环境配置，取消请求可观察，且没有重复全局拦截器。

不应凭感觉声称“请求性能提升”。可以证明的是结果顺序正确、请求次数受控、错误可识别和 Loading 可收口。

### 11. 完成标准

- [ ] 不再同时维护三套互相冲突的 Axios 公共行为；
- [ ] 两个服务的地址和 timeout 可配置；
- [ ] 远程选择不会越筛越少；
- [ ] 乱序响应无法覆盖当前选择；
- [ ] 组件销毁会清理 debounce 和在途请求；
- [ ] Loading 在成功、失败和取消后都能正确结束；
- [ ] 关键异步边界有自动化测试；
- [ ] lint、测试和生产构建通过；
- [ ] 原有推荐、预测、训练与详情查询没有回归。

预计工作量：第一切片 **3～5 个工作日**；迁移全部 API 及按需缓存/重试再增加 **3～5 个工作日**。

---

## 五、实施项 2：Schema 驱动的工艺参数域模型与可验证转换

分类：**B 修复现有映射 + C 最小真实 Schema，优先实施。**

### 1. 修改目标

建立唯一的工艺参数字段定义源，使参数推荐、质量预测、历史回显和请求 DTO 使用同一字段契约；消除手写正反映射不对称和 `$refs` 拉取子组件状态。

### 2. 当前实现

- `src/components/tab/Params.vue` 分别维护 `injectionData`、`pressure`、`temperature`、`moldTemperatureMachine`、`temperatureControlCabinet`；
- `transformToOldFormat` 与 `transformToFlatFormat` 手写两套映射；
- 第四/第五段注射时间读写 key 不一致；
- 温控箱 6 重复读取温控箱 5；
- `parseInput` 用通用 `parseFloat` 猜测类型，没有字段级范围、单位和精度；
- `src/views/ParameterTuning.vue` 与 `src/views/qualityPredict.vue` 通过 `$refs.paramsComponent.emitParamsToParent()` 获取结果。

### 3. 新方案

建立面向当前注塑参数域的 `parameterSchema`，而不是通用低代码引擎。每项至少包含：

- `key`：后端/API 字段；
- `group`、`row`、`stage`：页面布局位置；
- `label`、`unit`；
- `type`、`nullable`、`defaultValue`；
- `min/max/precision`（只有真实业务规则明确时填写）；
- `enabled` 或设备能力条件；
- `schemaVersion`。

使用 Schema 构建一个 canonical form model。UI 通过 `value/input` 或 `modelValue` 等 Vue 2 可用的受控模式同步；`toFormModel`、`normalizeParameter`、`validateParameter`、`toRequestDto` 为无副作用纯函数。

### 4. 涉及文件

必须修改：

- `src/components/tab/Params.vue`
- `src/views/ParameterTuning.vue`
- `src/views/qualityPredict.vue`
- `src/api/useAlgorithm.js`（明确 DTO 构建边界，不在 API 内猜字段）

按实际回显链路可能修改：

- `src/views/historyParameter.vue`
- `src/api/parameterHistory.js`
- `src/assets/data/parameter.json` 及相关静态参数样例

### 5. 是否需要新增文件

建议新增：

- `src/domain/parameter/parameterSchema.js`
- `src/domain/parameter/parameterTransform.js`
- `src/domain/parameter/parameterValidation.js`
- `tests/unit/domain/parameter/parameterTransform.spec.js`
- `tests/unit/domain/parameter/parameterValidation.spec.js`
- `tests/fixtures/parameter/`

若校验逻辑很少，可以先并入 `parameterTransform.js`；拆分应由职责和测试规模决定。

### 6. 数据流变化

当前：

```text
平铺 API 参数
→ Params.created
→ 手写转换成 5 组局部数组
→ 用户编辑
→ 父页面通过 $refs 触发子组件反向转换
→ 页面拼请求
→ 算法 API
```

改造后：

```text
API DTO
→ normalizeParameter/toFormModel
→ 父页面持有 canonical form model
→ Params 按 Schema 渲染并 emit 更新
→ validateParameter
→ toRequestDto
→ 参数推荐/质量预测 API
```

### 7. 实现步骤

1. 从现有 `Params.vue` 和真实 DTO 提取完整字段清单，标记已确认与待确认规则；
2. 为当前映射编写 characterization tests，先复现注射时间和温控箱 6 错误；
3. 修复确定错误，得到可用基线；
4. 建立最小 Schema，只描述当前页面实际使用的字段；
5. 实现 `toFormModel` 与 `toRequestDto`，保证不修改输入对象；
6. 添加 round-trip、不丢 key 和边界值测试；
7. 改造 `Params.vue` 为受控组件，移除内部重复可信状态；
8. 先接入 ParameterTuning，回归成功后再接 qualityPredict；
9. 接入历史保存/回显链路，验证同一方案往返；
10. 根据真实后端契约决定是否需要 `schemaVersion` 迁移；无旧版本需求时只记录版本，不建设迁移框架。

### 8. 边界情况

- `0`、`false` 不能被当成空值；
- 空字符串、`null`、`undefined` 必须有一致策略；
- `parseFloat("12abc")` 不应被静默接受为 12；
- 小数精度、负数和科学计数法是否允许要按字段定义；
- 设备只支持部分段数时，禁用字段是否应提交；
- 后端多出未知字段或缺少必需字段；
- 中文标签变化不能影响 API key；
- 子组件接收到新的 `params` prop 时必须更新，不能只在 `created` 初始化一次；
- Vue 2 新增嵌套 key 时需要预声明或使用响应式 API；
- 同一参数在推荐、预测、历史中的字段名不一致时，转换应有明确边界，不能在 UI 中散落兼容代码。

### 9. 测试方式

- 单元测试 `toRequestDto(toFormModel(dto))` 的往返不变量；
- 单独断言 schema 已覆盖所有当前已知 key，且 key 不重复；
- 覆盖 0、false、null、空字符串、非法数字、边界值和精度；
- 覆盖可选工艺段、温控箱 1～6，防止相邻字段串位；
- 测试函数不修改原始 DTO；
- 组件测试 prop 更新、用户输入、校验提示和 emit；
- 手工回归推荐、预测、历史保存/回显三条链路；
- 对最终请求体做快照或明确字段断言，避免只测试 UI。

### 10. 如何证明优化有效

- 保存改造前能够失败的两个已知映射反例，改造后成为永久回归测试；
- 统计当前业务 DTO key 与 Schema key 的集合差异，完成时差异必须有解释；
- 用固定 DTO 完成“接口对象 → 表单 → 编辑 → 请求对象 → 回显”的完整往返；
- 新增一个测试字段时，只修改 Schema 与必要业务规则即可让 UI/转换同步生效；
- Code review 中不再出现两套独立硬编码正反映射。

### 11. 完成标准

- [ ] 已知字段错映射修复且有回归测试；
- [ ] 当前页面使用的参数都由单一 Schema 描述；
- [ ] 表单只有一个可信状态源；
- [ ] 父页面不再通过 `$refs` 拉取参数值；
- [ ] 转换函数为纯函数并通过 round-trip/边界测试；
- [ ] 推荐、预测和历史回显使用同一 DTO 边界；
- [ ] 未确认的单位/范围没有被臆造；
- [ ] lint、测试、构建和三条业务回归通过。

预计工作量：**5～7 个工作日**；复杂业务校验和真实旧版本迁移另行估算。

---

## 六、实施项 3：可验证、可控内存的数据集导入管线

分类：**B 抽取复用 + C 最小可靠导入；Worker 与后端数据集化暂列 D。**

### 1. 修改目标

让参数推荐和模型训练复用同一套 CSV 读取、数据契约校验、错误反馈和预览策略；减少大型数组在 Vue 响应式状态中的重复持有，并用真实基准决定是否需要 Worker。

### 2. 当前实现

- `src/views/ParameterTuning.vue:748-776` 使用 `FileReader.readAsText` 和 `Papa.parse` 一次读取完整 CSV；
- `src/components/tab/createModel/model_training/DataSelect.vue:216-245` 重复基本相同的逻辑；
- 两处通过 `Object.keys(result.data[0])` 取列，空文件会访问不存在的首行；
- 两处使用 `dynamicTyping: true`，没有业务字段级类型规则；
- 上传控件只有 `accept=".csv"`，没有大小、编码、必需列、重复列和范围校验；
- `DataSelect.vue` 将完整数据数组写入 `src/store/taskModule.js` 的 `train_model.dataSet`；
- `DataSelect.vue:94` 已记录大数据预览卡顿，但没有测量数据证明应该先做虚拟列表或 Worker。

### 3. 新方案

建立共享 `datasetImporter` 和导入会话：

- 输入是 `File + datasetSchema + options`；
- 状态为 idle/reading/parsing/validating/ready/failed/cancelled；
- 输出分为完整数据引用、有限预览、列统计、错误列表和文件元数据；
- Vue 组件只响应式持有状态、摘要、预览和错误，不在页面与 Vuex 中复制多份完整 rows；
- 训练 Store 只保存 dataset session ID/元数据。纯前端阶段刷新后无法恢复原始文件时，应明确显示“需要重新选择文件”；
- 先用主线程实现正确性并建立基准；只有超出交互预算时才增加 Worker；
- 如果目标规模超出浏览器合理内存，再设计后端上传、异步校验和 dataset ID。

### 4. 涉及文件

必须修改：

- `src/views/ParameterTuning.vue`
- `src/components/tab/createModel/model_training/DataSelect.vue`
- `src/components/tab/createModel/model_training/FeatureSelect.vue`
- `src/store/taskModule.js`
- `src/api/useAlgorithm.js`
- `package.json`

可能修改：

- `src/components/tab/createModel/model_training/ModelTraining.vue`
- 负责表格预览的局部组件

### 5. 是否需要新增文件

建议新增：

- `src/domain/dataset/datasetSchemas.js`
- `src/services/dataset/datasetImporter.js`
- `src/services/dataset/datasetSession.js`
- `src/components/DatasetImport.vue`（仅在两个页面 UI 足够一致时提取）
- `tests/unit/services/dataset/datasetImporter.spec.js`
- `tests/fixtures/dataset/`
- `scripts/generate-dataset-fixture.js`（生成不同规模脱敏样本，避免提交巨大真实文件）
- `docs/benchmarks/dataset-import.md`

Worker 文件只有触发条件成立后才新增，例如 `src/workers/datasetParser.worker.js`。

### 6. 数据流变化

当前：

```text
File
→ FileReader 完整字符串
→ Papa Parse 完整对象数组
→ 页面响应式 tableData
→ Vuex 再持有 dataSet
→ 预览/算法请求
```

改造后：

```text
File
→ 文件边界检查
→ datasetImporter 解析与 Schema 校验
→ datasetSession 保存完整数据引用
→ Vue 仅接收状态 + 有限预览 + 统计 + 错误
→ Store 保存会话元数据
→ 业务提交时由 session 提供数据
```

未来后端数据集化：

```text
File → 上传/异步校验 → dataset ID → Store/训练任务只引用 dataset ID
```

### 7. 实现步骤

1. 明确推荐数据与训练数据各自的必需列、可选列和类型；不明确的业务范围先不写死；
2. 建立空文件、缺列、重复列、坏行、BOM、不同换行符等小型 fixture；
3. 把两个页面的 FileReader/Papa 逻辑抽成无 UI 的 importer；
4. 去掉无约束 `dynamicTyping`，按 Schema 显式解析值；
5. 建立结构化错误 `{row, column, code, message}` 和有限错误展示；
6. 实现导入状态、重新选择和取消；
7. 将预览限制为可配置的前 N 行，并提供总行数、有效/无效行数；
8. 引入内存型 dataset session，Store 只保存元数据；处理刷新后需重选文件的状态；
9. 接入 ParameterTuning，再接 DataSelect/FeatureSelect；
10. 生成小、中、大三档数据，记录原实现与新实现的解析时间、长任务、交互响应和内存快照；
11. 若主线程仍有不可接受长任务，再制作 Worker 原型并比较总耗时、可交互性与通信成本；
12. 若浏览器内存仍超边界，停止继续堆前端技术，提出后端数据集化接口。

### 8. 边界情况

- 空文件、只有表头、末尾空行；
- UTF-8 BOM、非 UTF-8 编码、逗号出现在引号内；
- 重复表头、表头前后空格、大小写差异和未知列；
- 数字列中的空值、`NaN`、`Infinity`、科学计数法和超大数字；
- 某一坏行是否阻止全部导入，需按业务定义错误/警告等级；
- 用户连续选择两个文件时，旧文件解析结果不能覆盖新文件；
- 读取、解析、校验三个阶段的取消语义不同；
- 页面离开和组件销毁时必须释放 reader/parser/未来 Worker；
- 刷新后内存 session 消失，草稿必须标记需重选，不能假装数据仍在；
- 预览有限并不代表提交数据被截断；
- 错误列表本身也可能很大，必须限制展示和导出策略。

### 9. 测试方式

- 用 fixture 测试空文件、缺列、重复列、坏行、BOM、引号和换行；
- 断言错误含正确行号、列名和错误码；
- 测试连续选择 A/B 文件时只接受 B；
- 测试取消后不会进入 ready，也不会提交旧数据；
- 测试预览只含 N 行但总行数和完整数据不被错误截断；
- 测试 Store 不再保存完整 rows；
- 集成测试推荐请求和训练特征选择仍拿到完整有效数据；
- 使用固定生成脚本完成小、中、大三档基准；
- 如果实现 Worker，对比主线程与 Worker 两种模式并测试 terminate/异常清理。

### 10. 如何证明优化有效

正确性证据：

- 同一批坏文件在改造前可能静默进入算法，在改造后得到确定的行列级错误；
- 自动化测试覆盖已定义的列契约和解析边界；
- 推荐与训练复用同一 importer，不再维护两份解析逻辑。

性能证据：

- 固定浏览器、设备和样本生成参数，记录读取、解析、校验、首个预览时间；
- 用 Performance API/DevTools 记录 Long Task、主线程阻塞和 heap snapshot；
- 对比 Vuex/页面中持有的完整数据引用数量；
- 只有对照结果证明 Worker 更好，才把 Worker 写入最终实现与简历；
- 最终数字填入 `docs/benchmarks/dataset-import.md`，不得预先编造提升比例。

### 11. 完成标准

- [ ] 两个业务入口复用同一 importer；
- [ ] 文件、列、类型和错误位置有明确校验；
- [ ] 导入状态和失败/取消交互完整；
- [ ] 页面只展示有限预览和有限错误；
- [ ] Vuex 不再持有完整 CSV 数组；
- [ ] 刷新丢失内存数据时明确要求重选，而非进入错误步骤；
- [ ] 固定样本的正确性测试和性能基准可重复；
- [ ] Worker 是否实施有书面测量结论；
- [ ] 推荐与训练链路回归通过；
- [ ] lint、测试和生产构建通过。

预计工作量：基础 C 版本 **4～6 个工作日**；若测量后实施 Worker，再增加 **2～4 个工作日**。后端数据集化不进入本轮工期。

---

## 七、实施项 4：可恢复的模型训练工作流与异步任务状态机

分类：**B 清理 Store + C 前端状态机；后端异步任务协议暂列 D。**

### 1. 修改目标

把当前五步训练页面从“可任意修改的 step 数字”改为有合法事件、进入条件、失效规则和草稿恢复的业务状态机。先完成前端可独立交付部分，不把后端任务能力写成已经实现。

### 2. 当前实现

- `src/components/tab/createModel/model_training/ModelTraining.vue` 根据 Vuex `step` 用五个 `v-if` 切换页面；
- `src/store/taskModule.js` 混合保留旧字段、训练表单、完整 CSV 和结果；
- `ChangeStep` 可直接写入任意步骤；
- `src/components/mixins/vuex_mixin.js` 暴露 `m_changeStep` 等薄包装，组件直接驱动迁移；
- mixin 调用了 `reset_train_select_data`，但当前 `taskModule.js` 中没有对应 mutation；
- `reset_state_train_model` 的表达含混，默认对象也没有覆盖完整业务状态；
- `src/components/tab/createModel/model_training/AlgorithmSelect.vue:219-256` 同步等待训练结果；
- `src/api/useAlgorithm.js:13-15` 用 GET 触发有副作用的训练；
- 刷新、退出或前序数据变更后没有恢复和后续失效逻辑。

### 3. 新方案

第一阶段只建设前端工作流：

- State 拆为 `draft`、`datasetRef`、`jobRef`、`result` 和 `meta`；
- 定义业务阶段 taskInfo/data/feature/algorithm/submitting/running/succeeded/failed，而不是只保存 1～5；
- 通过 Vuex actions 接收事件并检查守卫，mutation 只执行同步状态提交；
- 前序数据改变时清理依赖它的后续选择和结果；
- 草稿只保存小型可序列化元数据，包含 `schemaVersion`、`updatedAt`、用户/会话归属；
- 路由离开时根据 dirty/running 状态提示；
- 完整 CSV 留在数据集 session，草稿只标记是否需要重新选择；
- 不强制引入状态机库，先用纯 transition 函数和迁移表实现。

第二阶段保留服务端设计：

- `POST /training-jobs` + idempotency key；
- `GET /training-jobs/{id}` 查询状态；
- 取消接口和结果接口；
- 有上限的退避轮询；
- 有数据证明轮询不合适后再考虑 SSE/WebSocket。

### 4. 涉及文件

第一阶段必须修改：

- `src/store/taskModule.js`
- `src/components/mixins/vuex_mixin.js`
- `src/components/tab/createModel/model_training/ModelTraining.vue`
- `src/components/tab/createModel/model_training/TaskInfo.vue`
- `src/components/tab/createModel/model_training/DataSelect.vue`
- `src/components/tab/createModel/model_training/FeatureSelect.vue`
- `src/components/tab/createModel/model_training/AlgorithmSelect.vue`
- `src/components/tab/createModel/model_training/Result.vue`
- `src/router/index.js`（恢复入口/离开保护按最终交互实现）
- `src/utils/storage.js`

第二阶段才修改：

- `src/api/useAlgorithm.js`
- 后端训练任务接口及部署配置

### 5. 是否需要新增文件

建议新增：

- `src/domain/training/trainingState.js`
- `src/domain/training/trainingTransitions.js`
- `src/services/training/trainingDraftStorage.js`
- `tests/unit/domain/training/trainingTransitions.spec.js`
- `tests/unit/store/taskModule.spec.js`
- `tests/fixtures/training/`

后端协议确认后再新增：

- `src/services/training/trainingJobService.js`
- `src/services/training/trainingPoller.js`

### 6. 数据流变化

当前：

```text
步骤组件点击
→ 直接 commit ChangeStep/ChangeModelTrain
→ step 数字变化
→ ModelTraining 切换 v-if
→ AlgorithmSelect 等待单个 GET Promise
→ 成功后直接进入结果页
```

前端第一阶段：

```text
用户事件
→ Vuex action
→ transition(currentState, event)
→ 守卫校验/后续状态失效
→ mutation 提交合法新状态
→ 保存版本化草稿元数据
→ UI 由状态派生当前步骤和可用操作
```

未来服务端阶段：

```text
SUBMIT_JOB
→ POST 创建任务并保存 job ID
→ 轮询任务状态
→ JOB_PROGRESS/JOB_SUCCEEDED/JOB_FAILED
→ 状态机更新
→ 刷新后凭 job ID 恢复
```

### 7. 实现步骤

1. 盘点五步实际读取/写入的字段，删除或隔离旧业务字段；
2. 画出状态、事件、守卫、失效范围和终止状态的迁移表；
3. 用纯函数实现 transition，并先写合法/非法迁移测试；
4. 重构 `taskModule.js`，区分 actions 与 mutations，修复缺失 reset；
5. 保留由新状态派生的数字步骤，先兼容现有 `ModelTraining.vue`，避免一次重写全部组件；
6. 按 TaskInfo → DataSelect → FeatureSelect → AlgorithmSelect → Result 逐步改为 dispatch 业务事件；
7. 前序信息变化时显式清理后续状态并给出 UI 提示；
8. 实现版本化草稿存取、损坏/过期处理、登出清理；
9. 增加恢复对话框和路由离开确认；
10. 与数据集导入方案联动：只存 dataset 元数据，刷新后标记需重新选文件；
11. 完成组件和关键流程测试；
12. 后端能配合时，再以单独里程碑实现 job 协议，不能混入第一阶段完成声明。

### 8. 边界情况

- 用户直接访问后续步骤对应状态或手工篡改存储；
- 草稿 JSON 损坏、Schema 版本过旧、超过有效期；
- 同一浏览器切换账号后读到上一用户草稿；
- 多标签页同时编辑同一草稿；
- 修改数据集后，已选特征、算法和旧结果必须失效；
- 刷新后有草稿但原始 CSV session 已消失；
- 提交中重复点击、路由离开或关闭页面；
- 训练失败后哪些步骤可以保留，重试从哪一状态开始；
- 清空/重置应保留什么用户信息；
- 未来 job 成功但最后一次响应丢失；
- 取消前端轮询不等于取消服务端任务；
- 页面隐藏时轮询频率和恢复策略。

### 9. 测试方式

- 对迁移表逐项测试合法事件和非法事件；
- 测试前序字段改变会精确清理依赖状态；
- 测试 reset 得到全新对象且无旧数据残留；
- 测试草稿保存、恢复、过期、损坏和版本不兼容；
- 测试不同用户不能恢复彼此草稿；
- 测试刷新后数据集缺失会回到“需重选”而非错误进入下一步；
- 组件测试按钮可用性和离开确认；
- E2E 覆盖创建 → 数据 → 特征 → 算法 → 结果，以及中途刷新恢复；
- 第二阶段用 mock job server 测 queued/running/succeeded/failed/cancelled、断网和重复提交。

### 10. 如何证明优化有效

- 保存并评审状态迁移表，代码测试覆盖表中的每条允许迁移和关键拒绝迁移；
- 改造前可通过直接 `ChangeStep(5)` 进入结果页，改造后非法事件被拒绝；
- 用自动化测试和录屏证明在指定步骤刷新后可恢复已保存元数据；
- 检查 storage 内容，确认没有完整 CSV、算法结果或敏感 token；
- 改变前序数据后，测试断言旧特征/算法/结果全部按依赖关系失效；
- 第二阶段若实施，用同一 job ID 验证刷新恢复和重复提交不创建多任务。

### 11. 完成标准

前端 C 阶段完成标准：

- [ ] 五步流程由显式事件和守卫驱动；
- [ ] 不能非法跳到后续步骤；
- [ ] 前序变化能使相关后续状态失效；
- [ ] Store 不再混放无关旧字段和完整 CSV；
- [ ] reset、恢复和过期行为确定；
- [ ] 草稿带版本与用户归属，且不含敏感/大型数据；
- [ ] 刷新、回退、退出和重进有明确交互；
- [ ] 迁移矩阵、Store 和关键组件测试通过；
- [ ] lint、测试、构建及五步手工回归通过。

后端 D 阶段只有满足以下条件才能改为“已实现”：

- [ ] 真实接口返回 job ID；
- [ ] 状态查询、取消、失败和结果协议可验证；
- [ ] 幂等键由服务端执行而非只靠禁用按钮；
- [ ] 刷新后从服务端恢复真实任务；
- [ ] 轮询策略有测试且能停止和清理。

预计工作量：前端 C 阶段 **5～8 个工作日**。真实异步任务协议需要前后端分别估算，暂不进入近期承诺。

---

## 八、按收益与成本排序的实施路线

### 第一组：高收益低成本

#### 0. 可验证基线与确定性止损

- 建立最小测试环境；
- 修复参数已知错映射、训练缺失 mutation 和核心链 lint 问题；
- 保存重构前请求乱序与 CSV 基准样本。

预计 **1～2 个工作日**。这些是后续成果可信的前提，不单独包装。

#### 1. 请求治理第一切片

- 环境配置与两个 Client；
- `ApiError`；
- `DebouncedSelect` 原始选项、取消、latest-wins、销毁清理；
- ParameterTuning/qualityPredict 详情联动竞态测试。

预计 **3～5 个工作日**。前端可独立完成、覆盖页面多、能够快速形成可复现的改造故事。

### 第二组：高收益中成本

#### 2. 参数 Schema 最小版本

预计 **5～7 个工作日**。优先级在这一组最高，因为它直接决定算法输入正确性，并且业务辨识度最强。

#### 3. 数据集导入基础版本

预计 **4～6 个工作日**。先实现校验、错误定位、有限预览和基准，不承诺 Worker。

#### 4. 训练工作流前端状态机

预计 **5～8 个工作日**。复杂度最高，放在参数、请求和数据集边界稳定之后，避免状态机建立在仍会变化的数据结构上。

### 第三组：其他或条件触发

#### 5. 请求去重、TTL 缓存与有限重试

只有重复请求、数据稳定性和错误类型有证据后实施。预计额外 **2～4 个工作日**。

#### 6. CSV Worker

只有基准显示目标文件在主线程产生不可接受长任务，且后端数据集化暂不可用时实施。预计额外 **2～4 个工作日**。

#### 7. 异步训练 job 协议

当前先完成状态图、接口草案和 mock 验证；只有后端确认创建、查询、取消和幂等协议后进入开发。前端约 **1～2 周**，后端另算。

#### 8. 后端数据集化

当目标文件规模超过浏览器内存与上传体验边界时，再建设分片上传、异步校验和 dataset ID。属于跨端项目，不纳入本轮最小增强。

---

## 九、建议里程碑与提交边界

| 里程碑 | 交付物 | 可独立验收 | 可写入简历 |
| --- | --- | --- | --- |
| M0 基线 | 测试命令、脱敏夹具、已知错误回归 | 是 | 否，属于基础治理 |
| M1 请求竞态 | Client、ApiError、latest-wins、异步测试 | 是 | 完成测试与回归后可以 |
| M2 参数 Schema | Schema、纯转换、受控 Params、往返测试 | 是 | 完成三条业务回归后可以 |
| M3 数据集导入 | Importer、Schema 错误、有限预览、基准 | 是 | 基础描述可以；Worker 不能写 |
| M4 训练状态机 | 迁移表、Vuex 重构、草稿恢复、测试 | 是 | 只能写前端状态机部分 |
| M5 条件增强 | Worker 或 job 协议 | 分别验收 | 只有真实接入与测量后可以 |

建议每个里程碑单独提交，避免把依赖升级、全仓格式化、功能重构和性能优化混在同一个变更中。

## 十、总体完成标准

本轮“项目增强实施”可以在 M1～M4 全部完成时视为主要目标达成：

- [ ] 四个核心亮点都对应真实代码，不只存在于设计文档；
- [ ] 已实现部分与 D 类设计方案在文档和简历中严格区分；
- [ ] 参数、请求、数据集和训练状态各有自动化测试；
- [ ] 所有关键业务链完成手工或 E2E 回归；
- [ ] lint、unit test、production build 形成稳定质量门禁；
- [ ] 性能相关结论有固定环境、样本和原始记录；
- [ ] 没有虚构用户量、性能比例或上线效果；
- [ ] 每条最终简历描述都能定位到实现文件、测试文件和验收证据。

按一名熟悉项目的开发者顺序实施，M0～M4 预计约 **18～28 个工作日**。该估算不包含后端异步训练、后端数据集化、全仓历史 lint 清理和真实部署环境联调。
