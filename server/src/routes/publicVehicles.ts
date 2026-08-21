import { Router, type Request, type Response, type NextFunction } from "express";
import { pool } from "../db/pool";
import { listPublishedVehicles, type PublicListRow } from "../db/vehicleRepo";
import { requirePublishedVehicle } from "../services/vehicleGuards";
import { toPublicVehicle } from "../models/vehicle";
import { validationError } from "../lib/errors";
import type { components } from "../generated/openapi-types";

type PriceValue = components["schemas"]["PriceValue"];
type PublicVehicleSummary = components["schemas"]["PublicVehicleSummary"];

export const publicVehiclesRouter = Router();

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

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw validationError([{ field: "id", reason: "TYPE" }]);
  return id;
}

function parseKeyword(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > 50) throw validationError([{ field: "keyword", reason: "MAX_LENGTH" }]);
  return trimmed;
}

function parseOptionalNumber(raw: unknown, field: string, opts: { integer?: boolean; exclusiveMin?: number; min?: number; max?: number } = {}): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw validationError([{ field, reason: "TYPE" }]);
  if (opts.integer && !Number.isInteger(n)) throw validationError([{ field, reason: "TYPE" }]);
  if (opts.exclusiveMin !== undefined && !(n > opts.exclusiveMin)) throw validationError([{ field, reason: "RANGE" }]);
  if (opts.min !== undefined && n < opts.min) throw validationError([{ field, reason: "RANGE" }]);
  if (opts.max !== undefined && n > opts.max) throw validationError([{ field, reason: "RANGE" }]);
  return n;
}

function toSummary(row: PublicListRow): PublicVehicleSummary {
  // price_amount 库内为分（ADR-074），公开接口输出元
  const currentPrice: PriceValue =
    row.price_type === "amount"
      ? { type: "amount", amount: Number(row.price_amount) / 100 }
      : { type: "negotiable", amount: null };
  return {
    ...toPublicVehicle(row),
    coverImageUrl: row.cover_image_url,
    currentPrice,
  };
}

publicVehiclesRouter.get("/public/vehicles", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parsePage(req.query.page);
    const pageSize = parsePageSize(req.query.pageSize);
    const keyword = parseKeyword(req.query.keyword);
    const priceMin = parseOptionalNumber(req.query.priceMin, "priceMin", { exclusiveMin: 0 });
    const priceMax = parseOptionalNumber(req.query.priceMax, "priceMax", { exclusiveMin: 0 });
    const registrationYearMin = parseOptionalNumber(req.query.registrationYearMin, "registrationYearMin", {
      integer: true,
      min: 1980,
      max: 2100,
    });
    const registrationYearMax = parseOptionalNumber(req.query.registrationYearMax, "registrationYearMax", {
      integer: true,
      min: 1980,
      max: 2100,
    });
    const mileageKmMin = parseOptionalNumber(req.query.mileageKmMin, "mileageKmMin", { integer: true, min: 0 });
    const mileageKmMax = parseOptionalNumber(req.query.mileageKmMax, "mileageKmMax", { integer: true, min: 0 });

    const fieldErrors: Array<{ field: string; reason: string }> = [];
    if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
      fieldErrors.push({ field: "priceMin", reason: "RANGE" });
    }
    if (registrationYearMin !== undefined && registrationYearMax !== undefined && registrationYearMin > registrationYearMax) {
      fieldErrors.push({ field: "registrationYearMin", reason: "RANGE" });
    }
    if (mileageKmMin !== undefined && mileageKmMax !== undefined && mileageKmMin > mileageKmMax) {
      fieldErrors.push({ field: "mileageKmMin", reason: "RANGE" });
    }
    if (fieldErrors.length > 0) throw validationError(fieldErrors);

    const client = await pool.connect();
    try {
      const { items, total } = await listPublishedVehicles(client, {
        keyword,
        priceMin,
        priceMax,
        registrationYearMin,
        registrationYearMax,
        mileageKmMin,
        mileageKmMax,
        page,
        pageSize,
      });
      res.status(200).json({ items: items.map(toSummary), page, pageSize, total });
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

publicVehiclesRouter.get("/public/vehicles/:id", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const id = parseId(req.params.id);
    const row = await requirePublishedVehicle(client, id);
    res.status(200).json(toPublicVehicle(row));
  } catch (err) {
    next(err);
  } finally {
    client.release();
  }
});
