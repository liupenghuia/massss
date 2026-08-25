import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../app";
import { resetAccountTables, createLoginableAccount } from "../test/dbHelpers";

async function loginAgent(loginName: string, password: string) {
  const agent = request.agent(app);
  const res = await agent.post("/admin/auth/login").send({ loginName, password });
  expect(res.status).toBe(200);
  return agent;
}

beforeEach(async () => {
  await resetAccountTables();
});

describe("DELETE /admin/accounts/:accountId", () => {
  it("已停用账号删除成功后，不再出现在账号列表里（回归：曾经 listAccounts 漏过滤 deleted_at）", async () => {
    const superAdmin = await createLoginableAccount({ loginName: "root", password: "Passw0rd!", role: "super_admin" });
    const target = await createLoginableAccount({
      loginName: "to-delete",
      password: "Passw0rd!",
      role: "admin",
      enabled: false,
    });
    const agent = await loginAgent(superAdmin.loginName, superAdmin.password);

    const del = await agent.delete(`/admin/accounts/${target.id}`);
    expect(del.status).toBe(204);

    const list = await agent.get("/admin/accounts");
    expect(list.status).toBe(200);
    expect(list.body.items.map((a: { id: number }) => a.id)).not.toContain(target.id);
  });

  it("启用中的账号不能删除，返回 409", async () => {
    const superAdmin = await createLoginableAccount({ loginName: "root", password: "Passw0rd!", role: "super_admin" });
    const target = await createLoginableAccount({ loginName: "still-enabled", password: "Passw0rd!", role: "admin" });
    const agent = await loginAgent(superAdmin.loginName, superAdmin.password);

    const del = await agent.delete(`/admin/accounts/${target.id}`);
    expect(del.status).toBe(409);
    expect(del.body.code).toBe("ACCOUNT_NOT_DISABLED");
  });

  it("重复删除同一个已删除账号返回 404，不是幂等成功", async () => {
    const superAdmin = await createLoginableAccount({ loginName: "root", password: "Passw0rd!", role: "super_admin" });
    const target = await createLoginableAccount({
      loginName: "twice-deleted",
      password: "Passw0rd!",
      role: "admin",
      enabled: false,
    });
    const agent = await loginAgent(superAdmin.loginName, superAdmin.password);

    expect((await agent.delete(`/admin/accounts/${target.id}`)).status).toBe(204);
    const second = await agent.delete(`/admin/accounts/${target.id}`);
    expect(second.status).toBe(404);
  });

  it("普通管理员无权调用删除接口", async () => {
    const admin = await createLoginableAccount({ loginName: "plain-admin", password: "Passw0rd!", role: "admin" });
    const target = await createLoginableAccount({
      loginName: "victim",
      password: "Passw0rd!",
      role: "admin",
      enabled: false,
    });
    const agent = await loginAgent(admin.loginName, admin.password);

    const del = await agent.delete(`/admin/accounts/${target.id}`);
    expect(del.status).toBe(403);
  });

  it("删除后 loginName 不释放，同名建号返回冲突", async () => {
    const superAdmin = await createLoginableAccount({ loginName: "root", password: "Passw0rd!", role: "super_admin" });
    const target = await createLoginableAccount({
      loginName: "taken-name",
      password: "Passw0rd!",
      role: "admin",
      enabled: false,
    });
    const agent = await loginAgent(superAdmin.loginName, superAdmin.password);

    expect((await agent.delete(`/admin/accounts/${target.id}`)).status).toBe(204);

    const create = await agent.post("/admin/accounts").send({ loginName: "taken-name", role: "admin" });
    expect(create.status).toBe(409);
    expect(create.body.code).toBe("ACCOUNT_LOGIN_NAME_TAKEN");
  });
});

describe("POST /admin/accounts/:accountId/role 与 /password-reset 的事务一致性", () => {
  it("角色变更成功后，账号列表能读到新角色（同事务提交，无中间态）", async () => {
    const superAdmin = await createLoginableAccount({ loginName: "root", password: "Passw0rd!", role: "super_admin" });
    const target = await createLoginableAccount({ loginName: "promotee", password: "Passw0rd!", role: "admin" });
    const agent = await loginAgent(superAdmin.loginName, superAdmin.password);

    const res = await agent.post(`/admin/accounts/${target.id}/role`).send({ role: "super_admin" });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("super_admin");

    const list = await agent.get("/admin/accounts");
    const found = list.body.items.find((a: { id: number }) => a.id === target.id);
    expect(found.role).toBe("super_admin");
  });

  it("重置密码后旧口令失效、新口令可登录", async () => {
    const superAdmin = await createLoginableAccount({ loginName: "root", password: "Passw0rd!", role: "super_admin" });
    const target = await createLoginableAccount({ loginName: "reset-me", password: "OldPassw0rd!", role: "admin" });
    const agent = await loginAgent(superAdmin.loginName, superAdmin.password);

    const reset = await agent.post(`/admin/accounts/${target.id}/password-reset`).send({});
    expect(reset.status).toBe(200);
    const newPassword = reset.body.initialPassword as string;

    const oldLogin = await request(app).post("/admin/auth/login").send({ loginName: target.loginName, password: target.password });
    expect(oldLogin.status).toBe(403);

    const newLogin = await request(app).post("/admin/auth/login").send({ loginName: target.loginName, password: newPassword });
    expect(newLogin.status).toBe(200);
  });
});
