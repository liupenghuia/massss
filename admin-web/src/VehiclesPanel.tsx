import { useEffect, useState, type FormEvent } from "react";
import { api } from "./api";

type EnergyType = "gasoline" | "ev" | "phev" | "range_extender";
type Status = "draft" | "published" | "unpublished";

type AdminVehicle = {
  id: number;
  status: Status;
  version: number;
  brand: string;
  model: string;
  registrationYear: number;
  mileageKm: number;
  color: string;
  conditionDesc: string;
  energyType: EnergyType;
  transferCount: number;
  displacementL: number | null;
  energyConsumption: number | null;
  batteryKwh: number | null;
  vinMasked: string | null;
};

type PriceValue = { type: "amount"; amount: number } | { type: "negotiable"; amount: null };
type ImageItem = { id: number; url: string; caption: string };
type ReportItem = { id: number; url: string; contentType: string; byteSize: number };
type PriceRecordItem = { id: number; from: PriceValue; to: PriceValue; createdAt: string };
type UploadTask = { name: string; status: "uploading" | "done" | "failed" };

const emptyForm = {
  brand: "",
  model: "",
  registrationYear: 2020,
  mileageKm: 0,
  color: "",
  conditionDesc: "",
  energyType: "gasoline" as EnergyType,
  transferCount: 0,
  displacementL: "1.5",
  energyConsumption: "",
  batteryKwh: "",
  vin: "",
  initialPriceType: "amount" as "amount" | "negotiable",
  initialAmount: "1.00",
};

const STATUS_LABEL: Record<Status, string> = {
  draft: "草稿",
  published: "已上架",
  unpublished: "已下架",
};

function statusTag(status: Status): string {
  if (status === "published") return "tag tag-accent-2";
  if (status === "draft") return "tag tag-neutral";
  return "tag tag-outline";
}

function formatPrice(p: PriceValue | null | { type: string; amount: number | null }): string {
  if (!p) return "未填";
  if (p.type === "negotiable" || p.type === "unset" || p.amount == null) return "面议";
  return `${(p.amount / 10000).toFixed(2)} 万`;
}

function ThumbPreview({ src, alt }: { src: string; alt: string }) {
  const [ok, setOk] = useState(true);
  useEffect(() => {
    setOk(true);
  }, [src]);
  if (!ok) return <span className="thumb-fallback">无法预览</span>;
  return <img src={src} alt={alt} onError={() => setOk(false)} />;
}

export function VehiclesPanel() {
  const [view, setView] = useState<"list" | "form">("list");
  const [items, setItems] = useState<AdminVehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<Status | "">("");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState<AdminVehicle | null>(null);
  const [price, setPrice] = useState<PriceValue | null>(null);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [priceRecords, setPriceRecords] = useState<PriceRecordItem[]>([]);
  const [imageUploads, setImageUploads] = useState<UploadTask[]>([]);
  const [reportUploads, setReportUploads] = useState<UploadTask[]>([]);
  const [priceType, setPriceType] = useState<"amount" | "negotiable">("amount");
  const [priceAmount, setPriceAmount] = useState("1.00");
  const [copied, setCopied] = useState("");
  const [dragId, setDragId] = useState<number | null>(null);

  const publicOrigin = (import.meta.env.VITE_PUBLIC_WEB_ORIGIN as string | undefined) ?? "http://127.0.0.1:5173";
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function load(nextPage = page) {
    setError("");
    const qs = new URLSearchParams({ page: String(nextPage), pageSize: String(pageSize) });
    if (status) qs.set("status", status);
    if (q.trim()) qs.set("q", q.trim());
    const data = await api<{ items: AdminVehicle[]; total: number }>(`/admin/vehicles?${qs}`);
    setItems(data.items);
    setTotal(data.total);
    setPage(nextPage);
  }

  useEffect(() => {
    void load(1).catch((err) => setError(err instanceof Error ? err.message : "加载失败"));
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError("");
    const body: Record<string, unknown> = {
      brand: form.brand,
      model: form.model,
      registrationYear: Number(form.registrationYear),
      mileageKm: Number(form.mileageKm),
      color: form.color,
      conditionDesc: form.conditionDesc,
      energyType: form.energyType,
      transferCount: Number(form.transferCount),
      displacementL: form.energyType === "ev" ? null : Number(form.displacementL),
      energyConsumption: form.energyType === "gasoline" ? null : form.energyConsumption ? Number(form.energyConsumption) : null,
      batteryKwh: form.energyType === "gasoline" ? null : form.batteryKwh ? Number(form.batteryKwh) : null,
      vin: form.vin || null,
      initialPrice:
        form.initialPriceType === "amount"
          ? { type: "amount", amount: Number(form.initialAmount) }
          : { type: "negotiable", amount: null },
    };
    try {
      const created = await api<AdminVehicle>("/admin/vehicles", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setForm(emptyForm);
      await open(created);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    }
  }

  async function open(v: AdminVehicle) {
    setError("");
    const detail = await api<AdminVehicle>(`/admin/vehicles/${v.id}`);
    setSelected(detail);
    const p = await api<{ filled: boolean; current: PriceValue | null }>(`/admin/vehicles/${v.id}/price`);
    setPrice(p.current);
    if (p.current?.type === "amount") {
      setPriceType("amount");
      setPriceAmount(String(p.current.amount));
    } else {
      setPriceType("negotiable");
    }
    const imgs = await api<{ items: ImageItem[] }>(`/admin/vehicles/${v.id}/images`);
    setImages(imgs.items);
    const reps = await api<{ items: ReportItem[] }>(`/admin/vehicles/${v.id}/reports`);
    setReports(reps.items);
    const records = await api<{ items: PriceRecordItem[] }>(`/admin/vehicles/${v.id}/price-records`);
    setPriceRecords(records.items);
    setCopied("");
    setView("form");
  }

  async function saveSelected(): Promise<AdminVehicle | null> {
    if (!selected) return null;
    setError("");
    try {
      const updated = await api<AdminVehicle>(`/admin/vehicles/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          version: selected.version,
          brand: selected.brand,
          model: selected.model,
          registrationYear: selected.registrationYear,
          mileageKm: selected.mileageKm,
          color: selected.color,
          conditionDesc: selected.conditionDesc,
          energyType: selected.energyType,
          transferCount: selected.transferCount,
          displacementL: selected.energyType === "ev" ? null : selected.displacementL,
          energyConsumption: selected.energyType === "gasoline" ? null : selected.energyConsumption,
          batteryKwh: selected.energyType === "gasoline" ? null : selected.batteryKwh,
        }),
      });
      setSelected(updated);
      await load();
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
      return null;
    }
  }

  async function act(path: string, vehicle: AdminVehicle = selected as AdminVehicle) {
    if (!vehicle) return;
    setError("");
    try {
      const updated = await api<AdminVehicle>(`/admin/vehicles/${vehicle.id}/${path}`, {
        method: "POST",
        body: JSON.stringify({ version: vehicle.version }),
      });
      if (path === "trash") {
        setSelected(null);
        setView("list");
        await load();
        return;
      }
      setSelected(updated);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "操作失败");
    }
  }

  async function savePrice() {
    if (!selected) return;
    setError("");
    try {
      const body =
        priceType === "amount" ? { type: "amount", amount: Number(priceAmount) } : { type: "negotiable", amount: null };
      const data = await api<{ current: PriceValue }>(`/admin/vehicles/${selected.id}/price`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      setPrice(data.current);
      const records = await api<{ items: PriceRecordItem[] }>(`/admin/vehicles/${selected.id}/price-records`);
      setPriceRecords(records.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "改价失败");
    }
  }

  async function uploadImages(files: File[]) {
    if (!selected) return;
    setError("");
    setImageUploads(files.map((f) => ({ name: f.name, status: "uploading" })));
    for (const file of files) {
      try {
        const contentType = file.type || "image/jpeg";
        const presign = await api<{ uploadUrl: string; objectKey: string; requiredHeaders: Record<string, string> }>(
          `/admin/vehicles/${selected.id}/images/presign`,
          { method: "POST", body: JSON.stringify({ contentType, byteSize: file.size }) },
        );
        const putRes = await fetch(presign.uploadUrl, {
          method: "PUT",
          headers: presign.requiredHeaders,
          body: file,
        });
        if (!putRes.ok) throw new Error(`图片直传失败（${putRes.status}）`);
        await api(`/admin/vehicles/${selected.id}/images`, {
          method: "POST",
          body: JSON.stringify({ objectKey: presign.objectKey, caption: "" }),
        });
        setImageUploads((prev) => prev.map((t) => (t.name === file.name ? { ...t, status: "done" } : t)));
      } catch (err) {
        setImageUploads((prev) => prev.map((t) => (t.name === file.name ? { ...t, status: "failed" } : t)));
        setError(err instanceof Error ? err.message : "上传失败");
      }
    }
    const imgs = await api<{ items: ImageItem[] }>(`/admin/vehicles/${selected.id}/images`);
    setImages(imgs.items);
  }

  async function uploadReports(files: File[]) {
    if (!selected) return;
    setError("");
    setReportUploads(files.map((f) => ({ name: f.name, status: "uploading" })));
    for (const file of files) {
      try {
        const contentType = file.type || "application/pdf";
        const presign = await api<{ uploadUrl: string; objectKey: string; requiredHeaders: Record<string, string> }>(
          `/admin/vehicles/${selected.id}/reports/presign`,
          { method: "POST", body: JSON.stringify({ contentType, byteSize: file.size }) },
        );
        const putRes = await fetch(presign.uploadUrl, {
          method: "PUT",
          headers: presign.requiredHeaders,
          body: file,
        });
        if (!putRes.ok) throw new Error(`报告直传失败（${putRes.status}）`);
        await api(`/admin/vehicles/${selected.id}/reports`, {
          method: "POST",
          body: JSON.stringify({ objectKey: presign.objectKey }),
        });
        setReportUploads((prev) => prev.map((t) => (t.name === file.name ? { ...t, status: "done" } : t)));
      } catch (err) {
        setReportUploads((prev) => prev.map((t) => (t.name === file.name ? { ...t, status: "failed" } : t)));
        setError(err instanceof Error ? err.message : "上传失败");
      }
    }
    const reps = await api<{ items: ReportItem[] }>(`/admin/vehicles/${selected.id}/reports`);
    setReports(reps.items);
  }

  async function deleteReport(reportId: number) {
    if (!selected) return;
    setError("");
    try {
      await api(`/admin/vehicles/${selected.id}/reports/${reportId}`, { method: "DELETE" });
      const reps = await api<{ items: ReportItem[] }>(`/admin/vehicles/${selected.id}/reports`);
      setReports(reps.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  async function saveCaption(imageId: number, caption: string) {
    if (!selected) return;
    try {
      await api(`/admin/vehicles/${selected.id}/images/${imageId}`, {
        method: "PATCH",
        body: JSON.stringify({ caption }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存图片说明失败");
    }
  }

  async function dropReorder(targetId: number) {
    if (!selected || dragId == null || dragId === targetId) {
      setDragId(null);
      return;
    }
    const ids = images.map((img) => img.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) {
      setDragId(null);
      return;
    }
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragId(null);
    try {
      const data = await api<{ items: ImageItem[] }>(`/admin/vehicles/${selected.id}/images/order`, {
        method: "PUT",
        body: JSON.stringify({ imageIds: next }),
      });
      setImages(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "排序失败");
    }
  }

  function startCreate() {
    setSelected(null);
    setForm(emptyForm);
    setImages([]);
    setReports([]);
    setPriceRecords([]);
    setPrice(null);
    setError("");
    setView("form");
  }

  if (view === "form") {
    const editing = selected;
    const energy = editing ? editing.energyType : form.energyType;
    return (
      <div>
        {error ? (
          <p className="banner banner-warn" role="alert">
            {error}
          </p>
        ) : null}
        <div className="edit-split">
          <form onSubmit={editing ? (e) => { e.preventDefault(); void saveSelected(); } : (e) => void create(e)}>
            <div className="form-head">
              <h2 style={{ margin: 0 }}>{editing ? `编辑 #${editing.id}` : "新建车辆"}</h2>
              {editing ? <span className={statusTag(editing.status)}>{STATUS_LABEL[editing.status]}</span> : null}
              {editing ? <span className="page-sub">v{editing.version}</span> : null}
              <button type="button" className="btn btn-ghost" onClick={() => setView("list")}>
                返回列表
              </button>
            </div>

            <div className="form-grid-3">
              <label className="field">
                <span>品牌</span>
                <input
                  className="input"
                  required
                  value={editing ? editing.brand : form.brand}
                  onChange={(e) =>
                    editing
                      ? setSelected({ ...editing, brand: e.target.value })
                      : setForm({ ...form, brand: e.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>车型</span>
                <input
                  className="input"
                  required
                  value={editing ? editing.model : form.model}
                  onChange={(e) =>
                    editing
                      ? setSelected({ ...editing, model: e.target.value })
                      : setForm({ ...form, model: e.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>上牌年</span>
                <input
                  className="input"
                  type="number"
                  value={editing ? editing.registrationYear : form.registrationYear}
                  onChange={(e) =>
                    editing
                      ? setSelected({ ...editing, registrationYear: Number(e.target.value) })
                      : setForm({ ...form, registrationYear: Number(e.target.value) })
                  }
                />
              </label>
              <label className="field">
                <span>里程（公里）</span>
                <input
                  className="input"
                  type="number"
                  value={editing ? editing.mileageKm : form.mileageKm}
                  onChange={(e) =>
                    editing
                      ? setSelected({ ...editing, mileageKm: Number(e.target.value) })
                      : setForm({ ...form, mileageKm: Number(e.target.value) })
                  }
                />
              </label>
              <label className="field">
                <span>颜色</span>
                <input
                  className="input"
                  required
                  value={editing ? editing.color : form.color}
                  onChange={(e) =>
                    editing
                      ? setSelected({ ...editing, color: e.target.value })
                      : setForm({ ...form, color: e.target.value })
                  }
                />
              </label>
              <label className="field">
                <span>过户次数</span>
                <input
                  className="input"
                  type="number"
                  value={editing ? editing.transferCount : form.transferCount}
                  onChange={(e) =>
                    editing
                      ? setSelected({ ...editing, transferCount: Number(e.target.value) })
                      : setForm({ ...form, transferCount: Number(e.target.value) })
                  }
                />
              </label>
            </div>

            <div style={{ marginTop: 16 }}>
              <span className="page-sub">能源</span>
              <div className="seg" style={{ marginTop: 10 }}>
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
                    style={energy === value ? { background: "var(--color-accent)", color: "var(--color-neutral-100)" } : undefined}
                    onClick={() =>
                      editing
                        ? setSelected({ ...editing, energyType: value })
                        : setForm({ ...form, energyType: value })
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="form-grid-3" style={{ marginTop: 16 }}>
                {energy !== "ev" ? (
                  <label className="field">
                    <span>排量（升）</span>
                    <input
                      className="input"
                      value={editing ? String(editing.displacementL ?? "") : form.displacementL}
                      onChange={(e) =>
                        editing
                          ? setSelected({ ...editing, displacementL: e.target.value ? Number(e.target.value) : null })
                          : setForm({ ...form, displacementL: e.target.value })
                      }
                    />
                  </label>
                ) : (
                  <label className="field" style={{ opacity: 0.45 }}>
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
                        value={editing ? String(editing.energyConsumption ?? "") : form.energyConsumption}
                        onChange={(e) =>
                          editing
                            ? setSelected({
                                ...editing,
                                energyConsumption: e.target.value ? Number(e.target.value) : null,
                              })
                            : setForm({ ...form, energyConsumption: e.target.value })
                        }
                      />
                    </label>
                    <label className="field">
                      <span>电池 kWh</span>
                      <input
                        className="input"
                        value={editing ? String(editing.batteryKwh ?? "") : form.batteryKwh}
                        onChange={(e) =>
                          editing
                            ? setSelected({ ...editing, batteryKwh: e.target.value ? Number(e.target.value) : null })
                            : setForm({ ...form, batteryKwh: e.target.value })
                        }
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label className="field" style={{ opacity: 0.45 }}>
                      <span>电耗</span>
                      <input className="input" placeholder="汽油车不填" disabled />
                    </label>
                    <label className="field" style={{ opacity: 0.45 }}>
                      <span>电池 kWh</span>
                      <input className="input" placeholder="汽油车不填" disabled />
                    </label>
                  </>
                )}
              </div>
            </div>

            <label className="field" style={{ marginTop: 16 }}>
              <span>车辆描述</span>
              <textarea
                className="input"
                rows={3}
                required
                value={editing ? editing.conditionDesc : form.conditionDesc}
                onChange={(e) =>
                  editing
                    ? setSelected({ ...editing, conditionDesc: e.target.value })
                    : setForm({ ...form, conditionDesc: e.target.value })
                }
              />
            </label>

            <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap", marginTop: 16 }}>
              <label className="field field-fixed">
                <span>VIN</span>
                <input
                  className="input"
                  value={editing ? (editing.vinMasked ?? "") : form.vin}
                  onChange={(e) => {
                    if (editing) return;
                    setForm({ ...form, vin: e.target.value });
                  }}
                  readOnly={Boolean(editing)}
                />
              </label>
              {!editing ? (
                <div>
                  <span className="page-sub">初始价格</span>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6 }}>
                    <div className="seg">
                      <button
                        type="button"
                        className="seg-opt"
                        style={
                          form.initialPriceType === "amount"
                            ? { background: "var(--color-accent)", color: "var(--color-neutral-100)" }
                            : undefined
                        }
                        onClick={() => setForm({ ...form, initialPriceType: "amount" })}
                      >
                        标价
                      </button>
                      <button
                        type="button"
                        className="seg-opt"
                        style={
                          form.initialPriceType === "negotiable"
                            ? { background: "var(--color-accent)", color: "var(--color-neutral-100)" }
                            : undefined
                        }
                        onClick={() => setForm({ ...form, initialPriceType: "negotiable" })}
                      >
                        面谈
                      </button>
                    </div>
                    {form.initialPriceType === "amount" ? (
                      <input
                        className="input"
                        value={form.initialAmount}
                        onChange={(e) => setForm({ ...form, initialAmount: e.target.value })}
                        style={{ width: 130 }}
                      />
                    ) : null}
                  </div>
                </div>
              ) : (
                <div>
                  <span className="page-sub">价格</span>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6 }}>
                    <div className="seg">
                      <button
                        type="button"
                        className="seg-opt"
                        style={
                          priceType === "amount"
                            ? { background: "var(--color-accent)", color: "var(--color-neutral-100)" }
                            : undefined
                        }
                        onClick={() => setPriceType("amount")}
                      >
                        标价
                      </button>
                      <button
                        type="button"
                        className="seg-opt"
                        style={
                          priceType === "negotiable"
                            ? { background: "var(--color-accent)", color: "var(--color-neutral-100)" }
                            : undefined
                        }
                        onClick={() => setPriceType("negotiable")}
                      >
                        面谈
                      </button>
                    </div>
                    {priceType === "amount" ? (
                      <input className="input" value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} style={{ width: 130 }} />
                    ) : null}
                    <button type="button" className="btn btn-secondary" onClick={() => void savePrice()}>
                      改价
                    </button>
                  </div>
                </div>
              )}
            </div>

            {editing ? (
              <>
                <div style={{ marginTop: 24 }}>
                  <div className="form-head" style={{ marginBottom: 0 }}>
                    <h3 style={{ margin: 0 }}>车辆图片</h3>
                    <span className="page-sub">拖拽排序 · 第一张为封面 · 上架至少 4 张</span>
                  </div>
                  <div className="thumb-grid" style={{ marginTop: 12 }}>
                    {images.map((img, i) => (
                      <div key={img.id}>
                        <div
                          className="thumb"
                          draggable
                          onDragStart={() => setDragId(img.id)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => void dropReorder(img.id)}
                          style={dragId === img.id ? { outline: "2px dashed var(--color-accent)" } : undefined}
                        >
                          <ThumbPreview src={img.url} alt={img.caption || `图片 ${i + 1}`} />
                          {i === 0 ? <span className="tag thumb-cover">封面</span> : null}
                        </div>
                        <input
                          className="input"
                          value={img.caption}
                          placeholder="图片说明"
                          onChange={(e) =>
                            setImages((prev) => prev.map((x) => (x.id === img.id ? { ...x, caption: e.target.value } : x)))
                          }
                          onBlur={(e) => void saveCaption(img.id, e.target.value)}
                          style={{ marginTop: 6, padding: "6px 12px" }}
                        />
                      </div>
                    ))}
                    <div>
                      <label
                        className="dropzone"
                        htmlFor="vehicle-image-files"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const files = Array.from(e.dataTransfer.files);
                          if (files.length) void uploadImages(files);
                        }}
                      >
                        拖拽图片到此处上传
                        <input
                          id="vehicle-image-files"
                          className="visually-hidden"
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) => {
                            const files = Array.from(e.target.files ?? []);
                            if (files.length) void uploadImages(files);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {imageUploads.map((t) => (
                        <div key={t.name} className="page-sub">
                          {t.name} {t.status === "uploading" ? "上传中…" : t.status === "done" ? "完成" : "失败"}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 24 }}>
                  <h3>评估报告</h3>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    {reports.map((r) => (
                      <div key={r.id} className="banner banner-ok" style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: 999 }}>
                        <a href={r.url} target="_blank" rel="noreferrer">
                          {r.contentType} · {(r.byteSize / 1024).toFixed(0)} KB
                        </a>
                        <button type="button" className="btn btn-ghost" onClick={() => void deleteReport(r.id)}>
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
                        if (files.length) void uploadReports(files);
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
                          if (files.length) void uploadReports(files);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                  {reportUploads.map((t) => (
                    <div key={t.name} className="page-sub">
                      {t.name} {t.status === "uploading" ? "上传中…" : t.status === "done" ? "完成" : "失败"}
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {!editing ? (
              <div style={{ marginTop: 24 }}>
                <button type="submit" className="btn btn-primary">
                  创建
                </button>
              </div>
            ) : null}
          </form>

          {editing ? (
            <aside>
              <div className="card elev-sm" style={{ gap: 14 }}>
                <span className="page-sub" style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}>
                  操作
                </span>
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() =>
                    void saveSelected().then((updated) => {
                      if (updated) return act("publish", updated);
                    })
                  }
                >
                  保存并发布
                </button>
                <button type="button" className="btn btn-secondary btn-block" onClick={() => void saveSelected()}>
                  保存草稿
                </button>
                <button type="button" className="btn btn-ghost btn-block" onClick={() => void act("unpublish")}>
                  下架
                </button>
                <button type="button" className="btn btn-ghost btn-block" onClick={() => void act("trash")}>
                  进回收站
                </button>
              </div>
              <div className="card elev-sm" style={{ marginTop: 20, gap: 10 }}>
                <span className="page-sub" style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}>
                  前台链接
                </span>
                {editing.status === "published" ? (
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
                  <span className="page-sub">未上架时不可复制（无访客预览）</span>
                )}
              </div>
              <div className="card elev-sm" style={{ marginTop: 20, gap: 12 }}>
                <span className="page-sub" style={{ letterSpacing: "0.14em", textTransform: "uppercase" }}>
                  价格记录
                </span>
                {priceRecords.length === 0 ? <span className="page-sub">暂无记录</span> : null}
                {priceRecords.map((r) => (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span>
                      {formatPrice(r.from)} → {formatPrice(r.to)}
                    </span>
                    <span className="page-sub">{r.createdAt.slice(5, 10)}</span>
                  </div>
                ))}
                <div className="price price-sm">当前：{formatPrice(price)}</div>
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h2>车辆</h2>
          <p className="page-sub">共 {total} 辆</p>
        </div>
        <div className="toolbar">
          <div className="seg">
            {(
              [
                ["", "全部状态"],
                ["draft", "草稿"],
                ["published", "已上架"],
                ["unpublished", "已下架"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={label}
                type="button"
                className="seg-opt"
                style={status === value ? { background: "var(--color-accent)", color: "var(--color-neutral-100)" } : undefined}
                onClick={() => {
                  setStatus(value);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <input className="input" placeholder="品牌 / 车型" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="button" className="btn btn-secondary" onClick={() => void load(1)}>
            筛选
          </button>
          <button type="button" className="btn btn-primary" onClick={startCreate}>
            新建车辆
          </button>
        </div>
      </div>
      {error ? (
        <p className="banner banner-warn" role="alert">
          {error}
        </p>
      ) : null}
      {items.length === 0 ? (
        <div className="empty-card">
          <div className="empty-blob" />
          <div style={{ fontFamily: "var(--font-heading)", fontSize: 20 }}>暂无车辆</div>
        </div>
      ) : (
        <ul className="vehicle-grid">
          {items.map((v) => (
            <li key={v.id}>
              <button type="button" className="card elev-sm vehicle-card" onClick={() => void open(v)}>
                <div className="vehicle-card-cover">车辆封面图</div>
                <div className="vehicle-card-body">
                  <div className="card-title-row">
                    <span className="vehicle-card-title">
                      {v.brand} {v.model}
                    </span>
                    <span className={statusTag(v.status)}>{STATUS_LABEL[v.status]}</span>
                  </div>
                  <div className="page-sub">
                    #{v.id} · v{v.version} · {v.registrationYear} 年 · {v.mileageKm.toLocaleString("zh-CN")} 公里
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {totalPages > 1 ? (
        <div className="pager">
          <button type="button" className="btn btn-ghost" disabled={page <= 1} onClick={() => void load(page - 1)}>
            上一页
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page >= totalPages}
            onClick={() => void load(page + 1)}
          >
            下一页
          </button>
        </div>
      ) : null}
    </div>
  );
}
