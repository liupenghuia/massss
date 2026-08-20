import type { PoolClient } from "pg";
import type { VehicleRow } from "../models/vehicle";
import { getVehicleById, getVehicleForUpdate } from "../db/vehicleRepo";
import { notFound, vehicleInRecycleBin } from "../lib/errors";

/** 管理端只读接口：车辆必须存在（含草稿），不检查回收站态。 */
export async function requireVehicle(client: PoolClient, id: number): Promise<VehicleRow> {
  const row = await getVehicleById(client, id);
  if (!row) throw notFound();
  return row;
}

/**
 * 管理端写接口：车辆必须存在，且不在回收站中（F-005，trashedAt 不为空一律拒绝）。
 * 需要行锁时传 forUpdate=true（调用方需已 BEGIN）。
 */
export async function requireVehicleForWrite(client: PoolClient, id: number, forUpdate = false): Promise<VehicleRow> {
  const row = forUpdate ? await getVehicleForUpdate(client, id) : await getVehicleById(client, id);
  if (!row) throw notFound();
  if (row.trashed_at !== null) throw vehicleInRecycleBin();
  return row;
}

/** 公开端：车不可见（不存在或非 published）一律 404 VEHICLE_NOT_FOUND，不泄露真实状态。 */
export async function requirePublishedVehicle(client: PoolClient, id: number): Promise<VehicleRow> {
  const row = await getVehicleById(client, id);
  if (!row || row.status !== "published") throw notFound();
  return row;
}
