import { describe, expect, test } from "vitest";
import { evaluatePublishPrecondition } from "./publishPrecondition";

describe("evaluatePublishPrecondition", () => {
  test("图片数 >= 4 且已填价 -> 通过", () => {
    expect(evaluatePublishPrecondition(4, true)).toEqual({ ok: true, missing: [] });
  });

  test("图片数 > 4 且已填价 -> 通过", () => {
    expect(evaluatePublishPrecondition(10, true)).toEqual({ ok: true, missing: [] });
  });

  test("图片数不足 -> missing 含 images", () => {
    expect(evaluatePublishPrecondition(2, true)).toEqual({ ok: false, missing: ["images"] });
  });

  test("未填价 -> missing 含 price", () => {
    expect(evaluatePublishPrecondition(5, false)).toEqual({ ok: false, missing: ["price"] });
  });

  test("图片和价格都不满足 -> missing 同时含 images 与 price", () => {
    expect(evaluatePublishPrecondition(0, false)).toEqual({ ok: false, missing: ["images", "price"] });
  });

  test("恰好 3 张图片仍不满足（边界值）", () => {
    expect(evaluatePublishPrecondition(3, true).ok).toBe(false);
  });
});
