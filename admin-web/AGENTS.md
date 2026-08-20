# AGENTS.md（admin-web 管理后台）

继承仓库根 AGENTS.md 的全部约定。本文件在冲突时优先。

## 技术栈

- React 19 + TypeScript + Vite
- Ant Design **6.x**（原生支持 React 19，**不需要** `@ant-design/v5-patch-for-react-19`）
- `@ant-design/icons` **≥ 6.0.0**，必须与 antd 主版本同步
- `@ant-design/pro-components` 3.x 按需引入 ProTable / ProForm / ProDescriptions，**不上 Ant Design Pro 脚手架、不引入 Umi**。当前尚未安装（npm latest 2.8.10 只支持 antd 5；配 antd 6 需 3.x beta，车辆列表那刀再装）

## 全局配置约定

- `ConfigProvider` 统一在 `src/App.tsx` 配置，**不要在页面里零散写 theme**
- locale 从 `antd/es/locale/zh_CN` 引入（Vite 下走 esm，cjs 路径在生产构建会多一层默认导出）
- 用 `<App>` 组件包裹应用，`message` / `notification` / `modal` **一律用 hooks 版**（`App.useApp()`），禁止用静态方法
- 使用 antd 默认主题，只允许调 `colorPrimary` 和 `borderRadius`。**不做定制主题、不做品牌 VI、不覆写组件内部 DOM 的 CSS**

## 页面骨架

- 整体布局：`Layout` + 可折叠 `Sider`（inline Menu）+ `Header` + `Content`
- 面包屑由路由自动生成（`useLocation` 映射），**不要在每个页面手写 Breadcrumb items**
- 面包屑层级控制在 3 级以内，最多不超过 5 级

## 列表页统一用 ProTable

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
