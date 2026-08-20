import type { PoolClient } from "pg";
import { createHash } from "node:crypto";

export interface IdempotencyRecord {
  key: string;
  requestHash: string;
  vehicleId: number;
  responseStatus: number;
  responseBody: unknown;
}

export function hashRequestBody(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

export async function findIdempotencyKey(client: PoolClient, key: string): Promise<IdempotencyRecord | null> {
  const result = await client.query<{
    key: string;
    request_hash: string;
    vehicle_id: string;
    response_status: number;
    response_body: unknown;
  }>("SELECT * FROM idempotency_keys WHERE key = $1", [key]);
  const row = result.rows[0];
  if (!row) return null;
  return {
    key: row.key,
    requestHash: row.request_hash,
    vehicleId: Number(row.vehicle_id),
    responseStatus: row.response_status,
    responseBody: row.response_body,
  };
}

export async function saveIdempotencyKey(client: PoolClient, record: IdempotencyRecord): Promise<void> {
  await client.query(
    `INSERT INTO idempotency_keys (key, request_hash, vehicle_id, response_status, response_body)
     VALUES ($1, $2, $3, $4, $5)`,
    [record.key, record.requestHash, record.vehicleId, record.responseStatus, JSON.stringify(record.responseBody)]
  );
}
