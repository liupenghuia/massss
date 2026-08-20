import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { Breadcrumb, Button, Layout, Menu, Space, Tag, Typography } from "antd";
import { CarOutlined, DeleteOutlined, LogoutOutlined, UserOutlined } from "@ant-design/icons";
import { api } from "../api";
import { useSession } from "../session";

const { Header, Sider, Content } = Layout;

const PAGE_TITLES: Record<string, string> = {
  "/vehicles": "车辆",
  "/recycle": "回收站",
  "/accounts": "账号",
};

const MENU_ITEMS = [
  { key: "/vehicles", icon: <CarOutlined />, label: "车辆" },
  { key: "/recycle", icon: <DeleteOutlined />, label: "回收站" },
  { key: "/accounts", icon: <UserOutlined />, label: "账号" },
];

export function AdminLayout() {
  const { session, setSession } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  if (!session) {
    return null;
  }

  async function logout() {
    await api("/admin/auth/logout", { method: "POST" });
    setSession(null);
    navigate("/login", { replace: true });
  }

  const pageTitle = PAGE_TITLES[location.pathname] ?? "";

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
      >
        <div
          style={{
            height: 48,
            margin: 16,
            color: "#fff",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          {collapsed ? "管" : "管理后台"}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={MENU_ITEMS}
          onClick={({ key }) => {
            navigate(key);
          }}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: "#fff",
            padding: "0 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            height: "auto",
            minHeight: 64,
            borderBottom: "1px solid #f0f0f0",
          }}
        >
          <Typography.Text strong>管理后台</Typography.Text>
          <Space>
            <span>{session.loginName}</span>
            <Tag color={session.role === "super_admin" ? "gold" : "blue"}>
              {session.role === "super_admin" ? "超级管理员" : "管理员"}
            </Tag>
            <Button type="default" icon={<LogoutOutlined />} onClick={() => void logout()}>
              退出
            </Button>
          </Space>
        </Header>
        <Content style={{ margin: 16 }}>
          <Breadcrumb
            style={{ marginBottom: 16 }}
            items={[{ title: "管理后台" }, ...(pageTitle ? [{ title: pageTitle }] : [])]}
          />
          <div
            style={{
              background: "#fff",
              padding: 16,
              minHeight: 360,
              borderRadius: 6,
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
