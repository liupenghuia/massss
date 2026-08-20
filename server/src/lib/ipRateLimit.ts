const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 30;

const hits = new Map<string, number[]>();

/** 登录接口 IP 级限流，防止跨账号撞库。超出返回 true。 */
export function isIpRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}
