import type { components } from "../generated/openapi-types";
import type { PriceRecordRow } from "../db/priceRepo";
import { fenToYuan } from "../lib/priceChange";

type PriceValue = components["schemas"]["PriceValue"];
type PriceFrom = components["schemas"]["PriceFrom"];
type AdminPriceRecord = components["schemas"]["AdminPriceRecord"];
type PublicPriceRecord = components["schemas"]["PublicPriceRecord"];

function toFrom(row: PriceRecordRow): PriceFrom {
  if (row.from_type === "unset") return { type: "unset", amount: null };
  if (row.from_type === "amount") return { type: "amount", amount: fenToYuan(Number(row.from_amount)) };
  return { type: "negotiable", amount: null };
}

function toValue(row: PriceRecordRow): PriceValue {
  if (row.to_type === "amount") return { type: "amount", amount: fenToYuan(Number(row.to_amount)) };
  return { type: "negotiable", amount: null };
}

export function toAdminPriceRecord(row: PriceRecordRow): AdminPriceRecord {
  // ADR-076：展示登录账号名；无关联账号时退回 id 字符串或 unknown
  const operatorId =
    row.operator_login_name && row.operator_login_name.length > 0
      ? row.operator_login_name
      : row.operator_id === null
        ? "unknown"
        : String(row.operator_id);

  return {
    id: Number(row.id),
    vehicleId: Number(row.vehicle_id),
    from: toFrom(row),
    to: toValue(row),
    createdAt: row.created_at.toISOString(),
    operatorId,
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
