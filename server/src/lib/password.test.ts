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

  it("ADR-105：超过 72 字符拒绝", () => {
    expect(passwordMeetsPolicy(`Ab1${"x".repeat(70)}`)).toBe(false);
  });

  it("ADR-105：含控制字符拒绝", () => {
    expect(passwordMeetsPolicy("ChangeMe1\n")).toBe(false);
  });

  it("ADR-105：72 字符边界可接受", () => {
    const p = `Ab1${"x".repeat(69)}`;
    expect(p).toHaveLength(72);
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
