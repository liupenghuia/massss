import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { Field } from "../ui/Field";
import { formatPrice, statusTag, ThumbPreview } from "./helpers";
import { currentMaxYear, mileageError, transferError, yearError } from "./validate";
import {
  STATUS_LABEL,
  type AdminVehicle,
  type ImageItem,
  type PriceRecordItem,
  type PriceValue,
  type ReportItem,
  type UploadTask,
  type VehicleFormState,
} from "./types";

export type VehicleFormViewProps = {
  editing: AdminVehicle | null;
  form: VehicleFormState;
  setForm: Dispatch<SetStateAction<VehicleFormState>>;
  error: string;
  info: string;
  onDismissError: () => void;
  onDismissInfo: () => void;
  formBusy: boolean;
  publicOrigin: string;
  price: PriceValue | null;
  priceType: "amount" | "negotiable";
  setPriceType: (t: "amount" | "negotiable") => void;
  priceAmount: string;
  setPriceAmount: (v: string) => void;
  priceRecords: PriceRecordItem[];
  images: ImageItem[];
  setImages: Dispatch<SetStateAction<ImageItem[]>>;
  reports: ReportItem[];
  imageUploads: UploadTask[];
  reportUploads: UploadTask[];
  dragId: number | null;
  setDragId: (id: number | null) => void;
  copied: string;
  setCopied: (v: string) => void;
  onBack: () => void;
  onCreate: (e: FormEvent) => void;
  onSave: () => Promise<AdminVehicle | null>;
  onAct: (path: string, vehicle?: AdminVehicle) => void;
  onSavePrice: () => void;
  onUploadImages: (files: File[]) => void;
  onUploadReports: (files: File[]) => void;
  onDeleteImage: (id: number) => void;
  onDeleteReport: (id: number) => void;
  onSaveCaption: (id: number, caption: string) => void;
  onDropReorder: (targetId: number) => void;
  onSetCover: (id: number) => void;
  onMoveImage: (id: number, dir: -1 | 1) => void;
};

export function VehicleFormView({
  editing,
  form,
  setForm,
  error,
  info,
  onDismissError,
  onDismissInfo,
  formBusy,
  publicOrigin,
  price,
  priceType,
  setPriceType,
  priceAmount,
  setPriceAmount,
  priceRecords,
  images,
  setImages,
  reports,
  imageUploads,
  reportUploads,
  dragId,
  setDragId,
  copied,
  setCopied,
  onBack,
  onCreate,
  onSave,
  onAct,
  onSavePrice,
  onUploadImages,
  onUploadReports,
  onDeleteImage,
  onDeleteReport,
  onSaveCaption,
  onDropReorder,
  onSetCover,
  onMoveImage,
}: VehicleFormViewProps) {
  const energy = form.energyType;
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [dropzoneHot, setDropzoneHot] = useState(false);
  const [moveLive, setMoveLive] = useState("");
  const imageCount = images.length;
  const needMore = Math.max(0, 4 - imageCount);
  const maxYear = currentMaxYear();
  const yearVal = form.registrationYear;
  const mileageVal = form.mileageKm;
  const transferVal = form.transferCount;

  function patchForm<K extends keyof VehicleFormState>(key: K, value: VehicleFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

    return (
      <div>
        {error ? (
          <p className="banner banner-warn" role="alert">
            <span>{error}</span>
            <button type="button" className="banner-dismiss" onClick={onDismissError} aria-label="关闭提示">
              ×
            </button>
          </p>
        ) : null}
        {info ? (
          <p className="banner banner-ok" role="status">
            <span>{info}</span>
            <button type="button" className="banner-dismiss" onClick={onDismissInfo} aria-label="关闭提示">
              ×
            </button>
          </p>
        ) : null}
        <div className="edit-split">
          <form onSubmit={editing ? (e) => { e.preventDefault(); void onSave(); } : (e) => onCreate(e)}>
            <div className="form-head">
              <h2 className="form-head-title">
                {editing ? `编辑 #${editing.id}` : "新建车辆"}
                <span className="page-sub"> · 步骤 {editing ? "2" : "1"} / 2</span>
              </h2>
              {editing ? <span className={statusTag(editing.status)}>{STATUS_LABEL[editing.status]}</span> : null}
              {editing ? <span className="page-sub">v{editing.version}</span> : null}
              {formBusy ? (
                <span className="page-sub" role="status">
                  处理中…
                </span>
              ) : null}
              <button type="button" className="btn btn-ghost" onClick={onBack} disabled={formBusy}>
                返回列表
              </button>
            </div>

            {!editing ? (
              <p className="page-sub form-step-note">
                先填基本信息并创建，创建后即可上传图片与报告。
              </p>
            ) : null}

            <div className="form-grid-3">
              <Field label="品牌" suggested>
                <input className="input" value={form.brand} onChange={(e) => patchForm("brand", e.target.value)} />
              </Field>
              <Field label="车型" suggested>
                <input className="input" value={form.model} onChange={(e) => patchForm("model", e.target.value)} />
              </Field>
              <Field label="上牌年" error={yearError(Number(yearVal))}>
                <input
                  className="input"
                  type="number"
                  min={1980}
                  max={maxYear}
                  step={1}
                  value={yearVal}
                  onChange={(e) => patchForm("registrationYear", Number(e.target.value))}
                />
              </Field>
              <Field label="里程（公里）" error={mileageError(Number(mileageVal))}>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step={100}
                  value={mileageVal}
                  onChange={(e) => patchForm("mileageKm", Number(e.target.value))}
                />
              </Field>
              <Field label="颜色">
                <input className="input" value={form.color} onChange={(e) => patchForm("color", e.target.value)} />
              </Field>
              <Field label="过户次数" error={transferError(Number(transferVal))}>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={20}
                  step={1}
                  value={transferVal}
                  onChange={(e) => patchForm("transferCount", Number(e.target.value))}
                />
              </Field>
            </div>

            <div className="form-block">
              <span className="field-label">能源</span>
              <div className="seg" role="group" aria-label="能源类型">
                {(
                  [
                    ["gasoline", "汽油"],
                    ["ev", "纯电"],
                    ["phev", "插混"],
                    ["range_extender", "增程"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className="seg-opt"
                    aria-pressed={energy === value}
                    onClick={() => patchForm("energyType", value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="form-grid-3">
                {energy !== "ev" ? (
                  <label className="field">
                    <span>排量（升）</span>
                    <input
                      className="input"
                      value={form.displacementL}
                      onChange={(e) => patchForm("displacementL", e.target.value)}
                    />
                  </label>
                ) : (
                  <label className="field field-muted">
                    <span>排量（升）</span>
                    <input className="input" placeholder="纯电不填" disabled />
                  </label>
                )}
                {energy !== "gasoline" ? (
                  <>
                    <label className="field">
                      <span>电耗</span>
                      <input
                        className="input"
                        value={form.energyConsumption}
                        onChange={(e) => patchForm("energyConsumption", e.target.value)}
                      />
                    </label>
                    <label className="field">
                      <span>电池 kWh</span>
                      <input
                        className="input"
                        value={form.batteryKwh}
                        onChange={(e) => patchForm("batteryKwh", e.target.value)}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label className="field field-muted">
                      <span>电耗</span>
                      <input className="input" placeholder="汽油车不填" disabled />
                    </label>
                    <label className="field field-muted">
                      <span>电池 kWh</span>
                      <input className="input" placeholder="汽油车不填" disabled />
                    </label>
                  </>
                )}
              </div>
            </div>

            <label className="field form-block">
              <span>车辆描述</span>
              <textarea
                className="input"
                rows={3}
                maxLength={500}
                value={form.conditionDesc}
                onChange={(e) => patchForm("conditionDesc", e.target.value)}
              />
            </label>

            <div className="form-block price-vin-row">
              <Field
                label="VIN"
                hint={editing ? "VIN 创建后不可修改" : undefined}
              >
                <input
                  className="input"
                  value={editing ? (editing.vinMasked ?? "") : form.vin}
                  onChange={(e) => {
                    if (editing) return;
                    setForm({ ...form, vin: e.target.value });
                  }}
                  readOnly={Boolean(editing)}
                  aria-readonly={Boolean(editing)}
                />
              </Field>
              {!editing ? (
                <div className="price-field">
                  <span className="field-label">初始价格</span>
                  <div className="price-controls">
                    <div className="seg" role="group" aria-label="初始价格类型">
                      <button
                        type="button"
                        className="seg-opt"
                        aria-pressed={form.initialPriceType === "amount"}
                        onClick={() => setForm({ ...form, initialPriceType: "amount" })}
                      >
                        标价
                      </button>
                      <button
                        type="button"
                        className="seg-opt"
                        aria-pressed={form.initialPriceType === "negotiable"}
                        onClick={() => setForm({ ...form, initialPriceType: "negotiable" })}
                      >
                        面谈
                      </button>
                    </div>
                    {form.initialPriceType === "amount" ? (
                      <input
                        className="input input-price"
                        value={form.initialAmount}
                        onChange={(e) => setForm({ ...form, initialAmount: e.target.value })}
                        inputMode="decimal"
                        aria-label="初始金额（元）"
                      />
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="price-field">
                  <span className="field-label">价格</span>
                  <div className="price-controls">
                    <div className="seg" role="group" aria-label="价格类型">
                      <button
                        type="button"
                        className="seg-opt"
                        aria-pressed={priceType === "amount"}
                        onClick={() => setPriceType("amount")}
                      >
                        标价
                      </button>
                      <button
                        type="button"
                        className="seg-opt"
                        aria-pressed={priceType === "negotiable"}
                        onClick={() => setPriceType("negotiable")}
                      >
                        面谈
                      </button>
                    </div>
                    {priceType === "amount" ? (
                      <input
                        className="input input-price"
                        value={priceAmount}
                        onChange={(e) => setPriceAmount(e.target.value)}
                        inputMode="decimal"
                        aria-label="金额（元）"
                      />
                    ) : null}
                    <button type="button" className="btn btn-secondary" onClick={() => void onSavePrice()} disabled={formBusy}>
                      改价
                    </button>
                  </div>
                </div>
              )}
            </div>

            {editing ? (
              <>
                <section className="media-section" aria-labelledby="vehicle-images-heading">
                  <div className="media-section-head">
                    <h3 id="vehicle-images-heading" className="media-section-title">
                      车辆图片
                    </h3>
                    <span className="page-sub">
                      拖拽或用左右键排序 · 第一张为封面 · 上架至少 4 张
                      {imageCount > 0 ? ` · 已有 ${imageCount} 张` : ""}
                      {needMore > 0 ? ` · 还差 ${needMore} 张` : ""}
                    </span>
                  </div>
                  <p className="visually-hidden" aria-live="polite">
                    {moveLive}
                  </p>
                  <div className="thumb-grid">
                    {images.map((img, i) => {
                      const dragging = dragId === img.id;
                      const dropOver = dropTargetId === img.id && dragId != null && dragId !== img.id;
                      return (
                        <div key={img.id} className="thumb-item">
                          <div
                            className={
                              dragging ? "thumb thumb-dragging" : dropOver ? "thumb thumb-drop-target" : "thumb"
                            }
                            draggable
                            onDragStart={(e) => {
                              setDragId(img.id);
                              e.dataTransfer.effectAllowed = "move";
                              try {
                                e.dataTransfer.setData("text/plain", String(img.id));
                              } catch {
                                /* ignore */
                              }
                            }}
                            onDragEnd={() => {
                              setDragId(null);
                              setDropTargetId(null);
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = "move";
                              setDropTargetId(img.id);
                            }}
                            onDragLeave={() => {
                              setDropTargetId((cur) => (cur === img.id ? null : cur));
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              setDropTargetId(null);
                              void onDropReorder(img.id);
                            }}
                            role="listitem"
                            aria-label={`图片 ${i + 1}${i === 0 ? "（封面）" : ""}，拖拽可排序`}
                          >
                            <ThumbPreview src={img.url} alt={img.caption || `图片 ${i + 1}`} />
                            {i === 0 ? <span className="tag thumb-cover">封面</span> : null}
                            {dragging ? <span className="thumb-drag-hint">拖动中</span> : null}
                            <div className="thumb-actions">
                              {i !== 0 ? (
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  onClick={() => void onSetCover(img.id)}
                                >
                                  设为封面
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className="btn btn-ghost btn-danger-text"
                                onClick={() => void onDeleteImage(img.id)}
                              >
                                删除
                              </button>
                            </div>
                          </div>
                          <input
                            className="input input-caption"
                            value={img.caption}
                            placeholder="图片说明"
                            maxLength={200}
                            onChange={(e) =>
                              setImages((prev) =>
                                prev.map((x) => (x.id === img.id ? { ...x, caption: e.target.value } : x)),
                              )
                            }
                            onBlur={(e) => void onSaveCaption(img.id, e.target.value)}
                            aria-label={`图片 ${i + 1} 说明`}
                          />
                          <div className="thumb-keys">
                            <button
                              type="button"
                              className="btn btn-ghost"
                              disabled={i === 0}
                              onClick={() => {
                                void onMoveImage(img.id, -1);
                                setMoveLive(`已移到第 ${i} 位`);
                              }}
                              aria-label={`将图片 ${i + 1} 左移`}
                            >
                              ←
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost"
                              disabled={i === images.length - 1}
                              onClick={() => {
                                void onMoveImage(img.id, 1);
                                setMoveLive(`已移到第 ${i + 2} 位`);
                              }}
                              aria-label={`将图片 ${i + 1} 右移`}
                            >
                              →
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="thumb-item">
                      <label
                        className={dropzoneHot ? "dropzone dropzone-hot" : "dropzone"}
                        htmlFor="vehicle-image-files"
                        onDragEnter={(e) => {
                          e.preventDefault();
                          setDropzoneHot(true);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDropzoneHot(true);
                        }}
                        onDragLeave={() => setDropzoneHot(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setDropzoneHot(false);
                          const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
                          if (files.length) void onUploadImages(files);
                        }}
                      >
                        <span>
                          拖拽图片到此处上传
                          <br />
                          <span className="dropzone-sub">或点击选择 · JPG/PNG/WebP</span>
                        </span>
                        <input
                          id="vehicle-image-files"
                          className="visually-hidden"
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => {
                            const files = Array.from(e.target.files ?? []);
                            if (files.length) void onUploadImages(files);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <div className="upload-task-list" aria-live="polite">
                        {imageUploads.map((t) => (
                          <div key={t.id} className={t.status === "failed" ? "page-sub upload-task-fail" : "page-sub"}>
                            {t.name}{" "}
                            {t.status === "uploading"
                              ? "上传中…"
                              : t.status === "done"
                                ? "完成"
                                : `失败${t.reason ? `：${t.reason}` : ""}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {imageCount > 0 && imageCount < 4 ? (
                    <p className="banner banner-warn banner-flush" role="status">
                      当前 {imageCount} 张，发布前至少需要 4 张图片。
                    </p>
                  ) : null}
                </section>

                <section className="media-section" aria-labelledby="vehicle-reports-heading">
                  <div className="media-section-head">
                    <h3 id="vehicle-reports-heading" className="media-section-title">
                      评估报告
                    </h3>
                    <span className="page-sub">{reports.length > 0 ? `${reports.length} 份` : "可选"}</span>
                  </div>
                  <div className="report-row-bar">
                    {reports.map((r) => (
                      <div key={r.id} className="report-chip">
                        <a href={r.url} target="_blank" rel="noreferrer" className="report-chip-link">
                          {r.contentType.split("/").pop()?.toUpperCase() || "FILE"} · {(r.byteSize / 1024).toFixed(0)} KB
                        </a>
                        <button type="button" className="btn btn-ghost btn-chip-del" onClick={() => void onDeleteReport(r.id)}>
                          删除
                        </button>
                      </div>
                    ))}
                    <label
                      className="dropzone dropzone-pill"
                      htmlFor="vehicle-report-files"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const files = Array.from(e.dataTransfer.files);
                        if (files.length) void onUploadReports(files);
                      }}
                    >
                      拖拽报告到此处上传
                      <input
                        id="vehicle-report-files"
                        className="visually-hidden"
                        type="file"
                        multiple
                        accept="application/pdf,image/jpeg,image/png"
                        onChange={(e) => {
                          const files = Array.from(e.target.files ?? []);
                          if (files.length) void onUploadReports(files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  <div className="upload-task-list" aria-live="polite">
                    {reportUploads.map((t) => (
                      <div key={t.id} className={t.status === "failed" ? "page-sub upload-task-fail" : "page-sub"}>
                        {t.name}{" "}
                        {t.status === "uploading"
                          ? "上传中…"
                          : t.status === "done"
                            ? "完成"
                            : `失败${t.reason ? `：${t.reason}` : ""}`}
                      </div>
                    ))}
                  </div>
                </section>
              </>
            ) : null}

            {!editing ? (
              <div className="form-block">
                <button type="submit" className="btn btn-primary" disabled={formBusy}>
                  {formBusy ? "创建中…" : "创建并继续"}
                </button>
              </div>
            ) : null}
          </form>

          {editing ? (
            <aside className="edit-aside">
              <div className="card elev-sm ops-card">
                <span className="ops-card-label">操作</span>
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  disabled={formBusy}
                  onClick={() =>
                    void onSave().then((updated) => {
                      if (updated) return onAct("publish", updated);
                    })
                  }
                >
                  {formBusy ? "处理中…" : "保存并发布"}
                </button>
                <button type="button" className="btn btn-secondary btn-block" disabled={formBusy} onClick={() => void onSave()}>
                  保存草稿
                </button>
                <button type="button" className="btn btn-ghost btn-block" disabled={formBusy} onClick={() => void onAct("unpublish")}>
                  下架
                </button>
                <button type="button" className="btn btn-ghost btn-block btn-danger-text" disabled={formBusy} onClick={() => void onAct("trash")}>
                  进回收站
                </button>
              </div>
              <div className="card elev-sm ops-card">
                <span className="ops-card-label">前台链接</span>
                {editing.status === "published" ? (
                  publicOrigin ? (
                    <div className="link-chip">
                      <code>{`${publicOrigin}/vehicles/${editing.id}`}</code>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          void navigator.clipboard.writeText(`${publicOrigin}/vehicles/${editing.id}`);
                          setCopied("已复制");
                        }}
                      >
                        复制
                      </button>
                      {copied ? <span className="page-sub">{copied}</span> : null}
                    </div>
                  ) : (
                    <span className="page-sub">未配置前台域名（VITE_PUBLIC_WEB_ORIGIN）</span>
                  )
                ) : (
                  <span className="page-sub">未上架时不可复制（无访客预览）</span>
                )}
              </div>
              <div className="card elev-sm ops-card">
                <span className="ops-card-label">价格记录</span>
                {priceRecords.length === 0 ? <span className="page-sub">暂无价格变动记录</span> : null}
                <div className="price-log-admin">
                  {priceRecords.map((r) => (
                    <div key={r.id} className="price-log-admin-row">
                      <span>
                        {formatPrice(r.from)} → {formatPrice(r.to)}
                        {r.operatorId ? <span className="page-sub"> · {r.operatorId}</span> : null}
                      </span>
                      <span className="page-sub">{r.createdAt.slice(5, 10)}</span>
                    </div>
                  ))}
                </div>
                <div className="price price-sm">当前：{formatPrice(price)}</div>
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    );
}
