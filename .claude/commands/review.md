---
description: 对一个需求发起多方独立评审
argument-hint: [feature-id]
allowed-tools: Read, Write, Glob, Agent
---

需求 ID：$1

0. 用 glob `docs/product/features/$1-*/` 定位该 feature 的目录，记作 <DIR>。
   找不到或匹配到多个就停下来问用户。
1. 读 <DIR>/brief.md 和 docs/principles.md。
2. 列出 .claude/agents/ 下所有 reviewer-* agent。
3. **并行**派发它们。给每个 subagent 的 prompt 只包含：
   - 需求文件路径
   - docs/principles.md 路径
   - 模板路径 docs/templates/review-template.md
   - 它自己的输出路径 <DIR>/review/<角色>.md

**绝对不要**把任何一个 subagent 的观点转述给另一个 subagent。
它们必须完全独立发散，否则会互相附和，评审就失去意义。

全部完成后只回报：几份评审已生成 + 路径列表。不要复述内容。
