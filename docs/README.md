# 文档导航

`docs` 已按“当前材料、实现证据、历史归档”整理。准备项目介绍或面试时，优先阅读根目录的当前材料，不要直接复制 `archive` 中的阶段稿。

## 推荐阅读顺序

1. [项目事实摘要](../PROJECT_INTERVIEW_CONTEXT.md)：快速了解定位、核心能力和真实性边界。
2. [简历与面试定稿](./19_IMPLEMENTED_EXPERIENCE_AND_RESUME_FINAL.md)：当前可直接使用的项目表达。
3. [业务过程与实现原理](./20_PROJECT_PROCESS_AND_IMPLEMENTATION_DETAILS.md)：理解四项核心亮点的业务过程和代码细节。
4. [已实现亮点证据总表](./evidence/09_COMPLETED_HIGHLIGHTS_EVIDENCE.md)：核对源码、测试和表达边界。

## 目录结构

```text
docs/
├── README.md
├── 19_IMPLEMENTED_EXPERIENCE_AND_RESUME_FINAL.md
├── 20_PROJECT_PROCESS_AND_IMPLEMENTATION_DETAILS.md
├── evidence/   # 已实现能力的详细证据
└── archive/    # 阶段性审计、候选方案和旧简历稿
```

### `evidence/`

- `09_COMPLETED_HIGHLIGHTS_EVIDENCE.md`：四项亮点的统一证据入口。
- `08_REQUEST_RELIABILITY_EVIDENCE.md`：请求竞态、取消和错误治理的专项证据。

### `archive/`

保留早期源码普查、架构分析、候选亮点、实施计划、外部对标和旧版简历。它们用于追溯决策，不代表当前最终口径。

## 维护约定

- 新的最终结论直接更新当前两份主文档，避免继续增加编号稿。
- 新的测试或量化结果更新 `evidence/`。
- 被新版本替代的材料移动到 `archive/`，不要和当前定稿并列。
