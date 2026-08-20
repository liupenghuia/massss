---
description: 提取评审冲突，输出待裁决清单
argument-hint: [feature-id]
allowed-tools: Read, Write, Agent
---

需求 ID：$1

用 glob `docs/product/features/$1-*/` 定位目录，记作 <DIR>。

用 arbiter subagent **只**读取 <DIR>/review/ 下文件，输出到 <DIR>/conflicts.md。
禁止让 arbiter 再读 contracts/、其他 feature、或 ADR 目录全文。

提醒 arbiter：禁止自己下结论或推荐方案，只做机械提取。
特别注意「无人认领的空白」。
待裁决问题：合并重复题，每题一行；principles/overview/已有 ADR 已写明的不要列入。

完成后，**只**把「需要用户裁决的问题」这一节贴到对话里（不要贴一致项/冲突项全文）。
主会话可加一句：用户可用打包 /decide，不必按题号逐条长答。
