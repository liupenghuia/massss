import { describe, expect, test } from "vitest";
import { mergePatch } from "./vehiclePatchMerge";
import type { VehicleRow } from "../models/vehicle";
import { AppError } from "../lib/errors";

function baseRow(overrides: Partial<VehicleRow> = {}): VehicleRow {
  return {
    id: "1",
    status: "draft",
    version: "1",
    brand: "大众",
    model: "帕萨特",
    registration_year: 2020,
    mileage_km: 35000,
    color: "白色",
    condition_desc: "良好",
    energy_type: "gasoline",
    transfer_count: 1,
    displacement_l: "1.80",
    energy_consumption: null,
    battery_kwh: null,
    vin: "LSVAM24H3BN123456",
    trashed_at: null,
    purged: false,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

describe("mergePatch（编辑与状态解耦，ADR-002 能源类型联动）", () => {
  test("省略的字段保持不变", () => {
    const row = baseRow();
    const result = mergePatch(row, { brand: "奥迪" });
    expect(result.brand).toBe("奥迪");
    expect(result.model).toBe("帕萨特");
    expect(result.displacementL).toBe(1.8);
  });

  test("energyType 从 gasoline 改为 ev 时，displacementL 未显式清空则服务端自动置 null", () => {
    const row = baseRow({ energy_type: "gasoline", displacement_l: "1.80" });
    const result = mergePatch(row, { energyType: "ev" });
    expect(result.displacementL).toBeNull();
    expect(result.energyType).toBe("ev");
  });

  test("energyType 改为 ev 且客户端显式传非 null 的 displacementL -> 拒绝", () => {
    const row = baseRow({ energy_type: "gasoline" });
    try {
      mergePatch(row, { energyType: "ev", displacementL: 2.0 });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe("VALIDATION_ERROR");
    }
  });

  test("未变更 energyType 时，向不适用字段显式传非 null -> 拒绝", () => {
    const row = baseRow({ energy_type: "gasoline" });
    try {
      mergePatch(row, { batteryKwh: 60 });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe("VALIDATION_ERROR");
    }
  });

  test("显式传 null 可以清空适用字段", () => {
    const row = baseRow({ energy_type: "gasoline", displacement_l: "1.80" });
    const result = mergePatch(row, { displacementL: null });
    expect(result.displacementL).toBeNull();
  });

  test("energyType 改为 phev 时原本 gasoline 下不适用的字段变为适用，未提供则保持原值", () => {
    const row = baseRow({ energy_type: "gasoline", energy_consumption: null, battery_kwh: null });
    const result = mergePatch(row, { energyType: "phev" });
    expect(result.energyConsumption).toBeNull();
    expect(result.batteryKwh).toBeNull();
  });

  // ADR-035：草稿阶段核心字段（含 energyType）允许为 null。
  test("草稿 energyType 仍为 null 时，联动字段不受限制", () => {
    const row = baseRow({ energy_type: null, displacement_l: null, energy_consumption: null, battery_kwh: null });
    const result = mergePatch(row, { batteryKwh: 60 });
    expect(result.batteryKwh).toBe(60);
    expect(result.energyType).toBeNull();
  });

  test("草稿核心字段为 null 时，省略字段合并结果保持 null", () => {
    const row = baseRow({ brand: null, model: null });
    const result = mergePatch(row, {});
    expect(result.brand).toBeNull();
    expect(result.model).toBeNull();
  });
});
