#!/usr/bin/env bash
# 新建一个 feature 的文档骨架
# 用法: ./scripts/new-feature.sh F-002 订单退款
set -euo pipefail

ID="${1:?用法: new-feature.sh <ID> <标题>}"
TITLE="${2:?用法: new-feature.sh <ID> <标题>}"
SLUG=$(echo "$TITLE" | tr ' ' '-')
DIR="docs/product/features/${ID}-${SLUG}"

[[ -d "$DIR" ]] && { echo "✗ $DIR 已存在"; exit 1; }
mkdir -p "$DIR/review"

cat > "$DIR/brief.md" << EOF
# $ID $TITLE

> 由用户手写，几句话即可。写完后运行 /review $ID
> 这个文件是历史快照，评审开始后**不要再改**。

## 解决谁的什么问题

## 成功标准

## 明确不做
EOF

cat > "$DIR/spec.md" << EOF
---
id: $ID
title: $TITLE
status: draft
version: 1.0
owners: []
contracts: []
adrs: []
rfcs: []
---

## 背景

## 用户故事

## 状态机

## 各端职责

## 边界与限制

## 变更历史
- v1.0 初版
EOF

cat > "$DIR/acceptance.md" << EOF
# $ID $TITLE — 验收标准

> 每条都必须是**用户能自己点一遍验证**的。
> 写不出操作路径的条目，说明需求还没想清楚。

| # | 场景 | 操作路径 | 预期 | 通过 |
|---|---|---|---|---|
| 1 | | | | ☐ |
EOF

cat > "$DIR/open-questions.md" << EOF
# $ID 未决问题

> 只标记状态，**不要删除行**。

| # | 问题 | 提出者 | 状态 |
|---|---|---|---|
EOF

echo "✓ 已创建 $DIR"
echo "  1. 手写 $DIR/brief.md"
echo "  2. 在 Claude Code 里运行: /review $ID"
