import { randomUUID } from "node:crypto";

const IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const REPORT_CONTENT_TYPES = ["application/pdf", "image/png", "image/jpeg"] as const;

export type ImageContentType = (typeof IMAGE_CONTENT_TYPES)[number];
export type ReportContentType = (typeof REPORT_CONTENT_TYPES)[number];

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const REPORT_MAX_BYTES = 20 * 1024 * 1024;
export const IMAGE_COUNT_WARN_THRESHOLD = 100;

const IMAGE_EXTENSION_BY_CONTENT_TYPE: Record<ImageContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const REPORT_EXTENSION_BY_CONTENT_TYPE: Record<ReportContentType, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
};

export function isImageContentType(value: string): value is ImageContentType {
  return (IMAGE_CONTENT_TYPES as readonly string[]).includes(value);
}

export function isReportContentType(value: string): value is ReportContentType {
  return (REPORT_CONTENT_TYPES as readonly string[]).includes(value);
}

/**
 * 生成图片 objectKey，路径带车辆 id 前缀，作为"该 objectKey 是否属于该车预签名"的校验依据
 * （本期不额外建预签名发放记录表，见开发说明中的假设）。
 */
export function buildImageObjectKey(vehicleId: number, contentType: ImageContentType): string {
  return `vehicles/${vehicleId}/images/${randomUUID()}.${IMAGE_EXTENSION_BY_CONTENT_TYPE[contentType]}`;
}

export function buildReportObjectKey(vehicleId: number, contentType: ReportContentType): string {
  return `vehicles/${vehicleId}/reports/${randomUUID()}.${REPORT_EXTENSION_BY_CONTENT_TYPE[contentType]}`;
}

/** objectKey 是否可能属于该车辆（前缀校验），确认落库时用于挡掉跨车辆盗用的 objectKey。 */
export function objectKeyBelongsToVehicleImages(objectKey: string, vehicleId: number): boolean {
  return objectKey.startsWith(`vehicles/${vehicleId}/images/`);
}

export function objectKeyBelongsToVehicleReports(objectKey: string, vehicleId: number): boolean {
  return objectKey.startsWith(`vehicles/${vehicleId}/reports/`);
}

export type ConfirmOutcome = "idempotent" | "invalid" | "proceed";

/**
 * 确认落库的幂等判定（图片/报告共用）：
 * - 已有同 objectKey 的记录且属于该车 -> idempotent（返回已有资源，不重复创建）
 * - 已有同 objectKey 的记录但属于别的车，或 objectKey 前缀与该车不符 -> invalid
 * - 否则 -> proceed（继续走 head 校验 + 落库）
 */
export function classifyObjectKeyConfirm(
  existingVehicleId: number | null,
  requestVehicleId: number,
  belongsToVehicle: boolean
): ConfirmOutcome {
  if (existingVehicleId !== null) {
    return existingVehicleId === requestVehicleId ? "idempotent" : "invalid";
  }
  return belongsToVehicle ? "proceed" : "invalid";
}

/** ConfirmImageRequest.caption 省略视为空字符串（契约）。 */
export function resolveCaption(caption: unknown): string {
  if (caption === undefined) return "";
  if (typeof caption !== "string") throw new TypeError("caption must be a string");
  return caption;
}
