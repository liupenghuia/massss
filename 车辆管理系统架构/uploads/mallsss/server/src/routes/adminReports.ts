import { Router, type Request, type Response, type NextFunction } from "express";
import { pool } from "../db/pool";
import { getObjectStorage } from "../lib/objectStorage";
import {
  buildReportObjectKey,
  classifyObjectKeyConfirm,
  isReportContentType,
  objectKeyBelongsToVehicleReports,
  REPORT_MAX_BYTES,
} from "../lib/media";
import { requireVehicleForWrite, requireVehicle } from "../services/vehicleGuards";
import { deleteReport, findReportByObjectKey, getReport, insertReport, listReports } from "../db/reportRepo";
import { toAdminReport } from "../models/media";
import { fileTooLarge, invalidContentType, invalidObjectKey, objectNotUploaded, reportNotFound, validationError } from "../lib/errors";
import { insertOperationLog } from "../db/operationLogRepo";

export const adminReportsRouter = Router();

function parseId(raw: string, field: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw validationError([{ field, reason: "TYPE" }]);
  return id;
}

adminReportsRouter.post("/admin/vehicles/:id/reports/presign", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const vehicleId = parseId(req.params.id, "id");
    await requireVehicleForWrite(client, vehicleId);

    const body = (req.body ?? {}) as Record<string, unknown>;
    const contentType = body.contentType;
    if (typeof contentType !== "string" || !isReportContentType(contentType)) throw invalidContentType();

    const byteSize = body.byteSize;
    if (typeof byteSize !== "number" || !Number.isInteger(byteSize) || byteSize <= 0) {
      throw validationError([{ field: "byteSize", reason: "TYPE" }]);
    }
    if (byteSize > REPORT_MAX_BYTES) throw fileTooLarge();

    const objectKey = buildReportObjectKey(vehicleId, contentType);
    const presigned = await getObjectStorage().presignUpload({ objectKey, contentType });

    res.status(200).json({
      uploadUrl: presigned.uploadUrl,
      objectKey,
      expiresAt: presigned.expiresAt,
      requiredHeaders: presigned.requiredHeaders,
    });
  } catch (err) {
    next(err);
  } finally {
    client.release();
  }
});

adminReportsRouter.post("/admin/vehicles/:id/reports", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const vehicleId = parseId(req.params.id, "id");

    const body = (req.body ?? {}) as Record<string, unknown>;
    const objectKey = body.objectKey;
    if (typeof objectKey !== "string" || objectKey.length < 1) {
      throw validationError([{ field: "objectKey", reason: "REQUIRED" }]);
    }

    await client.query("BEGIN");
    await requireVehicleForWrite(client, vehicleId, true);

    const existing = await findReportByObjectKey(client, objectKey);
    const outcome = classifyObjectKeyConfirm(
      existing ? Number(existing.vehicle_id) : null,
      vehicleId,
      objectKeyBelongsToVehicleReports(objectKey, vehicleId)
    );

    if (outcome === "invalid") {
      await client.query("ROLLBACK");
      throw invalidObjectKey();
    }
    if (outcome === "idempotent") {
      await client.query("COMMIT");
      res.status(200).json(toAdminReport(existing!));
      return;
    }

    const head = await getObjectStorage().headObject(objectKey);
    if (!head.exists) {
      await client.query("ROLLBACK");
      throw objectNotUploaded();
    }

    const contentType = objectKey.endsWith(".pdf") ? "application/pdf" : objectKey.endsWith(".png") ? "image/png" : "image/jpeg";
    const url = getObjectStorage().publicUrl(objectKey);

    const row = await insertReport(client, {
      vehicleId,
      objectKey,
      url,
      contentType,
      byteSize: head.size ?? 1,
    });

    await insertOperationLog(client, {
      operatorId: req.operatorId,
      action: "confirm_report",
      vehicleId,
      detail: { reportId: Number(row.id), objectKey },
    });

    await client.query("COMMIT");
    res.status(201).json(toAdminReport(row));
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    next(err);
  } finally {
    client.release();
  }
});

adminReportsRouter.get("/admin/vehicles/:id/reports", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const vehicleId = parseId(req.params.id, "id");
    await requireVehicle(client, vehicleId);
    const rows = await listReports(client, vehicleId);
    res.status(200).json({ items: rows.map(toAdminReport) });
  } catch (err) {
    next(err);
  } finally {
    client.release();
  }
});

adminReportsRouter.delete("/admin/vehicles/:id/reports/:reportId", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const vehicleId = parseId(req.params.id, "id");
    const reportId = parseId(req.params.reportId, "reportId");

    await client.query("BEGIN");
    await requireVehicleForWrite(client, vehicleId, true);
    const report = await getReport(client, vehicleId, reportId);
    if (!report) {
      await client.query("ROLLBACK");
      throw reportNotFound();
    }

    await deleteReport(client, reportId);
    await getObjectStorage()
      .deleteObject(report.object_key)
      .catch(() => undefined);
    await insertOperationLog(client, {
      operatorId: req.operatorId,
      action: "delete_report",
      vehicleId,
      detail: { reportId },
    });
    await client.query("COMMIT");
    res.status(204).send();
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    next(err);
  } finally {
    client.release();
  }
});
