import type { components } from "../generated/openapi-types";

export type PriceValue = components["schemas"]["PriceValue"];
export type PriceFrom = components["schemas"]["PriceFrom"];

export interface PriceChangePlan {
  /** true = 与当前价完全相同，不插行（ADR-015）。 */
  unchanged: boolean;
  from: PriceFrom;
  to: PriceValue;
}

/** ADR-074：元 → 分（四舍五入到整数分）。 */
export function yuanToFen(yuan: number): number {
  return Math.round(yuan * 100);
}

/** ADR-074：分 → 元（接口输出）。 */
export function fenToYuan(fen: number): number {
  return fen / 100;
}

/** 金额等价：比较整数分，消除 10.1 与 10.10 等表示差异（ADR-074）。 */
export function sameYuanAmount(a: number | null, b: number | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return yuanToFen(a) === yuanToFen(b);
}

/**
 * ADR-015 价格变动判定：
 * - 从未设过价（current=null）：from = unset，一定写记录（首次设价）。
 * - type+amount 都相同（金额按分比较）：unchanged=true，不写记录。
 * - 面谈 <-> 数值互切，或数值不同：写记录。
 */
export function planPriceChange(current: PriceValue | null, next: PriceValue): PriceChangePlan {
  if (current === null) {
    return { unchanged: false, from: { type: "unset", amount: null }, to: next };
  }

  const unchanged = current.type === next.type && sameYuanAmount(current.amount, next.amount);
  return {
    unchanged,
    from: current,
    to: next,
  };
}
