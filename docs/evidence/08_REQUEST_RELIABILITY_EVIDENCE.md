# 多服务请求可靠性与高频交互竞态治理：实施证据

> 整理日期：2026-08-26（Asia/Shanghai）  
> 本文只记录当前已经完成并可由源码或测试验证的亮点。其他候选亮点仍处于分析/规划阶段，不列为已实现成果。  
> 分类：**B（基于已有请求层增强）+ 小范围 C（组件内 single-flight 与有限缓存）**。

## 一、证据口径

本文区分四种证据，避免把设计目标写成实际结果：

| 标记 | 含义 | 能否写成“已经实现” |
| --- | --- | --- |
| 源码证据 | 当前工作区存在明确实现位置 | 可以 |
| 自动化证据 | 可重复执行的断言已经通过 | 可以 |
| 当前快照 | 只有改造后数据，没有改造前同口径基线 | 只能写当前值，不能写提升比例 |
| 待测方案 | 已定义测量步骤，但尚未执行或缺少真实服务环境 | 不可以写成结果 |

当前没有保存改造前的同环境性能基线，因此本文不声称“耗时降低百分比”“内存降低百分比”或“构建体积下降”。

## 二、最终亮点证据链

### 1. 问题

项目同时请求业务服务和算法服务，并包含三类容易出错的异步场景：

1. 机台、模具、材料、产品下拉框在聚焦和快速输入时可能并发加载同一列表；
2. 选择 A 后立即选择 B 时，A 的详情响应可能比 B 更晚返回，旧结果可能覆盖当前选择；
3. 参数推荐、质量预测、模型训练耗时较长，重复点击、超时、响应格式异常或页面销毁都可能造成重复提交、错误状态或 Loading 不能收口。

这不是单纯的“二次封装 Axios”问题，而是多服务配置、错误语义、Promise 完成顺序和 Vue 组件生命周期共同形成的可靠性问题。

### 2. 原方案

原方案的源码审计证据保留在 `docs/archive/04_ENGINEERING_AUDIT.md:270-443`、`docs/archive/06_SELECTED_HIGHLIGHTS.md:131-215` 和 `docs/archive/07_IMPLEMENTATION_PLAN.md:143-263`。Git 中可直接对比的典型实现包括：

- `src/utils/request.js` 自己创建 Axios 实例，使用固定配置，异常分支把错误退化成字符串；
- `src/utils/requestAlg.js` 单独创建算法请求实例，地址、超时和错误处理与业务实例不一致；
- `src/utils/api.js` 曾直接使用全局 Axios，并注册另一套响应处理；
- `src/main.js` 曾把原始 Axios 挂到 `Vue.prototype.$axios`；
- `DebouncedSelect` 只有 300ms debounce，首次数据未返回前没有在途 Promise 合并、取消或提交序号；后续筛选还可能基于上一次筛选子集；
- 参数调优和质量预测页面直接等待详情请求，返回后立即写状态，没有 latest-wins 保护；
- 长耗时提交缺少一致的重复点击保护、销毁取消、响应格式校验和 `finally` 收口。

### 3. 原方案缺陷

| 缺陷 | 触发条件 | 用户可见后果 |
| --- | --- | --- |
| 请求层行为分裂 | 同一页面访问不同服务或使用不同入口 | baseURL、timeout、返回值和错误形状不一致 |
| 错误信息丢失 | timeout、网络断开、HTTP 失败 | 页面只得到字符串或 `undefined`，难以区分是否应提示/重试 |
| 同资源请求乱序 | 用户快速从 A 切换到 B | A 晚返回后覆盖 B 的详情 |
| 重复列表请求 | 首次加载未完成时再次聚焦/查询 | 同一字典产生并行 API 调用 |
| 累进筛选 | 先搜索 alpha，再搜索 beta 或清空 | 无法从完整候选集恢复正确结果 |
| 销毁后异步回写 | 请求期间切换路由 | 已销毁组件仍可能处理结果或错误 |
| Loading 状态泄漏 | 前置处理、解析或请求抛错 | 按钮/遮罩可能不能恢复 |
| 响应契约未校验 | HTTP 成功但返回结构变化 | 在更深层访问字段时报模糊运行时错误 |

### 4. 新方案

新方案保持原有 `utils → api → view/component` 结构，只补充最小公共能力：

1. 用 `createHttpClient` 生成业务、算法两个独立 Client，共享请求 ID、响应解包和错误归一化，但保留不同 baseURL/timeout；
2. 用 `ApiError` 区分 cancel、timeout、network、HTTP、business、invalid-response、unknown；
3. 用 `LatestRequestCoordinator` 按资源 key 保存 `{ controller, sequence }`，新请求中止旧请求，且只有 Map 中仍是当前 entry 的 Promise 才能提交；
4. `DebouncedSelect` 用 `_loadPromise` 合并首次并发列表请求，用只读 `allOptions` 保存原始列表，后续查询只在本地筛选；
5. 详情联动按 `machine/mold/material/product` 分 key latest-wins，不同资源可并发、同一资源只接受最新结果；
6. 推荐、预测、训练增加按钮级重复提交保护、AbortController、响应形状校验和 `finally` 收口；
7. 组件销毁时取消 debounce、在途请求和协调器，取消类错误不弹用户错误提示。

本轮明确**没有**实现通用自动重试、跨页面全局缓存、Refresh Token 编排、服务端幂等键或“取消后端计算”。这些能力需要接口幂等性、缓存失效或后端任务协议，不能从当前实现推断。

### 5. 技术原理

#### 5.1 取消传输与阻止旧结果提交是两道防线

`AbortController.abort()` 会让支持 `signal` 的 Axios 请求在浏览器侧进入取消态，但请求一旦到达服务器，不保证服务器停止计算；某些适配器或不可取消的异步任务也可能继续完成。因此协调器还用 entry 身份校验：

```text
同一个 key 发起 A → Map[key] = entryA
同一个 key 发起 B → abort(A)，Map[key] = entryB
A 最后完成         → Map[key] !== entryA → 转成 StaleRequestError
B 完成             → Map[key] === entryB → 允许页面提交状态
```

所以正确性不依赖“取消一定成功”，核心不变量是：**旧 Promise 不能进入状态提交分支**。

#### 5.2 Promise 的完成顺序不等于发起顺序

浏览器发起 A、B 后，网络、服务器处理和连接调度都会改变完成顺序。Promise 微任务只保证各自回调在对应 Promise settled 后执行，不保证 A 的回调先于 B。latest-wins 必须由业务 key 和当前 entry 显式判定，不能依赖事件循环“碰巧有序”。

#### 5.3 single-flight 与缓存是两件事

- `_loadPromise`：首次请求未完成期间，所有调用共享同一个 Promise，解决并发重复请求；
- `allOptions + hasData`：请求成功后复用已加载列表，解决后续重复请求；
- `apiUrl` 变化时 `resetOptions()`：取消旧请求并清空缓存，避免跨资源复用错误数据。

当前缓存仅属于单个组件实例，没有 TTL、容量上限和跨组件共享，因此不能包装成完整的全局缓存系统。

#### 5.4 防抖不等于竞态治理

300ms debounce 只能减少回调触发频率；聚焦直接调用、慢网请求重叠、程序化调用以及已经发出的请求仍可能竞态。当前方案同时使用 debounce、single-flight、query sequence、AbortController 和销毁清理，各自解决不同问题。

#### 5.5 Axios 拦截器与错误归一化

请求拦截器为 config 增加客户端 `requestId` 和 `startedAt`；响应拦截器统一返回 `response.data`。错误分支依据 Axios 的 `code/request/response` 区分取消、超时、无响应网络错误和 HTTP 错误，再包装成保留 `cause`、服务名、状态码、是否可重试等字段的 `ApiError`。

`X-Request-ID` 默认不发送，因为自定义 Header 会触发 CORS 预检/白名单要求；只有后端明确放行后才通过环境变量开启。

#### 5.6 Vue 2 生命周期与状态收口

协调器和 AbortController 放在组件实例的非响应式字段中，不参与模板渲染；模板真正依赖 `loading/status/errorMessage`。`beforeDestroy` 置销毁标记并取消任务，`finally` 只在组件仍存活且 controller/sequence 仍匹配时回收 Loading，避免旧请求的 finally 关闭新请求状态。

### 6. 实现位置

| 能力 | 实现位置 | 关键对象/API |
| --- | --- | --- |
| 统一 Client 工厂与错误模型 | `src/utils/http.js:4-231` | `API_ERROR_KIND`、`ApiError`、`normalizeApiError`、`createHttpClient` |
| 业务服务 Client | `src/utils/request.js:1-11` | 默认 5s，可由环境变量覆盖 |
| 算法服务 Client | `src/utils/requestAlg.js:1-11` | 默认 120s，可由环境变量覆盖 |
| 多服务环境示例 | `.env.example:1-7` | 两个 baseURL、三类 timeout、request ID 开关 |
| latest-wins 协调器 | `src/utils/requestCoordinator.js:1-106` | `Map`、`AbortController`、entry identity、`dispose()` |
| API config/signal 透传 | `src/api/user.js:8-37`、`src/api/model.js:27-29` | Axios request config、`signal` |
| 算法响应契约 | `src/api/useAlgorithm.js:4-32` | `validateData`、不同接口 timeout |
| 下拉 single-flight/有限缓存 | `src/components/DebouncedSelect.vue:73-199` | `_loadPromise`、`allOptions`、`_querySequence` |
| 参数调优详情 latest-wins | `src/views/ParameterTuning.vue:605-770` | `detailRequestState`、按类型 key 协调 |
| 质量预测详情 latest-wins | `src/views/qualityPredict.vue:384-526` | 同上 |
| 推荐提交可靠收口 | `src/views/ParameterTuning.vue:779-852` | 防重复、取消、解析校验、finally |
| 预测提交可靠收口 | `src/views/qualityPredict.vue:534-599` | 防重复、取消、解析校验、finally |
| 训练提交可靠收口 | `src/components/tab/createModel/model_training/AlgorithmSelect.vue:235-299` | 防重复、600s timeout、取消、校验 |
| 请求基础层测试 | `tests/http.test.js:1-131` | 错误分类、JSON 错误、请求元数据、响应校验 |
| 真实组件行为测试 | `tests/debouncedSelect.test.js:1-178` | 加载 `.vue` script、延迟 Promise、请求计数 |
| 协调器竞态测试 | `tests/requestCoordinator.test.js:1-101` | 同 key 乱序、旧失败、真实失败、dispose |
| 测试入口 | `package.json:5-10` | `npm test` |

### 7. 完整调用链

#### 下拉列表

```text
用户 focus / 输入
→ Element UI remote-method
→ lodash debounce（focus 首次加载可直接触发）
→ DebouncedSelect.remoteMethod(query)
→ loadOptions()
→ 命中 _loadPromise：复用在途 Promise
  或命中 hasData：直接使用 allOptions
  或 getRequest(apiUrl, { signal })
→ src/api/user.js
→ 业务 Http Client
→ Axios adapter / 浏览器网络栈
→ 响应拦截器解包或 ApiError 归一化
→ sequence 仍为最新时从 allOptions 筛选并更新 options
→ finally 收口 loading
```

#### 详情联动

```text
用户选择机台/模具/材料/产品
→ onXxxChange
→ loadDetail(type, selectedValue, ...)
→ coordinator.run(type, executor)
→ 中止同 type 旧 controller，登记新 entry
→ getRequest(/type/detail/id, { signal })
→ 业务 Http Client → 后端
→ coordinator 校验当前 entry
→ 页面校验 res.data 结构
→ 仅最新请求写入 xxxData 和 success 状态
→ 真实当前错误写 error；取消/过期结果静默丢弃
```

#### 推荐/预测/训练

```text
点击提交
→ loading guard 拦截重复点击
→ 创建 AbortController并进入 loading
→ 页面构造业务 payload
→ src/api/useAlgorithm.js
→ 算法 Http Client（接口级响应校验/训练独立 timeout）
→ 页面做 JSON/非空二次校验
→ 组件仍存活且未取消时提交结果
→ catch 区分取消与真实错误
→ finally 回收 controller 和 loading
```

### 8. 测试方式与已执行结果

执行日期均为 2026-08-26。

#### 8.1 自动化测试

命令：

```bash
node --test tests/http.test.js tests/requestCoordinator.test.js tests/debouncedSelect.test.js
```

实际结果：请求可靠性专项 **10 个测试通过，0 失败**。当前项目执行 `npm test` 时还会运行参数域、数据集导入和训练工作流测试，项目总计 **36 个测试通过，0 失败**。

| 已通过测试 | 输入/时序 | 实际可验证结果 |
| --- | --- | --- |
| 并发下拉查询合并 | 首次空查询与 `beta` 查询在响应前重叠 | `getRequest` 计数为 1；最终 options 只有 Beta；Loading 关闭 |
| 下拉成功后复用 | 依次查询空串、alpha、beta、空串 | 4 次 `remoteMethod` 调用累计只有 1 次列表 API；清空后恢复 2 条完整候选 |
| 下拉销毁取消 | 请求 pending 时执行 `beforeDestroy` | `signal.aborted === true`；不提交列表；不发出用户级 error 事件 |
| 结构化错误归一化 | timeout、network、HTTP 503、cancel 四类 Axios 错误 | kind、service、requestId、status 和 retryable 字段符合预期 |
| 非法 JSON 契约错误 | 算法服务返回非 JSON 字符串 | 抛出带 algorithm service 的 `INVALID_RESPONSE` |
| Client 元数据/响应校验 | valid 与字段缺失响应各一次 | 请求生成 requestId/startedAt；有效响应解包；无效响应被拒绝 |
| 同资源 latest-wins | machine-A 先发，machine-B 后发但先完成 | B 正常返回；A 被标记为 `ERR_STALE_REQUEST`，旧结果提交次数为 0 |
| 旧失败不覆盖新成功 | mold-B 成功后 mold-A 才失败 | A 转为 stale，不会进入当前错误分支 |
| 当前错误保真 | 当前 material 请求抛出 network error | 协调器把同一个 Error 交给页面，而不是误判 stale |
| 销毁协调器 | product 请求 pending 时 dispose | signal 被中止；旧请求和 dispose 后的新请求都不能提交 |

测试输出中的单例耗时受 Babel 编译、Node 调度和机器状态影响，**不作为页面性能数字**。

#### 8.2 定向静态检查

已对本亮点涉及的 utils、API、三个业务页面/组件和三个测试文件执行 ESLint，实际结果：**0 error**。

项目级 `npm run lint` 仍为 **16 errors / 0 warnings**，错误位于四项亮点定向检查范围外。因此可以说“本次修改通过定向 lint”，不能说“项目 lint 已全部通过”。

#### 8.3 生产构建

命令：

```bash
npm run build
```

实际结果：构建退出码 0，`dist` 成功生成；仍有 3 类构建警告：ECharts default import、超限静态资源、入口体积超限。

当前产物快照如下，但因为没有改造前同配置基线，**这些数字不是本亮点的优化效果**：

| 文件 | 当前大小 | 当前 gzip |
| --- | ---: | ---: |
| `dist/js/chunk-vendors.7a1b99a8.js` | 3558.05 KiB | 1121.24 KiB |
| `dist/js/app.3e6d1aa3.js` | 281.40 KiB | 92.00 KiB |

### 9. 实际效果

#### 已有证据、现在可以陈述

- 两个后端服务由同一工厂创建但保留各自 baseURL 和 timeout，错误统一为结构化 `ApiError`；
- 在自动化场景中，2 个重叠的首次下拉查询只产生 1 次列表 API 调用，重复列表请求数为 0；
- 在自动化场景中，列表加载后的 3 次继续筛选/清空不增加 API 调用，累计仍为 1 次；
- 在可控乱序场景中，最新请求结果成功返回，旧成功结果和旧失败结果的状态提交次数均为 0；
- 组件/协调器销毁测试中 signal 确实进入 aborted，销毁后的结果提交次数为 0；
- 推荐、预测、训练已经具备重复点击 guard、取消、响应校验和 finally 收口；
- 请求可靠性专项 10/10、项目全量 36/36 自动化测试通过；本亮点定向 lint 与生产构建通过。

#### 当前不能陈述

- 不能声称线上 API 总调用量降低了某个百分比；
- 不能声称首屏、FPS、内存或构建体积得到提升；
- 不能声称 AbortController 已停止服务端算法计算；
- 不能声称所有 GET/POST 都会自动重试或具有服务端幂等保证；
- 不能声称全项目 lint 已通过。

## 三、可实际执行的后续量化测试

### 1. 浏览器真实请求次数

目的：验证真实 Element UI 事件、300ms debounce 和浏览器请求链路下的 API 次数。

步骤：

1. 在 Chrome DevTools Network 中开启 Preserve log，清空记录；
2. 进入参数调优页，只测试一个下拉资源，例如 `/machine/list`；
3. 聚焦后在 300ms 内连续输入固定序列 `a → al → alp → 清空`；
4. 等待所有请求完成，导出 HAR；
5. 重复固定脚本 20 轮，分别统计每轮触发次数、列表 API 次数、取消次数和重复次数。

统计口径：

```text
interaction_count = focus + 输入变化次数
list_api_count     = HAR 中目标列表接口记录数
unique_load_count  = 本轮实际需要加载的不同 apiUrl 数量
duplicate_count    = max(0, list_api_count - unique_load_count)
```

报告时同时给出网络类型、CPU throttling、浏览器版本、后端环境和 20 轮原始值；执行前不预填结论。

### 2. 乱序响应提交率

目的：证明网络时序颠倒时 UI 始终对应最后选择。

自动化最小版已经在 `tests/requestCoordinator.test.js` 中执行。浏览器集成测试可用 Mock Service Worker、代理延迟或测试后端设置：A 延迟较长、B 延迟较短，每轮快速选择 A 后选择 B。

```text
round_count        = 总轮数
latest_commit      = 最终 UI 为 B 的轮数
stale_commit       = 最终 UI 被 A 覆盖的轮数
stale_commit_rate  = stale_commit / round_count
```

建议执行 100 轮并保留每轮选择 ID、请求 ID、响应时间和最终 UI ID。只有实际执行后才填写 rate。

### 3. Loading 与异常收口矩阵

对推荐、预测、训练分别注入以下场景：成功、HTTP 500、timeout、网络断开、主动 abort、响应字段缺失、JSON 非法、前置 payload 处理抛错、请求中切换路由。

每个场景记录：

- 请求结束后按钮 `loading` 是否为 false；
- 是否发生重复 API 调用；
- 取消是否被静默处理；
- 真实错误是否只提示一次；
- 错误后能否再次提交成功。

目标值不能预填；测试完成后用“通过场景数 / 总场景数”报告。

### 4. 内存与生命周期

目的：检查 debounce 闭包、Axios Promise、Controller 和 Vue 组件是否在反复进出路由后被保留。

1. Chrome 以相同起始页面强制 GC 后拍 Heap Snapshot A；
2. 在请求未完成时进入/离开参数调优和质量预测页面 30 次；
3. 等待任务结束，再强制 GC 并拍 Snapshot B；
4. 搜索 `DebouncedSelect`、`LatestRequestCoordinator`、`AbortController` 和 Detached DOM；
5. 再执行一轮 30 次得到 Snapshot C，观察存活对象/retained size 是否持续单调增长。

只有记录 A/B/C 的 heap size、目标对象数量和 retained path 后，才能给出内存结论。一次快照变大不能直接判定泄漏。

### 5. 高频本地筛选性能

当前下拉是在 `allOptions` 上执行 O(n) 字符串筛选，适合稳定的小字典。建立 100、1,000、10,000、50,000 条固定数据集，在 Chrome Performance 中分别执行相同输入脚本，记录：

- 每次 `filterOptions` 的 duration；
- 主线程 Long Task 数量；
- 输入到 options 更新的延迟；
- JS heap 和列表 DOM 节点数。

若真实数据下出现明显长任务或输入延迟，再升级为服务端 query、分页/虚拟化或索引；在测量前不预设阈值与收益。

## 四、面试可用的证据化表述

推荐表述：

> 项目同时访问业务服务和长耗时算法服务，原先多套 Axios 封装的超时、返回值和错误语义不一致；远程下拉及设备详情联动还存在重复请求和旧响应覆盖。我的改造没有重写项目结构，而是用 Client 工厂保留多服务差异，增加结构化 ApiError，并用 AbortController 加 Map entry 身份校验实现 latest-wins。稳定小字典采用组件内 single-flight 和原始列表缓存，页面销毁统一取消，推荐/预测/训练用 guard 与 finally 收口。当前有 10 个确定性测试覆盖错误分类、响应契约、重复请求、乱序成功/失败、真实错误和销毁取消；测试中两个重叠列表查询只调用一次 API，旧响应提交次数为 0。没有真实基线的数据，例如线上降幅、内存和首屏，我不会写成优化结果。

面试官继续追问时，应主动说明三个边界：

1. abort 不等于服务端停止计算，所以还需要 latest-entry 校验；
2. 当前只有组件级有限缓存，没有 TTL/LRU/跨组件失效协议；
3. 自动重试和 POST 幂等必须建立在明确接口契约上，本轮没有擅自实现。
