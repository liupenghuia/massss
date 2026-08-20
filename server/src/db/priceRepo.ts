import type { PoolClient } from "pg";
import type { components } from "../generated/openapi-types";

type PriceValue = components["schemas"]["PriceValue"];

/**
 * F-004 内部方法 isPriceFilled（契约 internal.yaml）。本期 F-004 管理端接口未实现，
 * 但 vehicle_price_records 表已建好：只要该车存在至少一条价格记录即视为已填写（面谈也算）。
 * 车辆不存在 / 查询失败一律向上抛错，不得返回 false。
 */
export async function isPriceFilled(client: PoolClient, vehicleId: number): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    "SELECT EXISTS(SELECT 1 FROM vehicle_price_records WHERE vehicle_id = $1) AS exists",
    [vehicleId]
  );
  return result.rows[0].exists;
}

/** 创建车辆时的可选初始价格记录（AdminVehicleCreateRequest.initialPrice）。 */
export async function insertInitialPriceRecord(
  client: PoolClient,
  vehicleId: number,
  price: PriceValue,
  operatorId: number | null
): Promise<void> {
  await client.query(
    `INSERT INTO vehicle_price_records (vehicle_id, from_type, from_amount, to_type, to_amount, operator_id)
     VALUES ($1, 'unset', NULL, $2, $3, $4)`,
    [vehicleId, price.type, price.amount, operatorId]
  );
}

export interface PriceRecordRow {
  id: string;
  vehicle_id: string;
  from_type: "amount" | "negotiable" | "unset";
  from_amount: string | null;
  to_type: "amount" | "negotiable";
  to_amount: string | null;
  operator_id: string | null;
  created_at: Date;
}

/** 当前价 = 最新一条记录的 to（ADR-015）；从未设过价返回 null。 */
export async function getCurrentPrice(client: PoolClient, vehicleId: number): Promise<PriceValue | null> {
  const result = await client.query<PriceRecordRow>(
    "SELECT * FROM vehicle_price_records WHERE vehicle_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1",
    [vehicleId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return toPriceValue(row.to_type, row.to_amount);
}

export interface InsertPriceRecordParams {
  vehicleId: number;
  fromType: "amount" | "negotiable" | "unset";
  fromAmount: number | null;
  toType: "amount" | "negotiable";
  toAmount: number | null;
  operatorId: number | null;
}

export async function insertPriceRecord(client: PoolClient, params: InsertPriceRecordParams): Promise<PriceRecordRow> {
  const result = await client.query<PriceRecordRow>(
    `INSERT INTO vehicle_price_records (vehicle_id, from_type, from_amount, to_type, to_amount, operator_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [params.vehicleId, params.fromType, params.fromAmount, params.toType, params.toAmount, params.operatorId]
  );
  return result.rows[0];
}

export async function listPriceRecords(
  client: PoolClient,
  vehicleId: number,
  page: number,
  pageSize: number
): Promise<{ items: PriceRecordRow[]; total: number }> {
  const totalResult = await client.query<{ count: string }>(
    "SELECT count(*)::text AS count FROM vehicle_price_records WHERE vehicle_id = $1",
    [vehicleId]
  );
  const total = Number(totalResult.rows[0].count);

  const itemsResult = await client.query<PriceRecordRow>(
    `SELECT * FROM vehicle_price_records WHERE vehicle_id = $1
     ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $3`,
    [vehicleId, pageSize, (page - 1) * pageSize]
  );

  return { items: itemsResult.rows, total };
}

function toPriceValue(type: "amount" | "negotiable", amount: string | null): PriceValue {
  if (type === "amount") return { type: "amount", amount: Number(amount) };
  return { type: "negotiable", amount: null };
}
