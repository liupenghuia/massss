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
  brand: string;
  model: string;
  registrationYear: number;
  mileageKm: number;
  color: string;
  conditionDesc: string;
  energyType: "gasoline" | "ev" | "phev" | "range_extender";
  transferCount: number;
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
    values.push(`%${params.q}%`);
    const idx = values.length;
    conditions.push(`(brand ILIKE $${idx} OR model ILIKE $${idx})`);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

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
