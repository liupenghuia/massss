const buckets = new Map<string, Map<string, number[]>>();

function hit(bucket: string, ip: string, windowMs: number, maxAttempts: number): boolean {
  const store = buckets.get(bucket) ?? new Map<string, number[]>();
  buckets.set(bucket, store);
  const now = Date.now();
  const recent = (store.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= maxAttempts) {
    store.set(ip, recent);
    return true;
  }
  recent.push(now);
  store.set(ip, recent);
  return false;
}

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 30;

/** 登录接口 IP 级限流，防止跨账号撞库。超出返回 true。 */
export function isIpRateLimited(ip: string): boolean {
  return hit("login", ip, LOGIN_WINDOW_MS, LOGIN_MAX_ATTEMPTS);
}

// 公开只读接口限流阈值：仓库 spec 未给出具体数值，此处为默认值，如需调整可修改这两个常量。
const PUBLIC_WINDOW_MS = 60 * 1000;
const PUBLIC_MAX_ATTEMPTS = 1000;

/** 公开只读接口 IP 级限流，防止爬取/刷接口。超出返回 true。 */
export function isPublicIpRateLimited(ip: string): boolean {
  return hit("public", ip, PUBLIC_WINDOW_MS, PUBLIC_MAX_ATTEMPTS);
}
