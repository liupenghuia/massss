export type ImageOrderResult =
  | { ok: true }
  | { ok: false; reason: "COUNT_MISMATCH" | "DUPLICATE" | "SET_MISMATCH" };

/**
 * ADR-008：排序必须一次性提交该车当前全部图片 id 的一个排列，不可多、不可少、不可重复。
 */
export function validateImageOrder(currentIds: number[], requestedIds: number[]): ImageOrderResult {
  if (requestedIds.length !== currentIds.length) return { ok: false, reason: "COUNT_MISMATCH" };

  const requestedSet = new Set(requestedIds);
  if (requestedSet.size !== requestedIds.length) return { ok: false, reason: "DUPLICATE" };

  const currentSet = new Set(currentIds);
  for (const id of requestedSet) {
    if (!currentSet.has(id)) return { ok: false, reason: "SET_MISMATCH" };
  }
  return { ok: true };
}
