import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router";
import { AdminLayout } from "./layouts/AdminLayout";
import { AccountsPage } from "./pages/AccountsPage";
import { ChangePasswordPage } from "./pages/ChangePasswordPage";
import { LoginPage } from "./pages/LoginPage";
import { RecyclePanel } from "./RecyclePanel";
import { SessionProvider, useSession } from "./session";

const VehiclesPanel = lazy(() =>
  import("./VehiclesPanel").then((m) => ({ default: m.VehiclesPanel })),
);

function GuestRoute() {
  const { session } = useSession();
  if (session?.mustChangePassword) return <Navigate to="/password" replace />;
  if (session) return <Navigate to="/vehicles" replace />;
  return <Outlet />;
}

function AuthedLayout() {
  const { session } = useSession();
  if (!session) return <Navigate to="/login" replace />;
  if (session.mustChangePassword) return <Navigate to="/password" replace />;
  return <AdminLayout />;
}

function RootRedirect() {
  const { session } = useSession();
  if (!session) return <Navigate to="/login" replace />;
  if (session.mustChangePassword) return <Navigate to="/password" replace />;
  return <Navigate to="/vehicles" replace />;
}

export default function App() {
  return (
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
                <Suspense fallback={<p>加载中…</p>}>
                  <VehiclesPanel />
                </Suspense>
              }
            />
            <Route path="/recycle" element={<RecyclePanel />} />
            <Route path="/accounts" element={<AccountsPage />} />
          </Route>
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </SessionProvider>
  );
}
