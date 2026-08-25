import { pool } from "../db/pool";
import { insertAccount, type AccountRole } from "../db/accountRepo";
import { hashPassword } from "../lib/password";

/** 每个用例开始前清空账号相关表，保证用例间互不干扰。仅用于集成测试库。 */
export async function resetAccountTables(): Promise<void> {
  await pool.query(`TRUNCATE accounts, admin_sessions, operation_logs RESTART IDENTITY CASCADE`);
}

/** 创建一个可直接登录的账号（跳过首次强制改密），返回账号信息与明文密码供登录用。 */
export async function createLoginableAccount(params: {
  loginName: string;
  password: string;
  role: AccountRole;
  enabled?: boolean;
}): Promise<{ id: number; loginName: string; password: string }> {
  const passwordHash = await hashPassword(params.password);
  const account = await insertAccount({
    loginName: params.loginName,
    passwordHash,
    role: params.role,
    mustChangePassword: false,
  });
  if (params.enabled === false) {
    await pool.query(`UPDATE accounts SET enabled = FALSE WHERE id = $1`, [account.id]);
  }
  return { id: account.id, loginName: params.loginName, password: params.password };
}
