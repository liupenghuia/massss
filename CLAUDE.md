# 项目约定

## 角色分工
用户是**决策者**，不写代码。所有产出由 agent 完成，所有取舍由用户裁决。

## 铁律
1. 遇到未被授权的业务决策，**停下来问用户**，禁止自行假设。
2. 信息不足时写进该 feature 的 open-questions.md，禁止编造业务规则。
3. 不直接修改 contracts/，需变更时先输出提案。
4. 不修改 docs/decisions/ 下已有文件，只能新增。
5. 不修改 brief.md 和 review/ 下的文件——它们是历史快照。
6. 省上下文：编码与小改只读该 feature 的 spec、已引用 ADR、contracts 中相关 path；禁止通读 review/ 与 conflicts.md。全量五方 `/review` 仅用于跨端+状态机+钱/权限。`/review F-00x api,qa` 可收窄角色。
7. 需求改动前先用 Grep/Glob 按契约字段名、接口路径定位涉及文件，禁止让 agent 先"通读全仓库/全端理解"再改；范围确认后只进入命中的文件。
8. 批量机械性改动（改名、替换固定字符串等）直接用 Edit 的 replace_all 或 sed 在已确认的文件列表上做，不逐文件调用 agent 判断。
9. 需求涉及多端（server/admin-web/public-web）时按端拆分处理，一端做完可 `/clear` 或开新会话再做下一端，不在同一个长对话里累积多端上下文。
10. 编码前核对该 feature spec.md 的「明确不做」清单；提交前自查 diff，每处改动都要能追溯到 spec 里某一条需求或已裁决的 open-questions，追溯不到的先停下问，不许顺手扩展。

## 关键路径
| 路径 | 作用 |
|---|---|
| docs/principles.md | 用户的决策基线，动手前必读 |
| docs/product/features/ | 各功能需求 |
| docs/decisions/ | ADR，只追加 |
| docs/rfc/ | 变更提案 |
| contracts/ | 接口契约，全项目唯一事实来源 |

## 工作流命令
/review <ID> [all|api,qa,…]  独立评审（可收窄角色）
/conflicts <ID>   提取冲突，输出待裁决清单
/decide <ID> ...  记录裁决，更新 spec 与 ADR
/rfc <ID> ...     发起变更提案
/status           全局进度总览

## 改需求 vs 新功能，走哪条路

**改某个已有 feature（spec 已定稿，代码已写）：**
1. 按契约字段名/接口路径定位涉及文件，不通读全仓库
2. 按量级分流：文案/范围内加字段 → 小改 + 新 ADR；状态机/权限/价格对错/跨端接口 → `/rfc`；三者同时涉及 → `/review` 全角色
3. 若这次改动碰到 spec 里「明确不做」的条目，必须先把该条挪出并写清原因，不许留着自相矛盾
4. contracts/ 变更只能由 contract-keeper 出提案
5. spec.md 升版本号 + 记变更历史，acceptance.md 同步补验收项

**全新功能：**
1. 分配新 feature ID，起草 brief.md（先跟用户聊清楚需求、边界、验收标准）
2. `/review` → `/conflicts` → `/decide` 定稿 spec.md，「明确不做」与验收范围必填
3. 跨 feature 契约变更走 `/rfc`，contracts/ 仍只能由 contract-keeper 落地
4. 关键设计决策写新 ADR（只追加）

两条路径收尾都要过：diff 每处改动可追溯到 spec 里某条需求（铁律 10）。

## 命令
构建: cd server && npm run build（或 cd admin-web / cd public-web && npm run build）
测试: cd server && npm test（Vitest 单测；admin-web / public-web 暂无测试脚手架）
集成测试: cd server && npm run test:integration（需本机先建好 mallsss_test 库并跑迁移：
  createdb mallsss_test && PGDATABASE=mallsss_test npm run migrate:up；目前仅覆盖
  adminAccounts 路由，见 ADR-120）
检查文档一致性: python3 scripts/check-docs.py
