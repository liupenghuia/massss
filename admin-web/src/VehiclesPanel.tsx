import { useEffect, useState, type FormEvent } from "react";
import { api } from "./api";
import { describeError } from "./vehicles/helpers";
import { VehicleFormView } from "./vehicles/VehicleFormView";
import { VehicleListView } from "./vehicles/VehicleListView";
import {
  emptyForm,
  type AdminVehicle,
  type ImageItem,
  type PriceRecordItem,
  type PriceValue,
  type ReportItem,
  type Status,
  type UploadTask,
} from "./vehicles/types";

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
  const [info, setInfo] = useState("");
  const [dragId, setDragId] = useState<number | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [formBusy, setFormBusy] = useState(false);
  const [covers, setCovers] = useState<Record<number, string>>({});

  const publicOrigin = (import.meta.env.VITE_PUBLIC_WEB_ORIGIN as string | undefined)?.trim() || "";
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function load(nextPage = page, filters?: { status?: Status | ""; q?: string }) {
    const nextStatus = filters?.status !== undefined ? filters.status : status;
    const nextQ = filters?.q !== undefined ? filters.q : q;
    setError("");
    setListLoading(true);
    try {
      const qs = new URLSearchParams({ page: String(nextPage), pageSize: String(pageSize) });
      if (nextStatus) qs.set("status", nextStatus);
      if (nextQ.trim()) qs.set("q", nextQ.trim());
      const data = await api<{ items: AdminVehicle[]; total: number }>(`/admin/vehicles?${qs}`);
      setItems(data.items);
      setTotal(data.total);
      setPage(nextPage);
      void Promise.all(
        data.items.map(async (v) => {
          try {
            const imgs = await api<{ items: ImageItem[] }>(`/admin/vehicles/${v.id}/images`);
            const url = imgs.items[0]?.url;
            if (url) setCovers((prev) => (prev[v.id] === url ? prev : { ...prev, [v.id]: url }));
          } catch {
            /* ignore cover errors */
          }
        }),
      );
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    void load(1).catch((err) => setError(err instanceof Error ? err.message : "加载失败"));
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    setError("");
    const body: Record<string, unknown> = {
      brand: form.brand || undefined,
      model: form.model || undefined,
      registrationYear: Number(form.registrationYear),
      mileageKm: Number(form.mileageKm),
      color: form.color || undefined,
      conditionDesc: form.conditionDesc || undefined,
      energyType: form.energyType || undefined,
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
    setInfo("");
    setFormBusy(true);
    setView("form");
    try {
      const detail = await api<AdminVehicle>(`/admin/vehicles/${v.id}`);
      setSelected(detail);
      const [p, imgs, reps, records] = await Promise.all([
        api<{ filled: boolean; current: PriceValue | null }>(`/admin/vehicles/${v.id}/price`),
        api<{ items: ImageItem[] }>(`/admin/vehicles/${v.id}/images`),
        api<{ items: ReportItem[] }>(`/admin/vehicles/${v.id}/reports`),
        api<{ items: PriceRecordItem[] }>(`/admin/vehicles/${v.id}/price-records`),
      ]);
      setPrice(p.current);
      if (p.current?.type === "amount") {
        setPriceType("amount");
        setPriceAmount(String(p.current.amount));
      } else {
        setPriceType("negotiable");
      }
      setImages(imgs.items);
      if (imgs.items[0]?.url) setCovers((prev) => ({ ...prev, [v.id]: imgs.items[0]!.url }));
      setReports(reps.items);
      setPriceRecords(records.items);
      setCopied("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载车辆失败");
      setView("list");
    } finally {
      setFormBusy(false);
    }
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
    if (path === "trash" && !window.confirm("确认将该车辆移入回收站？可在回收站恢复。")) return;
    setError("");
    setInfo("");
    setFormBusy(true);
    try {
      const updated = await api<AdminVehicle>(`/admin/vehicles/${vehicle.id}/${path}`, {
        method: "POST",
        body: JSON.stringify({ version: vehicle.version }),
      });
      if (path === "trash") {
        if (updated.version === vehicle.version) {
          setInfo("该车辆已在回收站中，保留期不变");
        }
        setSelected(null);
        setView("list");
        await load();
        return;
      }
      setSelected(updated);
      await load();
    } catch (err) {
      setError(describeError(err, "操作失败"));
    } finally {
      setFormBusy(false);
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
    setImageUploads(files.map((f, id) => ({ id, name: f.name, status: "uploading" as const })));
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
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
        setImageUploads((prev) => prev.map((t) => (t.id === i ? { ...t, status: "done", reason: undefined } : t)));
      } catch (err) {
        const reason = err instanceof Error ? err.message : "上传失败";
        setImageUploads((prev) => prev.map((t) => (t.id === i ? { ...t, status: "failed", reason } : t)));
      }
    }
    const imgs = await api<{ items: ImageItem[] }>(`/admin/vehicles/${selected.id}/images`);
    setImages(imgs.items);
    if (imgs.items[0]?.url) setCovers((prev) => ({ ...prev, [selected.id]: imgs.items[0]!.url }));
  }

  async function uploadReports(files: File[]) {
    if (!selected) return;
    setError("");
    setReportUploads(files.map((f, id) => ({ id, name: f.name, status: "uploading" as const })));
    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
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
        setReportUploads((prev) => prev.map((t) => (t.id === i ? { ...t, status: "done", reason: undefined } : t)));
      } catch (err) {
        const reason = err instanceof Error ? err.message : "上传失败";
        setReportUploads((prev) => prev.map((t) => (t.id === i ? { ...t, status: "failed", reason } : t)));
      }
    }
    const reps = await api<{ items: ReportItem[] }>(`/admin/vehicles/${selected.id}/reports`);
    setReports(reps.items);
  }

  async function deleteImage(imageId: number) {
    if (!selected) return;
    if (!window.confirm("确认删除这张图片？")) return;
    setError("");
    try {
      await api(`/admin/vehicles/${selected.id}/images/${imageId}`, { method: "DELETE" });
      const imgs = await api<{ items: ImageItem[] }>(`/admin/vehicles/${selected.id}/images`);
      setImages(imgs.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  }

  async function deleteReport(reportId: number) {
    if (!selected) return;
    if (!window.confirm("确认删除这份评估报告？")) return;
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
    return (
      <VehicleFormView
        editing={selected}
        form={form}
        setForm={setForm}
        setSelected={setSelected}
        error={error}
        info={info}
        formBusy={formBusy}
        publicOrigin={publicOrigin}
        price={price}
        priceType={priceType}
        setPriceType={setPriceType}
        priceAmount={priceAmount}
        setPriceAmount={setPriceAmount}
        priceRecords={priceRecords}
        images={images}
        setImages={setImages}
        reports={reports}
        imageUploads={imageUploads}
        reportUploads={reportUploads}
        dragId={dragId}
        setDragId={setDragId}
        copied={copied}
        setCopied={setCopied}
        onBack={() => setView("list")}
        onCreate={(e) => void create(e)}
        onSave={saveSelected}
        onAct={(path, vehicle) => void act(path, vehicle)}
        onSavePrice={() => void savePrice()}
        onUploadImages={(files) => void uploadImages(files)}
        onUploadReports={(files) => void uploadReports(files)}
        onDeleteImage={(id) => void deleteImage(id)}
        onDeleteReport={(id) => void deleteReport(id)}
        onSaveCaption={(id, caption) => void saveCaption(id, caption)}
        onDropReorder={(id) => void dropReorder(id)}
      />
    );
  }

  return (
    <VehicleListView
      items={items}
      total={total}
      page={page}
      totalPages={totalPages}
      status={status}
      q={q}
      listLoading={listLoading}
      error={error}
      info={info}
      covers={covers}
      onStatusChange={(value) => {
        setStatus(value);
        void load(1, { status: value }).catch((err) => setError(err instanceof Error ? err.message : "加载失败"));
      }}
      onQChange={setQ}
      onFilter={() => void load(1).catch((err) => setError(err instanceof Error ? err.message : "加载失败"))}
      onClearFilters={() => {
        setStatus("");
        setQ("");
        void load(1, { status: "", q: "" }).catch((err) => setError(err instanceof Error ? err.message : "加载失败"));
      }}
      onOpen={(v) => void open(v)}
      onCreate={startCreate}
      onPage={(p) => void load(p).catch((err) => setError(err instanceof Error ? err.message : "加载失败"))}
    />
  );
}
