import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { api } from "../api";
import { useSession } from "../session";

export function ChangePasswordPage() {
  const { session, setSession } = useSession();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!session) return <Navigate to="/login" replace />;
  if (!session.mustChangePassword) return <Navigate to="/vehicles" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
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
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await api("/admin/auth/logout", { method: "POST" });
    } catch {
      /* 仍清本地会话 */
    }
    setSession(null);
    navigate("/login", { replace: true });
  }

  return (
    <div className="login-wrap">
      <form className="password-card" onSubmit={(e) => void onSubmit(e)} aria-busy={loading}>
        <p className="page-sub" style={{ margin: 0 }}>
          {session.loginName} · 首次登录
        </p>
        <h1>首次登录请改密</h1>
        <div className="banner banner-warn" role="status">
          新密码 8–72 位，需同时包含字母和数字；改密完成前无法使用其他功能。
        </div>
        {error ? (
          <div className="banner banner-warn" role="alert">
            {error}
          </div>
        ) : null}
        <label className="field">
          <span>当前密码</span>
          <input
            className="input"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
            maxLength={72}
            autoFocus
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
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? "保存中…" : "保存并重新登录"}
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={() => void logout()} disabled={loading}>
          退出登录
        </button>
      </form>
    </div>
  );
}
