# F-001 未决问题

> 只标记状态，**不要删除行**。

| # | 问题 | 提出者 | 状态 |
|---|---|---|---|
| 19 | 前台/管理后台是否采用微信小程序，还是走 Web？ | reviewer-miniapp（/conflicts 汇总） | ✅ 已裁决，见 ADR-001：走 Web，不做小程序 |
| 20-23 | 小程序类目资质、账号与微信身份绑定、评估报告小程序端预览格式、分享链路（均以"问题 19 裁决为小程序"为前提） | reviewer-miniapp | ✅ 因 ADR-001 裁决为 Web，前提不成立，问题作废 |
| 1 | 车辆卡片核心字段的完整清单是什么？ | reviewer-api/admin/domain/qa（/conflicts 汇总） | ✅ 已裁决，见 ADR-002 |
| 2 | 车辆是否需要业务唯一标识（车架号/VIN），是否要求全局唯一？ | reviewer-api/admin/domain（/conflicts 汇总） | ✅ 已裁决，见 ADR-002：车架号不要求全局唯一，仅后台展示后六位 |
| 3 | 车辆无图片/无价格时能否直接发布上架？校验放哪里？ | reviewer-api/admin/domain/qa（/conflicts 汇总） | ✅ 已裁决，见 ADR-003 |
| 4 | "每车最少 4 张"图片是硬性发布前置条件还是业务现状描述？ | reviewer-domain（/conflicts 汇总） | ✅ 已裁决，见 ADR-003：是硬性前置条件 |
| 5 | 车辆卡片本身是否包含价格字段？ | reviewer-api/domain/qa（/conflicts 汇总） | ✅ 已裁决，见 ADR-007：不包含，价格归 F-004 |
| 6 | 编辑操作是否改变车辆状态？ | reviewer-api/admin/domain/qa（/conflicts 汇总） | ✅ 已裁决，见 ADR-004：编辑不改变状态 |
| 7 | 状态转换矩阵如何定义？非法转换如何处理？ | reviewer-qa/api/admin（/conflicts 汇总） | ✅ 已裁决，见 ADR-004 |
| 8 | 已下架能否退回草稿？ | reviewer-domain（/conflicts 汇总） | ✅ 已裁决，见 ADR-004：不支持 |
| 9 | 管理后台账号是否有权限分级？ | reviewer-api/admin/domain/qa（/conflicts 汇总） | ✅ 已确认，见 docs/product/overview.md 角色部分：只有一种管理员角色，不设审批流程 |
| 10 | 是否需要记录操作日志？ | reviewer-api/admin/qa（/conflicts 汇总） | ✅ 已裁决，见 ADR-006：记录，只落库不做查看页面 |
| 11 | 是否需要并发编辑防护（乐观锁/幂等键）？ | reviewer-api/qa（/conflicts 汇总） | ✅ 已裁决，见 ADR-005 |
| 12 | 管理后台列表页是否需要筛选/搜索？ | reviewer-admin（/conflicts 汇总） | ✅ 已裁决，见 ADR-006：需要，属于 F-001 范围 |
| 13 | 是否需要导出车辆清单？ | reviewer-admin（/conflicts 汇总） | ✅ 已裁决，见 ADR-006：本期不做 |
| 14 | "一百台以内"是当前规模还是长期上限？ | reviewer-admin（/conflicts 汇总） | ✅ 已裁决，见 ADR-007：当前规模，后续会增长 |
| 15 | 车辆唯一标识生成规则是什么？ | reviewer-qa/api/domain（/conflicts 汇总） | ✅ 已裁决，见 ADR-005：系统自动生成技术主键 |
| 16 | 下架后前台不可见的生效延迟允许多大？ | reviewer-qa/admin（/conflicts 汇总） | ✅ 已裁决，见 ADR-005：实时，不做缓存延迟 |
| 17 | 是否为 F-005 预留软删除字段？ | reviewer-api/qa（/conflicts 汇总） | ✅ 已裁决，见 ADR-005：本期不预留 |
| 18 | 草稿数据在 F-005 上线前是否有清除手段？ | reviewer-qa（/conflicts 汇总） | ✅ 已裁决，见 ADR-006：本期没有，接受此限制 |
| 24 | 车辆下架时，F-003 挂载的图片是否需要联动处理？ | reviewer-api（/conflicts 汇总） | ✅ 已裁决，见 ADR-010：不联动；下架后图片/报告后台仍可编辑 |
| 25 | F-005 的删除操作允许作用于哪些状态的车辆？ | reviewer-domain（/conflicts 汇总） | ✅ 已裁决，见 ADR-023：草稿 / 已上架 / 已下架均可直接进回收站 |
