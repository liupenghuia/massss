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
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [oncePassword, setOncePassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newLogin, setNewLogin] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "super_admin">("admin");

  async function loadAccounts() {
    setError("");
    try {
      const data = await api<{ items: Account[] }>("/admin/accounts");
      setAccounts(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "无法加载账号");
    }
  }

  async function changeOwnPassword(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/admin/auth/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setSession(null);
      navigate("/login", { replace: true, state: { notice: "密码已修改，请重新登录" } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "改密失败");
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

  useEffect(() => {
    if (session?.role === "super_admin") void loadAccounts();
  }, [session?.role]);

  if (!session) return null;

  return (
    <div>
      <h2>账号管理</h2>
      {error ? (
        <p className="banner banner-warn" role="alert">
          {error}
        </p>
      ) : null}

      <form onSubmit={(e) => void changeOwnPassword(e)} style={{ maxWidth: 360, margin: "20px 0" }}>
        <h3>修改自己的密码</h3>
        <label className="field">
          <span>当前密码</span>
          <input className="input" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        </label>
        <label className="field" style={{ marginTop: 12 }}>
          <span>新密码</span>
          <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
        </label>
        <button type="submit" className="btn btn-secondary" style={{ marginTop: 12 }}>
          改密
        </button>
      </form>

      {session.role === "super_admin" ? (
        <>
          <form onSubmit={(e) => void createAccount(e)} className="toolbar toolbar-end" style={{ marginBottom: 20 }}>
            <label className="field" style={{ flex: 1 }}>
              <span>新登录名</span>
              <input className="input" value={newLogin} onChange={(e) => setNewLogin(e.target.value)} required />
            </label>
            <div className="seg">
              <button
                type="button"
                className="seg-opt"
                style={newRole === "admin" ? { background: "var(--color-accent)", color: "var(--color-neutral-100)" } : undefined}
                onClick={() => setNewRole("admin")}
              >
                管理员
              </button>
              <button
                type="button"
                className="seg-opt"
                style={
                  newRole === "super_admin" ? { background: "var(--color-accent)", color: "var(--color-neutral-100)" } : undefined
                }
                onClick={() => setNewRole("super_admin")}
              >
                超管
              </button>
            </div>
            <button type="submit" className="btn btn-primary">
              新建
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => void loadAccounts()}>
              刷新列表
            </button>
          </form>
          {oncePassword ? (
            <div className="banner banner-warn" style={{ marginBottom: 16 }}>
              <div>一次性口令（只显示一次）</div>
              <code className="code-break">{oncePassword}</code>
            </div>
          ) : null}
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
                  <td>{a.loginName}</td>
                  <td>{a.role === "super_admin" ? "超级管理员" : "管理员"}</td>
                  <td>
                    <span className={a.enabled ? "tag tag-accent-2" : "tag tag-outline"}>{a.enabled ? "启用" : "停用"}</span>
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
        </>
      ) : null}
    </div>
  );
}
