import { describe, expect, test } from "vitest";
import { maskVin } from "./vin";

describe("maskVin", () => {
  test("null 输入返回 null", () => {
    expect(maskVin(null)).toBeNull();
  });

  test("undefined 输入返回 null", () => {
    expect(maskVin(undefined)).toBeNull();
  });

  test("空字符串返回 null", () => {
    expect(maskVin("")).toBeNull();
  });

  test("长度大于 6 时只保留末 6 位明文", () => {
    expect(maskVin("LSVAM24H3BN123456")).toBe("***********123456");
  });

  test("长度不足 6 位时全部保留（不产生负长度掩码）", () => {
    expect(maskVin("ABC")).toBe("ABC");
  });

  test("长度恰好 6 位时全部保留、无掩码字符", () => {
    expect(maskVin("ABCDEF")).toBe("ABCDEF");
  });
});
