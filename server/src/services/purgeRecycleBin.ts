import { pool } from "../db/pool";
import { getVehicleForUpdate, listDueForPurge, markPurgedIfStillTrashed } from "../db/vehicleRepo";
import { listImages } from "../db/imageRepo";
import { listReports } from "../db/reportRepo";
import { getObjectStorage } from "../lib/objectStorage";
import { insertOperationLog } from "../db/operationLogRepo";

const DAY_MS = 24 * 60 * 60 * 1000;
/** ADR-087：补偿重试间隔 1 / 5 / 30 分钟 */
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000] as const;

/**
 * 删除单车对象存储文件；失败按 ADR-087 重试，耗尽后仅打日志。
 * 在 mark purged 之后异步调用，不阻塞元数据事务。
 */
export function scheduleObjectStorageDelete(objectKeys: string[], vehicleId: number): void {
  const storage = getObjectStorage();
  const pending = [...objectKeys];

  const attempt = (retryIndex: number): void => {
    void (async () => {
      const stillFailed: string[] = [];
      for (const key of pending) {
        try {
          await storage.deleteObject(key);
        } catch (err) {
          console.error("清除对象存储失败", { vehicleId, key, err });
          stillFailed.push(key);
        }
      }
      pending.length = 0;
      pending.push(...stillFailed);
      if (pending.length === 0) return;
      if (retryIndex >= RETRY_DELAYS_MS.length) {
        console.error("对象存储删除重试耗尽，停止自动重试", { vehicleId, keys: pending });
        return;
      }
      const delay = RETRY_DELAYS_MS[retryIndex]!;
      setTimeout(() => attempt(retryIndex + 1), delay);
    })();
  };

  // 同一次任务内立即发起首次删除（ADR-087：不额外排队）
  attempt(0);
}

/**
 * ADR-024 / ADR-086 / ADR-087：
 * - 逐条事务：锁行 → 二次确认仍在回收站 → purged=true
 * - 恢复优先：trashed_at 已空则跳过
 * - OSS 删除在标记后异步 + 1/5/30 分钟补偿
 */
export async function runPurgeOnce(): Promise<number> {
  const scan = await pool.connect();
  let due: Awaited<ReturnType<typeof listDueForPurge>>;
  try {
    due = await listDueForPurge(scan);
  } finally {
    scan.release();
  }

  let purged = 0;
  for (const row of due) {
    const id = Number(row.id);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await getVehicleForUpdate(client, id);
      // ADR-086：已被恢复或已清除则跳过
      if (!locked || locked.trashed_at === null || locked.purged) {
        await client.query("ROLLBACK");
        continue;
      }
      const dueCutoff = Date.now() - 720 * 60 * 60 * 1000;
      if (locked.trashed_at.getTime() > dueCutoff) {
        await client.query("ROLLBACK");
        continue;
      }

      const images = await listImages(client, id);
      const reports = await listReports(client, id);
      const objectKeys = [...images.map((i) => i.object_key), ...reports.map((r) => r.object_key)];

      const marked = await markPurgedIfStillTrashed(client, id);
      if (!marked) {
        await client.query("ROLLBACK");
        continue;
      }

      await insertOperationLog(client, {
        operatorId: null,
        action: "purge",
        vehicleId: id,
        detail: { trashedAt: locked.trashed_at.toISOString() },
      });
      await client.query("COMMIT");
      purged += 1;
      scheduleObjectStorageDelete(objectKeys, id);
    } catch (err) {
      await client.query("ROLLBACK").catch(() => undefined);
      console.error("单条回收站清除失败", { vehicleId: id, err });
    } finally {
      client.release();
    }
  }
  return purged;
}

export function startPurgeScheduler(): void {
  const tick = (): void => {
    void runPurgeOnce().catch((err) => {
      console.error("回收站到期清除失败", err);
    });
  };
  tick();
  setInterval(tick, DAY_MS);
}
