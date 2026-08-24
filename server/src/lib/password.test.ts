import { describe, expect, it } from "vitest";
import { generateInitialPassword, passwordMeetsPolicy } from "./password";

describe("passwordMeetsPolicy", () => {
  it("拒绝过短或缺少字母/数字", () => {
    expect(passwordMeetsPolicy("abc")).toBe(false);
    expect(passwordMeetsPolicy("12345678")).toBe(false);
    expect(passwordMeetsPolicy("abcdefgh")).toBe(false);
  });

  it("接受至少 8 位且含字母与数字", () => {
    expect(passwordMeetsPolicy("ChangeMe123")).toBe(true);
  });

  it("ADR-105：超过 72 字节拒绝", () => {
    expect(passwordMeetsPolicy(`Ab1${"x".repeat(70)}`)).toBe(false);
  });

  it("ADR-105：含控制字符拒绝", () => {
    expect(passwordMeetsPolicy("ChangeMe1\n")).toBe(false);
  });

  it("ADR-105：72 字节边界（ASCII，字节数=字符数）可接受", () => {
    const p = `Ab1${"x".repeat(69)}`;
    expect(Buffer.byteLength(p, "utf8")).toBe(72);
    expect(passwordMeetsPolicy(p)).toBe(true);
  });

  it("ADR-111：多字节字符即使字符数≤72，字节数超限也拒绝（避免 bcrypt 静默截断）", () => {
    // 30 个汉字，UTF-8 每字 3 字节 = 90 字节，字符数仅 30（远小于 72）
    const p = "密".repeat(30);
    expect(p.length).toBeLessThanOrEqual(72);
    expect(Buffer.byteLength(p, "utf8")).toBeGreaterThan(72);
    expect(passwordMeetsPolicy(p)).toBe(false);
  });

  it("ADR-111：多字节字符按字节数在 72 以内可接受", () => {
    // 24 个汉字 = 72 字节，但不含字母数字，需拼接字母数字满足既有规则再验证字节边界单独用例
    const p = "Ab1" + "密".repeat(23); // 3 + 23*3 = 72 字节
    expect(Buffer.byteLength(p, "utf8")).toBe(72);
    expect(passwordMeetsPolicy(p)).toBe(true);
  });
});

describe("generateInitialPassword", () => {
  it("长度为 12 且满足策略", () => {
    const p = generateInitialPassword();
    expect(p).toHaveLength(12);
    expect(passwordMeetsPolicy(p)).toBe(true);
  });
});
