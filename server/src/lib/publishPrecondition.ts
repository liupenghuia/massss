export interface PublishPreconditionResult {
  ok: boolean;
  missing: Array<"images" | "price" | "coreFields">;
  missingCoreFields?: string[];
}

const MIN_IMAGE_COUNT = 4;

/** ADR-035 + RFC 2026-08-21：发布时校验的核心字段（camelCase，对应契约 missingCoreFields）。 */
export interface CoreFieldsForPublish {
  brand: string | null;
  model: string | null;
  registrationYear: number | null;
  mileageKm: number | null;
  color: string | null;
  conditionDesc: string | null;
  energyType: string | null;
  transferCount: number | null;
}

function missingCoreFieldNames(fields: CoreFieldsForPublish): string[] {
  const missing: string[] = [];
  for (const [name, value] of Object.entries(fields)) {
    if (value === null || value === undefined) missing.push(name);
  }
  return missing;
}

/**
 * ADR-003 发布前置校验：图片数 >= 4、价格已填写（含"面谈"）、核心字段全部已填写（ADR-035）。
 * countImages / isPriceFilled 的失败不在本函数处理，调用方必须先让异常向上抛出为 INTERNAL_ERROR，
 * 不得把抛错误当成 0/false 传进来（见 contracts/internal.yaml）。
 */
export function evaluatePublishPrecondition(
  imageCount: number,
  priceFilled: boolean,
  coreFields: CoreFieldsForPublish
): PublishPreconditionResult {
  const missing: Array<"images" | "price" | "coreFields"> = [];
  if (imageCount < MIN_IMAGE_COUNT) missing.push("images");
  if (!priceFilled) missing.push("price");

  const missingCoreFields = missingCoreFieldNames(coreFields);
  if (missingCoreFields.length > 0) missing.push("coreFields");

  return {
    ok: missing.length === 0,
    missing,
    ...(missingCoreFields.length > 0 ? { missingCoreFields } : {}),
  };
}
