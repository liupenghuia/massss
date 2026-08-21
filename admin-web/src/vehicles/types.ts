export type EnergyType = "gasoline" | "ev" | "phev" | "range_extender";
export type Status = "draft" | "published" | "unpublished";

export type AdminVehicle = {
  id: number;
  status: Status;
  version: number;
  brand: string;
  model: string;
  registrationYear: number;
  mileageKm: number;
  color: string;
  conditionDesc: string;
  energyType: EnergyType;
  transferCount: number;
  displacementL: number | null;
  energyConsumption: number | null;
  batteryKwh: number | null;
  vinMasked: string | null;
};

export type PriceValue = { type: "amount"; amount: number } | { type: "negotiable"; amount: null };
export type ImageItem = { id: number; url: string; caption: string };
export type ReportItem = { id: number; url: string; contentType: string; byteSize: number };
/** operatorId：契约字段名；服务端按 ADR-076 填登录账号名 */
export type PriceRecordItem = {
  id: number;
  from: PriceValue | { type: "unset"; amount: null };
  to: PriceValue;
  createdAt: string;
  operatorId?: string;
};
/** ADR-058：批量上传按文件展示成功/失败与失败原因 */
export type UploadTask = { id: number; name: string; status: "uploading" | "done" | "failed"; reason?: string };

export type VehicleFormState = {
  brand: string;
  model: string;
  registrationYear: number;
  mileageKm: number;
  color: string;
  conditionDesc: string;
  energyType: EnergyType;
  transferCount: number;
  displacementL: string;
  energyConsumption: string;
  batteryKwh: string;
  vin: string;
  initialPriceType: "amount" | "negotiable";
  initialAmount: string;
};

export const emptyForm: VehicleFormState = {
  brand: "",
  model: "",
  registrationYear: 2020,
  mileageKm: 0,
  color: "",
  conditionDesc: "",
  energyType: "gasoline",
  transferCount: 0,
  displacementL: "1.5",
  energyConsumption: "",
  batteryKwh: "",
  vin: "",
  initialPriceType: "amount",
  initialAmount: "1.00",
};

export const CORE_FIELD_LABEL: Record<string, string> = {
  brand: "品牌",
  model: "车型",
  registrationYear: "上牌年",
  mileageKm: "里程",
  color: "颜色",
  conditionDesc: "车辆描述",
  energyType: "能源类型",
  transferCount: "过户次数",
};

export const STATUS_LABEL: Record<Status, string> = {
  draft: "草稿",
  published: "已上架",
  unpublished: "已下架",
};
