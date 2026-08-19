---
id: F-003
title: 图片与评估报告
status: agreed
version: 1.1
owners: []
contracts: [adminPresignVehicleImage, adminConfirmVehicleImage, adminPatchVehicleImageCaption, adminReorderVehicleImages, adminDeleteVehicleImage, adminListVehicleImages, adminPresignVehicleReport, adminConfirmVehicleReport, adminDeleteVehicleReport, adminListVehicleReports, publicListVehicleImages, publicListVehicleReports, PUBLISHED_IMAGE_MIN, countImages]
adrs: [ADR-008, ADR-009, ADR-010, ADR-011]
rfcs: []
---

## 背景

管理员为车辆上传图片（≥4 张，无上限）和第三方评估报告文件，是车辆信息展示系统的核心资产。
图片和评估报告是长期主要成本项（对象存储 + CDN）。

## 用户故事

## 状态机

图片/评估报告本身没有独立状态机（见 ADR-008）：增删改都是"编辑"动作，保存后立即生效，
可见性完全由 F-001 车辆的 published/unpublished 状态决定，不存在"已保存未发布"的中间态。

## 数据模型与交互

见 ADR-008、ADR-010。

- 图片说明为 1:1（一图一段文字），"无上限"指图片数量无上限
- 图片/评估报告支持删除（需二次确认）、支持"新增+删除"方式替换，不做原地覆盖
- 评估报告允许一辆车挂多份，按上传时间倒序展示，一份报告对应一个文件
- 已上架车辆删除图片导致数量 < 4 张时，服务端拒绝该次删除
- 车辆下架时图片/报告不做任何联动处理，管理后台随时可编辑
- 评估报告"直接展示" = 新标签页打开原文件
- 图片上传要求车辆已存在（含草稿态），用 F-001 技术主键关联
- 支持批量拖拽多文件上传，带进度反馈，部分失败不影响其余
- 不做并发排序冲突检测、不做打包下载

## 服务端与存储

见 ADR-009、ADR-011。

- 客户端直传对象存储 + 预签名 URL，服务端只做元数据落库确认
- 文件限制（工程默认值）：图片 jpg/png/webp、单张 ≤10MB；评估报告 PDF/PNG/jpeg、单份 ≤20MB；
  单车图片数超 100 张只告警不阻断
- 访问链接为公开直链，车辆下架后链接不做失效处理，只保证 `/public/*` 接口不返回已下架数据
- 向 F-001 暴露图片数量查询用进程内方法调用（服务端合一）
- 操作纳入 ADR-006 的操作日志机制，同一口径
- 权限与 F-001 一致，本期单一管理员角色全权限，待 F-006 收紧
- 车辆删除后图片/报告文件本期不同步清理，留给 F-005 处理
- 前台链接以微信内分享为主，同时支持纯 URL 分享；前台域名尚未 ICP 备案，
  正式上线前必须完成备案，这是部署阶段前置条件，非本 feature 开发范围

## 各端职责

## 边界与限制

- 本期不做打包下载、不做并发排序冲突检测（ADR-008）
- 本期不清理已删除车辆的存储文件，留给 F-005（ADR-009）
- 域名未备案是已知的上线阻塞项，需在部署阶段解决（ADR-011）

## 变更历史
- v1.0 初版
- v1.1 补充数据模型、交互规则、服务端与存储规则、下架联动、微信分享与部署前置条件，
  status 改为 agreed（ADR-008、ADR-009、ADR-010、ADR-011）
