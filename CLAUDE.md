# 项目约定

## 角色分工
用户是**决策者**，不写代码。所有产出由 agent 完成，所有取舍由用户裁决。

## 铁律
1. 遇到未被授权的业务决策，**停下来问用户**，禁止自行假设。
2. 信息不足时写进该 feature 的 open-questions.md，禁止编造业务规则。
3. 不直接修改 contracts/，需变更时先输出提案。
4. 不修改 docs/decisions/ 下已有文件，只能新增。
5. 不修改 brief.md 和 review/ 下的文件——它们是历史快照。

## 关键路径
| 路径 | 作用 |
|---|---|
| docs/principles.md | 用户的决策基线，动手前必读 |
| docs/product/features/ | 各功能需求 |
| docs/decisions/ | ADR，只追加 |
| docs/rfc/ | 变更提案 |
| contracts/ | 接口契约，全项目唯一事实来源 |

## 工作流命令
/review <ID>      发起多方独立评审
/conflicts <ID>   提取冲突，输出待裁决清单
/decide <ID> ...  记录裁决，更新 spec 与 ADR
/rfc <ID> ...     发起变更提案
/status           全局进度总览

## 命令
构建: <待补充>
测试: <待补充>
检查文档一致性: python3 scripts/check-docs.py
