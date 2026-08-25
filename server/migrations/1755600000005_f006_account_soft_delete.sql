-- ADR-119：账号软删除，仅已停用账号可删，login_name 唯一约束不变（永久占用不释放）。
ALTER TABLE accounts
  ADD COLUMN deleted_at TIMESTAMPTZ;
