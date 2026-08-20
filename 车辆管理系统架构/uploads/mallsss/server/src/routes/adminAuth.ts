import { Router, type Request, type Response, type NextFunction } from "express";
import {
  findAccountById,
  findAccountByLoginName,
  recordLoginFailure,
  recordLoginSuccess,
  updatePassword,
} from "../db/accountRepo";
import { insertSession, revokeAllSessionsForAccount, revokeSession } from "../db/sessionRepo";
import {
  accountDisabled,
  accountLocked,
  invalidCredentials,
  unauthorized,
  validationError,
} from "../lib/errors";
import { isIpRateLimited } from "../lib/ipRateLimit";
import { hashPassword, newSessionToken, passwordMeetsPolicy, verifyPassword } from "../lib/password";

export const adminAuthRouter = Router();

const COOKIE = "admin_session";
const COOKIE_MAX_AGE = 8 * 60 * 60 * 1000;

function cookieOpts() {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "strict" as const,
    path: "/admin",
    maxAge: COOKIE_MAX_AGE,
  };
}

function clientIp(req: Request): string {
  const xf = req.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return req.ip ?? "unknown";
}

function sessionInfo(account: { id: number; login_name: string; role: "admin" | "super_admin"; must_change_password: boolean }) {
  return {
    accountId: account.id,
    loginName: account.login_name,
    role: account.role,
    mustChangePassword: account.must_change_password,
  };
}

adminAuthRouter.post("/admin/auth/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (isIpRateLimited(clientIp(req))) {
      throw invalidCredentials();
    }
    const loginName = typeof req.body?.loginName === "string" ? req.body.loginName : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!loginName || !password) {
      throw validationError([
        { field: "loginName", reason: "REQUIRED" },
        { field: "password", reason: "REQUIRED" },
      ]);
    }

    const account = await findAccountByLoginName(loginName);
    const dummyHash = "$2a$12$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const hash = account?.password_hash ?? dummyHash;
    const ok = await verifyPassword(password, hash);

    if (!account) {
      throw invalidCredentials();
    }

    const locked = account.locked_until && account.locked_until.getTime() > Date.now();
    if (!ok) {
      const after = await recordLoginFailure(account.id);
      if (after.locked_until && after.locked_until.getTime() > Date.now()) {
        throw accountLocked();
      }
      throw invalidCredentials();
    }
    if (locked) {
      throw accountLocked();
    }
    if (!account.enabled) {
      throw accountDisabled();
    }

    await recordLoginSuccess(account.id);
    const token = newSessionToken();
    await insertSession(token, account.id);
    res.cookie(COOKIE, token, cookieOpts());
    const fresh = await findAccountById(account.id);
    res.status(200).json(sessionInfo(fresh!));
  } catch (err) {
    next(err);
  }
});

adminAuthRouter.post("/admin/auth/logout", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.[COOKIE] as string | undefined;
    if (token) await revokeSession(token);
    res.clearCookie(COOKIE, { path: "/admin" });
    res.status(200).end();
  } catch (err) {
    next(err);
  }
});

adminAuthRouter.post("/admin/auth/password", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.authAccount) throw unauthorized();
    const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
    const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";
    if (!currentPassword || !newPassword) {
      throw validationError([
        { field: "currentPassword", reason: "REQUIRED" },
        { field: "newPassword", reason: "REQUIRED" },
      ]);
    }
    if (!passwordMeetsPolicy(newPassword)) {
      throw validationError([{ field: "newPassword", reason: "TYPE" }]);
    }
    const account = await findAccountById(req.authAccount.id);
    if (!account) throw unauthorized();
    const ok = await verifyPassword(currentPassword, account.password_hash);
    if (!ok) throw invalidCredentials();
    await updatePassword(account.id, await hashPassword(newPassword), false);
    await revokeAllSessionsForAccount(account.id);
    res.clearCookie(COOKIE, { path: "/admin" });
    res.status(200).end();
  } catch (err) {
    next(err);
  }
});
