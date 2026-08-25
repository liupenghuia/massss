import type { PoolClient } from "pg";
import { pool } from "./pool";

export type AccountRole = "admin" | "super_admin";

export type AccountRow = {
  id: number;
  login_name: string;
  password_hash: string;
  role: AccountRole;
  enabled: boolean;
  must_change_password: boolean;
  failed_login_count: number;
  locked_until: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

/** pg BIGINT 可能是 string，读出后归一为 number。 */
function normalizeAccountRow(row: AccountRow): AccountRow {
  return { ...row, id: Number(row.id) };
}

export function toAdminAccount(row: AccountRow) {
  return {
    id: Number(row.id),
    loginName: row.login_name,
    role: row.role,
    enabled: row.enabled,
    mustChangePassword: row.must_change_password,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function findAccountByLoginName(loginName: string): Promise<AccountRow | null> {
  const r = await pool.query<AccountRow>(
    `SELECT * FROM accounts WHERE login_name = $1 AND deleted_at IS NULL`,
    [loginName]
  );
  return r.rows[0] ? normalizeAccountRow(r.rows[0]) : null;
}

export async function findAccountById(id: number): Promise<AccountRow | null> {
  const r = await pool.query<AccountRow>(`SELECT * FROM accounts WHERE id = $1 AND deleted_at IS NULL`, [id]);
  return r.rows[0] ? normalizeAccountRow(r.rows[0]) : null;
}

export async function countAccounts(): Promise<number> {
  const r = await pool.query<{ n: string }>(`SELECT count(*)::text AS n FROM accounts WHERE deleted_at IS NULL`);
  return Number(r.rows[0].n);
}

export async function insertAccount(
  params: { loginName: string; passwordHash: string; role: AccountRole; mustChangePassword: boolean }
): Promise<AccountRow> {
  const r = await pool.query<AccountRow>(
    `INSERT INTO accounts (login_name, password_hash, role, must_change_password, enabled)
     VALUES ($1, $2, $3, $4, TRUE)
     RETURNING *`,
    [params.loginName, params.passwordHash, params.role, params.mustChangePassword]
  );
  return normalizeAccountRow(r.rows[0]);
}

export async function listAccounts(page: number, pageSize: number): Promise<{ rows: AccountRow[]; total: number }> {
  const totalR = await pool.query<{ n: string }>(`SELECT count(*)::text AS n FROM accounts WHERE deleted_at IS NULL`);
  const total = Number(totalR.rows[0].n);
  const r = await pool.query<AccountRow>(
    `SELECT * FROM accounts WHERE deleted_at IS NULL ORDER BY id ASC LIMIT $1 OFFSET $2`,
    [pageSize, (page - 1) * pageSize]
  );
  return { rows: r.rows.map(normalizeAccountRow), total };
}

export async function recordLoginFailure(id: number): Promise<AccountRow> {
  const r = await pool.query<AccountRow>(
    `UPDATE accounts
     SET failed_login_count = failed_login_count + 1,
         locked_until = CASE WHEN failed_login_count + 1 >= 5 THEN now() + interval '15 minutes' ELSE locked_until END,
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  return normalizeAccountRow(r.rows[0]);
}

export async function recordLoginSuccess(id: number): Promise<void> {
  await pool.query(
    `UPDATE accounts SET failed_login_count = 0, locked_until = NULL, updated_at = now() WHERE id = $1`,
    [id]
  );
}

export async function updatePassword(
  id: number,
  passwordHash: string,
  mustChangePassword: boolean,
  client?: PoolClient
): Promise<void> {
  await (client ?? pool).query(
    `UPDATE accounts SET password_hash = $2, must_change_password = $3, failed_login_count = 0, locked_until = NULL, updated_at = now() WHERE id = $1`,
    [id, passwordHash, mustChangePassword]
  );
}

export async function setAccountEnabled(client: PoolClient, id: number, enabled: boolean): Promise<AccountRow> {
  // ADR-101：从停用重新启用时强制 must_change_password = true
  const r = enabled
    ? await client.query<AccountRow>(
        `UPDATE accounts
         SET enabled = TRUE, must_change_password = TRUE, updated_at = now()
         WHERE id = $1 RETURNING *`,
        [id]
      )
    : await client.query<AccountRow>(
        `UPDATE accounts SET enabled = FALSE, updated_at = now() WHERE id = $1 RETURNING *`,
        [id]
      );
  return normalizeAccountRow(r.rows[0]);
}

export async function setAccountRole(id: number, role: AccountRole, client?: PoolClient): Promise<AccountRow> {
  const r = await (client ?? pool).query<AccountRow>(
    `UPDATE accounts SET role = $2, updated_at = now() WHERE id = $1 RETURNING *`,
    [id, role]
  );
  return normalizeAccountRow(r.rows[0]);
}

export type DeleteAccountResult = "deleted" | "not_found" | "not_disabled";

/**
 * ADR-119：前置状态检查须用条件更新判断受影响行数，避免并发删除/并发启用的竞态窗口，
 * 不做"先查再改"两步式判断。
 */
export async function deleteAccount(id: number, client?: PoolClient): Promise<DeleteAccountResult> {
  const c = client ?? pool;
  const r = await c.query(
    `UPDATE accounts SET deleted_at = now() WHERE id = $1 AND enabled = FALSE AND deleted_at IS NULL`,
    [id]
  );
  if (r.rowCount && r.rowCount > 0) return "deleted";

  const check = await c.query<{ enabled: boolean; deleted_at: Date | null }>(
    `SELECT enabled, deleted_at FROM accounts WHERE id = $1`,
    [id]
  );
  const row = check.rows[0];
  if (!row || row.deleted_at) return "not_found";
  return "not_disabled";
}

export async function countActiveSuperAdmins(client?: PoolClient): Promise<number> {
  const q = `SELECT count(*)::text AS n FROM accounts WHERE role = 'super_admin' AND enabled = TRUE`;
  const r = client ? await client.query<{ n: string }>(q) : await pool.query<{ n: string }>(q);
  return Number(r.rows[0].n);
}
