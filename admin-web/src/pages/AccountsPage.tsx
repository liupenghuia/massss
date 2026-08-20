import { useState } from "react";
import { useNavigate } from "react-router";
import { Alert, App as AntdApp, Button, Form, Input, List, Select, Space, Tag, Typography } from "antd";
import { api } from "../api";
import { useSession } from "../session";

type Account = {
  id: number;
  loginName: string;
  role: "admin" | "super_admin";
  enabled: boolean;
  mustChangePassword: boolean;
};

type SelfPasswordValues = {
  currentPassword: string;
  newPassword: string;
};

type CreateAccountValues = {
  loginName: string;
  role: "admin" | "super_admin";
};

export function AccountsPage() {
  const { session, setSession } = useSession();
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const [error, setError] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [oncePassword, setOncePassword] = useState("");
  const [selfSaving, setSelfSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selfForm] = Form.useForm<SelfPasswordValues>();
  const [createForm] = Form.useForm<CreateAccountValues>();

  if (!session) {
    return null;
  }

  async function loadAccounts() {
    setError("");
    try {
      const data = await api<{ items: Account[] }>("/admin/accounts");
      setAccounts(data.items);
    } catch (err) {
      const text = err instanceof Error ? err.message : "无法加载账号";
      setError(text);
      void message.error(text);
    }
  }

  async function changeOwnPassword(values: SelfPasswordValues) {
    setError("");
    setSelfSaving(true);
    try {
      await api("/admin/auth/password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });
      setSession(null);
      navigate("/login", { replace: true, state: { notice: "密码已修改，请重新登录" } });
    } catch (err) {
      const text = err instanceof Error ? err.message : "改密失败";
      setError(text);
      void message.error(text);
    } finally {
      setSelfSaving(false);
    }
  }

  async function createAccount(values: CreateAccountValues) {
    setError("");
    setCreating(true);
    try {
      const data = await api<{ account: Account; initialPassword: string }>("/admin/accounts", {
        method: "POST",
        body: JSON.stringify({ loginName: values.loginName, role: values.role }),
      });
      setOncePassword(data.initialPassword);
      createForm.resetFields();
      await loadAccounts();
    } catch (err) {
      const text = err instanceof Error ? err.message : "创建失败";
      setError(text);
      void message.error(text);
    } finally {
      setCreating(false);
    }
  }

  async function setEnabled(id: number, enabled: boolean) {
    setError("");
    try {
      await api(`/admin/accounts/${id}/status`, {
        method: "POST",
        body: JSON.stringify({ enabled }),
      });
      await loadAccounts();
    } catch (err) {
      const text = err instanceof Error ? err.message : "操作失败";
      setError(text);
      void message.error(text);
    }
  }

  async function resetPassword(id: number) {
    setError("");
    try {
      const data = await api<{ initialPassword: string }>(`/admin/accounts/${id}/password-reset`, {
        method: "POST",
      });
      setOncePassword(data.initialPassword);
    } catch (err) {
      const text = err instanceof Error ? err.message : "重置失败";
      setError(text);
      void message.error(text);
    }
  }

  return (
    <Space direction="vertical" size="large" style={{ display: "flex" }}>
      {error ? <Alert type="error" role="alert" title={error} showIcon /> : null}

      <section>
        <Typography.Title level={4}>修改自己的密码</Typography.Title>
        <Form<SelfPasswordValues>
          form={selfForm}
          layout="vertical"
          onFinish={(values) => void changeOwnPassword(values)}
          style={{ maxWidth: 400 }}
        >
          <Form.Item
            name="currentPassword"
            label="当前密码"
            rules={[{ required: true, message: "请输入当前密码" }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码"
            rules={[{ required: true, message: "请输入新密码" }]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={selfSaving}>
              改密
            </Button>
          </Form.Item>
        </Form>
      </section>

      {session.role === "super_admin" ? (
        <section>
          <Typography.Title level={4}>账号管理</Typography.Title>
          <Space direction="vertical" size="middle" style={{ display: "flex" }}>
            <div>
              <Button type="default" onClick={() => void loadAccounts()}>
                刷新列表
              </Button>
            </div>
            <Form<CreateAccountValues>
              form={createForm}
              layout="inline"
              initialValues={{ role: "admin" }}
              onFinish={(values) => void createAccount(values)}
            >
              <Form.Item
                name="loginName"
                label="新登录名"
                rules={[{ required: true, message: "请输入登录名" }]}
              >
                <Input />
              </Form.Item>
              <Form.Item name="role" label="角色" rules={[{ required: true }]}>
                <Select
                  style={{ width: 160 }}
                  options={[
                    { value: "admin", label: "管理员" },
                    { value: "super_admin", label: "超级管理员" },
                  ]}
                />
              </Form.Item>
              <Form.Item>
                <Button htmlType="submit" loading={creating}>
                  新建
                </Button>
              </Form.Item>
            </Form>
            {oncePassword ? (
              <Alert
                type="warning"
                showIcon
                title={
                  <>
                    一次性口令（只显示一次）：<Typography.Text code>{oncePassword}</Typography.Text>
                  </>
                }
              />
            ) : null}
            <List
              bordered
              dataSource={accounts}
              locale={{ emptyText: "暂无账号，请先刷新列表" }}
              renderItem={(a) => (
                <List.Item
                  actions={[
                    <Button
                      key="toggle"
                      type="link"
                      onClick={() => void setEnabled(a.id, !a.enabled)}
                    >
                      {a.enabled ? "停用" : "启用"}
                    </Button>,
                    <Button key="reset" type="link" onClick={() => void resetPassword(a.id)}>
                      重置密码
                    </Button>,
                  ]}
                >
                  <Space wrap>
                    <span>{a.loginName}</span>
                    <Tag>{a.role === "super_admin" ? "超级管理员" : "管理员"}</Tag>
                    <Tag color={a.enabled ? "success" : "default"}>{a.enabled ? "启用" : "停用"}</Tag>
                  </Space>
                </List.Item>
              )}
            />
          </Space>
        </section>
      ) : null}
    </Space>
  );
}
