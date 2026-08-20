import { Outlet, useLocation, useNavigate } from "react-router";
import { api } from "../api";
import { useSession } from "../session";

const TABS = [
  { path: "/vehicles", label: "车辆" },
  { path: "/recycle", label: "回收站" },
  { path: "/accounts", label: "账号" },
] as const;

export function AdminLayout() {
  const { session, setSession } = useSession();
  const location = useLocation();
  const navigate = useNavigate();

  if (!session) return null;

  async function logout() {
    await api("/admin/auth/logout", { method: "POST" });
    setSession(null);
    navigate("/login", { replace: true });
  }

  const roleLabel = session.role === "super_admin" ? "超级管理员" : "管理员";

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-left">
          <span className="brand-mark">车行 · 管理后台</span>
          <nav className="nav-tabs" aria-label="后台导航">
            {TABS.map((tab) => {
              const on = location.pathname === tab.path || location.pathname.startsWith(`${tab.path}/`);
              return (
                <button
                  key={tab.path}
                  type="button"
                  className={on ? "tag tag-accent nav-tab" : "tag tag-outline nav-tab"}
                  onClick={() => navigate(tab.path)}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="topbar-right">
          <span>
            {session.loginName}（{roleLabel}）
          </span>
          <button type="button" className="btn btn-ghost" onClick={() => void logout()}>
            退出
          </button>
        </div>
      </header>
      <div className="content">
        <Outlet />
      </div>
    </div>
  );
}
