import type { PoolClient } from "pg";
import type { components } from "../generated/openapi-types";
import { fenToYuan, yuanToFen, type PriceValue } from "../lib/priceChange";

/**
 * F-004 内部方法 isPriceFilled（契约 internal.yaml）。
 * 只要该车存在至少一条价格记录即视为已填写（面谈也算）。
 * 车辆不存在 / 查询失败一律向上抛错，不得返回 false。
 */
export async function isPriceFilled(client: PoolClient, vehicleId: number): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    "SELECT EXISTS(SELECT 1 FROM vehicle_price_records WHERE vehicle_id = $1) AS exists",
    [vehicleId]
  );
  return result.rows[0].exists;
}

/** 创建车辆时的可选初始价格记录（AdminVehicleCreateRequest.initialPrice）。金额按分入库（ADR-074）。 */
export async function insertInitialPriceRecord(
  client: PoolClient,
  vehicleId: number,
  price: PriceValue,
  operatorId: number | null
): Promise<void> {
  const toAmountFen = price.type === "amount" ? yuanToFen(price.amount) : null;
  await client.query(
    `INSERT INTO vehicle_price_records (vehicle_id, from_type, from_amount, to_type, to_amount, operator_id)
     VALUES ($1, 'unset', NULL, $2, $3, $4)`,
    [vehicleId, price.type, toAmountFen, operatorId]
  );
}

export interface PriceRecordRow {
  id: string;
  vehicle_id: string;
  from_type: "amount" | "negotiable" | "unset";
  /** 分；null 表示无金额（面谈 / unset） */
  from_amount: string | null;
  to_type: "amount" | "negotiable";
  to_amount: string | null;
  operator_id: string | null;
  /** ADR-076：JOIN accounts 得到的登录名；无账号时为 null */
  operator_login_name?: string | null;
  created_at: Date;
}

/** 当前价 = id 最大的一条的 to（ADR-073）；从未设过价返回 null。接口层为元。 */
export async function getCurrentPrice(client: PoolClient, vehicleId: number): Promise<PriceValue | null> {
  const result = await client.query<PriceRecordRow>(
    "SELECT * FROM vehicle_price_records WHERE vehicle_id = $1 ORDER BY id DESC LIMIT 1",
    [vehicleId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return toPriceValueYuan(row.to_type, row.to_amount);
}

export interface InsertPriceRecordParams {
  vehicleId: number;
  fromType: "amount" | "negotiable" | "unset";
  /** 元；入库前转分 */
  fromAmount: number | null;
  toType: "amount" | "negotiable";
  toAmount: number | null;
  operatorId: number | null;
}

export async function insertPriceRecord(client: PoolClient, params: InsertPriceRecordParams): Promise<PriceRecordRow> {
  const fromFen = params.fromType === "amount" && params.fromAmount != null ? yuanToFen(params.fromAmount) : null;
  const toFen = params.toType === "amount" && params.toAmount != null ? yuanToFen(params.toAmount) : null;
  const result = await client.query<PriceRecordRow>(
    `INSERT INTO vehicle_price_records (vehicle_id, from_type, from_amount, to_type, to_amount, operator_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [params.vehicleId, params.fromType, fromFen, params.toType, toFen, params.operatorId]
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

  // ADR-073：按 id 新到旧；ADR-076：带出登录名
  const itemsResult = await client.query<PriceRecordRow>(
    `SELECT r.*, a.login_name AS operator_login_name
     FROM vehicle_price_records r
     LEFT JOIN accounts a ON a.id = r.operator_id
     WHERE r.vehicle_id = $1
     ORDER BY r.id DESC
     LIMIT $2 OFFSET $3`,
    [vehicleId, pageSize, (page - 1) * pageSize]
  );

  return { items: itemsResult.rows, total };
}

/** DB 分 → 接口元 */
export function toPriceValueYuan(type: "amount" | "negotiable", amountFen: string | null): PriceValue {
  if (type === "amount") return { type: "amount", amount: fenToYuan(Number(amountFen)) };
  return { type: "negotiable", amount: null };
}
