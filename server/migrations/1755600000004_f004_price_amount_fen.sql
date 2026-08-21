-- ADR-074：金额以最小货币单位（分）整数存储；接口层仍为元。
-- ADR-073：当前价按自增 id 取最大，索引按 (vehicle_id, id DESC)。

ALTER TABLE vehicle_price_records
  ALTER COLUMN from_amount TYPE BIGINT USING (
    CASE WHEN from_amount IS NULL THEN NULL ELSE ROUND(from_amount * 100)::bigint END
  ),
  ALTER COLUMN to_amount TYPE BIGINT USING (
    CASE WHEN to_amount IS NULL THEN NULL ELSE ROUND(to_amount * 100)::bigint END
  );

DROP INDEX IF EXISTS idx_vehicle_price_records_vehicle_id;
CREATE INDEX idx_vehicle_price_records_vehicle_id_id
  ON vehicle_price_records (vehicle_id, id DESC);
