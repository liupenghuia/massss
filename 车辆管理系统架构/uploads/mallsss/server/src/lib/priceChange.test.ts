import { describe, expect, test } from "vitest";
import { planPriceChange } from "./priceChange";

describe("planPriceChange", () => {
  test("从未设过价 -> from 为 unset，一定写记录", () => {
    const plan = planPriceChange(null, { type: "amount", amount: 100 });
    expect(plan).toEqual({
      unchanged: false,
      from: { type: "unset", amount: null },
      to: { type: "amount", amount: 100 },
    });
  });

  test("金额相同 -> unchanged=true，不写记录", () => {
    const current = { type: "amount" as const, amount: 128000 };
    const plan = planPriceChange(current, { type: "amount", amount: 128000 });
    expect(plan.unchanged).toBe(true);
  });

  test("金额不同 -> unchanged=false", () => {
    const current = { type: "amount" as const, amount: 128000 };
    const plan = planPriceChange(current, { type: "amount", amount: 129000 });
    expect(plan.unchanged).toBe(false);
    expect(plan.from).toEqual(current);
  });

  test("面谈 -> 数值 算变动", () => {
    const current = { type: "negotiable" as const, amount: null };
    const plan = planPriceChange(current, { type: "amount", amount: 50000 });
    expect(plan.unchanged).toBe(false);
  });

  test("数值 -> 面谈 算变动", () => {
    const current = { type: "amount" as const, amount: 50000 };
    const plan = planPriceChange(current, { type: "negotiable", amount: null });
    expect(plan.unchanged).toBe(false);
  });

  test("面谈 -> 面谈 不算变动", () => {
    const current = { type: "negotiable" as const, amount: null };
    const plan = planPriceChange(current, { type: "negotiable", amount: null });
    expect(plan.unchanged).toBe(true);
  });
});
