import type { NextFunction, Request, Response } from "express";
import { forbidden } from "../lib/errors";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** ADR-031：状态变更校验 Origin。本地允许无 Origin（curl）。 */
export function csrfOrigin(req: Request, _res: Response, next: NextFunction): void {
  if (!MUTATING.has(req.method)) {
    next();
    return;
  }
  if (!req.path.startsWith("/admin")) {
    next();
    return;
  }
  const allowed = process.env.ADMIN_ORIGIN ?? "http://localhost:5174";
  const origin = req.get("origin");
  if (!origin) {
    if (process.env.NODE_ENV === "production") {
      next(forbidden());
      return;
    }
    next();
    return;
  }
  if (origin !== allowed) {
    next(forbidden());
    return;
  }
  next();
}
