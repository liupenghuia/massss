import { missingVersion, validationError } from "./errors";

/**
 * 解析 If-Match / body.version 二选一（契约 adminPatchVehicle）。
 * 两者都缺 -> MISSING_VERSION；两者都提供但不一致 -> VALIDATION_ERROR。
 * If-Match 允许带引号（ETag 格式，如 `"12"`）或不带引号的十进制。
 */
export function resolveRequestedVersion(bodyVersion: number | null | undefined, ifMatchHeader: string | undefined): number {
  const ifMatchVersion = parseIfMatch(ifMatchHeader);

  if (bodyVersion == null && ifMatchVersion == null) {
    throw missingVersion();
  }
  if (bodyVersion != null && ifMatchVersion != null && bodyVersion !== ifMatchVersion) {
    throw validationError([{ field: "version", reason: "IF_MATCH_VERSION_MISMATCH" }]);
  }
  return (bodyVersion ?? ifMatchVersion)!;
}

function parseIfMatch(header: string | undefined): number | null {
  if (header === undefined) return null;
  const stripped = header.trim().replace(/^"(.*)"$/, "$1");
  const parsed = Number(stripped);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw validationError([{ field: "If-Match", reason: "TYPE" }]);
  }
  return parsed;
}
