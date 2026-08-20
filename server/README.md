# server

二手车信息管理系统后端骨架（Express + TypeScript，PostgreSQL）。F-006 登录/账号与 F-001/003/004 管理端接口已按契约实现。本地需 PostgreSQL。
参见仓库根目录 CLAUDE.md。

## 启动

```bash
npm install
cp .env.example .env   # 按本机 PostgreSQL 配置修改
npm run migrate:up
npm run dev             # http://localhost:8080/healthz
# 管理后台：admin-web 开发服务 http://localhost:5174 （/admin 反代到本进程）
```

## 常用命令

- `npm run build`：TypeScript 编译到 dist/
- `npm run typecheck`：只做类型检查，不产出文件
- `npm run generate:types`：从 ../contracts/openapi.yaml 重新生成 src/generated/openapi-types.ts
- `npm run migrate:up` / `npm run migrate:down`：执行/回滚 migrations/ 下的 SQL 迁移（node-pg-migrate，
  连接参数来自标准 PG* 环境变量）

## 目录

- `src/routes/`：Express 路由（当前仅 healthz）
- `src/models/`：数据模型（待实现）
- `src/middleware/`：中间件，如鉴权（待实现，见 F-006）
- `src/db/`：数据库连接
- `src/generated/`：由 openapi.yaml 生成的 TS 类型，不手改
- `migrations/`：SQL 迁移文件
