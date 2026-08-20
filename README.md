# 新项目 — 多 Agent 协作开发手册

> 这份文件是给**人**看的。打开它就知道今天该做什么。
> 给 agent 看的约定在 `CLAUDE.md`。

---

## 0. 这套东西解决什么问题

多个 agent 协作时，最大的问题是**它们之间没有共享上下文**。
人类团队靠会议和默契对齐，agent 只能靠文件。

而且如果让 agent 互相看到对方的意见，它们会**互相附和**——
你让 B 看着 A 的方案发言，B 大概率会说"很好，补充一点"。

所以这套流程的核心不是让 agent 聊天，而是：

```
独立发散  →  机械提取冲突  →  你来裁决  →  固化成文档
```

Claude Code 的 subagent 天然不继承主对话历史，
只要派发时不把别人的观点写进 prompt，独立性就自动成立。

---

## 1. 角色定义

**你是决策者，不是实现者。**

| 你负责 | agent 负责 |
|---|---|
| 写 `docs/principles.md`（一次） | 评审、冲突提取 |
| 写每个功能的 `brief.md`（5 行） | 写 spec、ADR、契约 |
| 做裁决 | 写代码、写测试 |
| 按 `acceptance.md` 点一遍验收 | 维护所有文档 |

**你不需要维护任何文件。** 只有输入（写 brief、说裁决）和读取（看 conflicts、点验收）。

如果你发现自己在手改 `spec.md`，说明流程出了问题——应该走 `/rfc` 让 agent 改。

---

## 2. 第一次使用（约 1 小时）

### 2.1 填 principles.md ← 这一步最值钱

```bash
$EDITOR docs/principles.md
```

亲手写，别让 agent 代笔。它会替你消化掉后续 80% 的琐碎决定。
不填的话，agent 会按自己的默认偏好来——而它的默认偏好是"功能加满"。

### 2.2 装检查钩子

```bash
./scripts/install-hooks.sh
```

### 2.3 拿最简单的功能跑通一遍

**不要用真需求练手。** 挑"登录 + 看一个列表"这种。

```bash
./scripts/new-feature.sh F-000 管理员登录
$EDITOR docs/product/features/F-000-管理员登录/brief.md
```

然后在 Claude Code 里走完整流程（见第 3 节）。

**这一遍的目的不是做功能，是暴露流程本身的问题：**

| 观察到 | 怎么改 |
|---|---|
| arbiter 自己拍板了 | 改 `.claude/agents/arbiter.md`，加更硬的禁止条款 |
| reviewer 编造业务规则 | 改对应 agent 文件的"铁律"段 |
| conflicts.md 你看不懂 | 改 arbiter 的输出格式 |
| agent 该问你时没问 | 在 `CLAUDE.md` 铁律里加具体例子 |

`.claude/` 下所有文件都是给你改的。调完再做真需求，效率差好几倍。

---

## 3. 一个功能的完整流程

### Step 1 — 建骨架

```bash
./scripts/new-feature.sh F-002 订单退款
```

### Step 2 — 你手写 brief.md

五行就够，别写细节，细节是 agent 的活：

```markdown
## 解决谁的什么问题
用户申请退款要打客服电话，运营每天处理几十通，效率低。

## 成功标准
用户能在小程序自助申请，运营在后台一键审批。

## 明确不做
一期不做部分退款，不做自动退款。
```

### Step 3 — 多方独立评审

```
/review F-002
```

会并行派发 5 个 subagent，各自从自己的视角挑毛病，写到 `review/` 下。
主对话只会收到"5 份评审已生成"，**不会**把全文吐回来——这是刻意的，
否则 5 份评审会把你的主上下文塞满。

### Step 4 — 提取冲突

```
/conflicts F-002
```

arbiter 会读全部评审，输出对照表，并把待裁决问题贴到对话里。

**你重点看「无人认领的空白」这一节。**
五个角色都默认别人会处理的东西，正是上线后炸掉的东西。

### Step 5 — 你裁决

```
/decide F-002 状态机对C端收敛为3态（申请中/已退款/已驳回），后台保留完整5态；
              退款金额上限走配置不硬编码；超7天不允许退款
```

agent 会自动：写 ADR → 更新 spec（version+1）→ 标记已解决的问题 → 跑一致性检查。

### Step 6 — 定契约

```
用 contract-keeper 根据 F-002 的 spec 更新 contracts/
```

**这是 G2 关卡，你要看一眼 diff。** 契约定错，四个端一起返工。

### Step 7 — 并行开发

契约冻结后，用 git worktree 让各端物理隔离：

```bash
git worktree add ../proj-admin  feat/F-002-admin
git worktree add ../proj-wx     feat/F-002-wx
git worktree add ../proj-api    feat/F-002-api
```

开三个终端，各自 `cd` 进去跑 `claude`。**合并由你控制，别让 agent 自动合主干。**

### Step 8 — 你验收

照着 `acceptance.md` 自己点一遍。全部勾选后：

```
把 F-002 的 status 改成 shipped
```

一致性检查会拦住"还有未勾选项就标 shipped"的情况。

---

## 4. 后期改需求

**不要直接改 spec.md。**

```
/rfc F-002 增加部分退款
```

会做三件事：生成 RFC 文件（含影响面分析）→ **只**惊动受影响的端 →
把待裁决问题贴给你。

批准后：

```
/decide F-002 同意部分退款，单笔订单最多拆3次
```

被否决的 RFC **保留文件**，status 改 Rejected。
下次有人再提同样方案，直接甩链接，不用重新论证一遍。

---

## 5. 日常怎么用

想知道现在什么状态，敲：

```
/status
```

它会告诉你各功能的进度，以及**当前卡在你身上的裁决**（放最前面）。

不要去翻目录。文件多是特性不是缺陷——正因为拆得细，
agent 才能只读它需要的那份，不会把整个项目塞进上下文。

---

## 6. 什么时候**不要**走全流程

这套流程有成本：一次 `/review` 是 5 个 subagent 各读一遍上下文。

| 情况 | 怎么办 |
|---|---|
| 改文案、加个字段 | 直接让 agent 改，不走流程 |
| 需求方向还没定 | 先串行想清楚，别急着并行——否则得到 5 份互相矛盾的臆测 |
| 只影响单端的小功能 | 只派 1~2 个相关 reviewer |
| 紧急线上问题 | 先修，事后补一条 ADR |

**建议门槛：跨端的、涉及状态机的、涉及钱和权限的，才走全流程。**

收窄写法：`/review F-002 api,qa` 只派列出的角色，独立性（并行、互不看稿）不变。
已定稿改动走 `/rfc`，默认只派 1～2 个受影响 reviewer。
评审 agent 禁止通读 `contracts/openapi.yaml` 和其他 feature 的 `review/`。
编码 agent 禁止把 `review/`、`conflicts.md` 当必读。

---

## 7. 常见问题

**Q: agent 找不到我新建的 reviewer？**
A: 如果 `.claude/agents/` 是会话启动后才创建的，当前会话检测不到。重启 Claude Code。之后再增删文件会自动热加载。

**Q: 评审结果都很平庸，全是我已经想到的？**
A: 说明流程太重了。砍成"单 agent 评审 + ADR"就够。或者检查 `principles.md` 是不是写得太笼统，agent 没有约束就只能说套话。

**Q: 五个 reviewer 说的话很像？**
A: 检查 `/review` 有没有被改动——它明确写了"绝对不要把任何一个 subagent 的观点转述给另一个"。如果主会话把 A 的意见带给了 B，独立性就破了。

**Q: 我想加一个新的评审视角（比如安全）？**
A: 复制一份 `.claude/agents/reviewer-qa.md`，改 name 和关注点即可。`/review` 会自动发现所有 `reviewer-*`。

**Q: 文档和代码对不上了？**
A: `python3 scripts/check-docs.py`。这是这套体系半年后唯一真正会崩的地方，所以务必装 pre-commit 钩子。

**Q: 这套能保证 agent 做对吗？**
A: 不能。它是**放大器不是替代品**——放大你的判断力，替代不了。
五个 reviewer 是同一个模型的五个提示词，不是五个真人。
它能可靠抓到"你没想到要考虑幂等"这类**遗漏**，
抓不到"这方案在你们团队执行不下去"这类**判断**。
把它当成一份非常好的多角度检查清单，而不是 AI 评审委员会。

---

## 8. 结构可以裁剪，三条原则别动

1. **决策要留痕** —— `docs/decisions/` 只追加，永不修改
2. **快照与真相分开** —— `brief.md` / `review/` 是历史，`spec.md` 是现在
3. **变更有入口** —— 不直接改 spec，走 RFC

| 情况 | 可以砍掉 |
|---|---|
| 功能少于 5 个 | `INDEX.md` |
| 只有你一个决策者 | `review/` 落文件（让 subagent 直接回报） |
| 改动不频繁 | RFC（直接改 spec + 追加 ADR） |
| 纯内部项目 | `acceptance.md`（并进 spec） |

**唯一别省的是 `decisions/`。**
其他省掉最多是麻烦，这个省掉是信息永久丢失——
三个月后你自己都想不起当初为什么否掉方案 B，
agent 更不可能知道，于是它会自信地把方案 B 又提一遍。

---

## 9. 存量项目迁移

如果这是个已有项目，**不要试图给存量代码补齐文档**。
让 agent 读代码反推需求，它会把"当前实现"写成"当初意图"，把 bug 写成规范。

正确顺序：

1. 只读探测，生成 `docs/product/AS-IS.md`（现状**地图**，不是规范）
2. 从代码捞出 `contracts/`，如实反映当前接口的真实行为
3. 只补你**还记得原因**的历史 ADR，写不出 Context 的别补
4. 在 `CLAUDE.md` 划线：新功能走流程，存量"就近补充"——改哪块补哪块
5. 补关键路径冒烟测试（这一步收益最高，没有它 agent 改存量代码没有反馈闭环）

`AS-IS.md` 缩到只剩边角料时，迁移就完成了。这个过程半年是正常的。

---

## 10. 目录速查

```
README.md              ← 你在这里
CLAUDE.md              给 agent 的约定
docs/
  principles.md        ★ 你手写，一次
  product/
    overview.md        全局概览、术语表
    features/<ID>-*/
      brief.md         ★ 你手写，5 行
      spec.md          agent 维护，当前真相
      acceptance.md    ★ 你验收时读
      conflicts.md     ★ 你决策时读
      open-questions.md
      review/          各角色评审快照
  decisions/           ADR，只追加
  rfc/                 变更提案
  templates/           模板，初始化后基本不动
contracts/             接口契约，唯一事实来源
scripts/
  new-feature.sh       建功能骨架
  check-docs.py        一致性检查
  install-hooks.sh     装 pre-commit
.claude/
  agents/              7 个 agent，可自由增删改
  commands/            5 个工作流命令
```

★ = 需要你亲自读写的，只有这 4 个。
