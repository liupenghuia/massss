import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { api } from "../api";
import { useSession } from "../session";

export function ProfilePage() {
  const { session, setSession } = useSession();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);

  if (!session) return null;

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

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>我的资料</h2>
          <p className="page-sub">修改当前登录账号的密码。改密成功后需重新登录。</p>
        </div>
      </div>

      {error ? (
        <p className="banner banner-warn" role="alert">
          {error}
        </p>
      ) : null}

      <div className="card elev-sm admin-section-card">
        <span className="page-sub section-kicker">修改自己的密码</span>
        <form onSubmit={(e) => void changeOwnPassword(e)} className="profile-password-form">
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
          <button type="submit" className="btn btn-secondary" disabled={busy}>
            {busy ? "提交中…" : "改密"}
          </button>
        </form>
      </div>
    </div>
  );
}
