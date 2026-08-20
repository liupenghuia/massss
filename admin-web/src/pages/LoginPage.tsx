import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Alert, App as AntdApp, Button, Card, Form, Input } from "antd";
import { api } from "../api";
import { useSession, type Session } from "../session";

type LoginValues = {
  loginName: string;
  password: string;
};

function noticeFromState(state: unknown): string | undefined {
  if (typeof state !== "object" || state === null || !("notice" in state)) {
    return undefined;
  }
  return typeof state.notice === "string" ? state.notice : undefined;
}

export function LoginPage() {
  const { setSession } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = AntdApp.useApp();
  const notice = noticeFromState(location.state);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onFinish(values: LoginValues) {
    setError("");
    setLoading(true);
    try {
      const s = await api<Session>("/admin/auth/login", {
        method: "POST",
        body: JSON.stringify({ loginName: values.loginName, password: values.password }),
      });
      setSession(s);
      navigate(s.mustChangePassword ? "/password" : "/vehicles", { replace: true });
    } catch (err) {
      const text = err instanceof Error ? err.message : "登录失败";
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
      <Card title="管理后台登录" style={{ width: 400, maxWidth: "100%" }}>
        {notice ? (
          <Alert type="success" title={notice} showIcon style={{ marginBottom: 16 }} />
        ) : null}
        {error ? (
          <Alert type="error" role="alert" title={error} showIcon style={{ marginBottom: 16 }} />
        ) : null}
        <Form<LoginValues> layout="vertical" onFinish={(values) => void onFinish(values)}>
          <Form.Item
            name="loginName"
            label="登录名"
            rules={[{ required: true, message: "请输入登录名" }]}
          >
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
