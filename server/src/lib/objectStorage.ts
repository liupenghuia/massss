/**
 * 对象存储适配器（ADR-032：阿里云 OSS）。
 * 服务端只做预签名与元数据确认，客户端直传存储，不经过本服务（ADR-009）。
 *
 * 生产环境用真实 OSS SDK（动态 require，避免本机没有 `ali-oss` 依赖时 build/test 失败）。
 * 未配置 OSS_ACCESS_KEY_ID 时（本机常见：无真实阿里云账号）自动退回 mock 实现，
 * 用可预测的假直传 URL，headObject 恒为已上传，方便本地开发与单测联调，不阻塞任务推进。
 * 通过 OBJECT_STORAGE_DRIVER=oss|mock 显式切换；未设置时按是否配置 OSS 凭据自动判断。
 */

export interface PresignUploadParams {
  objectKey: string;
  contentType: string;
}

export interface PresignUploadResult {
  uploadUrl: string;
  expiresAt: string; // ISO date-time
  requiredHeaders: Record<string, string>;
}

export interface HeadObjectResult {
  exists: boolean;
  /** 字节数；mock 环境无法探测真实大小时为 undefined。 */
  size?: number;
}

export interface ObjectStorageAdapter {
  presignUpload(params: PresignUploadParams): Promise<PresignUploadResult>;
  headObject(objectKey: string): Promise<HeadObjectResult>;
  publicUrl(objectKey: string): string;
  deleteObject(objectKey: string): Promise<void>;
}

const PRESIGN_TTL_MS = 5 * 60 * 1000;

class MockObjectStorageAdapter implements ObjectStorageAdapter {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async presignUpload(params: PresignUploadParams): Promise<PresignUploadResult> {
    return {
      uploadUrl: `${this.baseUrl}/mock-oss/${encodeURIComponent(params.objectKey)}`,
      expiresAt: new Date(Date.now() + PRESIGN_TTL_MS).toISOString(),
      requiredHeaders: { "Content-Type": params.contentType },
    };
  }

  // mock 环境没有真实客户端直传，视为已上传，避免本地联调卡在存储校验上。
  async headObject(_objectKey: string): Promise<HeadObjectResult> {
    return { exists: true };
  }

  publicUrl(objectKey: string): string {
    return `${this.baseUrl}/mock-oss/${encodeURIComponent(objectKey)}`;
  }

  async deleteObject(_objectKey: string): Promise<void> {
    // mock：无真实文件，空实现。
  }
}

interface OssClientLike {
  signatureUrl(objectKey: string, options: Record<string, unknown>): string;
  head(objectKey: string): Promise<unknown>;
  delete(objectKey: string): Promise<unknown>;
}

class AliyunOssAdapter implements ObjectStorageAdapter {
  private client: OssClientLike | null = null;
  private readonly bucket: string;
  private readonly region: string;

  constructor(
    private readonly config: {
      region: string;
      bucket: string;
      accessKeyId: string;
      accessKeySecret: string;
    }
  ) {
    this.bucket = config.bucket;
    this.region = config.region.startsWith("oss-") || config.region === "" ? config.region : `oss-${config.region}`;
  }

  private async getClient(): Promise<OssClientLike> {
    if (this.client) return this.client;
    // 动态 import：本机未安装 ali-oss 时，只有真的走到生产分支才会报错，不影响 mock 场景下的 build/test。
    const mod = (await import("ali-oss")) as unknown as { default: new (opts: Record<string, unknown>) => OssClientLike };
    const OSS = mod.default;
    this.client = new OSS({
      region: this.region,
      bucket: this.bucket,
      accessKeyId: this.config.accessKeyId,
      accessKeySecret: this.config.accessKeySecret,
      secure: true,
    });
    return this.client;
  }

  async presignUpload(params: PresignUploadParams): Promise<PresignUploadResult> {
    const client = await this.getClient();
    const expiresInSec = PRESIGN_TTL_MS / 1000;
    const uploadUrl = client.signatureUrl(params.objectKey, {
      method: "PUT",
      expires: expiresInSec,
      "Content-Type": params.contentType,
    });
    return {
      uploadUrl,
      expiresAt: new Date(Date.now() + PRESIGN_TTL_MS).toISOString(),
      requiredHeaders: { "Content-Type": params.contentType },
    };
  }

  async headObject(objectKey: string): Promise<HeadObjectResult> {
    const client = await this.getClient();
    try {
      const result = (await client.head(objectKey)) as { res?: { headers?: Record<string, string> } };
      const contentLength = result.res?.headers?.["content-length"];
      return { exists: true, size: contentLength ? Number(contentLength) : undefined };
    } catch {
      return { exists: false };
    }
  }

  publicUrl(objectKey: string): string {
    return `https://${this.bucket}.${this.region}.aliyuncs.com/${objectKey}`;
  }

  async deleteObject(objectKey: string): Promise<void> {
    const client = await this.getClient();
    await client.delete(objectKey);
  }
}

let instance: ObjectStorageAdapter | null = null;

export function getObjectStorage(): ObjectStorageAdapter {
  if (instance) return instance;

  const driver = process.env.OBJECT_STORAGE_DRIVER;
  const hasOssCredentials = Boolean(process.env.OSS_ACCESS_KEY_ID && process.env.OSS_ACCESS_KEY_SECRET);
  const useOss = driver === "oss" || (driver === undefined && hasOssCredentials);

  if (useOss) {
    instance = new AliyunOssAdapter({
      region: process.env.OSS_REGION ?? "",
      bucket: process.env.OSS_BUCKET ?? "",
      accessKeyId: process.env.OSS_ACCESS_KEY_ID ?? "",
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET ?? "",
    });
  } else {
    instance = new MockObjectStorageAdapter(process.env.MOCK_OSS_BASE_URL ?? "http://localhost:8080");
  }
  console.log(`object storage driver: ${useOss ? "oss" : "mock"}`);
  return instance;
}

/** 仅供测试重置单例。 */
export function resetObjectStorageForTest(): void {
  instance = null;
}
