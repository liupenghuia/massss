import type { components } from "../generated/openapi-types";
import type { PriceRecordRow } from "../db/priceRepo";

type PriceValue = components["schemas"]["PriceValue"];
type PriceFrom = components["schemas"]["PriceFrom"];
type AdminPriceRecord = components["schemas"]["AdminPriceRecord"];
type PublicPriceRecord = components["schemas"]["PublicPriceRecord"];

function toFrom(row: PriceRecordRow): PriceFrom {
  if (row.from_type === "unset") return { type: "unset", amount: null };
  if (row.from_type === "amount") return { type: "amount", amount: Number(row.from_amount) };
  return { type: "negotiable", amount: null };
}

function toValue(row: PriceRecordRow): PriceValue {
  if (row.to_type === "amount") return { type: "amount", amount: Number(row.to_amount) };
  return { type: "negotiable", amount: null };
}

export function toAdminPriceRecord(row: PriceRecordRow): AdminPriceRecord {
  return {
    id: Number(row.id),
    vehicleId: Number(row.vehicle_id),
    from: toFrom(row),
    to: toValue(row),
    createdAt: row.created_at.toISOString(),
    // 契约要求 operatorId 非空字符串；F-006 登录未落地时 operator_id 为 null，
    // 用固定占位符表示"未知操作人"，避免违反 minLength:1（见任务总结中的假设说明）。
    operatorId: row.operator_id === null ? "unknown" : String(row.operator_id),
  };
}

export function toPublicPriceRecord(row: PriceRecordRow): PublicPriceRecord {
  return {
    id: Number(row.id),
    from: toFrom(row),
    to: toValue(row),
    createdAt: row.created_at.toISOString(),
  };
}
