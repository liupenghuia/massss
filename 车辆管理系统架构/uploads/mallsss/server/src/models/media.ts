import type { components } from "../generated/openapi-types";
import type { ImageRow } from "../db/imageRepo";
import type { ReportRow } from "../db/reportRepo";

type AdminVehicleImage = components["schemas"]["AdminVehicleImage"];
type PublicVehicleImage = components["schemas"]["PublicVehicleImage"];
type AdminVehicleReport = components["schemas"]["AdminVehicleReport"];
type PublicVehicleReport = components["schemas"]["PublicVehicleReport"];

export function toAdminImage(row: ImageRow): AdminVehicleImage {
  return {
    id: Number(row.id),
    vehicleId: Number(row.vehicle_id),
    objectKey: row.object_key,
    url: row.url,
    caption: row.caption,
    contentType: row.content_type,
    byteSize: Number(row.byte_size),
    createdAt: row.created_at.toISOString(),
  };
}

export function toPublicImage(row: ImageRow): PublicVehicleImage {
  return {
    id: Number(row.id),
    url: row.url,
    caption: row.caption,
    contentType: row.content_type,
    byteSize: Number(row.byte_size),
    createdAt: row.created_at.toISOString(),
  };
}

export function toAdminReport(row: ReportRow): AdminVehicleReport {
  return {
    id: Number(row.id),
    vehicleId: Number(row.vehicle_id),
    objectKey: row.object_key,
    url: row.url,
    contentType: row.content_type,
    byteSize: Number(row.byte_size),
    uploadedAt: row.uploaded_at.toISOString(),
  };
}

export function toPublicReport(row: ReportRow): PublicVehicleReport {
  return {
    id: Number(row.id),
    url: row.url,
    contentType: row.content_type,
    byteSize: Number(row.byte_size),
    uploadedAt: row.uploaded_at.toISOString(),
  };
}
