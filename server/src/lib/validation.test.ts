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

  // ADR-035：草稿保存不强制核心字段非空，仅发布时才校验，创建接口因此允许缺字段。
  test("核心字段缺失 -> 允许保存为草稿，缺失字段落为 null", () => {
    const input = validateCreateRequest({ brand: "大众" });
    expect(input.brand).toBe("大众");
    expect(input.model).toBeNull();
    expect(input.registrationYear).toBeNull();
    expect(input.mileageKm).toBeNull();
    expect(input.color).toBeNull();
    expect(input.conditionDesc).toBeNull();
    expect(input.energyType).toBeNull();
    expect(input.transferCount).toBeNull();
  });

  test("空 body -> 全部核心字段落为 null，不报错", () => {
    const input = validateCreateRequest({});
    expect(input.brand).toBeNull();
    expect(input.vin).toBeNull();
  });

  test("提供了核心字段但类型不对 -> VALIDATION_ERROR", () => {
    try {
      validateCreateRequest({ mileageKm: "abc" });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe("VALIDATION_ERROR");
    }
  });

  // ADR-038 第2条：字段取值范围。
  test("上牌年份早于 1980 -> VALIDATION_ERROR", () => {
    try {
      validateCreateRequest({ registrationYear: 1979 });
      expect.unreachable();
    } catch (err) {
      expect((err as AppError).code).toBe("VALIDATION_ERROR");
    }
  });

  test("上牌年份晚于 2100 -> VALIDATION_ERROR", () => {
    try {
      validateCreateRequest({ registrationYear: 2101 });
      expect.unreachable();
    } catch (err) {
      expect((err as AppError).code).toBe("VALIDATION_ERROR");
    }
  });

  test("上牌年份边界值 1980/2100 合法", () => {
    expect(validateCreateRequest({ registrationYear: 1980 }).registrationYear).toBe(1980);
    expect(validateCreateRequest({ registrationYear: 2100 }).registrationYear).toBe(2100);
  });

  test("车况描述超过 500 字 -> VALIDATION_ERROR", () => {
    try {
      validateCreateRequest({ conditionDesc: "a".repeat(501) });
      expect.unreachable();
    } catch (err) {
      expect((err as AppError).code).toBe("VALIDATION_ERROR");
    }
  });

  test("车况描述恰好 500 字合法", () => {
    expect(validateCreateRequest({ conditionDesc: "a".repeat(500) }).conditionDesc).toBe("a".repeat(500));
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

  test("上牌年份超出范围 -> VALIDATION_ERROR", () => {
    try {
      validatePatchRequest({ registrationYear: 1900 });
      expect.unreachable();
    } catch (err) {
      expect((err as AppError).code).toBe("VALIDATION_ERROR");
    }
  });

  test("车况描述超过 500 字 -> VALIDATION_ERROR", () => {
    try {
      validatePatchRequest({ conditionDesc: "a".repeat(501) });
      expect.unreachable();
    } catch (err) {
      expect((err as AppError).code).toBe("VALIDATION_ERROR");
    }
  });
});
