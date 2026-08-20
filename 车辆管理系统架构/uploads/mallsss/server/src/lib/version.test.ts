import { describe, expect, test } from "vitest";
import { resolveRequestedVersion } from "./version";
import { AppError } from "./errors";

describe("resolveRequestedVersion（乐观锁 If-Match / body.version 二选一）", () => {
  test("只提供 body.version -> 返回该值", () => {
    expect(resolveRequestedVersion(3, undefined)).toBe(3);
  });

  test("只提供 If-Match（带引号 ETag 格式）-> 返回该值", () => {
    expect(resolveRequestedVersion(undefined, '"5"')).toBe(5);
  });

  test("只提供 If-Match（不带引号）-> 返回该值", () => {
    expect(resolveRequestedVersion(undefined, "5")).toBe(5);
  });

  test("两者都提供且一致 -> 返回该值", () => {
    expect(resolveRequestedVersion(7, '"7"')).toBe(7);
  });

  test("两者都缺 -> 抛 MISSING_VERSION 400", () => {
    try {
      resolveRequestedVersion(undefined, undefined);
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe("MISSING_VERSION");
      expect((err as AppError).httpStatus).toBe(400);
    }
  });

  test("两者都提供但不一致 -> 抛 VALIDATION_ERROR 400", () => {
    try {
      resolveRequestedVersion(3, '"4"');
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe("VALIDATION_ERROR");
      expect((err as AppError).httpStatus).toBe(400);
    }
  });

  test("null 视为未提供 body.version", () => {
    expect(resolveRequestedVersion(null, "9")).toBe(9);
  });
});
