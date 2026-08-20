---
description: 对已定稿的需求发起变更提案
argument-hint: [feature-id] [变更简述]
allowed-tools: Read, Write, Glob, Agent
---

需求 ID：$1
变更：$ARGUMENTS

1. 用 glob `docs/product/features/$1-*/spec.md` 定位并阅读，判断这次变更影响哪些端。
2. 按 docs/templates/rfc-template.md 生成
   docs/rfc/<今天日期>-$1-<短标题>.md，
   「不做的替代方案」一节必须填写。
3. **只**派发受影响的 reviewer（默认 1～2 个，禁止无必要的五方）。
   评审意见直接写进 RFC 文件的「评审意见」小节。
   prompt 遵守 /review 的阅读范围限制（禁止通读契约和其他 feature 的 review/）。
   不受影响的端不要惊动。
4. 把待裁决问题贴到对话里（每题一行），等用户决定。禁止复述评审全文。

用户批准后再用 /decide 更新 spec 并追加 ADR，RFC 的 status 改为 Accepted。
被否决的 RFC **保留文件**，status 改 Rejected——下次有人再提同样方案可直接引用。
