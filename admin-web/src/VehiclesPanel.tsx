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

export function VehiclesPanel() {
  const [items, setItems] = useState<AdminVehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<Status | "">("");
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState<AdminVehicle | null>(null);
  const [price, setPrice] = useState<PriceValue | null>(null);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [priceType, setPriceType] = useState<"amount" | "negotiable">("amount");
  const [priceAmount, setPriceAmount] = useState("1.00");
  const [copied, setCopied] = useState("");

  const publicOrigin = (import.meta.env.VITE_PUBLIC_WEB_ORIGIN as string | undefined) ?? "http://127.0.0.1:5173";

  async function load() {
    setError("");
    const qs = new URLSearchParams({ page: "1", pageSize: "50" });
    if (status) qs.set("status", status);
    if (q.trim()) qs.set("q", q.trim());
    const data = await api<{ items: AdminVehicle[]; total: number }>(`/admin/vehicles?${qs}`);
    setItems(data.items);
    setTotal(data.total);
  }

  useEffect(() => {
    void load().catch((err) => setError(err instanceof Error ? err.message : "加载失败"));
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
      await api("/admin/vehicles", {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setForm(emptyForm);
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
  }

  async function saveSelected() {
    if (!selected) return;
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    }
  }

  async function act(path: string) {
    if (!selected) return;
    setError("");
    try {
      const updated = await api<AdminVehicle>(`/admin/vehicles/${selected.id}/${path}`, {
        method: "POST",
        body: JSON.stringify({ version: selected.version }),
      });
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "改价失败");
    }
  }

  async function uploadImage(file: File) {
    if (!selected) return;
    setError("");
    try {
      const contentType = file.type || "image/jpeg";
      const presign = await api<{ uploadUrl: string; objectKey: string; requiredHeaders: Record<string, string> }>(
        `/admin/vehicles/${selected.id}/images/presign`,
        { method: "POST", body: JSON.stringify({ contentType, byteSize: file.size }) }
      );
      await fetch(presign.uploadUrl, { method: "PUT", headers: presign.requiredHeaders, body: file }).catch(() => undefined);
      await api(`/admin/vehicles/${selected.id}/images`, {
        method: "POST",
        body: JSON.stringify({ objectKey: presign.objectKey, caption: "" }),
      });
      const imgs = await api<{ items: ImageItem[] }>(`/admin/vehicles/${selected.id}/images`);
      setImages(imgs.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    }
  }

  return (
    <section>
      <h2>车辆</h2>
      {error ? <p role="alert">{error}</p> : null}
      <div>
        <select value={status} onChange={(e) => setStatus(e.target.value as Status | "")}>
          <option value="">全部状态</option>
          <option value="draft">草稿</option>
          <option value="published">已上架</option>
          <option value="unpublished">已下架</option>
        </select>
        <input placeholder="品牌/车型" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" onClick={() => void load()}>
          筛选
        </button>
        <span>共 {total} 辆</span>
      </div>
      <ul>
        {items.map((v) => (
          <li key={v.id}>
            <button type="button" onClick={() => void open(v)}>
              #{v.id} {v.brand} {v.model} · {v.status} · v{v.version}
            </button>
          </li>
        ))}
      </ul>

      <h3>新建车辆</h3>
      <form onSubmit={create}>
        <label>
          品牌
          <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required />
        </label>
        <label>
          车型
          <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required />
        </label>
        <label>
          上牌年
          <input type="number" value={form.registrationYear} onChange={(e) => setForm({ ...form, registrationYear: Number(e.target.value) })} />
        </label>
        <label>
          里程
          <input type="number" value={form.mileageKm} onChange={(e) => setForm({ ...form, mileageKm: Number(e.target.value) })} />
        </label>
        <label>
          颜色
          <input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} required />
        </label>
        <label>
          车况
          <input value={form.conditionDesc} onChange={(e) => setForm({ ...form, conditionDesc: e.target.value })} required />
        </label>
        <label>
          能源
          <select value={form.energyType} onChange={(e) => setForm({ ...form, energyType: e.target.value as EnergyType })}>
            <option value="gasoline">汽油</option>
            <option value="ev">纯电</option>
            <option value="phev">插混</option>
            <option value="range_extender">增程</option>
          </select>
        </label>
        <label>
          过户次数
          <input type="number" value={form.transferCount} onChange={(e) => setForm({ ...form, transferCount: Number(e.target.value) })} />
        </label>
        {form.energyType !== "ev" ? (
          <label>
            排量
            <input value={form.displacementL} onChange={(e) => setForm({ ...form, displacementL: e.target.value })} />
          </label>
        ) : null}
        {form.energyType !== "gasoline" ? (
          <>
            <label>
              电耗
              <input value={form.energyConsumption} onChange={(e) => setForm({ ...form, energyConsumption: e.target.value })} />
            </label>
            <label>
              电池 kWh
              <input value={form.batteryKwh} onChange={(e) => setForm({ ...form, batteryKwh: e.target.value })} />
            </label>
          </>
        ) : null}
        <label>
          VIN
          <input value={form.vin} onChange={(e) => setForm({ ...form, vin: e.target.value })} />
        </label>
        <label>
          初始价格
          <select value={form.initialPriceType} onChange={(e) => setForm({ ...form, initialPriceType: e.target.value as "amount" | "negotiable" })}>
            <option value="amount">标价</option>
            <option value="negotiable">面谈</option>
          </select>
        </label>
        {form.initialPriceType === "amount" ? (
          <label>
            金额
            <input value={form.initialAmount} onChange={(e) => setForm({ ...form, initialAmount: e.target.value })} />
          </label>
        ) : null}
        <button type="submit">创建</button>
      </form>

      {selected ? (
        <div>
          <h3>
            编辑 #{selected.id}（{selected.status} · v{selected.version}）
          </h3>
          <label>
            品牌
            <input value={selected.brand} onChange={(e) => setSelected({ ...selected, brand: e.target.value })} />
          </label>
          <label>
            车型
            <input value={selected.model} onChange={(e) => setSelected({ ...selected, model: e.target.value })} />
          </label>
          <label>
            颜色
            <input value={selected.color} onChange={(e) => setSelected({ ...selected, color: e.target.value })} />
          </label>
          <label>
            车况
            <input value={selected.conditionDesc} onChange={(e) => setSelected({ ...selected, conditionDesc: e.target.value })} />
          </label>
          <button type="button" onClick={() => void saveSelected()}>
            保存字段
          </button>
          <button type="button" onClick={() => void act("publish")}>
            上架
          </button>
          <button type="button" onClick={() => void act("unpublish")}>
            下架
          </button>
          <button type="button" onClick={() => void act("trash")}>
            进回收站
          </button>
          {selected.status === "published" ? (
            <p>
              前台链接：
              <code>{`${publicOrigin}/vehicles/${selected.id}`}</code>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(`${publicOrigin}/vehicles/${selected.id}`);
                  setCopied("已复制");
                }}
              >
                复制
              </button>
              {copied}
            </p>
          ) : (
            <p>未上架，不能复制前台链接（无访客预览）。</p>
          )}
          <p>
            当前价：
            {price?.type === "amount" ? `${(price.amount / 10000).toFixed(2)} 万` : price ? "面议" : "未填"}
          </p>
          <select value={priceType} onChange={(e) => setPriceType(e.target.value as "amount" | "negotiable")}>
            <option value="amount">标价</option>
            <option value="negotiable">面谈</option>
          </select>
          {priceType === "amount" ? (
            <input value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} />
          ) : null}
          <button type="button" onClick={() => void savePrice()}>
            改价
          </button>
          <p>图片（已上架至少 4 张）</p>
          <ul>
            {images.map((img) => (
              <li key={img.id}>
                <img src={img.url} alt={img.caption} width={80} />
              </li>
            ))}
          </ul>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadImage(f);
            }}
          />
        </div>
      ) : null}
    </section>
  );
}
