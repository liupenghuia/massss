import type { PoolClient } from "pg";
import type { VehicleRow } from "../models/vehicle";
import type { CreateVehicleInput } from "../lib/validation";

export async function insertVehicle(client: PoolClient, input: CreateVehicleInput): Promise<VehicleRow> {
  const result = await client.query<VehicleRow>(
    `INSERT INTO vehicles
      (brand, model, registration_year, mileage_km, color, condition_desc, energy_type,
       transfer_count, displacement_l, energy_consumption, battery_kwh, vin)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      input.brand,
      input.model,
      input.registrationYear,
      input.mileageKm,
      input.color,
      input.conditionDesc,
      input.energyType,
      input.transferCount,
      input.displacementL,
      input.energyConsumption,
      input.batteryKwh,
      input.vin,
    ]
  );
  return result.rows[0];
}

export async function getVehicleById(client: PoolClient, id: number): Promise<VehicleRow | null> {
  const result = await client.query<VehicleRow>("SELECT * FROM vehicles WHERE id = $1", [id]);
  return result.rows[0] ?? null;
}

/** 行级锁，供 PATCH / publish / unpublish 在同一事务内读后写，避免并发覆盖。 */
export async function getVehicleForUpdate(client: PoolClient, id: number): Promise<VehicleRow | null> {
  const result = await client.query<VehicleRow>("SELECT * FROM vehicles WHERE id = $1 FOR UPDATE", [id]);
  return result.rows[0] ?? null;
}

export interface VehicleFieldUpdate {
  // ADR-035：草稿阶段核心字段允许为空，编辑时同样可以保持/写入 null。
  brand: string | null;
  model: string | null;
  registrationYear: number | null;
  mileageKm: number | null;
  color: string | null;
  conditionDesc: string | null;
  energyType: "gasoline" | "ev" | "phev" | "range_extender" | null;
  transferCount: number | null;
  displacementL: number | null;
  energyConsumption: number | null;
  batteryKwh: number | null;
  vin: string | null;
}

/** 编辑核心字段，不改 status，version 自增。调用方需已持有行锁（getVehicleForUpdate）。 */
export async function updateVehicleFields(client: PoolClient, id: number, fields: VehicleFieldUpdate): Promise<VehicleRow> {
  const result = await client.query<VehicleRow>(
    `UPDATE vehicles SET
       brand = $2, model = $3, registration_year = $4, mileage_km = $5, color = $6,
       condition_desc = $7, energy_type = $8, transfer_count = $9,
       displacement_l = $10, energy_consumption = $11, battery_kwh = $12, vin = $13,
       version = version + 1, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      fields.brand,
      fields.model,
      fields.registrationYear,
      fields.mileageKm,
      fields.color,
      fields.conditionDesc,
      fields.energyType,
      fields.transferCount,
      fields.displacementL,
      fields.energyConsumption,
      fields.batteryKwh,
      fields.vin,
    ]
  );
  return result.rows[0];
}

/** 状态转换（publish/unpublish 的落地态），version 自增。调用方需已持有行锁。 */
export async function updateVehicleStatus(
  client: PoolClient,
  id: number,
  nextStatus: "published" | "unpublished"
): Promise<VehicleRow> {
  const result = await client.query<VehicleRow>(
    `UPDATE vehicles SET status = $2, version = version + 1, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, nextStatus]
  );
  return result.rows[0];
}

export interface ListVehiclesParams {
  status?: "draft" | "published" | "unpublished";
  q?: string;
  page: number;
  pageSize: number;
}

export async function listVehicles(client: PoolClient, params: ListVehiclesParams): Promise<{ items: VehicleRow[]; total: number }> {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (params.status) {
    values.push(params.status);
    conditions.push(`status = $${values.length}`);
  }
  if (params.q) {
    // ADR-037：VIN 按展示的后六位匹配，不支持完整车架号搜索。
    values.push(`%${params.q}%`);
    const likeIdx = values.length;
    values.push(`%${params.q}%`);
    const vinIdx = values.length;
    conditions.push(`(brand ILIKE $${likeIdx} OR model ILIKE $${likeIdx} OR RIGHT(vin, 6) ILIKE $${vinIdx})`);
  }
  conditions.push("trashed_at IS NULL");
  const where = `WHERE ${conditions.join(" AND ")}`;

  const totalResult = await client.query<{ count: string }>(`SELECT count(*)::text AS count FROM vehicles ${where}`, values);
  const total = Number(totalResult.rows[0].count);

  const limitIdx = values.length + 1;
  const offsetIdx = values.length + 2;
  const itemsResult = await client.query<VehicleRow>(
    `SELECT * FROM vehicles ${where} ORDER BY id DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    [...values, params.pageSize, (params.page - 1) * params.pageSize]
  );

  return { items: itemsResult.rows, total };
}

export async function trashVehicle(client: PoolClient, id: number): Promise<VehicleRow> {
  const result = await client.query<VehicleRow>(
    `UPDATE vehicles SET trashed_at = now(), version = version + 1, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return result.rows[0];
}

export async function restoreVehicle(client: PoolClient, id: number): Promise<VehicleRow> {
  const result = await client.query<VehicleRow>(
    `UPDATE vehicles SET trashed_at = NULL, status = 'draft', version = version + 1, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return result.rows[0];
}

export async function listRecycleBin(
  client: PoolClient,
  params: { keyword?: string; page: number; pageSize: number }
): Promise<{ items: VehicleRow[]; total: number }> {
  const conditions = ["trashed_at IS NOT NULL", "purged = FALSE"];
  const values: unknown[] = [];
  if (params.keyword) {
    // ADR-090：搜索字段范围与在管列表（listVehicles）保持一致，含 VIN 后六位（ADR-037）。
    values.push(`%${params.keyword}%`);
    const likeIdx = values.length;
    values.push(`%${params.keyword}%`);
    const vinIdx = values.length;
    conditions.push(`(brand ILIKE $${likeIdx} OR model ILIKE $${likeIdx} OR RIGHT(vin, 6) ILIKE $${vinIdx})`);
  }
  const where = `WHERE ${conditions.join(" AND ")}`;
  const totalResult = await client.query<{ count: string }>(`SELECT count(*)::text AS count FROM vehicles ${where}`, values);
  const total = Number(totalResult.rows[0].count);
  const itemsResult = await client.query<VehicleRow>(
    `SELECT * FROM vehicles ${where} ORDER BY trashed_at DESC, id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, params.pageSize, (params.page - 1) * params.pageSize]
  );
  return { items: itemsResult.rows, total };
}

export async function hasTrashLog(client: PoolClient, vehicleId: number): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM operation_logs WHERE vehicle_id = $1 AND action = 'trash') AS exists`,
    [vehicleId]
  );
  return result.rows[0].exists;
}

export interface PublicListParams {
  keyword?: string;
  priceMin?: number;
  priceMax?: number;
  registrationYearMin?: number;
  registrationYearMax?: number;
  mileageKmMin?: number;
  mileageKmMax?: number;
  page: number;
  pageSize: number;
}

export interface PublicListRow extends VehicleRow {
  cover_image_url: string | null;
  price_type: "amount" | "negotiable" | null;
  price_amount: string | null;
}

export async function listPublishedVehicles(
  client: PoolClient,
  params: PublicListParams
): Promise<{ items: PublicListRow[]; total: number }> {
  const conditions = ["v.status = 'published'", "v.trashed_at IS NULL", "v.purged = FALSE"];
  const values: unknown[] = [];

  if (params.keyword) {
    values.push(`%${params.keyword}%`);
    conditions.push(`(v.brand ILIKE $${values.length} OR v.model ILIKE $${values.length})`);
  }
  if (params.registrationYearMin !== undefined) {
    values.push(params.registrationYearMin);
    conditions.push(`v.registration_year >= $${values.length}`);
  }
  if (params.registrationYearMax !== undefined) {
    values.push(params.registrationYearMax);
    conditions.push(`v.registration_year <= $${values.length}`);
  }
  if (params.mileageKmMin !== undefined) {
    values.push(params.mileageKmMin);
    conditions.push(`v.mileage_km >= $${values.length}`);
  }
  if (params.mileageKmMax !== undefined) {
    values.push(params.mileageKmMax);
    conditions.push(`v.mileage_km <= $${values.length}`);
  }

  // ADR-074：库内金额为分；筛选入参为元，比较前换算为分
  const usePrice = params.priceMin !== undefined || params.priceMax !== undefined;
  if (usePrice) {
    conditions.push(`pr.to_type = 'amount' AND pr.to_amount IS NOT NULL`);
    if (params.priceMin !== undefined) {
      values.push(Math.round(params.priceMin * 100));
      conditions.push(`pr.to_amount >= $${values.length}`);
    }
    if (params.priceMax !== undefined) {
      values.push(Math.round(params.priceMax * 100));
      conditions.push(`pr.to_amount <= $${values.length}`);
    }
  }

  const from = `
    FROM vehicles v
    LEFT JOIN LATERAL (
      SELECT url FROM vehicle_images WHERE vehicle_id = v.id ORDER BY sort_order ASC, id ASC LIMIT 1
    ) img ON true
    LEFT JOIN LATERAL (
      SELECT to_type, to_amount FROM vehicle_price_records WHERE vehicle_id = v.id
      ORDER BY id DESC LIMIT 1
    ) pr ON true
  `;
  const where = `WHERE ${conditions.join(" AND ")}`;
  const totalResult = await client.query<{ count: string }>(`SELECT count(*)::text AS count ${from} ${where}`, values);
  const total = Number(totalResult.rows[0].count);
  const itemsResult = await client.query<PublicListRow>(
    `SELECT v.*, img.url AS cover_image_url, pr.to_type AS price_type, pr.to_amount AS price_amount
     ${from} ${where}
     ORDER BY v.id DESC
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, params.pageSize, (params.page - 1) * params.pageSize]
  );
  return { items: itemsResult.rows, total };
}

/** 到期候选（不加行锁）；真正清除时逐条 FOR UPDATE 二次校验（ADR-086）。 */
export async function listDueForPurge(client: PoolClient): Promise<VehicleRow[]> {
  const result = await client.query<VehicleRow>(
    `SELECT * FROM vehicles
     WHERE trashed_at IS NOT NULL AND purged = FALSE
       AND trashed_at <= now() - interval '720 hours'
     ORDER BY id ASC`
  );
  return result.rows;
}

/**
 * ADR-086：仅当仍在回收站且未清除时置 purged=true。
 * @returns 是否实际标记成功（已被恢复则 false，跳过不报错）
 */
export async function markPurgedIfStillTrashed(client: PoolClient, id: number): Promise<boolean> {
  const result = await client.query(
    `UPDATE vehicles SET purged = TRUE, updated_at = now()
     WHERE id = $1 AND trashed_at IS NOT NULL AND purged = FALSE
     RETURNING id`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}
