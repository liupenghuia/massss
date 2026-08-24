import { Outlet, useLocation, useNavigate } from "react-router";
import { api } from "../api";
import { useSession } from "../session";

const BASE_TABS = [
  { path: "/vehicles", label: "车辆" },
  { path: "/recycle", label: "回收站" },
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
  // F-006：账号管理仅超管可见，普通管理员不展示入口
  const tabs =
    session.role === "super_admin"
      ? ([...BASE_TABS, { path: "/accounts", label: "账号" }] as const)
      : BASE_TABS;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-left">
          <span className="brand-mark">车行 · 管理后台</span>
          <nav className="nav-tabs" aria-label="后台导航">
            {tabs.map((tab) => {
              const on = location.pathname === tab.path || location.pathname.startsWith(`${tab.path}/`);
              return (
                <button
                  key={tab.path}
                  type="button"
                  className={on ? "tag tag-accent nav-tab" : "tag tag-outline nav-tab"}
                  aria-current={on ? "page" : undefined}
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
          <button
            type="button"
            className={location.pathname === "/profile" ? "btn btn-ghost is-current" : "btn btn-ghost"}
            aria-current={location.pathname === "/profile" ? "page" : undefined}
            onClick={() => navigate("/profile")}
          >
            我的资料
          </button>
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
