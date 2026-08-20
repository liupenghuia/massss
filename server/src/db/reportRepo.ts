import type { PoolClient } from "pg";
import type { ReportContentType } from "../lib/media";

export interface ReportRow {
  id: string;
  vehicle_id: string;
  object_key: string;
  url: string;
  content_type: ReportContentType;
  byte_size: string;
  uploaded_at: Date;
}

export async function listReports(client: PoolClient, vehicleId: number): Promise<ReportRow[]> {
  const result = await client.query<ReportRow>(
    "SELECT * FROM vehicle_reports WHERE vehicle_id = $1 ORDER BY uploaded_at DESC, id DESC",
    [vehicleId]
  );
  return result.rows;
}

export async function findReportByObjectKey(client: PoolClient, objectKey: string): Promise<ReportRow | null> {
  const result = await client.query<ReportRow>("SELECT * FROM vehicle_reports WHERE object_key = $1", [objectKey]);
  return result.rows[0] ?? null;
}

export async function getReport(client: PoolClient, vehicleId: number, reportId: number): Promise<ReportRow | null> {
  const result = await client.query<ReportRow>(
    "SELECT * FROM vehicle_reports WHERE id = $1 AND vehicle_id = $2",
    [reportId, vehicleId]
  );
  return result.rows[0] ?? null;
}

export interface InsertReportParams {
  vehicleId: number;
  objectKey: string;
  url: string;
  contentType: ReportContentType;
  byteSize: number;
}

export async function insertReport(client: PoolClient, params: InsertReportParams): Promise<ReportRow> {
  const result = await client.query<ReportRow>(
    `INSERT INTO vehicle_reports (vehicle_id, object_key, url, content_type, byte_size)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [params.vehicleId, params.objectKey, params.url, params.contentType, params.byteSize]
  );
  return result.rows[0];
}

export async function deleteReport(client: PoolClient, reportId: number): Promise<void> {
  await client.query("DELETE FROM vehicle_reports WHERE id = $1", [reportId]);
}
