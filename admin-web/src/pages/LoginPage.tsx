import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { api } from "../api";
import { useSession, type Session } from "../session";

function noticeFromState(state: unknown): string | undefined {
  if (typeof state !== "object" || state === null || !("notice" in state)) return undefined;
  return typeof state.notice === "string" ? state.notice : undefined;
}

export function LoginPage() {
  const { setSession } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const notice = noticeFromState(location.state);
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const s = await api<Session>("/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({ loginName, password }),
      });
      setSession(s);
      navigate(s.mustChangePassword ? "/password" : "/vehicles", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={(e) => void onSubmit(e)} aria-busy={loading}>
        <div className="login-aside" aria-hidden="true">
          <div className="login-blob" />
        </div>
        <div className="login-body">
          <p className="page-sub" style={{ margin: 0 }}>
            车行 · 管理后台
          </p>
          <h1>管理后台登录</h1>
          {notice ? (
            <div className="banner banner-ok" role="status">
              {notice}
            </div>
          ) : null}
          {error ? (
            <div className="banner banner-warn" role="alert">
              {error}
            </div>
          ) : null}
          <label className="field">
            <span>登录名</span>
            <input
              className="input"
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              autoComplete="username"
              autoFocus
              required
              maxLength={50}
            />
          </label>
          <label className="field">
            <span>密码</span>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              maxLength={72}
            />
          </label>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? "登录中…" : "登录"}
          </button>
        </div>
      </form>
    </div>
  );
}
