import { Router, type Request, type Response, type NextFunction } from "express";
import { pool } from "../db/pool";
import { toAdminVehicle } from "../models/vehicle";
import { validateCreateRequest, validatePatchRequest } from "../lib/validation";
import { resolveRequestedVersion } from "../lib/version";
import { evaluatePublishPrecondition } from "../lib/publishPrecondition";
import { planPublish, planUnpublish } from "../lib/stateMachine";
import {
  AppError,
  idempotencyKeyRequired,
  internalError,
  notFound,
  publishPreconditionFailed,
  validationError,
  versionConflict,
  illegalStatusTransition,
  vehicleInRecycleBin,
} from "../lib/errors";
import { getVehicleById, getVehicleForUpdate, insertVehicle, listVehicles, updateVehicleFields, updateVehicleStatus } from "../db/vehicleRepo";
import { findIdempotencyKey, hashRequestBody, saveIdempotencyKey } from "../db/idempotencyRepo";
import { insertInitialPriceRecord, isPriceFilled } from "../db/priceRepo";
import { countImages } from "../db/imageRepo";
import { insertOperationLog } from "../db/operationLogRepo";
import { mergePatch } from "../services/vehiclePatchMerge";
import type { components } from "../generated/openapi-types";

type PriceValue = components["schemas"]["PriceValue"];

export const adminVehiclesRouter = Router();

function etag(version: number): string {
  return `"${version}"`;
}

function parseVehicleId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    throw validationError([{ field: "id", reason: "TYPE" }]);
  }
  return id;
}

function validateInitialPrice(body: unknown): PriceValue | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const b = body as Record<string, unknown>;
  if (!("initialPrice" in b) || b.initialPrice == null) return undefined;
  const p = b.initialPrice as Record<string, unknown>;
  if (p.type === "amount") {
    if (typeof p.amount !== "number" || p.amount <= 0) {
      throw validationError([{ field: "initialPrice.amount", reason: "AMOUNT_NOT_NULL" }]);
    }
    return { type: "amount", amount: p.amount };
  }
  if (p.type === "negotiable") {
    if (p.amount !== null && p.amount !== undefined) {
      throw validationError([{ field: "initialPrice.amount", reason: "AMOUNT_NULL_REQUIRED" }]);
    }
    return { type: "negotiable", amount: null };
  }
  throw validationError([{ field: "initialPrice.type", reason: "TYPE" }]);
}

adminVehiclesRouter.post("/admin/vehicles", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const idempotencyKey = req.header("Idempotency-Key");
    if (!idempotencyKey) throw idempotencyKeyRequired();

    const input = validateCreateRequest(req.body);
    const initialPrice = validateInitialPrice(req.body);
    const requestHash = hashRequestBody(req.body);

    await client.query("BEGIN");

    const existing = await findIdempotencyKey(client, idempotencyKey);
    if (existing) {
      if (existing.requestHash !== requestHash) {
        await client.query("ROLLBACK");
        throw new AppError("IDEMPOTENCY_KEY_CONFLICT", 409, "幂等键已用于不同请求");
      }
      await client.query("COMMIT");
      const vehicle = existing.responseBody as ReturnType<typeof toAdminVehicle>;
      res.status(200).set("ETag", etag(vehicle.version)).json(vehicle);
      return;
    }

    const row = await insertVehicle(client, input);
    if (initialPrice) {
      await insertInitialPriceRecord(client, Number(row.id), initialPrice, req.operatorId);
    }
    const vehicle = toAdminVehicle(row);
    await saveIdempotencyKey(client, {
      key: idempotencyKey,
      requestHash,
      vehicleId: Number(row.id),
      responseStatus: 201,
      responseBody: vehicle,
    });

    await client.query("COMMIT");
    res
      .status(201)
      .set("ETag", etag(vehicle.version))
      .set("Location", `/admin/vehicles/${vehicle.id}`)
      .json(vehicle);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    next(err);
  } finally {
    client.release();
  }
});

adminVehiclesRouter.get("/admin/vehicles", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as "draft" | "published" | "unpublished" | undefined;
    if (status !== undefined && !["draft", "published", "unpublished"].includes(status)) {
      throw validationError([{ field: "status", reason: "TYPE" }]);
    }
    const q = typeof req.query.q === "string" && req.query.q.length > 0 ? req.query.q : undefined;

    const page = req.query.page !== undefined ? Number(req.query.page) : 1;
    if (!Number.isInteger(page) || page < 1) throw validationError([{ field: "page", reason: "TYPE" }]);

    const pageSize = req.query.pageSize !== undefined ? Number(req.query.pageSize) : 20;
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      throw validationError([{ field: "pageSize", reason: "TYPE" }]);
    }

    const client = await pool.connect();
    try {
      const { items, total } = await listVehicles(client, { status, q, page, pageSize });
      res.status(200).json({
        items: items.map(toAdminVehicle),
        page,
        pageSize,
        total,
      });
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

adminVehiclesRouter.get("/admin/vehicles/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseVehicleId(req.params.id);
    const client = await pool.connect();
    try {
      const row = await getVehicleById(client, id);
      if (!row) throw notFound();
      const vehicle = toAdminVehicle(row);
      res.status(200).set("ETag", etag(vehicle.version)).json(vehicle);
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

adminVehiclesRouter.patch("/admin/vehicles/:id", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const id = parseVehicleId(req.params.id);
    const bodyVersion = extractBodyVersion(req.body);
    const requestedVersion = resolveRequestedVersion(bodyVersion, req.header("If-Match"));
    const patch = validatePatchRequest(req.body);

    await client.query("BEGIN");
    const row = await getVehicleForUpdate(client, id);
    if (!row) {
      await client.query("ROLLBACK");
      throw notFound();
    }
    if (row.trashed_at !== null) {
      await client.query("ROLLBACK");
      throw vehicleInRecycleBin();
    }
    if (Number(row.version) !== requestedVersion) {
      await client.query("ROLLBACK");
      throw versionConflict();
    }

    const fields = mergePatch(row, patch);
    const updated = await updateVehicleFields(client, id, fields);
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

function extractBodyVersion(body: unknown): number | null | undefined {
  if (typeof body !== "object" || body === null) return undefined;
  const v = (body as Record<string, unknown>).version;
  if (v === undefined) return undefined;
  if (typeof v !== "number" || !Number.isInteger(v)) {
    throw validationError([{ field: "version", reason: "TYPE" }]);
  }
  return v;
}

adminVehiclesRouter.post("/admin/vehicles/:id/publish", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const id = parseVehicleId(req.params.id);

    await client.query("BEGIN");
    const row = await getVehicleForUpdate(client, id);
    if (!row) {
      await client.query("ROLLBACK");
      throw notFound();
    }
    if (row.trashed_at !== null) {
      await client.query("ROLLBACK");
      throw vehicleInRecycleBin();
    }

    const plan = planPublish(row.status);
    if (plan.kind === "idempotent") {
      await client.query("COMMIT");
      const vehicle = toAdminVehicle(row);
      res.status(200).set("ETag", etag(vehicle.version)).json(vehicle);
      return;
    }

    let imageCount: number;
    let priceFilled: boolean;
    try {
      imageCount = await countImages(client, id);
      priceFilled = await isPriceFilled(client, id);
    } catch {
      await client.query("ROLLBACK");
      throw internalError();
    }

    const precondition = evaluatePublishPrecondition(imageCount, priceFilled);
    if (!precondition.ok) {
      await client.query("ROLLBACK");
      throw publishPreconditionFailed(precondition.missing, imageCount, priceFilled);
    }

    const updated = await updateVehicleStatus(client, id, "published");
    await insertOperationLog(client, {
      operatorId: req.operatorId,
      action: "publish",
      vehicleId: id,
      detail: { from: row.status, to: "published" },
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

adminVehiclesRouter.post("/admin/vehicles/:id/unpublish", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const id = parseVehicleId(req.params.id);

    await client.query("BEGIN");
    const row = await getVehicleForUpdate(client, id);
    if (!row) {
      await client.query("ROLLBACK");
      throw notFound();
    }
    if (row.trashed_at !== null) {
      await client.query("ROLLBACK");
      throw vehicleInRecycleBin();
    }

    const plan = planUnpublish(row.status);
    if (plan.kind === "idempotent") {
      await client.query("COMMIT");
      const vehicle = toAdminVehicle(row);
      res.status(200).set("ETag", etag(vehicle.version)).json(vehicle);
      return;
    }
    if (plan.kind === "illegal") {
      await client.query("ROLLBACK");
      throw illegalStatusTransition(row.status, "unpublish");
    }

    const updated = await updateVehicleStatus(client, id, "unpublished");
    await insertOperationLog(client, {
      operatorId: req.operatorId,
      action: "unpublish",
      vehicleId: id,
      detail: { from: row.status, to: "unpublished" },
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
