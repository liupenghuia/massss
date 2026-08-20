const ENERGY: Record<string, string> = {
  gasoline: "汽油",
  ev: "纯电",
  phev: "插电混动",
  range_extender: "增程式",
};

export function energyLabel(value: string): string {
  return ENERGY[value] ?? value;
}

export function formatMileage(km: number): string {
  return `${km.toLocaleString("zh-CN")} 公里`;
}
