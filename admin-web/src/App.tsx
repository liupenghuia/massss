import type { ReactNode } from "react";
import { ConfigProvider, App as AntdApp } from "antd";
import zhCN from "antd/es/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router";
import { AdminLayout } from "./layouts/AdminLayout";
import { AccountsPage } from "./pages/AccountsPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { LoginPage } from "./pages/LoginPage";
import { RecyclePanel } from "./RecyclePanel";
import { SessionProvider, useSession } from "./session";
import { VehiclesPanel } from "./VehiclesPanel";

dayjs.locale("zh-cn");

function GuestRoute() {
  const { session } = useSession();
  if (session?.mustChangePassword) {
    return <Navigate to="/password" replace />;
  }
  if (session) {
    return <Navigate to="/vehicles" replace />;
  }
  return <Outlet />;
}

function AuthedLayout() {
  const { session } = useSession();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  if (session.mustChangePassword) {
    return <Navigate to="/password" replace />;
  }
  return <AdminLayout />;
}

function LegacyPanel({ children }: { children: ReactNode }) {
  return <div className="legacy-panel">{children}</div>;
}

function RootRedirect() {
  const { session } = useSession();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  if (session.mustChangePassword) {
    return <Navigate to="/password" replace />;
  }
  return <Navigate to="/vehicles" replace />;
}

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{ token: { colorPrimary: "#1677ff", borderRadius: 6 } }}
    >
      <AntdApp>
        <SessionProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<GuestRoute />}>
                <Route path="/login" element={<LoginPage />} />
              </Route>
              <Route path="/password" element={<ChangePasswordPage />} />
              <Route element={<AuthedLayout />}>
                <Route
                  path="/vehicles"
                  element={
                    <LegacyPanel>
                      <VehiclesPanel />
                    </LegacyPanel>
                  }
                />
                <Route
                  path="/recycle"
                  element={
                    <LegacyPanel>
                      <RecyclePanel />
                    </LegacyPanel>
                  }
                />
                <Route path="/accounts" element={<AccountsPage />} />
              </Route>
              <Route path="/" element={<RootRedirect />} />
              <Route path="*" element={<RootRedirect />} />
            </Routes>
          </BrowserRouter>
        </SessionProvider>
      </AntdApp>
    </ConfigProvider>
  );
}
