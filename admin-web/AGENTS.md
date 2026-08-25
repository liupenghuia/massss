# AGENTS.md（admin-web 管理后台）

继承仓库根 AGENTS.md 的全部约定。本文件在冲突时优先。

## 技术栈

- React 19 + TypeScript + Vite
- 视觉以仓库 `车辆管理系统架构/车辆系统统一设计-standalone.dc.html` 为准（Organic：奶油底、陶土强调色、圆角胶囊）
- 样式只从 `shared/organic.css` + `shared/shell.css` 取 token 和组件类（`.btn` `.card` `.tag` `.input` `.seg` `.table` `.dialog`），**不要再铺 antd 皮肤**
- 前台与后台同一套 token；后台桌面优先、**顶栏导航**，不用侧栏
- 表单用自有 Field，**不要**用 ProTable / DrawerForm / ModalForm 当列表或录入骨架

## 页面骨架

- 顶栏：`车行 · 管理后台` + 车辆 / 回收站 / 账号胶囊 + 用户名/退出
- 车辆列表用 **卡片网格**（不是表格）；筛选用状态分段 + 关键字；**不做批量下架、不做列表批量操作条**
- 录入/编辑为左右两栏：表单+图片 | 操作/前台链接/价格记录
- 新建与编辑共用单一 draft 状态；草稿可空、发布校验时机不变

## 列表页

- 直接对接现有列表接口；契约无 `price` / `coverUrl` 时，卡片当前价与封面用既有单车接口并行拉取后一次 setState（ADR-113），禁止改契约或造 mock
- 筛选：状态分段 + 关键字，不要另起一套表格 search 配置
- 分页、空态、错误态、加载态必须有；单车价格请求失败不得让整页列表失败
- `rowKey` / `rowSelection` / `tableAlertRender` 等 ProTable 约定**不适用**本后台列表

## 表单

- 校验写在字段旁（就地错误），不要只在提交后用顶部 message
- 关闭或离开编辑时丢掉未保存的本地 draft，防止上次旧值残留
- 破坏性操作用 `.dialog`，禁止 `window.confirm`
- 保存/发布/下架的成功反馈写在操作区，不得只写页顶、不得等列表 N+1 才提示
- 服务端错误若带 `details`，必须译成「缺什么、为什么」；禁止把「不满足发布前置条件」这类短句原样丢给用户（ADR-116）

## 样式

- 新页面必须复用 `.btn` `.card` `.tag` `.input` `.seg` `.table` `.dialog`
- 新增全局类走 ADR
- 内联 style 仅动态计算值；字面量收回 `shell.css`
- 最小正文 12px

## 打包体积

- 图标只按需引入具名导出，禁止 `import * as Icons`
- 路由级用 `React.lazy` 做代码分割

## 禁止事项

- 禁止引入第二个 UI 组件库
- 禁止在本项目引入 Tailwind 覆盖 Organic
- 禁止用 `dangerouslySetInnerHTML`
- 禁止把接口返回的原始字段名直接当表头文案
- 禁止修改调用接口的 URL、方法、参数名、响应解构
- 禁止声称列表契约已含价格

## 完成定义（本目录追加）

- 改完必须在本目录跑 `lint`、`typecheck`、`build`，全绿才算完成
- 涉及 UI：加载态、空态、错误态三态齐全
- 列表页：筛选、分页、空态、错误态（**不要求**批量操作）
- 表单：必填/建议标识、内联校验、提交 loading；保存草稿/发布/下架须操作区进行态+就地成功/失败条（ADR-115），禁止静默成功
- 文档与代码边界一致
