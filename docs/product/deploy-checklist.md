# 上线 / 本机部署清单

> 非代码阻塞项。正式对外前逐条确认。  
> 相关：ADR-011、ADR-041、F-006 部署节。

## 本机开发

- [x] PostgreSQL 已启动，库名 `mallsss`
- [x] `server/.env` 含 `PGHOST/PGPORT/PGDATABASE/PGUSER`（勿提交仓库）
- [x] `cd server && npm run migrate:up` 已跑到最新（含 F-001 VIN 索引、F-004 金额存分）
- [ ] `SEED_SUPER_ADMIN_*` 或已知超管口令可登录
- [ ] `VITE_PUBLIC_WEB_ORIGIN` 指向前台 origin（admin 复制链接用；缺失应提示未配置）
- [ ] OSS：`OBJECT_STORAGE_DRIVER` + 密钥；或本地 mock
- [ ] `COOKIE_SECURE=false`（本地 HTTP）；`ADMIN_ORIGIN` 与 admin 开发端口一致

## 生产发布前

- [ ] 全站 HTTPS；`COOKIE_SECURE=true`
- [ ] 管理后台与 API **同源**（会话 Cookie `Path=/admin`）
- [ ] 前台与后台 **不同域**（会话隔离）
- [ ] 主站 + OSS 域名 ICP 备案（ADR-011/041）
- [ ] 微信内置浏览器：评估报告打开链（新标签→当前页→提示）真机抽检 PDF/图片
- [ ] 生产 `VITE_PUBLIC_WEB_ORIGIN` / 等价配置已写入
- [ ] 超管种子仅首次；口令不进仓库、不进日志
- [ ] 迁移在生产库执行并备份
- [ ] 公开接口限流阈值按流量复核（单实例内存，扩容前改集中式，ADR-040）

## 发布后冒烟

- [ ] 超管登录 → 改密（若强制）→ 车辆列表
- [ ] 发布一台车 → 前台列表/详情/价格
- [ ] 删除进回收站 → 前台立即 404
- [ ] 复制前台链接在无痕窗口可开
