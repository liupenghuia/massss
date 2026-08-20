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

  return (
    <div className="login-wrap">
      <form className="password-card" onSubmit={(e) => void onSubmit(e)}>
        <h1>首次登录请改密</h1>
        <div className="banner banner-warn">新密码至少 8 位，含字母和数字</div>
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
            required
          />
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
          {loading ? "保存中…" : "保存并重新登录"}
        </button>
      </form>
    </div>
  );
}
