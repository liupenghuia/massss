# F-003 未决问题

> 只标记状态，**不要删除行**。

| # | 问题 | 提出者 | 状态 |
|---|---|---|---|
| 1 | 图片说明"条数无上限"具体指什么？ | api/admin/domain/qa（/conflicts 汇总） | ✅ 已裁决，见 ADR-008：1:1，无上限指图片数量 |
| 2 | 车辆下架时图片/报告是否需要联动处理？ | api/admin/domain/qa（/conflicts 汇总，对应 F-001 问题24） | ✅ 已裁决，见 ADR-010：不联动 |
| 3 | 已上架车辆图片删到低于4张时怎么处理？ | api/admin/domain（/conflicts 汇总） | ✅ 已裁决，见 ADR-010：服务端拒绝删除 |
| 4 | 图片/报告是否支持删除、替换？ | api/admin/domain/qa（/conflicts 汇总） | ✅ 已裁决，见 ADR-008 |
| 5 | 一辆车能挂几份评估报告？ | api/admin/domain/qa（/conflicts 汇总） | ✅ 已裁决，见 ADR-008：允许多份并存 |
| 6 | 上传走直传对象存储还是服务端中转？ | api/domain（/conflicts 汇总） | ✅ 已裁决，见 ADR-009：客户端直传 |
| 7 | 图片格式/单文件大小/单车总数上限？ | api/admin/domain/qa（/conflicts 汇总） | ✅ 已裁决，见 ADR-009（工程默认值） |
| 8 | 访问链接公开直链还是签名？下架后要不要失效？ | api/admin/qa（/conflicts 汇总） | ✅ 已裁决，见 ADR-009：公开直链，不做失效处理 |
| 9 | "排序后保存或发布"是什么意思？ | admin/domain/qa（/conflicts 汇总） | ✅ 已裁决，见 ADR-008：保存即生效，无中间态 |
| 10 | 图片/报告增删改算不算"编辑"，是否立即反映前台？ | qa（/conflicts 汇总） | ✅ 已裁决，见 ADR-008：算，立即生效 |
| 11 | F-003 向 F-001 暴露图片数量的方式？ | qa/api（/conflicts 汇总） | ✅ 已裁决，见 ADR-009：进程内方法调用 |
| 12 | F-003 操作是否纳入 ADR-006 操作日志？ | admin（/conflicts 汇总） | ✅ 已裁决，见 ADR-009：纳入 |
| 13 | F-003 权限是否与 F-001 一致？ | admin/qa（/conflicts 汇总） | ✅ 已裁决，见 ADR-009：一致，待 F-006 收紧 |
| 14 | 车辆删除后图片文件要不要同步清理？由谁主导？ | admin/api/domain（/conflicts 汇总） | ✅ 已裁决，见 ADR-009：本期不清理，留给 F-005 |
| 15 | 评估报告"直接展示"的具体交互？ | qa/miniapp/domain/admin（/conflicts 汇总） | ✅ 已裁决，见 ADR-010：新标签页打开 |
| 16 | 前台链接是否以微信内分享为主要传播路径？ | miniapp（/conflicts 汇总） | ✅ 已确认，见 ADR-011：微信分享为主，同时支持纯 URL |
| 17 | 前台域名是否已备案、不在微信黑名单？ | miniapp（/conflicts 汇总） | ✅ 已确认，见 ADR-011：尚未备案，上线前需完成，已知阻塞项 |
| 18 | 一份评估报告能否由多个文件组成？ | domain（/conflicts 汇总） | ✅ 已裁决，见 ADR-008：不支持，一份报告一个文件 |
| 19 | 图片上传是否要求车辆已存在（哪怕草稿态）？ | api（/conflicts 汇总） | ✅ 已裁决，见 ADR-008：要求 |
| 20 | 评估报告是否可能含敏感信息，要不要限制访问？ | api（/conflicts 汇总） | ✅ 已裁决，见 ADR-009：不做特殊处理 |
| 21 | 是否需要"打包下载某车全部资料"？ | admin（/conflicts 汇总） | ✅ 已裁决，见 ADR-008：本期不做 |
| 22 | 要不要处理多人同时排序的并发覆盖？ | api/qa（/conflicts 汇总） | ✅ 已裁决，见 ADR-008：不处理 |
| 23 | 删除后立即物理删除，还是软删除+异步清理？ | api/domain/admin（/conflicts 汇总） | ✅ 已裁决，见 ADR-008：直接物理删除 |
| 24 | 要不要支持批量拖拽多文件上传？ | admin/api（/conflicts 汇总） | ✅ 已裁决，见 ADR-008：要 |
