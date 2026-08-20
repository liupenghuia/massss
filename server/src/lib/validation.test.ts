import { describe, expect, test } from "vitest";
import { validateCreateRequest, validatePatchRequest } from "./validation";
import { AppError } from "./errors";

describe("validateCreateRequest", () => {
  test("合法汽油车草稿通过校验", () => {
    const input = validateCreateRequest({
      brand: "大众",
      model: "帕萨特",
      registrationYear: 2020,
      mileageKm: 35000,
      color: "白色",
      conditionDesc: "车况良好",
      energyType: "gasoline",
      transferCount: 1,
      displacementL: 1.8,
    });
    expect(input.energyType).toBe("gasoline");
    expect(input.vin).toBeNull();
  });

  test("缺少必填字段 -> VALIDATION_ERROR", () => {
    try {
      validateCreateRequest({ brand: "大众" });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe("VALIDATION_ERROR");
    }
  });

  test("纯电车传 displacementL -> VALIDATION_ERROR（不适用于能源类型）", () => {
    try {
      validateCreateRequest({
        brand: "特斯拉",
        model: "Model 3",
        registrationYear: 2022,
        mileageKm: 12000,
        color: "黑色",
        conditionDesc: "无重大事故",
        energyType: "ev",
        transferCount: 0,
        displacementL: 1.5,
      });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe("VALIDATION_ERROR");
    }
  });
});

describe("validatePatchRequest", () => {
  test("空 body 合法（全部字段可省略）", () => {
    expect(validatePatchRequest({})).toEqual({});
  });

  test("类型错误 -> VALIDATION_ERROR", () => {
    try {
      validatePatchRequest({ mileageKm: "abc" });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe("VALIDATION_ERROR");
    }
  });

  test("显式 null 用于清空选填字段", () => {
    const result = validatePatchRequest({ vin: null });
    expect(result.vin).toBeNull();
  });
});
