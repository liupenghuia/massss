# AGENTS.md（admin-web 管理后台）

继承仓库根 AGENTS.md 的全部约定。本文件在冲突时优先。

## 技术栈

- React 19 + TypeScript + Vite
- 视觉以仓库 `车辆管理系统架构/车辆系统统一设计-standalone.dc.html` 为准（Organic：奶油底、陶土强调色、圆角胶囊）
- 样式只从 `shared/organic.css` + `shared/shell.css` 取 token 和组件类（`.btn` `.card` `.tag` `.input` `.seg` `.table`），**不要再铺 antd 皮肤**
- 前台与后台同一套 token；后台桌面优先、顶栏导航，不用侧栏

## 页面骨架

- 顶栏：`车行 · 管理后台` + 车辆 / 回收站 / 账号胶囊 + 用户名/退出
- 车辆列表用 **卡片网格**（不是表格）；筛选用状态分段 + 关键字
- 录入/编辑为左右两栏：表单+图片 | 操作/前台链接/价格记录

## 列表页（历史约定，仅当设计稿使用表格时）

- `request` 直接对接现有接口，返回 `{ data, success, total }`
- 筛选走 `search` 配置，**不要自己在表格上方手搓一排 Input + Button**
- 状态类字段用 `valueEnum`，日期用 `valueType: 'date'`，金额用 `valueType: 'money'`
- 批量操作用 `rowSelection` + `tableAlertRender`
- 必须配 `rowKey`
- 错误用 `onRequestError` 统一走全局 message

## 表单

- 新增 / 编辑用 `DrawerForm`（车辆字段多，抽屉优于弹窗），简单确认类用 `ModalForm`
- 校验规则写在 `ProForm` 字段的 `rules` 上，**不要提交后才用 message 报错**
- 表单关闭时必须销毁内部状态（`drawerProps: { destroyOnClose: true }`），防止上次的旧值残留

## 打包体积

- 图标只按需引入具名导出：`import { SearchOutlined } from '@ant-design/icons'`，**禁止 `import * as Icons`**
- 路由级用 `React.lazy` 做代码分割
- 体积异常时用 `vite-bundle-visualizer` 排查，必要时对个别组件改用深路径引入 `antd/es/xxx`

## 禁止事项

- 禁止引入第二个 UI 组件库
- 禁止手写 CSS 去覆盖 antd 组件的内部结构（v6 的 DOM 结构与 v5 不同，这类覆盖会碎）
- 禁止在 antd 项目里引入 Tailwind
- 禁止用 `dangerouslySetInnerHTML`
- 禁止把接口返回的原始字段名直接当表头文案

## 完成定义（本目录追加）

- 列表页具备：筛选、排序、分页、批量操作、空态、错误态
- 表单具备：必填标识、内联校验、提交 loading、成功后刷新列表
- 按钮层级分明：一屏内只有一个 `type="primary"`
