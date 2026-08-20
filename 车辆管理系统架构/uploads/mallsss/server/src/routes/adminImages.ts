import { Router, type Request, type Response, type NextFunction } from "express";
import { pool } from "../db/pool";

import { getObjectStorage } from "../lib/objectStorage";
import {
  buildImageObjectKey,
  classifyObjectKeyConfirm,
  isImageContentType,
  objectKeyBelongsToVehicleImages,
  resolveCaption,
  IMAGE_MAX_BYTES,
  IMAGE_COUNT_WARN_THRESHOLD,
} from "../lib/media";
import { validateImageOrder } from "../lib/imageOrder";
import { requireVehicleForWrite, requireVehicle } from "../services/vehicleGuards";
import {
  countImages,
  deleteImage,
  findImageByObjectKey,
  getImage,
  insertImage,
  listImages,
  reorderImages,
  updateImageCaption,
} from "../db/imageRepo";
import { toAdminImage } from "../models/media";
import {
  fileTooLarge,
  imageNotFound,
  imageOrderMismatch,
  invalidContentType,
  invalidObjectKey,
  objectNotUploaded,
  publishedImageMin,
  validationError,
} from "../lib/errors";
import { insertOperationLog } from "../db/operationLogRepo";

export const adminImagesRouter = Router();

function parseId(raw: string, field: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw validationError([{ field, reason: "TYPE" }]);
  return id;
}

adminImagesRouter.post("/admin/vehicles/:id/images/presign", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const vehicleId = parseId(req.params.id, "id");
    await requireVehicleForWrite(client, vehicleId);

    const body = (req.body ?? {}) as Record<string, unknown>;
    const contentType = body.contentType;
    if (typeof contentType !== "string" || !isImageContentType(contentType)) throw invalidContentType();

    const byteSize = body.byteSize;
    if (typeof byteSize !== "number" || !Number.isInteger(byteSize) || byteSize <= 0) {
      throw validationError([{ field: "byteSize", reason: "TYPE" }]);
    }
    if (byteSize > IMAGE_MAX_BYTES) throw fileTooLarge();

    const objectKey = buildImageObjectKey(vehicleId, contentType);
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

adminImagesRouter.post("/admin/vehicles/:id/images", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const vehicleId = parseId(req.params.id, "id");

    const body = (req.body ?? {}) as Record<string, unknown>;
    const objectKey = body.objectKey;
    if (typeof objectKey !== "string" || objectKey.length < 1) {
      throw validationError([{ field: "objectKey", reason: "REQUIRED" }]);
    }
    const caption = resolveCaption(body.caption);

    await client.query("BEGIN");
    await requireVehicleForWrite(client, vehicleId, true);

    const existing = await findImageByObjectKey(client, objectKey);
    const outcome = classifyObjectKeyConfirm(
      existing ? Number(existing.vehicle_id) : null,
      vehicleId,
      objectKeyBelongsToVehicleImages(objectKey, vehicleId)
    );

    if (outcome === "invalid") {
      await client.query("ROLLBACK");
      throw invalidObjectKey();
    }
    if (outcome === "idempotent") {
      await client.query("COMMIT");
      res.status(200).json(toAdminImage(existing!));
      return;
    }

    const head = await getObjectStorage().headObject(objectKey);
    if (!head.exists) {
      await client.query("ROLLBACK");
      throw objectNotUploaded();
    }

    const contentType = objectKey.endsWith(".png") ? "image/png" : objectKey.endsWith(".webp") ? "image/webp" : "image/jpeg";
    const url = getObjectStorage().publicUrl(objectKey);

    // 契约的 ConfirmImageRequest 不带 byteSize，服务端从存储 head 结果取真实大小；
    // mock 适配器探测不到真实文件时退回 1 字节占位（见任务总结中的假设说明）。
    const row = await insertImage(client, {
      vehicleId,
      objectKey,
      url,
      caption,
      contentType,
      byteSize: head.size ?? 1,
    });

    await insertOperationLog(client, {
      operatorId: req.operatorId,
      action: "confirm_image",
      vehicleId,
      detail: { imageId: Number(row.id), objectKey },
    });

    const count = await countImages(client, vehicleId);
    await client.query("COMMIT");

    if (count > IMAGE_COUNT_WARN_THRESHOLD) {
      // 单车图片超 100 张只告警不阻断（ADR-009）
      console.warn(`[F-003] vehicle ${vehicleId} image count ${count} exceeds warn threshold`);
    }

    res.status(201).json(toAdminImage(row));
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    next(err);
  } finally {
    client.release();
  }
});

adminImagesRouter.get("/admin/vehicles/:id/images", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const vehicleId = parseId(req.params.id, "id");
    await requireVehicle(client, vehicleId);
    const rows = await listImages(client, vehicleId);
    res.status(200).json({ items: rows.map(toAdminImage) });
  } catch (err) {
    next(err);
  } finally {
    client.release();
  }
});

// 路由字面量 order 必须排在 :imageId 之前（契约要求）。
adminImagesRouter.put("/admin/vehicles/:id/images/order", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const vehicleId = parseId(req.params.id, "id");
    const body = (req.body ?? {}) as Record<string, unknown>;
    const imageIds = body.imageIds;
    if (!Array.isArray(imageIds) || imageIds.some((v) => typeof v !== "number" || !Number.isInteger(v) || v < 1)) {
      throw validationError([{ field: "imageIds", reason: "TYPE" }]);
    }

    await client.query("BEGIN");
    await requireVehicleForWrite(client, vehicleId, true);

    const current = await listImages(client, vehicleId);
    const currentIds = current.map((row) => Number(row.id));
    const result = validateImageOrder(currentIds, imageIds as number[]);
    if (!result.ok) {
      await client.query("ROLLBACK");
      throw imageOrderMismatch({ reason: result.reason });
    }

    await reorderImages(client, imageIds as number[]);
    await insertOperationLog(client, {
      operatorId: req.operatorId,
      action: "reorder_images",
      vehicleId,
      detail: { imageIds },
    });
    await client.query("COMMIT");

    const updated = await listImages(client, vehicleId);
    res.status(200).json({ items: updated.map(toAdminImage) });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    next(err);
  } finally {
    client.release();
  }
});

adminImagesRouter.patch("/admin/vehicles/:id/images/:imageId", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const vehicleId = parseId(req.params.id, "id");
    const imageId = parseId(req.params.imageId, "imageId");

    const body = (req.body ?? {}) as Record<string, unknown>;
    if (typeof body.caption !== "string") throw validationError([{ field: "caption", reason: "REQUIRED" }]);

    await client.query("BEGIN");
    await requireVehicle(client, vehicleId);
    const image = await getImage(client, vehicleId, imageId);
    if (!image) {
      await client.query("ROLLBACK");
      throw imageNotFound();
    }

    const updated = await updateImageCaption(client, imageId, body.caption);
    await client.query("COMMIT");
    res.status(200).json(toAdminImage(updated));
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    next(err);
  } finally {
    client.release();
  }
});

adminImagesRouter.delete("/admin/vehicles/:id/images/:imageId", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const vehicleId = parseId(req.params.id, "id");
    const imageId = parseId(req.params.imageId, "imageId");

    await client.query("BEGIN");
    const vehicle = await requireVehicleForWrite(client, vehicleId, true);
    const image = await getImage(client, vehicleId, imageId);
    if (!image) {
      await client.query("ROLLBACK");
      throw imageNotFound();
    }

    if (vehicle.status === "published") {
      const count = await countImages(client, vehicleId);
      if (count - 1 < 4) {
        await client.query("ROLLBACK");
        throw publishedImageMin();
      }
    }

    await deleteImage(client, imageId);
    await getObjectStorage()
      .deleteObject(image.object_key)
      .catch(() => undefined); // 物理删除对象存储文件失败不阻塞元数据删除，避免残留脏状态挡住用户重试
    await insertOperationLog(client, {
      operatorId: req.operatorId,
      action: "delete_image",
      vehicleId,
      detail: { imageId },
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
