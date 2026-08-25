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
| 26 | "车况描述"与 overview.md 的"车辆描述"是否同一字段？ | domain（第二轮 /conflicts 汇总） | ✅ 已裁决，见 ADR-034：同一字段，与 F-003 图片说明是两个独立字段 |
| 27 | 能源类型与排量/电耗/电池度数的联动，服务端是否强校验？ | qa（第二轮 /conflicts 汇总） | ✅ 已裁决，见 ADR-038：本期仅前端展示/隐藏，服务端不强校验 |
| 28 | 里程/年份/过户次数/车况描述是否有取值范围或长度限制？ | qa/domain（第二轮 /conflicts 汇总） | ✅ 已裁决，见 ADR-038：里程非负整数、年份1980-2100、手数非负整数、车况描述≤500字 |
| 29 | 草稿保存时必填字段是否强制非空？ | qa（第二轮 /conflicts 汇总） | ✅ 已裁决，见 ADR-035：草稿不强校验，仅发布时校验 |
| 30 | 两台车录入相同 VIN 是否允许保存？ | qa（第二轮 /conflicts 汇总） | ✅ 已裁决，见 ADR-036：不允许，保存时查重（修正 ADR-002 原"不要求全局唯一"） |
| 31 | 列表关键字搜索对 VIN 按完整车架号还是后六位匹配？ | admin/api（第二轮 /conflicts 汇总） | ✅ 已裁决，见 ADR-037：按展示的后六位匹配 |
| 32 | 已上架车辆事后不满足发布前置条件（F-003/F-004数据变动）时如何处理？ | domain（第二轮 /conflicts 汇总） | ✅ 已裁决，见 ADR-038：维持已上架不变，不做联动降级 |
| 33 | 乐观锁冲突响应是否需要回传最新数据？ | api/qa（第二轮 /conflicts 汇总） | ✅ 已裁决，见 ADR-038：仅报错，不回传最新数据 |
| 34 | 测试环境如何构造 F-003/F-004 的跨 feature 依赖数据？ | qa（第二轮 /conflicts 汇总） | ⏭️ 非业务决策，留待实现/测试阶段自行处理测试夹具，不升级为待裁决 |
| 35 | 管理后台车辆列表默认是否排除草稿状态？ | admin（第二轮 /conflicts 汇总） | ✅ 已裁决，见 ADR-038：默认展示全部状态含草稿，不做默认过滤 |
| 36 | 操作日志是否需要保留期/清理策略？ | api（第二轮 /conflicts 汇总） | ✅ 已裁决，见 ADR-038：本期不设保留期/清理策略 |
| 37 | 管理后台在微信内置浏览器下的登录态持久化是否需要专门处理？ | miniapp（第二轮 /conflicts 汇总） | ✅ 已确认，沿用 ADR-001：当普通浏览器测，不做微信专属处理 |
| 38 | 后台列表封面/当前价：独立 Summary 还是加进 AdminVehicle？ | RFC 2026-08-24 | ✅ 已裁决，见 ADR-114：新建 AdminVehicleSummary，详情不加 |
| 39 | 从未设价时 currentPrice 用 null 还是 unset？ | RFC 2026-08-24 | ✅ 已裁决，见 ADR-114：JSON null，不用 unset |
| 40 | 回收站列表要不要带封面/当前价？ | RFC 2026-08-24 | ✅ 已裁决，见 ADR-114：本期不做 |
| 41 | 保存草稿/发布成功反馈写在哪、能否等列表刷新？ | 实现走查 | ✅ 已裁决，见 ADR-115：操作区就地；成功不得等列表 N+1 |
| 42 | 发布失败能否只展示「不满足发布前置条件」？ | 实现走查 | ✅ 已裁决，见 ADR-116：必须展开缺什么与为什么 |
