import { pool } from "../db/pool";
import { listDueForPurge, markPurged } from "../db/vehicleRepo";
import { listImages } from "../db/imageRepo";
import { listReports } from "../db/reportRepo";
import { getObjectStorage } from "../lib/objectStorage";
import { insertOperationLog } from "../db/operationLogRepo";

/** ADR-024：trashedAt 严格 + 720 小时后彻底清除对象存储文件，元数据保留，purged=true。 */
export async function runPurgeOnce(): Promise<number> {
  const client = await pool.connect();
  let purged = 0;
  try {
    await client.query("BEGIN");
    const due = await listDueForPurge(client);
    const storage = getObjectStorage();
    for (const row of due) {
      const id = Number(row.id);
      const images = await listImages(client, id);
      const reports = await listReports(client, id);
      for (const img of images) {
        try {
          await storage.deleteObject(img.object_key);
        } catch (err) {
          console.error("清除图片对象失败", img.object_key, err);
        }
      }
      for (const report of reports) {
        try {
          await storage.deleteObject(report.object_key);
        } catch (err) {
          console.error("清除报告对象失败", report.object_key, err);
        }
      }
      await markPurged(client, id);
      await insertOperationLog(client, {
        operatorId: null,
        action: "purge",
        vehicleId: id,
        detail: { trashedAt: row.trashed_at?.toISOString() },
      });
      purged += 1;
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
  return purged;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function startPurgeScheduler(): void {
  const tick = (): void => {
    void runPurgeOnce().catch((err) => {
      console.error("回收站到期清除失败", err);
    });
  };
  tick();
  setInterval(tick, DAY_MS);
}
