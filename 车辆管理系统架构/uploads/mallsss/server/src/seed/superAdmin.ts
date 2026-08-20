import { countAccounts, insertAccount } from "../db/accountRepo";
import { hashPassword } from "../lib/password";

/**
 * 部署种子：环境变量注入首个超管口令，不进仓库。
 * SEED_SUPER_ADMIN_LOGIN / SEED_SUPER_ADMIN_PASSWORD
 */
export async function seedSuperAdminIfNeeded(): Promise<void> {
  const n = await countAccounts();
  if (n > 0) return;
  const login = process.env.SEED_SUPER_ADMIN_LOGIN;
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  if (!login || !password) {
    console.warn("accounts 表为空：未设置 SEED_SUPER_ADMIN_LOGIN / SEED_SUPER_ADMIN_PASSWORD，跳过种子超管");
    return;
  }
  const passwordHash = await hashPassword(password);
  await insertAccount({
    loginName: login,
    passwordHash,
    role: "super_admin",
    mustChangePassword: false,
  });
  console.log(`已创建种子超级管理员: ${login}`);
}
