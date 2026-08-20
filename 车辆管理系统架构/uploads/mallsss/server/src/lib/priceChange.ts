import type { components } from "../generated/openapi-types";

export type PriceValue = components["schemas"]["PriceValue"];
export type PriceFrom = components["schemas"]["PriceFrom"];

export interface PriceChangePlan {
  /** true = 与当前价完全相同，不插行（ADR-015）。 */
  unchanged: boolean;
  from: PriceFrom;
  to: PriceValue;
}

/**
 * ADR-015 价格变动判定：
 * - 从未设过价（current=null）：from = unset，一定写记录（首次设价）。
 * - type+amount 都相同：unchanged=true，不写记录。
 * - 面谈 <-> 数值互切，或数值不同：写记录。
 */
export function planPriceChange(current: PriceValue | null, next: PriceValue): PriceChangePlan {
  if (current === null) {
    return { unchanged: false, from: { type: "unset", amount: null }, to: next };
  }

  const unchanged = current.type === next.type && current.amount === next.amount;
  return {
    unchanged,
    from: current,
    to: next,
  };
}
