import type { components } from "../generated/openapi-types";

export type ErrorCode = components["schemas"]["ErrorCode"];

/**
 * 统一业务错误。code/httpStatus 映射见 contracts/errors.yaml。
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly httpStatus: number;
  readonly details: Record<string, unknown>;

  constructor(code: ErrorCode, httpStatus: number, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

export function notFound(): AppError {
  return new AppError("VEHICLE_NOT_FOUND", 404, "车辆不存在");
}

export function versionConflict(): AppError {
  // message 固定，禁止改写（contracts/errors.yaml）
  return new AppError("VEHICLE_VERSION_CONFLICT", 409, "该车辆已被修改，请刷新后重试");
}

export function missingVersion(): AppError {
  return new AppError("MISSING_VERSION", 400, "编辑车辆必须提供 If-Match 或 body.version");
}

export function validationError(fieldErrors: Array<{ field: string; reason: string }>): AppError {
  return new AppError("VALIDATION_ERROR", 400, "请求参数不合法", { fieldErrors });
}

export function idempotencyKeyRequired(): AppError {
  return new AppError("IDEMPOTENCY_KEY_REQUIRED", 400, "创建车辆必须提供 Idempotency-Key");
}

export function idempotencyKeyConflict(): AppError {
  return new AppError("IDEMPOTENCY_KEY_CONFLICT", 409, "幂等键已用于不同请求");
}

export function illegalStatusTransition(from: string, action: "publish" | "unpublish"): AppError {
  return new AppError("ILLEGAL_STATUS_TRANSITION", 409, "非法的车辆状态转换", { from, action });
}

export function publishPreconditionFailed(
  missing: Array<"images" | "price" | "coreFields">,
  imageCount: number,
  priceFilled: boolean,
  missingCoreFields?: string[]
): AppError {
  return new AppError("PUBLISH_PRECONDITION_FAILED", 422, "不满足发布前置条件", {
    missing,
    imageCount,
    priceFilled,
    ...(missingCoreFields ? { missingCoreFields } : {}),
  });
}

export function vehicleVinDuplicate(): AppError {
  // message 固定，禁止改写（contracts/errors.yaml）
  return new AppError("VEHICLE_VIN_DUPLICATE", 409, "该车架号已被其他车辆使用");
}

export function internalError(): AppError {
  return new AppError("INTERNAL_ERROR", 500, "服务内部错误");
}

export function imageNotFound(): AppError {
  return new AppError("IMAGE_NOT_FOUND", 404, "图片不存在");
}

export function reportNotFound(): AppError {
  return new AppError("REPORT_NOT_FOUND", 404, "评估报告不存在");
}

export function publishedImageMin(): AppError {
  // message 固定，禁止改写（contracts/errors.yaml）
  return new AppError("PUBLISHED_IMAGE_MIN", 409, "已上架车辆至少保留 4 张图片，请先下架或先补充图片");
}

export function imageOrderMismatch(details: Record<string, unknown> = {}): AppError {
  return new AppError("IMAGE_ORDER_MISMATCH", 400, "imageIds 必须是该车全部图片的一个排列", details);
}

export function invalidObjectKey(): AppError {
  return new AppError("INVALID_OBJECT_KEY", 400, "objectKey 无效或不属于该车辆");
}

export function invalidContentType(): AppError {
  return new AppError("INVALID_CONTENT_TYPE", 400, "不支持的文件类型");
}

export function fileTooLarge(): AppError {
  return new AppError("FILE_TOO_LARGE", 400, "文件大小超过限制");
}

export function objectNotUploaded(): AppError {
  return new AppError("OBJECT_NOT_UPLOADED", 400, "对象存储中尚未找到对应文件");
}

export function vehicleInRecycleBin(): AppError {
  return new AppError("VEHICLE_IN_RECYCLE_BIN", 409, "该车辆在回收站中，无法编辑");
}

export function recycleBinItemPurged(): AppError {
  return new AppError("RECYCLE_BIN_ITEM_PURGED", 404, "该车辆已被彻底清除");
}

export function vehicleNotInRecycleBin(): AppError {
  return new AppError("VEHICLE_NOT_IN_RECYCLE_BIN", 409, "该车辆不在回收站中");
}

export function unauthorized(): AppError {
  return new AppError("UNAUTHORIZED", 401, "未登录或登录已失效");
}

export function forbidden(): AppError {
  return new AppError("FORBIDDEN", 403, "权限不足");
}

export function mustChangePassword(): AppError {
  return new AppError("MUST_CHANGE_PASSWORD", 403, "请先修改密码");
}

export function invalidCredentials(): AppError {
  return new AppError("INVALID_CREDENTIALS", 403, "登录名或密码错误");
}

export function accountDisabled(): AppError {
  return new AppError("ACCOUNT_DISABLED", 403, "账号已停用");
}

export function accountLocked(): AppError {
  return new AppError("ACCOUNT_LOCKED", 403, "账号已被锁定，请稍后再试");
}

/** ADR-103 / F-002：IP 限流优先返回 429 */
export function tooManyRequests(): AppError {
  return new AppError("TOO_MANY_REQUESTS", 429, "请求过于频繁，请稍后再试");
}

export function accountLoginNameTaken(): AppError {
  return new AppError("ACCOUNT_LOGIN_NAME_TAKEN", 409, "该登录名已被占用");
}

export function cannotDisableSelf(): AppError {
  return new AppError("CANNOT_DISABLE_SELF", 403, "不能对自己的账号执行此操作");
}

export function lastSuperAdmin(): AppError {
  return new AppError("LAST_SUPER_ADMIN", 409, "系统必须至少保留一个启用状态的超级管理员");
}

export function accountNotDisabled(): AppError {
  return new AppError("ACCOUNT_NOT_DISABLED", 409, "账号当前不是已停用状态，无法删除");
}

export function accountNotFound(): AppError {
  return new AppError("VALIDATION_ERROR", 404, "账号不存在", {
    fieldErrors: [{ field: "accountId", reason: "NOT_FOUND" }],
  });
}
