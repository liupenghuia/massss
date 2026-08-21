import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(plain, passwordHash);
}

/**
 * 密码策略：≥8 且含字母与数字（既有规则）；
 * ADR-105：上限 72 字符；禁止控制字符；其余可打印 UTF-8 不限。
 */
export function passwordMeetsPolicy(plain: string): boolean {
  if (plain.length < 8 || plain.length > 72) return false;
  // 拒绝 C0 控制符与 DEL
  if (/[\u0000-\u001F\u007F]/.test(plain)) return false;
  return /[A-Za-z]/.test(plain) && /[0-9]/.test(plain);
}

/** 随机初始口令：12 位，保证含字母和数字。 */
export function generateInitialPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const all = alphabet + digits;
  const bytes = crypto.randomBytes(12);
  const chars = Array.from(bytes, (b, i) => {
    if (i === 0) return alphabet[b % alphabet.length];
    if (i === 1) return digits[b % digits.length];
    return all[b % all.length];
  });
  return chars.join("");
}

export function newSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
