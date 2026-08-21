import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { api } from "../api";
import { useSession } from "../session";

type Account = {
  id: number;
  loginName: string;
  role: "admin" | "super_admin";
  enabled: boolean;
  mustChangePassword: boolean;
};

export function AccountsPage() {
  const { session, setSession } = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [oncePassword, setOncePassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newLogin, setNewLogin] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "super_admin">("admin");
  const [busy, setBusy] = useState(false);

  async function loadAccounts() {
    setError("");
    setLoading(true);
    try {
      const data = await api<{ items: Account[] }>("/admin/accounts");
      setAccounts(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "无法加载账号");
    } finally {
      setLoading(false);
    }
  }

  async function changeOwnPassword(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/admin/auth/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setSession(null);
      navigate("/login", { replace: true, state: { notice: "密码已修改，请重新登录" } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "改密失败");
    } finally {
      setBusy(false);
    }
  }

  async function createAccount(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOncePassword("");
    setBusy(true);
    try {
      const data = await api<{ account: Account; initialPassword: string }>("/admin/accounts", {
        method: "POST",
        body: JSON.stringify({ loginName: newLogin, role: newRole }),
      });
      setOncePassword(data.initialPassword);
      setNewLogin("");
      setNewRole("admin");
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setBusy(false);
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
      setError(err instanceof Error ? err.message : "更新状态失败");
    }
  }

  async function resetPassword(id: number) {
    if (!window.confirm("确认重置该账号密码？旧口令将立即失效。")) return;
    setError("");
    setOncePassword("");
    try {
      const data = await api<{ initialPassword: string }>(`/admin/accounts/${id}/password-reset`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      setOncePassword(data.initialPassword);
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "重置失败");
    }
  }

  useEffect(() => {
    if (session?.role === "super_admin") void loadAccounts();
  }, [session?.role]);

  if (!session) return null;

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>账号管理</h2>
          <p className="page-sub">仅超级管理员可新建、启停与重置他人密码</p>
        </div>
        <div className="toolbar">
          <button type="button" className="btn btn-ghost" onClick={() => void loadAccounts()} disabled={loading}>
            刷新列表
          </button>
        </div>
      </div>

      {error ? (
        <p className="banner banner-warn" role="alert">
          {error}
        </p>
      ) : null}

      <div className="card elev-sm admin-section-card">
        <span className="page-sub" style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}>
          修改自己的密码
        </span>
        <form onSubmit={(e) => void changeOwnPassword(e)} style={{ maxWidth: 360, display: "flex", flexDirection: "column", gap: 12 }}>
          <label className="field">
            <span>当前密码</span>
            <input
              className="input"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          <label className="field">
            <span>新密码</span>
            <input
              className="input"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
            />
          </label>
          <button type="submit" className="btn btn-secondary" disabled={busy} style={{ alignSelf: "flex-start" }}>
            {busy ? "提交中…" : "改密"}
          </button>
        </form>
      </div>

      {session.role === "super_admin" ? (
        <>
          <div className="card elev-sm admin-section-card">
            <span className="page-sub" style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}>
              新建管理员
            </span>
            <form onSubmit={(e) => void createAccount(e)} className="toolbar toolbar-end">
              <label className="field" style={{ flex: 1, minWidth: 160 }}>
                <span>新登录名</span>
                <input
                  className="input"
                  value={newLogin}
                  onChange={(e) => setNewLogin(e.target.value)}
                  required
                  maxLength={50}
                  autoComplete="off"
                />
              </label>
              <div className="seg" role="group" aria-label="角色">
                <button
                  type="button"
                  className="seg-opt"
                  aria-pressed={newRole === "admin"}
                  onClick={() => setNewRole("admin")}
                >
                  管理员
                </button>
                <button
                  type="button"
                  className="seg-opt"
                  aria-pressed={newRole === "super_admin"}
                  onClick={() => setNewRole("super_admin")}
                >
                  超管
                </button>
              </div>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                新建
              </button>
            </form>
            {oncePassword ? (
              <div className="banner banner-warn" role="status">
                <div>一次性口令（只显示一次，请立即抄送给对方）</div>
                <code className="code-break">{oncePassword}</code>
              </div>
            ) : null}
          </div>

          {loading && accounts.length === 0 ? (
            <p className="page-sub" role="status">
              加载账号列表…
            </p>
          ) : null}

          {!loading && accounts.length === 0 ? (
            <div className="empty-card">
              <div className="empty-blob" />
              <div className="empty-card-title">暂无其他账号</div>
              <p className="page-sub">使用上方表单创建第一个管理员。</p>
            </div>
          ) : null}

          {accounts.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>登录名</th>
                    <th>角色</th>
                    <th>状态</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a.id} style={a.enabled ? undefined : { opacity: 0.55 }}>
                      <td>
                        {a.loginName}
                        {a.id === session.accountId ? <span className="page-sub"> · 我</span> : null}
                        {a.mustChangePassword ? <span className="tag tag-outline" style={{ marginLeft: 8 }}>待改密</span> : null}
                      </td>
                      <td>{a.role === "super_admin" ? "超级管理员" : "管理员"}</td>
                      <td>
                        <span className={a.enabled ? "tag tag-accent-2" : "tag tag-outline"}>
                          {a.enabled ? "启用" : "停用"}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {a.id !== session.accountId ? (
                          <button type="button" className="btn btn-ghost" onClick={() => void setEnabled(a.id, !a.enabled)}>
                            {a.enabled ? "停用" : "启用"}
                          </button>
                        ) : null}
                        <button type="button" className="btn btn-ghost" onClick={() => void resetPassword(a.id)}>
                          重置密码
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
