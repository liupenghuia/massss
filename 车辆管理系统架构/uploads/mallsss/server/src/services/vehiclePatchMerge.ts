import type { VehicleRow, } from "../models/vehicle";
import type { PatchVehicleInput } from "../lib/validation";
import type { VehicleFieldUpdate } from "../db/vehicleRepo";
import { inapplicableFields } from "../lib/energyType";
import { validationError } from "../lib/errors";

/**
 * 将 PATCH 请求与当前行合并为完整的更新字段集合。
 * - 省略的字段保持不变。
 * - energyType 变更导致某选填字段不再适用时，服务端自动置 null。
 * - 若客户端在（合并后）不适用的能源类型下显式传非 null，400 VALIDATION_ERROR（ADR-002/契约）。
 */
export function mergePatch(row: VehicleRow, patch: PatchVehicleInput): VehicleFieldUpdate {
  const finalEnergyType = patch.energyType ?? row.energy_type;
  const inapplicable = inapplicableFields(finalEnergyType);

  const displacementL = resolveLinkedField(
    "displacementL",
    patch.displacementL,
    row.displacement_l === null ? null : Number(row.displacement_l),
    inapplicable.includes("displacementL")
  );
  const energyConsumption = resolveLinkedField(
    "energyConsumption",
    patch.energyConsumption,
    row.energy_consumption === null ? null : Number(row.energy_consumption),
    inapplicable.includes("energyConsumption")
  );
  const batteryKwh = resolveLinkedField(
    "batteryKwh",
    patch.batteryKwh,
    row.battery_kwh === null ? null : Number(row.battery_kwh),
    inapplicable.includes("batteryKwh")
  );

  return {
    brand: patch.brand ?? row.brand,
    model: patch.model ?? row.model,
    registrationYear: patch.registrationYear ?? row.registration_year,
    mileageKm: patch.mileageKm ?? row.mileage_km,
    color: patch.color ?? row.color,
    conditionDesc: patch.conditionDesc ?? row.condition_desc,
    energyType: finalEnergyType,
    transferCount: patch.transferCount ?? row.transfer_count,
    displacementL,
    energyConsumption,
    batteryKwh,
    vin: patch.vin === undefined ? row.vin : patch.vin,
  };
}

function resolveLinkedField(
  field: "displacementL" | "energyConsumption" | "batteryKwh",
  patchValue: number | null | undefined,
  existingValue: number | null,
  isInapplicable: boolean
): number | null {
  if (patchValue !== undefined) {
    if (patchValue !== null && isInapplicable) {
      throw validationError([{ field, reason: "INAPPLICABLE_TO_ENERGY_TYPE" }]);
    }
    return patchValue;
  }
  return isInapplicable ? null : existingValue;
}
