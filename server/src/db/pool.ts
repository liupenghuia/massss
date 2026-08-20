import { Pool } from "pg";

// 连接参数完全来自标准 PG* 环境变量（见 .env.example），不在代码里拼连接串。
export const pool = new Pool();
