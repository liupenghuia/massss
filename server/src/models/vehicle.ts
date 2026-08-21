import type { components } from "../generated/openapi-types";
import { maskVin } from "../lib/vin";

export type AdminVehicle = components["schemas"]["AdminVehicle"];
export type PublicVehicle = components["schemas"]["PublicVehicle"];
export type PublicVehicleSummary = components["schemas"]["PublicVehicleSummary"];
export type AdminRecycleBinItem = components["schemas"]["AdminRecycleBinItem"];

const PURGE_HOURS = 720;

export function purgeDueAt(trashedAt: Date): string {
  return new Date(trashedAt.getTime() + PURGE_HOURS * 60 * 60 * 1000).toISOString();
}

/** vehicles 表行（snake_case，pg 默认列名）。 */
export interface VehicleRow {
  id: string; // BIGINT 由 pg 驱动以字符串返回
  status: "draft" | "published" | "unpublished";
  version: string;
  // ADR-035：草稿阶段允许核心字段缺失，发布时才强制校验（见 publishPrecondition）。
  brand: string | null;
  model: string | null;
  registration_year: number | null;
  mileage_km: number | null;
  color: string | null;
  condition_desc: string | null;
  energy_type: "gasoline" | "ev" | "phev" | "range_extender" | null;
  transfer_count: number | null;
  displacement_l: string | null; // NUMERIC 由 pg 驱动以字符串返回
  energy_consumption: string | null;
  battery_kwh: string | null;
  vin: string | null;
  trashed_at: Date | null;
  purged: boolean;
  created_at: Date;
  updated_at: Date;
}

// ADR-035：草稿阶段核心字段允许为 null，AdminVehicle 契约已同步放开为可空（RFC 2026-08-21）。
export function toAdminVehicle(row: VehicleRow): AdminVehicle {
  return {
    id: Number(row.id),
    status: row.status,
    trashedAt: row.trashed_at ? row.trashed_at.toISOString() : null,
    purged: row.purged,
    version: Number(row.version),
    brand: row.brand,
    model: row.model,
    registrationYear: row.registration_year,
    mileageKm: row.mileage_km,
    color: row.color,
    conditionDesc: row.condition_desc,
    energyType: row.energy_type,
    transferCount: row.transfer_count,
    displacementL: row.displacement_l === null ? null : Number(row.displacement_l),
    energyConsumption: row.energy_consumption === null ? null : Number(row.energy_consumption),
    batteryKwh: row.battery_kwh === null ? null : Number(row.battery_kwh),
    vinMasked: maskVin(row.vin),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function toPublicVehicle(row: VehicleRow): PublicVehicle {
  // 只有已上架车辆才会走到这里，发布前置校验已保证核心字段非空，此处断言安全。
  return {
    id: Number(row.id),
    status: "published",
    brand: row.brand as string,
    model: row.model as string,
    registrationYear: row.registration_year as number,
    mileageKm: row.mileage_km as number,
    color: row.color as string,
    conditionDesc: row.condition_desc as string,
    energyType: row.energy_type as NonNullable<VehicleRow["energy_type"]>,
    transferCount: row.transfer_count as number,
    displacementL: row.displacement_l === null ? null : Number(row.displacement_l),
    energyConsumption: row.energy_consumption === null ? null : Number(row.energy_consumption),
    batteryKwh: row.battery_kwh === null ? null : Number(row.battery_kwh),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

// ADR-035：回收站车辆可能是草稿态被删，核心字段允许为 null，
// AdminRecycleBinItem 契约已同步放开为可空（RFC 2026-08-21）。
export function toRecycleBinItem(row: VehicleRow): AdminRecycleBinItem {
  if (!row.trashed_at) {
    throw new Error("toRecycleBinItem 要求 trashed_at 非空");
  }
  return {
    id: Number(row.id),
    version: Number(row.version),
    originalStatus: row.status,
    trashedAt: row.trashed_at.toISOString(),
    purgeDueAt: purgeDueAt(row.trashed_at),
    purged: row.purged,
    brand: row.brand,
    model: row.model,
    registrationYear: row.registration_year,
    mileageKm: row.mileage_km,
    color: row.color,
    conditionDesc: row.condition_desc,
    energyType: row.energy_type,
    transferCount: row.transfer_count,
    displacementL: row.displacement_l === null ? null : Number(row.displacement_l),
    energyConsumption: row.energy_consumption === null ? null : Number(row.energy_consumption),
    batteryKwh: row.battery_kwh === null ? null : Number(row.battery_kwh),
    vinMasked: maskVin(row.vin),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
