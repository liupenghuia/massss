---
description: 提取评审冲突，输出待裁决清单
argument-hint: [feature-id]
allowed-tools: Read, Write, Agent
---

需求 ID：$1

用 glob `docs/product/features/$1-*/` 定位目录，记作 <DIR>。

用 arbiter subagent 读取 <DIR>/review/ 下全部文件，输出到 <DIR>/conflicts.md。

提醒 arbiter：禁止自己下结论或推荐方案，只做机械提取。
特别注意「无人认领的空白」一节要仔细找。

完成后，把「需要用户裁决的问题」这一节**原样贴到对话里**，方便用户直接决策。
