export type PriceValue = { type: "amount"; amount: number } | { type: "negotiable"; amount: null };

export type PriceLike = PriceValue | { type: "unset"; amount: null } | null;

export type Summary = {
  id: number;
  brand: string;
  model: string;
  registrationYear: number;
  mileageKm: number;
  color: string;
  energyType: string;
  coverImageUrl: string | null;
  currentPrice: PriceValue;
};

export type Detail = {
  id: number;
  brand: string;
  model: string;
  registrationYear: number;
  mileageKm: number;
  color: string;
  conditionDesc: string;
  energyType: string;
  transferCount: number;
  displacementL: number | null;
  energyConsumption: number | null;
  batteryKwh: number | null;
};

export type ImageItem = { id: number; url: string; caption: string };
export type ReportItem = { id: number; url: string; uploadedAt: string };
export type PriceRecord = {
  id: number;
  from: PriceValue | { type: "unset"; amount: null };
  to: PriceValue;
  createdAt: string;
};

export type Filters = {
  keyword: string;
  priceMin: string;
  priceMax: string;
  registrationYearMin: string;
  registrationYearMax: string;
  mileageKmMin: string;
  mileageKmMax: string;
};

export const EMPTY_FILTERS: Filters = {
  keyword: "",
  priceMin: "",
  priceMax: "",
  registrationYearMin: "",
  registrationYearMax: "",
  mileageKmMin: "",
  mileageKmMax: "",
};
