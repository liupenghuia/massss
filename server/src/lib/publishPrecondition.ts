export interface PublishPreconditionResult {
  ok: boolean;
  missing: Array<"images" | "price">;
}

const MIN_IMAGE_COUNT = 4;

/**
 * ADR-003 发布前置校验：图片数 >= 4 且价格已填写（含"面谈"）。
 * countImages / isPriceFilled 的失败不在本函数处理，调用方必须先让异常向上抛出为 INTERNAL_ERROR，
 * 不得把抛错误当成 0/false 传进来（见 contracts/internal.yaml）。
 */
export function evaluatePublishPrecondition(imageCount: number, priceFilled: boolean): PublishPreconditionResult {
  const missing: Array<"images" | "price"> = [];
  if (imageCount < MIN_IMAGE_COUNT) missing.push("images");
  if (!priceFilled) missing.push("price");
  return { ok: missing.length === 0, missing };
}
