import type { PoolClient } from "pg";

/** ADR-006 基本操作日志：只落库，不做查看页面。 */
export async function insertOperationLog(
  client: PoolClient,
  params: { operatorId: number | null; action: string; vehicleId: number | null; detail: Record<string, unknown> }
): Promise<void> {
  await client.query(
    `INSERT INTO operation_logs (operator_id, action, vehicle_id, detail) VALUES ($1, $2, $3, $4)`,
    [params.operatorId, params.action, params.vehicleId, JSON.stringify(params.detail)]
  );
}
