---
description: 对一个需求发起多方独立评审
argument-hint: [feature-id] [可选: all | api,admin,qa]
allowed-tools: Read, Write, Glob, Agent
---

需求 ID：$1
角色：$2

0. 用 glob `docs/product/features/$1-*/` 定位该 feature 的目录，记作 <DIR>。
   找不到或匹配到多个就停下来问用户。
1. 读 <DIR>/brief.md 和 docs/principles.md（含「评审与改需求的默认协议」）。
2. 决定派谁（**独立性不变：并行、互不转述**）：
   - `$2` 为空或 `all`：派全部 `reviewer-*`（跨端+状态机+钱/权限的全流程）
   - `$2` 为逗号列表（如 `api,qa`）：**只派这些角色**，用于单端或 RFC 收窄
   - 若 brief/ADR 已确认不做小程序，仍可派 miniapp，但 prompt 须写明：禁止再问要不要做小程序，只评微信内 H5
3. **并行**派发。给每个 subagent 的 prompt **只包含**：
   - 需求文件路径 `<DIR>/brief.md`
   - `docs/principles.md`
   - `docs/product/overview.md`（术语与边界，禁止当字段清单）
   - 模板 `docs/templates/review-template.md`
   - 输出路径 `<DIR>/review/<角色>.md`
   - 本 feature 的 `spec.md` 路径（可空）
   - 指令：禁止读其他 feature 的 `review/`、`conflicts.md`；禁止通读 `contracts/openapi.yaml`；禁止把 `docs/decisions/` 全部读一遍；待裁决问题遵守 principles 默认协议；必须把正文写入输出路径（需要 Write）

**绝对不要**把任何一个 subagent 的观点转述给另一个 subagent。
不要把评审全文贴回主对话。

全部完成后只回报：派了哪些角色 + 路径列表。不要复述内容。
