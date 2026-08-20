-- F-006：服务端可吊销会话。停用/改密时同步作废该账号全部会话。

CREATE TABLE admin_sessions (
  token         TEXT PRIMARY KEY,
  account_id    BIGINT NOT NULL REFERENCES accounts (id),
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_sessions_account_id ON admin_sessions (account_id);
CREATE INDEX idx_admin_sessions_expires_at ON admin_sessions (expires_at);
