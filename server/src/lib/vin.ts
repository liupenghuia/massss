/**
 * VIN 脱敏（ADR-002 / contracts AdminVehicle.vinMasked）。
 * vin 为 null/空 -> null；否则只保留末最多 6 位明文，其余替换为 *。
 */
export function maskVin(vin: string | null | undefined): string | null {
  if (vin === null || vin === undefined || vin === "") {
    return null;
  }
  const visibleLen = Math.min(6, vin.length);
  const maskedLen = vin.length - visibleLen;
  return "*".repeat(maskedLen) + vin.slice(vin.length - visibleLen);
}
