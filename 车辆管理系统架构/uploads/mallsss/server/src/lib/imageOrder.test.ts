import { describe, expect, test } from "vitest";
import { validateImageOrder } from "./imageOrder";

describe("validateImageOrder", () => {
  test("完整排列 -> 通过", () => {
    expect(validateImageOrder([1, 2, 3], [3, 1, 2])).toEqual({ ok: true });
  });

  test("数量不足 -> COUNT_MISMATCH", () => {
    expect(validateImageOrder([1, 2, 3], [1, 2])).toEqual({ ok: false, reason: "COUNT_MISMATCH" });
  });

  test("数量超出 -> COUNT_MISMATCH", () => {
    expect(validateImageOrder([1, 2], [1, 2, 3])).toEqual({ ok: false, reason: "COUNT_MISMATCH" });
  });

  test("重复 id -> DUPLICATE", () => {
    expect(validateImageOrder([1, 2, 3], [1, 1, 3])).toEqual({ ok: false, reason: "DUPLICATE" });
  });

  test("包含不属于该车的 id -> SET_MISMATCH", () => {
    expect(validateImageOrder([1, 2, 3], [1, 2, 99])).toEqual({ ok: false, reason: "SET_MISMATCH" });
  });

  test("空列表 -> 通过（该车尚无图片时不适用，但函数本身不做业务限制）", () => {
    expect(validateImageOrder([], [])).toEqual({ ok: true });
  });
});
