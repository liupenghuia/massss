---
description: 记录用户裁决，更新 spec 与 ADR
argument-hint: [feature-id] [裁决内容]
allowed-tools: Read, Write, Edit, Glob, Bash
---

需求 ID：$1
用户裁决：$ARGUMENTS

依次执行：

1. **写 ADR**：为每一条独立决策在 docs/decisions/ 新建一个文件，
   编号取现有最大编号 +1，格式见 docs/templates/adr-template.md。
   Consequences 必须同时写收益和代价。

2. **更新 spec**：用 glob `docs/product/features/$1-*/spec.md` 定位
   - version 次版本号 +1
   - frontmatter 的 adrs 数组追加新编号
   - 变更历史追加一行
   - 若所有冲突已裁决，status 改为 agreed

3. **更新同目录的 open-questions.md**：已解决的标记 ✅ 并注明 ADR 编号，
   **不要删除行**。

4. **契约提案**：若涉及接口变更，只输出提案，不要直接改 contracts/。

5. 运行 `python3 scripts/check-docs.py` 验证一致性。
