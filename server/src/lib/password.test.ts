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
});

describe("generateInitialPassword", () => {
  it("长度为 12 且满足策略", () => {
    const p = generateInitialPassword();
    expect(p).toHaveLength(12);
    expect(passwordMeetsPolicy(p)).toBe(true);
  });
});
