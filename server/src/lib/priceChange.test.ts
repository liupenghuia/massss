import { describe, expect, test } from "vitest";
import { planPriceChange, sameYuanAmount, yuanToFen } from "./priceChange";

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

  test("10.1 与 10.10 按分等价，不算变动（ADR-074）", () => {
    const current = { type: "amount" as const, amount: 10.1 };
    const plan = planPriceChange(current, { type: "amount", amount: 10.1 });
    expect(sameYuanAmount(10.1, 10.1)).toBe(true);
    expect(yuanToFen(10.1)).toBe(1010);
    expect(yuanToFen(10.1)).toBe(yuanToFen(10.1));
    expect(plan.unchanged).toBe(true);
  });

  test("浮点表示差异按分归一后等价", () => {
    // 10.10 字面量与 10.1 在 JS 中本就相等；用除法构造分后还原
    const a = 1010 / 100;
    const b = 10.1;
    expect(sameYuanAmount(a, b)).toBe(true);
    expect(planPriceChange({ type: "amount", amount: a }, { type: "amount", amount: b }).unchanged).toBe(true);
  });
});
