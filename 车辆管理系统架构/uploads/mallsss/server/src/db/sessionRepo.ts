import { pool } from "./pool";

const SESSION_TTL = "8 hours";

export async function insertSession(token: string, accountId: number): Promise<void> {
  await pool.query(
    `INSERT INTO admin_sessions (token, account_id, expires_at) VALUES ($1, $2, now() + interval '${SESSION_TTL}')`,
    [token, accountId]
  );
}

export async function findValidSession(token: string): Promise<{ accountId: number } | null> {
  const r = await pool.query<{ account_id: string }>(
    `SELECT account_id FROM admin_sessions
     WHERE token = $1 AND revoked = FALSE AND expires_at > now()`,
    [token]
  );
  if (!r.rows[0]) return null;
  return { accountId: Number(r.rows[0].account_id) };
}

export async function touchSession(token: string): Promise<void> {
  await pool.query(
    `UPDATE admin_sessions
     SET last_seen_at = now(), expires_at = now() + interval '${SESSION_TTL}'
     WHERE token = $1 AND revoked = FALSE`,
    [token]
  );
}

export async function revokeSession(token: string): Promise<void> {
  await pool.query(`UPDATE admin_sessions SET revoked = TRUE WHERE token = $1`, [token]);
}

export async function revokeAllSessionsForAccount(accountId: number): Promise<void> {
  await pool.query(`UPDATE admin_sessions SET revoked = TRUE WHERE account_id = $1`, [accountId]);
}
