import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api";
import { useSession } from "../session";
import { useConfirm } from "../ui/useConfirm";

type Account = {
  id: number;
  loginName: string;
  role: "admin" | "super_admin";
  enabled: boolean;
  mustChangePassword: boolean;
};

export function AccountsPage() {
  const { confirm, dialog } = useConfirm();
  const { session } = useSession();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [oncePassword, setOncePassword] = useState("");
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
    if (!enabled) {
      const ok = await confirm({
        title: "停用该账号？",
        body: "对方将立即无法登录。已发出的会话会失效，可随时再启用。",
        confirmLabel: "停用账号",
        danger: true,
      });
      if (!ok) return;
    }
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

  async function deleteAccount(id: number) {
    const ok = await confirm({
      title: "删除该账号？",
      body: "删除后不可恢复，登录名也无法再被使用。",
      confirmLabel: "删除账号",
      danger: true,
    });
    if (!ok) return;
    setError("");
    try {
      await api(`/admin/accounts/${id}`, { method: "DELETE" });
      await loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  async function resetPassword(id: number) {
    const ok = await confirm({
      title: "重置该账号密码？",
      body: "旧口令将立即失效，对方需使用新的一次性口令登录并改密。",
      confirmLabel: "重置密码",
      danger: true,
    });
    if (!ok) return;
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
    <>
      {dialog}
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

      {session.role === "super_admin" ? (
        <>
          <div className="card elev-sm admin-section-card">
            <span className="page-sub section-kicker">新建管理员</span>
            <form onSubmit={(e) => void createAccount(e)} className="toolbar toolbar-end">
              <label className="field field-grow">
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
              <div className="banner banner-info" role="status">
                <div>
                  <div>一次性口令（只显示一次，请立即抄送给对方）</div>
                  <code className="code-break">{oncePassword}</code>
                </div>
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
                    <tr key={a.id} className={a.enabled ? undefined : "muted-row"}>
                      <td>
                        {a.loginName}
                        {a.id === session.accountId ? <span className="page-sub"> · 我</span> : null}
                        {a.mustChangePassword ? <span className="tag tag-outline tag-inline">待改密</span> : null}
                      </td>
                      <td>{a.role === "super_admin" ? "超级管理员" : "管理员"}</td>
                      <td>
                        <span className={a.enabled ? "tag tag-accent-2" : "tag tag-outline"}>
                          {a.enabled ? "启用" : "停用"}
                        </span>
                      </td>
                      <td className="table-actions">
                        {a.id !== session.accountId ? (
                          <button type="button" className="btn btn-ghost" onClick={() => void setEnabled(a.id, !a.enabled)}>
                            {a.enabled ? "停用" : "启用"}
                          </button>
                        ) : null}
                        <button type="button" className="btn btn-ghost" onClick={() => void resetPassword(a.id)}>
                          重置密码
                        </button>
                        {!a.enabled ? (
                          <button type="button" className="btn btn-ghost" onClick={() => void deleteAccount(a.id)}>
                            删除
                          </button>
                        ) : null}
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
    </>
  );
}
