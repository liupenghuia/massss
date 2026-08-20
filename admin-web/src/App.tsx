import { useState, type FormEvent } from "react";

type Session = {
  accountId: number;
  loginName: string;
  role: "admin" | "super_admin";
  mustChangePassword: boolean;
};

type Account = {
  id: number;
  loginName: string;
  role: "admin" | "super_admin";
  enabled: boolean;
  mustChangePassword: boolean;
};

type ApiError = { code: string; message: string };

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (res.status === 204 || res.status === 200 && res.headers.get("content-length") === "0") {
    return undefined as T;
  }
  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err = body as ApiError;
    throw new Error(err.message || err.code || res.statusText);
  }
  return body as T;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [newLogin, setNewLogin] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "super_admin">("admin");
  const [oncePassword, setOncePassword] = useState("");

  async function login(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const s = await api<Session>("/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({ loginName, password }),
      });
      setSession(s);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    }
  }

  async function logout() {
    await api("/admin/auth/logout", { method: "POST" });
    setSession(null);
    setAccounts([]);
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/admin/auth/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setSession(null);
      setCurrentPassword("");
      setNewPassword("");
      setError("密码已修改，请重新登录");
    } catch (err) {
      setError(err instanceof Error ? err.message : "改密失败");
    }
  }

  async function loadAccounts() {
    setError("");
    try {
      const data = await api<{ items: Account[] }>("/admin/accounts");
      setAccounts(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "无法加载账号");
    }
  }

  async function createAccount(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const data = await api<{ account: Account; initialPassword: string }>("/admin/accounts", {
        method: "POST",
        body: JSON.stringify({ loginName: newLogin, role: newRole }),
      });
      setOncePassword(data.initialPassword);
      setNewLogin("");
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    }
  }

  async function setEnabled(id: number, enabled: boolean) {
    setError("");
    try {
      await api(`/admin/accounts/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ enabled }),
      });
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    }
  }

  async function resetPassword(id: number) {
    setError("");
    try {
      const data = await api<{ initialPassword: string }>(`/admin/accounts/${id}/password-reset`, {
        method: "POST",
      });
      setOncePassword(data.initialPassword);
    } catch (err) {
      setError(err instanceof Error ? err.message : "重置失败");
    }
  }

  if (!session) {
    return (
      <main style={{ maxWidth: 420, margin: "3rem auto", padding: "0 1rem" }}>
        <h1>管理后台登录</h1>
        <form onSubmit={login}>
          <label>
            登录名
            <input value={loginName} onChange={(e) => setLoginName(e.target.value)} autoComplete="username" />
          </label>
          <label>
            密码
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button type="submit">登录</button>
        </form>
        {error ? <p role="alert">{error}</p> : null}
      </main>
    );
  }

  if (session.mustChangePassword) {
    return (
      <main style={{ maxWidth: 420, margin: "3rem auto", padding: "0 1rem" }}>
        <h1>首次登录请改密</h1>
        <form onSubmit={changePassword}>
          <label>
            当前密码
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </label>
          <label>
            新密码（至少 8 位，含字母和数字）
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </label>
          <button type="submit">保存并重新登录</button>
        </form>
        {error ? <p role="alert">{error}</p> : null}
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>管理后台</h1>
          <p>
            {session.loginName}（{session.role === "super_admin" ? "超级管理员" : "管理员"}）
          </p>
        </div>
        <button type="button" onClick={() => void logout()}>
          退出
        </button>
      </header>
      {error ? <p role="alert">{error}</p> : null}

      <section>
        <h2>修改自己的密码</h2>
        <form onSubmit={changePassword}>
          <label>
            当前密码
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </label>
          <label>
            新密码
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </label>
          <button type="submit">改密</button>
        </form>
      </section>

      {session.role === "super_admin" ? (
        <section>
          <h2>账号管理</h2>
          <button type="button" onClick={() => void loadAccounts()}>
            刷新列表
          </button>
          <form onSubmit={createAccount}>
            <label>
              新登录名
              <input value={newLogin} onChange={(e) => setNewLogin(e.target.value)} />
            </label>
            <label>
              角色
              <select value={newRole} onChange={(e) => setNewRole(e.target.value as "admin" | "super_admin")}>
                <option value="admin">管理员</option>
                <option value="super_admin">超级管理员</option>
              </select>
            </label>
            <button type="submit">新建</button>
          </form>
          {oncePassword ? (
            <p>
              一次性口令（只显示一次）：<code>{oncePassword}</code>
            </p>
          ) : null}
          <ul>
            {accounts.map((a) => (
              <li key={a.id}>
                {a.loginName} · {a.role} · {a.enabled ? "启用" : "停用"}
                <button type="button" onClick={() => void setEnabled(a.id, !a.enabled)}>
                  {a.enabled ? "停用" : "启用"}
                </button>
                <button type="button" onClick={() => void resetPassword(a.id)}>
                  重置密码
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
