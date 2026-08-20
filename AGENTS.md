# AGENTS.md（仓库根）

本仓库为车辆信息展示与管理系统。当前任务阶段：**UI 企业级改造，只改前端表现层。**

## 仓库结构

```
admin-web/    管理后台（React 19 + TS + Vite + Ant Design）
public-web/   访客前台 / 卖车展示站（React 19 + TS + Vite + Tailwind v4）
server/       Node.js + Express + PostgreSQL   ← 本阶段禁止改动
```

各子目录有自己的 AGENTS.md，其中的约定优先级高于本文件。

## 全局命令

包管理器：npm（各子项目各自有 package-lock.json，在对应目录内执行）

```bash
npm install          # 安装依赖
npm run dev          # 本地开发（在 admin-web / public-web 目录内执行）
npm run build        # 生产构建
npm run lint         # ESLint
npm run typecheck    # tsc -b
npm test             # 单元测试（目前主要在 server）
npm run test:e2e     # Playwright（含截图回归，尚未铺开）
```

改动完成后必须自己跑 `lint`、`typecheck`、`build`，全绿才算完成。

## 本阶段的硬性边界

- **禁止改动 `server/` 下的任何文件。** 接口已经打通，这次只做 UI。
- **禁止修改前端调用接口的 URL、请求方法、参数名、响应字段解构方式。** 如果你认为某个接口返回的数据结构不适合新 UI，停下来告诉我，不要自己改接口或自己造 mock 顶替。
- **禁止一次性重写整个文件。** 改动保持最小 diff，只动需要动的行。
- **禁止臆造 API。** 不确定某个组件的属性、某个工具函数的签名、某个接口的返回字段时，先读代码确认；读不到就停下来问，不要猜。
- **禁止顺手做范围外的事。** 让你改 A 页面就只改 A 页面，不要"顺便"清理别的文件、升级别的依赖、重构别的模块。
- **禁止声称没跑过的检查通过了。** 没运行测试就说测试通过是严重问题。

## 工作方式

- 涉及多个文件或超过约 100 行改动的任务，先用 `/plan` 给出计划，等我确认后再执行。
- 每个页面 / 每个批次单独提交，commit message 用中文，格式：`ui(admin): 迁移车辆列表页到 ProTable`。
- 遇到需求本身有歧义、或按要求做会破坏现有功能时，停下来说明，不要自作主张选一条路走下去。

## 代码规范

- TypeScript `strict: true`，禁止 `any`（确需时写 `unknown` 并收窄）。
- 禁止 `@ts-ignore`、禁止用注释关闭 ESLint 规则来绕过报错。
- 组件文件 PascalCase，工具函数 camelCase，常量 SCREAMING_SNAKE_CASE。
- 不写无意义注释；只在逻辑不直观处解释"为什么"，不解释"做了什么"。

## 完成定义（DoD）

一个任务算完成，需同时满足：

1. `lint`、`typecheck`、`build` 全部通过
2. 改动范围与我要求的一致，没有夹带其它文件
3. 涉及的页面具备加载态、空态、错误态
4. 桌面 / 平板 / 手机三档宽度下布局不破
5. 键盘可操作，焦点样式可见
