import { Router, type Request, type Response, type NextFunction } from "express";
import { pool } from "../db/pool";
import { requirePublishedVehicle } from "../services/vehicleGuards";
import { listImages } from "../db/imageRepo";
import { listReports } from "../db/reportRepo";
import { getCurrentPrice, listPriceRecords } from "../db/priceRepo";
import { toPublicImage, toPublicReport } from "../models/media";
import { toPublicPriceRecord } from "../models/price";
import { validationError } from "../lib/errors";

export const publicMediaRouter = Router();

function parseId(raw: string, field: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw validationError([{ field, reason: "TYPE" }]);
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

publicMediaRouter.get("/public/vehicles/:id/images", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const vehicleId = parseId(req.params.id, "id");
    await requirePublishedVehicle(client, vehicleId);
    const rows = await listImages(client, vehicleId);
    res.status(200).json({ items: rows.map(toPublicImage) });
  } catch (err) {
    next(err);
  } finally {
    client.release();
  }
});

publicMediaRouter.get("/public/vehicles/:id/reports", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const vehicleId = parseId(req.params.id, "id");
    await requirePublishedVehicle(client, vehicleId);
    const rows = await listReports(client, vehicleId);
    res.status(200).json({ items: rows.map(toPublicReport) });
  } catch (err) {
    next(err);
  } finally {
    client.release();
  }
});

publicMediaRouter.get("/public/vehicles/:id/price", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const vehicleId = parseId(req.params.id, "id");
    await requirePublishedVehicle(client, vehicleId);
    const current = await getCurrentPrice(client, vehicleId);
    res.status(200).json({ filled: current !== null, current });
  } catch (err) {
    next(err);
  } finally {
    client.release();
  }
});

publicMediaRouter.get("/public/vehicles/:id/price-records", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const vehicleId = parseId(req.params.id, "id");
    const page = parsePage(req.query.page);
    const pageSize = parsePageSize(req.query.pageSize);

    await requirePublishedVehicle(client, vehicleId);
    const { items, total } = await listPriceRecords(client, vehicleId, page, pageSize);
    res.status(200).json({ items: items.map(toPublicPriceRecord), page, pageSize, total });
  } catch (err) {
    next(err);
  } finally {
    client.release();
  }
});
