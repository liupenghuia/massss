const MIN_YEAR = 1980;
const MAX_TRANSFER = 20;

export function currentMaxYear(): number {
  return new Date().getFullYear();
}

export function yearError(value: number): string | undefined {
  if (!Number.isFinite(value)) return "请填写上牌年";
  const max = currentMaxYear();
  if (value < MIN_YEAR || value > max) return `上牌年须在 ${MIN_YEAR}–${max} 之间`;
  return undefined;
}

export function mileageError(value: number): string | undefined {
  if (!Number.isFinite(value)) return "请填写里程";
  if (value < 0) return "里程不能为负";
  return undefined;
}

export function transferError(value: number): string | undefined {
  if (!Number.isFinite(value)) return "请填写过户次数";
  if (value < 0 || value > MAX_TRANSFER) return `过户次数须在 0–${MAX_TRANSFER} 之间`;
  return undefined;
}
