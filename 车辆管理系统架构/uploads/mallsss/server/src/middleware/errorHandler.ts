import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.httpStatus).json({ code: err.code, message: err.message, details: err.details });
    return;
  }
  console.error(err);
  res.status(500).json({ code: "INTERNAL_ERROR", message: "服务内部错误", details: {} });
}
