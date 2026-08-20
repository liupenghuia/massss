-- F-001 车辆信息管理：管理端接口所需的补充表结构。
-- F-006（登录）尚未落地，本期没有真实管理员账号可关联，operation_logs.operator_id
-- 暂放开为可空，F-006 上线后再收紧为 NOT NULL 并回填。

ALTER TABLE operation_logs ALTER COLUMN operator_id DROP NOT NULL;

-- F-001 创建车辆时可选写入首条价格记录（initialPrice），F-006 落地前同样没有真实操作人可关联。
ALTER TABLE vehicle_price_records ALTER COLUMN operator_id DROP NOT NULL;

-- 创建车辆的幂等键记录（契约 Idempotency-Key，见 contracts/openapi.yaml adminCreateVehicle）。
-- 同一 key 重放返回首次创建的响应；同一 key 搭配不同请求体 -> 409 IDEMPOTENCY_KEY_CONFLICT。
CREATE TABLE idempotency_keys (
  key               TEXT PRIMARY KEY,
  request_hash      TEXT NOT NULL,
  vehicle_id        BIGINT NOT NULL REFERENCES vehicles (id),
  response_status   INTEGER NOT NULL,
  response_body     JSONB NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
