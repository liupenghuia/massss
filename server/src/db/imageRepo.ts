import type { PoolClient } from "pg";
import type { ImageContentType } from "../lib/media";

/**
 * F-003 内部方法 countImages（契约 internal.yaml）。本期 F-003 管理端接口未实现，
 * 但 vehicle_images 表已建好，直接按已确认落库的图片数计数。
 * 车辆不存在 / 查询失败一律向上抛错，不得返回 0。
 */
export async function countImages(client: PoolClient, vehicleId: number): Promise<number> {
  const result = await client.query<{ count: string }>(
    "SELECT count(*)::text AS count FROM vehicle_images WHERE vehicle_id = $1",
    [vehicleId]
  );
  return Number(result.rows[0].count);
}

export interface ImageRow {
  id: string;
  vehicle_id: string;
  object_key: string;
  url: string;
  caption: string;
  content_type: ImageContentType;
  byte_size: string;
  sort_order: number;
  created_at: Date;
}

export async function listImages(client: PoolClient, vehicleId: number): Promise<ImageRow[]> {
  const result = await client.query<ImageRow>(
    "SELECT * FROM vehicle_images WHERE vehicle_id = $1 ORDER BY sort_order ASC, id ASC",
    [vehicleId]
  );
  return result.rows;
}

export async function findImageByObjectKey(client: PoolClient, objectKey: string): Promise<ImageRow | null> {
  const result = await client.query<ImageRow>("SELECT * FROM vehicle_images WHERE object_key = $1", [objectKey]);
  return result.rows[0] ?? null;
}

export async function getImage(client: PoolClient, vehicleId: number, imageId: number): Promise<ImageRow | null> {
  const result = await client.query<ImageRow>(
    "SELECT * FROM vehicle_images WHERE id = $1 AND vehicle_id = $2",
    [imageId, vehicleId]
  );
  return result.rows[0] ?? null;
}

export interface InsertImageParams {
  vehicleId: number;
  objectKey: string;
  url: string;
  caption: string;
  contentType: ImageContentType;
  byteSize: number;
}

/** 新增图片追加到排序末尾（当前最大 sort_order + 1）。调用方需已在事务内锁定车辆行。 */
export async function insertImage(client: PoolClient, params: InsertImageParams): Promise<ImageRow> {
  const result = await client.query<ImageRow>(
    `INSERT INTO vehicle_images (vehicle_id, object_key, url, caption, content_type, byte_size, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6,
       COALESCE((SELECT max(sort_order) + 1 FROM vehicle_images WHERE vehicle_id = $1), 0))
     RETURNING *`,
    [params.vehicleId, params.objectKey, params.url, params.caption, params.contentType, params.byteSize]
  );
  return result.rows[0];
}

export async function updateImageCaption(client: PoolClient, imageId: number, caption: string): Promise<ImageRow> {
  const result = await client.query<ImageRow>(
    "UPDATE vehicle_images SET caption = $2 WHERE id = $1 RETURNING *",
    [imageId, caption]
  );
  return result.rows[0];
}

export async function deleteImage(client: PoolClient, imageId: number): Promise<void> {
  await client.query("DELETE FROM vehicle_images WHERE id = $1", [imageId]);
}

/** 一次性提交全排列顺序；调用方须已用 validateImageOrder 校验过合法性。 */
export async function reorderImages(client: PoolClient, imageIds: number[]): Promise<void> {
  for (let i = 0; i < imageIds.length; i += 1) {
    await client.query("UPDATE vehicle_images SET sort_order = $2 WHERE id = $1", [imageIds[i], i]);
  }
}
