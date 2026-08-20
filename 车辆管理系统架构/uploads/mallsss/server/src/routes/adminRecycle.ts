import { Router, type Request, type Response, type NextFunction } from "express";
import { pool } from "../db/pool";
import {
  getVehicleById,
  getVehicleForUpdate,
  hasTrashLog,
  listRecycleBin,
  restoreVehicle,
  trashVehicle,
} from "../db/vehicleRepo";
import { toAdminVehicle, toRecycleBinItem } from "../models/vehicle";
import { resolveRequestedVersion } from "../lib/version";
import { insertOperationLog } from "../db/operationLogRepo";
import {
  notFound,
  recycleBinItemPurged,
  validationError,
  vehicleNotInRecycleBin,
  versionConflict,
} from "../lib/errors";

export const adminRecycleRouter = Router();

function etag(version: number): string {
  return `"${version}"`;
}

function parseVehicleId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw validationError([{ field: "id", reason: "TYPE" }]);
  return id;
}

function parsePage(raw: unknown): number {
  const page = raw !== undefined ? Number(raw) : 1;
  if (!Number.isInteger(page) || page < 1) throw validationError([{ field: "page", reason: "TYPE" }]);
  return page;
}

function parsePageSize(raw: unknown): number {
  const pageSize = raw !== undefined ? Number(raw) : 20;
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw validationError([{ field: "pageSize", reason: "TYPE" }]);
  }
  return pageSize;
}

function extractBodyVersion(body: unknown): number | null | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const v = (body as Record<string, unknown>).version;
  if (v === undefined) return undefined;
  if (typeof v !== "number" || !Number.isInteger(v)) {
    throw validationError([{ field: "version", reason: "TYPE" }]);
  }
  return v;
}

function parseKeyword(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > 50) throw validationError([{ field: "keyword", reason: "MAX_LENGTH" }]);
  return trimmed;
}

adminRecycleRouter.post("/admin/vehicles/:id/trash", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const id = parseVehicleId(req.params.id);
    await client.query("BEGIN");
    const row = await getVehicleForUpdate(client, id);
    if (!row) {
      await client.query("ROLLBACK");
      throw notFound();
    }
    if (row.purged) {
      await client.query("ROLLBACK");
      throw recycleBinItemPurged();
    }
    if (row.trashed_at !== null) {
      await client.query("COMMIT");
      const vehicle = toAdminVehicle(row);
      res.status(200).set("ETag", etag(vehicle.version)).json(vehicle);
      return;
    }

    const bodyVersion = extractBodyVersion(req.body);
    const requestedVersion = resolveRequestedVersion(bodyVersion, req.header("If-Match"));
    if (Number(row.version) !== requestedVersion) {
      await client.query("ROLLBACK");
      throw versionConflict();
    }

    if (row.status === "published") {
      await insertOperationLog(client, {
        operatorId: req.operatorId,
        action: "unpublish",
        vehicleId: id,
        detail: { from: "published", to: "unpublished", via: "trash" },
      });
    }

    const updated = await trashVehicle(client, id);
    await insertOperationLog(client, {
      operatorId: req.operatorId,
      action: "trash",
      vehicleId: id,
      detail: { originalStatus: row.status },
    });
    await client.query("COMMIT");
    const vehicle = toAdminVehicle(updated);
    res.status(200).set("ETag", etag(vehicle.version)).json(vehicle);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    next(err);
  } finally {
    client.release();
  }
});

adminRecycleRouter.post("/admin/vehicles/:id/restore", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const id = parseVehicleId(req.params.id);
    await client.query("BEGIN");
    const row = await getVehicleForUpdate(client, id);
    if (!row) {
      await client.query("ROLLBACK");
      throw notFound();
    }
    if (row.purged) {
      await client.query("ROLLBACK");
      throw recycleBinItemPurged();
    }
    if (row.trashed_at === null) {
      const everTrashed = await hasTrashLog(client, id);
      if (!everTrashed) {
        await client.query("ROLLBACK");
        throw vehicleNotInRecycleBin();
      }
      await client.query("COMMIT");
      const vehicle = toAdminVehicle(row);
      res.status(200).set("ETag", etag(vehicle.version)).json(vehicle);
      return;
    }

    const bodyVersion = extractBodyVersion(req.body);
    const requestedVersion = resolveRequestedVersion(bodyVersion, req.header("If-Match"));
    if (Number(row.version) !== requestedVersion) {
      await client.query("ROLLBACK");
      throw versionConflict();
    }

    const updated = await restoreVehicle(client, id);
    await insertOperationLog(client, {
      operatorId: req.operatorId,
      action: "restore",
      vehicleId: id,
      detail: { fromStatus: row.status, to: "draft" },
    });
    await client.query("COMMIT");
    const vehicle = toAdminVehicle(updated);
    res.status(200).set("ETag", etag(vehicle.version)).json(vehicle);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    next(err);
  } finally {
    client.release();
  }
});

adminRecycleRouter.get("/admin/recycle-bin", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parsePage(req.query.page);
    const pageSize = parsePageSize(req.query.pageSize);
    const keyword = parseKeyword(req.query.keyword);
    const client = await pool.connect();
    try {
      const { items, total } = await listRecycleBin(client, { keyword, page, pageSize });
      res.status(200).json({ items: items.map(toRecycleBinItem), page, pageSize, total });
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

adminRecycleRouter.get("/admin/recycle-bin/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseVehicleId(req.params.id);
    const client = await pool.connect();
    try {
      const row = await getVehicleById(client, id);
      if (!row || row.trashed_at === null) throw notFound();
      res.status(200).json(toRecycleBinItem(row));
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});
