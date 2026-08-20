-- 初始表结构，覆盖 F-001/003/004/005/006 已定稿的数据模型。
-- 依据：contracts/openapi.yaml、docs/product/features/*/spec.md。
-- F-005 的 trashedAt/purged 本应是后续迁移，但契约已定稿，这里直接建在 vehicles 里，
-- 避免脚手架阶段先建错表再补迁移。

CREATE TABLE vehicles (
  id                  BIGSERIAL PRIMARY KEY,
  status              TEXT NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft', 'published', 'unpublished')),
  version             BIGINT NOT NULL DEFAULT 1,

  brand               TEXT NOT NULL,
  model               TEXT NOT NULL,
  registration_year   INTEGER NOT NULL,
  mileage_km          INTEGER NOT NULL CHECK (mileage_km >= 0),
  color               TEXT NOT NULL,
  condition_desc      TEXT NOT NULL,
  energy_type         TEXT NOT NULL
                       CHECK (energy_type IN ('gasoline', 'ev', 'phev', 'range_extender')),
  transfer_count      INTEGER NOT NULL CHECK (transfer_count >= 0),

  -- 与能源类型联动的选填字段
  displacement_l      NUMERIC(6, 2),
  energy_consumption  NUMERIC(6, 2),
  battery_kwh         NUMERIC(6, 2),

  -- 后台专用，不要求全局唯一（spec F-001）
  vin                 TEXT,

  -- F-005 回收站：正交字段，不并入 status
  trashed_at          TIMESTAMPTZ,
  purged              BOOLEAN NOT NULL DEFAULT FALSE,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicles_status ON vehicles (status);
CREATE INDEX idx_vehicles_trashed_at ON vehicles (trashed_at);

CREATE TABLE vehicle_images (
  id            BIGSERIAL PRIMARY KEY,
  vehicle_id    BIGINT NOT NULL REFERENCES vehicles (id),
  object_key    TEXT NOT NULL UNIQUE,
  url           TEXT NOT NULL,
  caption       TEXT NOT NULL DEFAULT '',
  content_type  TEXT NOT NULL
                CHECK (content_type IN ('image/jpeg', 'image/png', 'image/webp')),
  byte_size     BIGINT NOT NULL CHECK (byte_size > 0),
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicle_images_vehicle_id ON vehicle_images (vehicle_id, sort_order);

CREATE TABLE vehicle_reports (
  id            BIGSERIAL PRIMARY KEY,
  vehicle_id    BIGINT NOT NULL REFERENCES vehicles (id),
  object_key    TEXT NOT NULL UNIQUE,
  url           TEXT NOT NULL,
  content_type  TEXT NOT NULL
                CHECK (content_type IN ('application/pdf', 'image/png', 'image/jpeg')),
  byte_size     BIGINT NOT NULL CHECK (byte_size > 0),
  uploaded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicle_reports_vehicle_id ON vehicle_reports (vehicle_id, uploaded_at DESC);

-- append-only，不建当前价格快照表（ADR-015）
CREATE TABLE vehicle_price_records (
  id                BIGSERIAL PRIMARY KEY,
  vehicle_id        BIGINT NOT NULL REFERENCES vehicles (id),

  from_type         TEXT NOT NULL CHECK (from_type IN ('amount', 'negotiable', 'unset')),
  from_amount       NUMERIC(12, 2),

  to_type           TEXT NOT NULL CHECK (to_type IN ('amount', 'negotiable')),
  to_amount         NUMERIC(12, 2),

  operator_id       BIGINT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicle_price_records_vehicle_id ON vehicle_price_records (vehicle_id, created_at DESC);

CREATE TABLE accounts (
  id                    BIGSERIAL PRIMARY KEY,
  login_name            TEXT NOT NULL UNIQUE,
  password_hash         TEXT NOT NULL,
  role                  TEXT NOT NULL CHECK (role IN ('admin', 'super_admin')),
  enabled               BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password  BOOLEAN NOT NULL DEFAULT TRUE,
  failed_login_count    INTEGER NOT NULL DEFAULT 0,
  locked_until          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 基础操作日志（F-001 ADR-006 口径），只落库不做查看页
CREATE TABLE operation_logs (
  id            BIGSERIAL PRIMARY KEY,
  operator_id   BIGINT NOT NULL REFERENCES accounts (id),
  action        TEXT NOT NULL,
  vehicle_id    BIGINT REFERENCES vehicles (id),
  detail        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_operation_logs_vehicle_id ON operation_logs (vehicle_id);
