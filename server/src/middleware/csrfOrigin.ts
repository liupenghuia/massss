import type { NextFunction, Request, Response } from "express";
import { forbidden } from "../lib/errors";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function loopbackTwin(origin: string): string | null {
  try {
    const url = new URL(origin);
    if (url.hostname === "localhost") {
      url.hostname = "127.0.0.1";
      return url.origin;
    }
    if (url.hostname === "127.0.0.1") {
      url.hostname = "localhost";
      return url.origin;
    }
  } catch {
    return null;
  }
  return null;
}

function allowedOrigins(): Set<string> {
  const primary = process.env.ADMIN_ORIGIN ?? "http://localhost:5174";
  const set = new Set<string>([primary]);
  const twin = loopbackTwin(primary);
  if (twin) set.add(twin);
  return set;
}

/** ADR-031：状态变更校验 Origin。本地允许无 Origin（curl）。localhost 与 127.0.0.1 视为同一后台来源。 */
export function csrfOrigin(req: Request, _res: Response, next: NextFunction): void {
  if (!MUTATING.has(req.method)) {
    next();
    return;
  }
  if (!req.path.startsWith("/admin")) {
    next();
    return;
  }
  const origin = req.get("origin");
  if (!origin) {
    if (process.env.NODE_ENV === "production") {
      next(forbidden());
      return;
    }
    next();
    return;
  }
  if (!allowedOrigins().has(origin)) {
    next(forbidden());
    return;
  }
  next();
}
