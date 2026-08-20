import type { NextFunction, Request, Response } from "express";
import { findAccountById, type AccountRole } from "../db/accountRepo";
import { findValidSession, touchSession } from "../db/sessionRepo";
import { forbidden, mustChangePassword, unauthorized } from "../lib/errors";

export type AuthAccount = {
  id: number;
  loginName: string;
  role: AccountRole;
  mustChangePassword: boolean;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      operatorId: number | null;
      authAccount?: AuthAccount;
    }
  }
}

const COOKIE = "admin_session";

function isAnonymousAdminPath(req: Request): boolean {
  return req.method === "POST" && req.path === "/admin/auth/login";
}

function isPasswordExempt(req: Request): boolean {
  if (req.method !== "POST") return false;
  return req.path === "/admin/auth/password" || req.path === "/admin/auth/logout";
}

export async function adminAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (isAnonymousAdminPath(req)) {
      req.operatorId = null;
      next();
      return;
    }
    if (!req.path.startsWith("/admin")) {
      next();
      return;
    }

    const token = req.cookies?.[COOKIE] as string | undefined;
    if (!token) throw unauthorized();

    const session = await findValidSession(token);
    if (!session) throw unauthorized();

    const account = await findAccountById(session.accountId);
    if (!account || !account.enabled) throw unauthorized();

    await touchSession(token);

    req.operatorId = account.id;
    req.authAccount = {
      id: account.id,
      loginName: account.login_name,
      role: account.role,
      mustChangePassword: account.must_change_password,
    };

    if (account.must_change_password && !isPasswordExempt(req)) {
      throw mustChangePassword();
    }
    next();
  } catch (err) {
    next(err);
  }
}

export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.authAccount || req.authAccount.role !== "super_admin") {
    next(forbidden());
    return;
  }
  next();
}
