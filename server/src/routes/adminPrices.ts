import { Router, type Request, type Response, type NextFunction } from "express";
import { pool } from "../db/pool";
import { requireVehicleForWrite, requireVehicle } from "../services/vehicleGuards";
import { getCurrentPrice, insertPriceRecord, listPriceRecords } from "../db/priceRepo";
import { toAdminPriceRecord } from "../models/price";
import { planPriceChange, type PriceValue } from "../lib/priceChange";
import { validationError } from "../lib/errors";

export const adminPricesRouter = Router();

function parseId(raw: string, field: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) throw validationError([{ field, reason: "TYPE" }]);
  return id;
}

function parsePriceValue(body: unknown): PriceValue {
  if (typeof body !== "object" || body === null) throw validationError([{ field: "type", reason: "TYPE" }]);
  const b = body as Record<string, unknown>;
  if (b.type === "amount") {
    const isTwoDecimalPlaces = typeof b.amount === "number" && Math.abs(b.amount * 100 - Math.round(b.amount * 100)) < 1e-9;
    if (typeof b.amount !== "number" || !(b.amount > 0) || !isTwoDecimalPlaces) {
      throw validationError([{ field: "amount", reason: "AMOUNT_NOT_NULL" }]);
    }
    return { type: "amount", amount: b.amount };
  }
  if (b.type === "negotiable") {
    if (b.amount !== null) throw validationError([{ field: "amount", reason: "AMOUNT_NULL_REQUIRED" }]);
    return { type: "negotiable", amount: null };
  }
  throw validationError([{ field: "type", reason: "TYPE" }]);
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

adminPricesRouter.put("/admin/vehicles/:id/price", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const vehicleId = parseId(req.params.id, "id");
    const nextPrice = parsePriceValue(req.body);

    await client.query("BEGIN");
    await requireVehicleForWrite(client, vehicleId, true);

    const current = await getCurrentPrice(client, vehicleId);
    const plan = planPriceChange(current, nextPrice);

    if (plan.unchanged) {
      await client.query("COMMIT");
      res.status(200).json({ unchanged: true, filled: true, current });
      return;
    }

    await insertPriceRecord(client, {
      vehicleId,
      fromType: plan.from.type,
      fromAmount: plan.from.type === "amount" ? plan.from.amount : null,
      toType: plan.to.type,
      toAmount: plan.to.type === "amount" ? plan.to.amount : null,
      operatorId: req.operatorId,
    });

    await client.query("COMMIT");
    res.status(200).json({ unchanged: false, filled: true, current: plan.to });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    next(err);
  } finally {
    client.release();
  }
});

adminPricesRouter.get("/admin/vehicles/:id/price", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const vehicleId = parseId(req.params.id, "id");
    await requireVehicle(client, vehicleId);
    const current = await getCurrentPrice(client, vehicleId);
    res.status(200).json({ filled: current !== null, current });
  } catch (err) {
    next(err);
  } finally {
    client.release();
  }
});

adminPricesRouter.get("/admin/vehicles/:id/price-records", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const vehicleId = parseId(req.params.id, "id");
    const page = parsePage(req.query.page);
    const pageSize = parsePageSize(req.query.pageSize);

    await requireVehicle(client, vehicleId);
    const { items, total } = await listPriceRecords(client, vehicleId, page, pageSize);
    res.status(200).json({ items: items.map(toAdminPriceRecord), page, pageSize, total });
  } catch (err) {
    next(err);
  } finally {
    client.release();
  }
});
