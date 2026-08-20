import type { PriceLike } from "../../types";

function formatPrice(value: PriceLike): string {
  if (!value || value.type === "negotiable" || value.type === "unset" || value.amount == null) {
    if (value && value.type === "unset") return "未设置";
    return "面议";
  }
  return `${(value.amount / 10000).toFixed(2)} 万`;
}

export function Price({ value, size = "md" }: { value: PriceLike; size?: "sm" | "md" | "lg" }) {
  const cls = size === "lg" ? "price price-lg" : size === "sm" ? "price price-sm" : "price price-md";
  return <span className={cls}>{formatPrice(value)}</span>;
}
