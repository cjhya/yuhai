# 宇海注塑工艺智能决策系统（前端）

这是一个基于 Vue 2、Vuex、Vue Router、Element UI、Axios、ECharts 与 Papa Parse 的注塑制造业务系统前端，包含高维生产数据探索、工艺参数推荐与方案对比、CSV 数据导入、模型训练任务和历史记录等流程。

## 无后端直接运行

项目默认开启纯前端演示模式，不需要启动业务后端或算法服务：

```bash
npm install
npm run serve
```

打开终端输出的本地地址即可。演示数据保存在浏览器 `localStorage`，推荐、预测和训练结果是确定性模拟结果，只用于验证前端交互与工程流程，不代表真实算法精度。

建议按以下顺序体验四个核心亮点：

1. `数据管理`：选择“机台参数”，查看 260 列级数据的摘要、字段搜索、纵向详情和多记录差异对比；
2. `参数调优`：点击“一键载入演示场景”，从 CSV 样本形成推荐前比较方案，再执行“参数推荐”，体验算法建议、人工工作稿、质量试算及结果过期提示；
3. `模型训练`：填充演示任务并加载演示 CSV，体验分块解析、有限预览、五步状态流转；
4. 在算法步骤提交训练，观察阶段进度和取消入口；训练期间刷新页面可从本地草稿与 job 状态继续恢复。

## 切换真实后端

复制 `.env.example` 为 `.env.local`，然后配置：

```dotenv
VUE_APP_DEMO_MODE=false
VUE_APP_BUSINESS_API_BASE_URL=http://127.0.0.1:8083
VUE_APP_ALGORITHM_API_BASE_URL=http://127.0.0.1:5000
VUE_APP_TRAINING_JOB_MODE=legacy
```

真实服务若实现 `/training-jobs` 异步任务协议，可将 `VUE_APP_TRAINING_JOB_MODE` 改为 `async`。

## 验证命令

```bash
npm test
npm run build
```

## 文档

- 文档导航：`docs/README.md`
- 项目事实与真实性边界：`PROJECT_INTERVIEW_CONTEXT.md`
- 简历定稿：`docs/19_IMPLEMENTED_EXPERIENCE_AND_RESUME_FINAL.md`
- 业务过程与实现原理：`docs/20_PROJECT_PROCESS_AND_IMPLEMENTATION_DETAILS.md`

阶段性审计和历史方案已集中到 `docs/archive/`，需要追溯决策时再查阅。
