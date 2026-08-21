import type { NextFunction, Request, Response } from "express";
import { isPublicIpRateLimited } from "../lib/ipRateLimit";

function clientIp(req: Request): string {
  const xf = req.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return req.ip ?? "unknown";
}

/** 公开接口统一挂载：禁止任何中间层缓存 + 基础 IP 限流。 */
export function publicGuard(req: Request, res: Response, next: NextFunction): void {
  res.set("Cache-Control", "no-store");
  if (isPublicIpRateLimited(clientIp(req))) {
    res.status(429).json({ code: "TOO_MANY_REQUESTS", message: "请求过于频繁，请稍后再试", details: {} });
    return;
  }
  next();
}
