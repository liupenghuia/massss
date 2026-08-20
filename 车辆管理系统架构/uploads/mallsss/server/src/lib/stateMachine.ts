export type VehicleStatus = "draft" | "published" | "unpublished";

export type TransitionResult =
  | { kind: "apply"; nextStatus: VehicleStatus }
  | { kind: "idempotent" }
  | { kind: "illegal" };

/**
 * ADR-004 状态机：草稿/已下架 -> 已上架，重复调用视为幂等，无非法转换。
 */
export function planPublish(current: VehicleStatus): TransitionResult {
  if (current === "published") return { kind: "idempotent" };
  return { kind: "apply", nextStatus: "published" };
}

/**
 * ADR-004 状态机：已上架 -> 已下架；对草稿调用非法；重复调用视为幂等。
 */
export function planUnpublish(current: VehicleStatus): TransitionResult {
  if (current === "unpublished") return { kind: "idempotent" };
  if (current === "draft") return { kind: "illegal" };
  return { kind: "apply", nextStatus: "unpublished" };
}
