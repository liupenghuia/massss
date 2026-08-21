import { describe, expect, test } from "vitest";
import { evaluatePublishPrecondition, type CoreFieldsForPublish } from "./publishPrecondition";

const FULL_CORE_FIELDS: CoreFieldsForPublish = {
  brand: "大众",
  model: "帕萨特",
  registrationYear: 2020,
  mileageKm: 35000,
  color: "白色",
  conditionDesc: "车况良好",
  energyType: "gasoline",
  transferCount: 1,
};

describe("evaluatePublishPrecondition", () => {
  test("图片数 >= 4 且已填价且核心字段齐全 -> 通过", () => {
    expect(evaluatePublishPrecondition(4, true, FULL_CORE_FIELDS)).toEqual({ ok: true, missing: [] });
  });

  test("图片数 > 4 且已填价 -> 通过", () => {
    expect(evaluatePublishPrecondition(10, true, FULL_CORE_FIELDS)).toEqual({ ok: true, missing: [] });
  });

  test("图片数不足 -> missing 含 images", () => {
    expect(evaluatePublishPrecondition(2, true, FULL_CORE_FIELDS)).toEqual({ ok: false, missing: ["images"] });
  });

  test("未填价 -> missing 含 price", () => {
    expect(evaluatePublishPrecondition(5, false, FULL_CORE_FIELDS)).toEqual({ ok: false, missing: ["price"] });
  });

  test("图片和价格都不满足 -> missing 同时含 images 与 price", () => {
    expect(evaluatePublishPrecondition(0, false, FULL_CORE_FIELDS)).toEqual({ ok: false, missing: ["images", "price"] });
  });

  test("恰好 3 张图片仍不满足（边界值）", () => {
    expect(evaluatePublishPrecondition(3, true, FULL_CORE_FIELDS).ok).toBe(false);
  });

  // ADR-035：草稿阶段核心字段可缺失，发布时才校验。
  test("核心字段缺失一个 -> missing 含 coreFields 且列出具体字段名", () => {
    const result = evaluatePublishPrecondition(4, true, { ...FULL_CORE_FIELDS, brand: null });
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(["coreFields"]);
    expect(result.missingCoreFields).toEqual(["brand"]);
  });

  test("核心字段缺失多个 -> missingCoreFields 全部列出", () => {
    const result = evaluatePublishPrecondition(4, true, { ...FULL_CORE_FIELDS, brand: null, model: null });
    expect(result.missingCoreFields).toEqual(["brand", "model"]);
  });

  test("图片、价格、核心字段三者都不满足 -> missing 三项齐全", () => {
    const result = evaluatePublishPrecondition(0, false, { ...FULL_CORE_FIELDS, brand: null });
    expect(result.missing).toEqual(["images", "price", "coreFields"]);
  });

  test("核心字段齐全时不返回 missingCoreFields", () => {
    const result = evaluatePublishPrecondition(4, true, FULL_CORE_FIELDS);
    expect(result.missingCoreFields).toBeUndefined();
  });
});
