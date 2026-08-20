// 本机未安装 `ali-oss`（无真实阿里云账号），仅在运行时按需动态 import。
// 这里声明为 any 模块，只为让 tsc 通过类型检查，不代表已引入该依赖。
declare module "ali-oss";
