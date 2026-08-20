export type EnergyType = "gasoline" | "ev" | "phev" | "range_extender";

export type LinkedField = "displacementL" | "energyConsumption" | "batteryKwh";

/**
 * ADR-002 能源类型联动规则：
 * - displacementL 适用于 gasoline / phev / range_extender
 * - energyConsumption、batteryKwh 适用于 ev / phev / range_extender
 * 返回给定能源类型下"不适用"的选填字段列表。
 */
export function inapplicableFields(energyType: EnergyType): LinkedField[] {
  const inapplicable: LinkedField[] = [];
  if (energyType === "ev") inapplicable.push("displacementL");
  if (energyType === "gasoline") inapplicable.push("energyConsumption", "batteryKwh");
  return inapplicable;
}
