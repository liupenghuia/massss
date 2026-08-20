import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { Alert, App as AntdApp, Button, Card, Form, Input } from "antd";
import { api } from "../api";
import { useSession } from "../session";

type ChangePasswordValues = {
  currentPassword: string;
  newPassword: string;
};

export function ChangePasswordPage() {
  const { session, setSession } = useSession();
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!session) {
    return <Navigate to="/login" replace />;
  }
  if (!session.mustChangePassword) {
    return <Navigate to="/vehicles" replace />;
  }

  async function onFinish(values: ChangePasswordValues) {
    setError("");
    setLoading(true);
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
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <Card title="首次登录请改密" style={{ width: 400, maxWidth: "100%" }}>
        {error ? (
          <Alert type="error" role="alert" title={error} showIcon style={{ marginBottom: 16 }} />
        ) : null}
        <Form<ChangePasswordValues> layout="vertical" onFinish={(values) => void onFinish(values)}>
          <Form.Item
            name="currentPassword"
            label="当前密码"
            rules={[{ required: true, message: "请输入当前密码" }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="新密码（至少 8 位，含字母和数字）"
            rules={[{ required: true, message: "请输入新密码" }]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              保存并重新登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
