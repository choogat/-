import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/api";

type AssetForm = {
  code: string;
  categoryId: string;
  name: string;
  description: string;
  acquireDate: string;
  costPrice: string;
  usefulLifeYears: string;
  location: string;
};

const emptyForm: AssetForm = {
  code: "",
  categoryId: "",
  name: "",
  description: "",
  acquireDate: dayjs().format("YYYY-MM-DD"),
  costPrice: "",
  usefulLifeYears: "0",
  location: "",
};

export default function Assets() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AssetForm>(emptyForm);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [confirmDel, setConfirmDel] = useState<{ id: number; name: string } | null>(null);

  const { data = [] } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => (await api.get("/assets")).data,
  });
  const constructionAssets = (data as any[]).filter(
    (a) => typeof a.code === "string" && a.code.startsWith("CON-PRJ-")
  );
  const { data: categories = [] } = useQuery({
    queryKey: ["asset-categories"],
    queryFn: async () => (await api.get("/assets/categories")).data,
  });
  const { data: investmentLedger = [] } = useQuery<any[]>({
    queryKey: ["utility-ledger", "INVESTMENT"],
    queryFn: async () =>
      (await api.get("/utility-ledger", { params: { utilityType: "INVESTMENT" } })).data,
  });
  const investmentItems = investmentLedger
    .filter((l) => l.kind === "EXPENSE" && /^\[สิ่งของ\]/.test(l.note ?? ""))
    .map((l) => ({
      id: `inv-${l.id}`,
      code: `INV-${l.id}`,
      name: (l.note ?? "").replace(/^\[สิ่งของ\]\s*/, "") || l.party,
      acquireDate: l.date,
      costPrice: l.amount,
      party: l.party,
    }));

  const createMut = useMutation({
    mutationFn: async (payload: any) => (await api.post("/assets", payload)).data,
    onSuccess: () => {
      toast.success("เพิ่มทรัพย์สินสำเร็จ");
      qc.invalidateQueries({ queryKey: ["assets"] });
      setShowForm(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? "เพิ่มไม่สำเร็จ"),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => api.delete(`/assets/${id}`),
    onSuccess: () => {
      toast.success("ลบแล้ว");
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? "ลบไม่สำเร็จ"),
  });

  const s = search.trim().toLowerCase();
  const filtered = data.filter((a: any) => {
    if (typeof a.code === "string" && a.code.startsWith("CON-PRJ-")) return false;
    if (filterCategory && String(a.categoryId) !== filterCategory) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    if (s && ![a.code, a.name, a.location ?? "", a.description ?? ""]
      .some((v: string) => v.toLowerCase().includes(s))) return false;
    return true;
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code || !form.name || !form.categoryId || !form.costPrice) {
      toast.error("กรอกข้อมูลให้ครบ");
      return;
    }
    createMut.mutate({
      code: form.code,
      categoryId: Number(form.categoryId),
      name: form.name,
      description: form.description || undefined,
      acquireDate: form.acquireDate,
      costPrice: Number(form.costPrice),
      usefulLifeYears: Number(form.usefulLifeYears || 0),
      location: form.location || undefined,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ทะเบียนทรัพย์สิน</h1>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "ยกเลิก" : "+ เพิ่มทรัพย์สิน"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="card grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="flex flex-col text-sm">
            รหัส *
            <input className="border rounded p-2" value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </label>
          <label className="flex flex-col text-sm">
            หมวด *
            <select className="border rounded p-2" value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">-- เลือก --</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm">
            ชื่อ *
            <input className="border rounded p-2" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="flex flex-col text-sm">
            วันที่ได้มา
            <input type="date" className="border rounded p-2" value={form.acquireDate}
              onChange={(e) => setForm({ ...form, acquireDate: e.target.value })} />
          </label>
          <label className="flex flex-col text-sm">
            ราคาทุน (บาท) *
            <input type="number" step="0.01" className="border rounded p-2" value={form.costPrice}
              onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
          </label>
          <label className="flex flex-col text-sm">
            อายุการใช้งาน (ปี)
            <input type="number" className="border rounded p-2" value={form.usefulLifeYears}
              onChange={(e) => setForm({ ...form, usefulLifeYears: e.target.value })} />
          </label>
          <label className="flex flex-col text-sm">
            ที่ตั้ง
            <input className="border rounded p-2" value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </label>
          <label className="flex flex-col text-sm md:col-span-2">
            รายละเอียด
            <input className="border rounded p-2" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <div className="md:col-span-3">
            <button type="submit" disabled={createMut.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
              บันทึก
            </button>
          </div>
        </form>
      )}

      <div className="card flex flex-wrap gap-3 items-end">
        <label className="flex flex-col text-sm">
          ค้นหา
          <input className="border rounded p-2" placeholder="รหัส / ชื่อ / ที่ตั้ง"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label className="flex flex-col text-sm">
          หมวด
          <select className="border rounded p-2" value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">ทั้งหมด</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm">
          สถานะ
          <select className="border rounded p-2" value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">ทั้งหมด</option>
            <option value="IN_USE">ใช้งาน</option>
            <option value="REPAIR">ซ่อม</option>
            <option value="DISPOSED">จำหน่ายแล้ว</option>
          </select>
        </label>
        {(filterCategory || filterStatus || search) && (
          <button className="px-3 py-2 text-sm text-gray-600 underline"
            onClick={() => { setFilterCategory(""); setFilterStatus(""); setSearch(""); }}>
            ล้างตัวกรอง
          </button>
        )}
        <div className="ml-auto text-sm text-gray-600 self-center">
          พบ {filtered.length} / {data.length} รายการ
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left border-b">
            <tr>
              <th className="p-2">รหัส</th><th className="p-2">หมวด</th><th className="p-2">รายการ</th>
              <th className="p-2">วันที่ได้มา</th><th className="p-2 text-right">ราคาทุน</th>
              <th className="p-2 text-right">ค่าเสื่อมสะสม</th><th className="p-2 text-right">มูลค่าปัจจุบัน</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a: any) => (
              <tr key={a.id} className="border-b">
                <td className="p-2 font-mono">{a.code}</td>
                <td className="p-2">{a.category.name}</td>
                <td className="p-2">{a.name}</td>
                <td className="p-2">{dayjs(a.acquireDate).format("DD/MM/YYYY")}</td>
                <td className="p-2 text-right">฿{a.costPrice.toLocaleString()}</td>
                <td className="p-2 text-right">฿{a.accumulatedDepreciation.toLocaleString()}</td>
                <td className="p-2 text-right font-medium">฿{a.currentValue.toLocaleString()}</td>
                <td className="p-2 text-right">
                  <button
                    className="text-red-600 hover:underline"
                    onClick={() => setConfirmDel({ id: a.id, name: a.name })}
                  >
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
            {investmentItems.map((a) => (
              <tr key={a.id} className="border-b bg-amber-50/40">
                <td className="p-2 font-mono">{a.code}</td>
                <td className="p-2">สิ่งของ</td>
                <td className="p-2">{a.name}</td>
                <td className="p-2">{dayjs(a.acquireDate).format("DD/MM/YYYY")}</td>
                <td className="p-2 text-right">฿{a.costPrice.toLocaleString()}</td>
                <td className="p-2 text-right text-slate-400">-</td>
                <td className="p-2 text-right font-medium">฿{a.costPrice.toLocaleString()}</td>
                <td className="p-2"></td>
              </tr>
            ))}
            {filtered.length === 0 && investmentItems.length === 0 && (
              <tr><td colSpan={8} className="p-4 text-center text-gray-500">ไม่พบข้อมูล</td></tr>
            )}
          </tbody>
          {(filtered.length > 0 || investmentItems.length > 0) && (() => {
            const cost = filtered.reduce((s: number, a: any) => s + a.costPrice, 0)
              + investmentItems.reduce((s, a) => s + a.costPrice, 0);
            const accum = filtered.reduce((s: number, a: any) => s + a.accumulatedDepreciation, 0);
            const cur = filtered.reduce((s: number, a: any) => s + a.currentValue, 0)
              + investmentItems.reduce((s, a) => s + a.costPrice, 0);
            return (
              <tfoot>
                <tr className="font-bold bg-slate-50 border-t">
                  <td className="p-2" colSpan={4}>รวมทะเบียนทรัพย์สิน</td>
                  <td className="p-2 text-right">฿{cost.toLocaleString()}</td>
                  <td className="p-2 text-right">฿{accum.toLocaleString()}</td>
                  <td className="p-2 text-right text-indigo-700">฿{cur.toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            );
          })()}
        </table>
      </div>

      {(() => {
        const regCost = filtered.reduce((s: number, a: any) => s + a.costPrice, 0)
          + investmentItems.reduce((s, a) => s + a.costPrice, 0);
        const conCost = constructionAssets.reduce((s: number, a: any) => s + a.costPrice, 0);
        const regCur = filtered.reduce((s: number, a: any) => s + a.currentValue, 0)
          + investmentItems.reduce((s, a) => s + a.costPrice, 0);
        const conCur = constructionAssets.reduce((s: number, a: any) => s + a.currentValue, 0);
        return (
          <div className="card bg-indigo-50 border-indigo-200 grid grid-cols-2 gap-3">
            <div>
              <div className="text-sm text-slate-600">ยอดรวมราคาทุน (ทุกหมวด)</div>
              <div className="text-2xl font-bold text-indigo-700">
                ฿{(regCost + conCost).toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-600">ยอดรวมมูลค่าปัจจุบัน (ทุกหมวด)</div>
              <div className="text-2xl font-bold text-indigo-700">
                ฿{(regCur + conCur).toLocaleString()}
              </div>
            </div>
          </div>
        );
      })()}

      <div className="card">
        <h2 className="text-lg font-bold mb-2">ทรัพย์สินจากค่าใช้จ่ายก่อสร้าง</h2>
        {constructionAssets.length === 0 ? (
          <div className="text-gray-500 text-sm">ยังไม่มีโครงการที่ถูกทำเครื่องหมายว่าเป็นทรัพย์สิน</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left border-b">
              <tr>
                <th className="p-2">รหัส</th>
                <th className="p-2">วันที่ได้มา</th>
                <th className="p-2">หมวด</th>
                <th className="p-2">โครงการ</th>
                <th className="p-2 text-right">ราคาทุน</th>
                <th className="p-2 text-right">ค่าเสื่อมสะสม</th>
                <th className="p-2 text-right">มูลค่าปัจจุบัน</th>
              </tr>
            </thead>
            <tbody>
              {constructionAssets.map((a: any) => (
                <tr key={a.id} className="border-b">
                  <td className="p-2 font-mono">{a.code}</td>
                  <td className="p-2">{dayjs(a.acquireDate).format("DD/MM/YYYY")}</td>
                  <td className="p-2">{a.category?.name ?? "งานก่อสร้าง"}</td>
                  <td className="p-2">{a.name}</td>
                  <td className="p-2 text-right">฿{a.costPrice.toLocaleString()}</td>
                  <td className="p-2 text-right">฿{a.accumulatedDepreciation.toLocaleString()}</td>
                  <td className="p-2 text-right font-medium">฿{a.currentValue.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="font-bold bg-slate-50">
                <td className="p-2" colSpan={4}>รวมทั้งหมด</td>
                <td className="p-2 text-right text-indigo-700">
                  ฿{constructionAssets.reduce((s, a) => s + a.costPrice, 0).toLocaleString()}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {confirmDel && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setConfirmDel(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-2">ยืนยันการลบ</h2>
            <p className="text-sm text-slate-600 mb-4">
              ต้องการลบ "{confirmDel.name}" ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้
            </p>
            <div className="flex gap-2 justify-end">
              <button
                className="btn-secondary"
                onClick={() => setConfirmDel(null)}
              >
                ยกเลิก
              </button>
              <button
                className="btn-primary bg-rose-600 hover:bg-rose-700"
                onClick={() => {
                  deleteMut.mutate(confirmDel.id);
                  setConfirmDel(null);
                }}
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
