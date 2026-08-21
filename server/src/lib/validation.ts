import { validationError } from "./errors";
import { inapplicableFields, type EnergyType, type LinkedField } from "./energyType";

const ENERGY_TYPES: EnergyType[] = ["gasoline", "ev", "phev", "range_extender"];

export interface FieldError {
  field: string;
  reason: string;
}

// ADR-038 第2条：字段取值范围。
const REGISTRATION_YEAR_MIN = 1980;
const REGISTRATION_YEAR_MAX = 2100;
const CONDITION_DESC_MAX_LENGTH = 500;

export interface CreateVehicleInput {
  // ADR-035：草稿保存不强制核心字段非空，仅发布时才校验，创建接口这几个字段因此改为可选。
  brand: string | null;
  model: string | null;
  registrationYear: number | null;
  mileageKm: number | null;
  color: string | null;
  conditionDesc: string | null;
  energyType: EnergyType | null;
  transferCount: number | null;
  displacementL: number | null;
  energyConsumption: number | null;
  batteryKwh: number | null;
  vin: string | null;
}

/** POST /admin/vehicles body 校验，失败抛 VALIDATION_ERROR。核心字段允许缺失（草稿），发布时另行校验。 */
export function validateCreateRequest(body: unknown): CreateVehicleInput {
  const errors: FieldError[] = [];
  const b = asRecord(body);

  const brand = has(b, "brand") ? requireNonEmptyString(b, "brand", errors) : undefined;
  const model = has(b, "model") ? requireNonEmptyString(b, "model", errors) : undefined;
  const registrationYear = has(b, "registrationYear")
    ? requireInteger(b, "registrationYear", errors, { min: REGISTRATION_YEAR_MIN, max: REGISTRATION_YEAR_MAX })
    : undefined;
  const mileageKm = has(b, "mileageKm") ? requireInteger(b, "mileageKm", errors, { min: 0 }) : undefined;
  const color = has(b, "color") ? requireNonEmptyString(b, "color", errors) : undefined;
  const conditionDesc = has(b, "conditionDesc")
    ? requireNonEmptyString(b, "conditionDesc", errors, { maxLength: CONDITION_DESC_MAX_LENGTH })
    : undefined;
  const energyType = has(b, "energyType") ? requireEnergyType(b, "energyType", errors) : undefined;
  const transferCount = has(b, "transferCount") ? requireInteger(b, "transferCount", errors, { min: 0 }) : undefined;

  const linked = optionalLinkedFields(b, errors, energyType);

  const vin = optionalNullableString(b, "vin", errors);

  if (errors.length > 0) throw validationError(errors);

  return {
    brand: brand ?? null,
    model: model ?? null,
    registrationYear: registrationYear ?? null,
    mileageKm: mileageKm ?? null,
    color: color ?? null,
    conditionDesc: conditionDesc ?? null,
    energyType: energyType ?? null,
    transferCount: transferCount ?? null,
    displacementL: linked.displacementL,
    energyConsumption: linked.energyConsumption,
    batteryKwh: linked.batteryKwh,
    vin: vin ?? null,
  };
}

export interface PatchVehicleInput {
  brand?: string;
  model?: string;
  registrationYear?: number;
  mileageKm?: number;
  color?: string;
  conditionDesc?: string;
  energyType?: EnergyType;
  transferCount?: number;
  displacementL?: number | null;
  energyConsumption?: number | null;
  batteryKwh?: number | null;
  vin?: string | null;
}

/** PATCH /admin/vehicles/{id} body 校验（不含 version，由调用方单独解析）。 */
export function validatePatchRequest(body: unknown): PatchVehicleInput {
  const errors: FieldError[] = [];
  const b = asRecord(body);
  const result: PatchVehicleInput = {};

  if (has(b, "brand")) result.brand = requireNonEmptyString(b, "brand", errors);
  if (has(b, "model")) result.model = requireNonEmptyString(b, "model", errors);
  if (has(b, "registrationYear")) {
    result.registrationYear = requireInteger(b, "registrationYear", errors, {
      min: REGISTRATION_YEAR_MIN,
      max: REGISTRATION_YEAR_MAX,
    });
  }
  if (has(b, "mileageKm")) result.mileageKm = requireInteger(b, "mileageKm", errors, { min: 0 });
  if (has(b, "color")) result.color = requireNonEmptyString(b, "color", errors);
  if (has(b, "conditionDesc")) {
    result.conditionDesc = requireNonEmptyString(b, "conditionDesc", errors, { maxLength: CONDITION_DESC_MAX_LENGTH });
  }
  if (has(b, "energyType")) result.energyType = requireEnergyType(b, "energyType", errors);
  if (has(b, "transferCount")) result.transferCount = requireInteger(b, "transferCount", errors, { min: 0 });
  if (has(b, "displacementL")) result.displacementL = optionalNullableNumber(b, "displacementL", errors);
  if (has(b, "energyConsumption")) result.energyConsumption = optionalNullableNumber(b, "energyConsumption", errors);
  if (has(b, "batteryKwh")) result.batteryKwh = optionalNullableNumber(b, "batteryKwh", errors);
  if (has(b, "vin")) result.vin = optionalNullableString(b, "vin", errors);

  if (errors.length > 0) throw validationError(errors);
  return result;
}

/**
 * 校验最终 energyType 下，某个显式非 null 的联动字段是否适用。
 * 供 create（当次 energyType）与 patch（合并后的最终 energyType）复用。
 */
export function assertLinkedFieldApplicable(field: LinkedField, value: number | null | undefined, energyType: EnergyType): void {
  if (value == null) return;
  if (inapplicableFields(energyType).includes(field)) {
    throw validationError([{ field, reason: "INAPPLICABLE_TO_ENERGY_TYPE" }]);
  }
}

function optionalLinkedFields(
  b: Record<string, unknown>,
  errors: FieldError[],
  energyType: EnergyType | undefined
): { displacementL: number | null; energyConsumption: number | null; batteryKwh: number | null } {
  const displacementL = optionalNullableNumber(b, "displacementL", errors) ?? null;
  const energyConsumption = optionalNullableNumber(b, "energyConsumption", errors) ?? null;
  const batteryKwh = optionalNullableNumber(b, "batteryKwh", errors) ?? null;

  if (energyType !== undefined) {
    for (const [field, value] of [
      ["displacementL", displacementL],
      ["energyConsumption", energyConsumption],
      ["batteryKwh", batteryKwh],
    ] as const) {
      if (value != null && inapplicableFields(energyType).includes(field)) {
        errors.push({ field, reason: "INAPPLICABLE_TO_ENERGY_TYPE" });
      }
    }
  }

  return { displacementL, energyConsumption, batteryKwh };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function has(b: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(b, key);
}

function requireNonEmptyString(
  b: Record<string, unknown>,
  key: string,
  errors: FieldError[],
  opts: { maxLength?: number } = {}
): string | undefined {
  const v = b[key];
  if (typeof v !== "string" || v.length < 1) {
    errors.push({ field: key, reason: typeof v !== "string" ? "TYPE" : "REQUIRED" });
    return undefined;
  }
  if (opts.maxLength !== undefined && v.length > opts.maxLength) {
    errors.push({ field: key, reason: "TYPE" });
    return undefined;
  }
  return v;
}

function requireInteger(
  b: Record<string, unknown>,
  key: string,
  errors: FieldError[],
  opts: { min?: number; max?: number } = {}
): number | undefined {
  const v = b[key];
  if (typeof v !== "number" || !Number.isInteger(v)) {
    errors.push({ field: key, reason: "TYPE" });
    return undefined;
  }
  if (opts.min !== undefined && v < opts.min) {
    errors.push({ field: key, reason: "TYPE" });
    return undefined;
  }
  if (opts.max !== undefined && v > opts.max) {
    errors.push({ field: key, reason: "TYPE" });
    return undefined;
  }
  return v;
}

function requireEnergyType(b: Record<string, unknown>, key: string, errors: FieldError[]): EnergyType | undefined {
  const v = b[key];
  if (typeof v !== "string" || !ENERGY_TYPES.includes(v as EnergyType)) {
    errors.push({ field: key, reason: "TYPE" });
    return undefined;
  }
  return v as EnergyType;
}

function optionalNullableNumber(b: Record<string, unknown>, key: string, errors: FieldError[]): number | null | undefined {
  if (!has(b, key)) return undefined;
  const v = b[key];
  if (v === null) return null;
  if (typeof v !== "number" || !(v > 0)) {
    errors.push({ field: key, reason: "TYPE" });
    return undefined;
  }
  return v;
}

function optionalNullableString(b: Record<string, unknown>, key: string, errors: FieldError[]): string | null | undefined {
  if (!has(b, key)) return undefined;
  const v = b[key];
  if (v === null) return null;
  if (typeof v !== "string") {
    errors.push({ field: key, reason: "TYPE" });
    return undefined;
  }
  return v;
}
