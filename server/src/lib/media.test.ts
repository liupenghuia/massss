import { describe, expect, test } from "vitest";
import {
  buildImageObjectKey,
  classifyObjectKeyConfirm,
  objectKeyBelongsToVehicleImages,
  resolveCaption,
  isCaptionTooLong,
  isImageContentType,
  isReportContentType,
  CAPTION_MAX_LENGTH,
} from "./media";

describe("resolveCaption", () => {
  test("省略 caption 默认空字符串", () => {
    expect(resolveCaption(undefined)).toBe("");
  });

  test("显式空字符串保留为空字符串", () => {
    expect(resolveCaption("")).toBe("");
  });

  test("非空字符串原样返回", () => {
    expect(resolveCaption("外观完好")).toBe("外观完好");
  });

  test("非字符串类型抛错", () => {
    expect(() => resolveCaption(123)).toThrow(TypeError);
  });
});

describe("isCaptionTooLong (ADR-057)", () => {
  test("等于上限不算超长", () => {
    expect(isCaptionTooLong("x".repeat(CAPTION_MAX_LENGTH))).toBe(false);
  });

  test("超过上限判定超长", () => {
    expect(isCaptionTooLong("x".repeat(CAPTION_MAX_LENGTH + 1))).toBe(true);
  });
});

describe("buildImageObjectKey / objectKeyBelongsToVehicleImages", () => {
  test("生成的 objectKey 带车辆 id 前缀，且校验通过", () => {
    const key = buildImageObjectKey(42, "image/png");
    expect(key.startsWith("vehicles/42/images/")).toBe(true);
    expect(key.endsWith(".png")).toBe(true);
    expect(objectKeyBelongsToVehicleImages(key, 42)).toBe(true);
  });

  test("objectKey 不属于该车辆时校验失败", () => {
    const key = buildImageObjectKey(42, "image/jpeg");
    expect(objectKeyBelongsToVehicleImages(key, 43)).toBe(false);
  });
});

describe("classifyObjectKeyConfirm", () => {
  test("首次确认，objectKey 属于该车 -> proceed", () => {
    expect(classifyObjectKeyConfirm(null, 1, true)).toBe("proceed");
  });

  test("首次确认，objectKey 不属于该车 -> invalid", () => {
    expect(classifyObjectKeyConfirm(null, 1, false)).toBe("invalid");
  });

  test("重复确认同一车辆的 objectKey -> idempotent", () => {
    expect(classifyObjectKeyConfirm(1, 1, true)).toBe("idempotent");
  });

  test("objectKey 已属于别的车辆 -> invalid（即便前缀恰好符合也不应发生）", () => {
    expect(classifyObjectKeyConfirm(2, 1, true)).toBe("invalid");
  });
});

describe("content type 校验", () => {
  test.each(["image/jpeg", "image/png", "image/webp"])("%s 是合法图片类型", (t) => {
    expect(isImageContentType(t)).toBe(true);
  });

  test("application/pdf 不是合法图片类型", () => {
    expect(isImageContentType("application/pdf")).toBe(false);
  });

  test.each(["application/pdf", "image/png", "image/jpeg"])("%s 是合法报告类型", (t) => {
    expect(isReportContentType(t)).toBe(true);
  });

  test("image/webp 不是合法报告类型", () => {
    expect(isReportContentType("image/webp")).toBe(false);
  });
});
