import { Router, type Request, type Response, type NextFunction } from "express";
import { pool } from "../db/pool";
import {
  countActiveSuperAdmins,
  findAccountById,
  insertAccount,
  listAccounts,
  setAccountEnabled,
  setAccountRole,
  toAdminAccount,
  updatePassword,
  type AccountRole,
} from "../db/accountRepo";
import { insertOperationLog } from "../db/operationLogRepo";
import { revokeAllSessionsForAccount } from "../db/sessionRepo";
import {
  accountLoginNameTaken,
  accountNotFound,
  cannotDisableSelf,
  lastSuperAdmin,
  validationError,
} from "../lib/errors";
// cannotDisableSelf 文案覆盖「不能对自己的账号执行此操作」，角色变更同样复用（ADR-109）
import { generateInitialPassword, hashPassword } from "../lib/password";
import { requireSuperAdmin } from "../middleware/adminAuth";

export const adminAccountsRouter = Router();
// 必须带路径：本 router 挂在应用根上，use() 无路径会拦截所有请求（含 /public/*）。
adminAccountsRouter.use("/admin/accounts", requireSuperAdmin);

function parseAccountId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) {
    throw validationError([{ field: "accountId", reason: "TYPE" }]);
  }
  return id;
}

function parsePage(req: Request): { page: number; pageSize: number } {
  const page = Number(req.query.page ?? 1);
  const pageSize = Number(req.query.pageSize ?? 20);
  if (!Number.isInteger(page) || page < 1) throw validationError([{ field: "page", reason: "TYPE" }]);
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
    throw validationError([{ field: "pageSize", reason: "TYPE" }]);
  }
  return { page, pageSize };
}

adminAccountsRouter.post("/admin/accounts", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const loginName = typeof req.body?.loginName === "string" ? req.body.loginName.trim() : "";
    const role = req.body?.role as AccountRole;
    if (!loginName || loginName.length > 50) {
      throw validationError([{ field: "loginName", reason: "REQUIRED" }]);
    }
    if (role !== "admin" && role !== "super_admin") {
      throw validationError([{ field: "role", reason: "TYPE" }]);
    }
    const initialPassword = generateInitialPassword();
    const passwordHash = await hashPassword(initialPassword);
    let account;
    try {
      account = await insertAccount({
        loginName,
        passwordHash,
        role,
        mustChangePassword: true,
      });
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code === "23505") throw accountLoginNameTaken();
      throw e;
    }
    await client.query("BEGIN");
    await insertOperationLog(client, {
      operatorId: req.authAccount!.id,
      action: "account.create",
      vehicleId: null,
      detail: { accountId: account.id, role },
    });
    await client.query("COMMIT");
    res.status(201).json({ account: toAdminAccount(account), initialPassword });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    next(err);
  } finally {
    client.release();
  }
});

adminAccountsRouter.get("/admin/accounts", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, pageSize } = parsePage(req);
    const { rows, total } = await listAccounts(page, pageSize);
    res.status(200).json({
      items: rows.map(toAdminAccount),
      page,
      pageSize,
      total,
    });
  } catch (err) {
    next(err);
  }
});

adminAccountsRouter.post("/admin/accounts/:accountId/status", async (req: Request, res: Response, next: NextFunction) => {
  const client = await pool.connect();
  try {
    const accountId = parseAccountId(req.params.accountId);
    const enabled = req.body?.enabled;
    if (typeof enabled !== "boolean") {
      throw validationError([{ field: "enabled", reason: "TYPE" }]);
    }
    if (accountId === req.authAccount!.id) throw cannotDisableSelf();

    const target = await findAccountById(accountId);
    if (!target) throw accountNotFound();
    if (target.enabled === enabled) {
      res.status(200).json(toAdminAccount(target));
      return;
    }

    await client.query("BEGIN");
    if (!enabled && target.role === "super_admin") {
      const n = await countActiveSuperAdmins(client);
      if (n <= 1) {
        await client.query("ROLLBACK");
        throw lastSuperAdmin();
      }
    }
    const updated = await setAccountEnabled(client, accountId, enabled);
    if (!enabled) await revokeAllSessionsForAccount(accountId);
    await insertOperationLog(client, {
      operatorId: req.authAccount!.id,
      action: enabled ? "account.enable" : "account.disable",
      vehicleId: null,
      detail: { accountId },
    });
    await client.query("COMMIT");
    res.status(200).json(toAdminAccount(updated));
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    next(err);
  } finally {
    client.release();
  }
});

adminAccountsRouter.post("/admin/accounts/:accountId/role", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = parseAccountId(req.params.accountId);
    const role = req.body?.role as AccountRole;
    if (role !== "admin" && role !== "super_admin") {
      throw validationError([{ field: "role", reason: "TYPE" }]);
    }
    // ADR-109：禁止对调用者自己改角色（升级/降级均拒）
    if (accountId === req.authAccount!.id) throw cannotDisableSelf();
    const target = await findAccountById(accountId);
    if (!target) throw accountNotFound();
    if (target.role === role) {
      res.status(200).json(toAdminAccount(target));
      return;
    }
    if (role === "admin" && target.role === "super_admin" && target.enabled) {
      const n = await countActiveSuperAdmins();
      if (n <= 1) throw lastSuperAdmin();
    }
    const updated = await setAccountRole(accountId, role);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await insertOperationLog(client, {
        operatorId: req.authAccount!.id,
        action: "account.role",
        vehicleId: null,
        detail: { accountId, role },
      });
      await client.query("COMMIT");
    } finally {
      client.release();
    }
    res.status(200).json(toAdminAccount(updated));
  } catch (err) {
    next(err);
  }
});

adminAccountsRouter.post("/admin/accounts/:accountId/password-reset", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accountId = parseAccountId(req.params.accountId);
    const target = await findAccountById(accountId);
    if (!target) throw accountNotFound();
    const initialPassword = generateInitialPassword();
    await updatePassword(accountId, await hashPassword(initialPassword), true);
    await revokeAllSessionsForAccount(accountId);
    const updated = await findAccountById(accountId);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await insertOperationLog(client, {
        operatorId: req.authAccount!.id,
        action: "account.password_reset",
        vehicleId: null,
        detail: { accountId },
      });
      await client.query("COMMIT");
    } finally {
      client.release();
    }
    res.status(200).json({ account: toAdminAccount(updated!), initialPassword });
  } catch (err) {
    next(err);
  }
});
