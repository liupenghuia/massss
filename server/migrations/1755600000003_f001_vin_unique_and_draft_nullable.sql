-- F-001 第二轮评审裁决落地。

-- ADR-036：VIN 保存时查重，重复拒绝。已清除（purged=true）的车辆同样不释放 VIN，
-- 所以不加 purged 排除条件，只排除 NULL（VIN 本身选填）。
CREATE UNIQUE INDEX vehicles_vin_unique_idx ON vehicles (vin) WHERE vin IS NOT NULL;

-- ADR-035：草稿保存不强制核心字段非空，仅发布时校验（见 publishPrecondition 扩展）。
ALTER TABLE vehicles ALTER COLUMN brand DROP NOT NULL;
ALTER TABLE vehicles ALTER COLUMN model DROP NOT NULL;
ALTER TABLE vehicles ALTER COLUMN registration_year DROP NOT NULL;
ALTER TABLE vehicles ALTER COLUMN mileage_km DROP NOT NULL;
ALTER TABLE vehicles ALTER COLUMN color DROP NOT NULL;
ALTER TABLE vehicles ALTER COLUMN condition_desc DROP NOT NULL;
ALTER TABLE vehicles ALTER COLUMN energy_type DROP NOT NULL;
ALTER TABLE vehicles ALTER COLUMN transfer_count DROP NOT NULL;
