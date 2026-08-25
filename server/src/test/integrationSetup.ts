// 集成测试专用：强制指向本机独立测试库，绝不连开发库（避免误清空开发数据）。
// 需先手动创建：createdb mallsss_test && PGDATABASE=mallsss_test npm run migrate:up
process.env.PGHOST = process.env.PGHOST || "localhost";
process.env.PGPORT = process.env.PGPORT || "5432";
process.env.PGUSER = process.env.PGUSER || "postgres";
process.env.PGDATABASE = "mallsss_test";
process.env.COOKIE_SECURE = "false";
