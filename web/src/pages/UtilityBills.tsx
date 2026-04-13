import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { api } from "../lib/api";

type Mode = "INCOME" | "EXPENSE";

export default function UtilityBills() {
  const qc = useQueryClient();
  const { data: bills = [] } = useQuery({
    queryKey: ["utility-bills"],
    queryFn: async () => (await api.get("/expenses/utility-bills")).data,
  });
  const { data: waterInvoices = [] } = useQuery({
    queryKey: ["invoices", "WATER"],
    queryFn: async () => (await api.get("/invoices", { params: {} })).data,
  });
  const { data: ledger = [] } = useQuery({
    queryKey: ["utility-ledger"],
    queryFn: async () => (await api.get("/utility-ledger")).data,
  });

  const [mode, setMode] = useState<Mode | null>(null);
  const [form, setForm] = useState({
    date: dayjs().format("YYYY-MM-DD"),
    utilityType: "WATER" as "WATER" | "ELECTRIC",
    party: "",
    amount: 0,
    note: "",
  });

  const resetForm = () =>
    setForm({
      date: dayjs().format("YYYY-MM-DD"),
      utilityType: "WATER",
      party: "",
      amount: 0,
      note: "",
    });

  const save = useMutation({
    mutationFn: async () =>
      (
        await api.post("/utility-ledger", {
          date: form.date,
          kind: mode,
          utilityType: form.utilityType,
          party: form.party,
          amount: Number(form.amount),
          note: form.note || undefined,
        })
      ).data,
    onSuccess: () => {
      toast.success("บันทึกแล้ว");
      qc.invalidateQueries({ queryKey: ["utility-ledger"] });
      setMode(null);
      resetForm();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "บันทึกไม่สำเร็จ"),
  });

  const incomeByPeriod = new Map<string, number>();
  for (const inv of waterInvoices as any[]) {
    if (inv.type !== "WATER" && inv.type !== "ELECTRIC") continue;
    incomeByPeriod.set(
      inv.period,
      (incomeByPeriod.get(inv.period) ?? 0) + (inv.paidAmount ?? 0)
    );
  }

  const expenseByPeriod = new Map<string, number>();
  for (const b of bills as any[]) {
    expenseByPeriod.set(b.period, (b.electricAmount ?? 0) + (b.waterAmount ?? 0));
  }

  type Detail = { id: number | null; text: string };
  const detailsByPeriod = new Map<string, Detail[]>();
  for (const l of ledger as any[]) {
    const m = l.kind === "INCOME" ? incomeByPeriod : expenseByPeriod;
    m.set(l.period, (m.get(l.period) ?? 0) + (l.amount ?? 0));
    const utility = l.utilityType === "WATER" ? "ค่าน้ำ" : "ค่าไฟ";
    const sign = l.kind === "INCOME" ? "+" : "-";
    const text = `${sign}${utility} ${l.party} ฿${(l.amount ?? 0).toLocaleString()}${l.note ? ` (${l.note})` : ""}`;
    const arr = detailsByPeriod.get(l.period) ?? [];
    arr.push({ id: l.id, text });
    detailsByPeriod.set(l.period, arr);
  }
  for (const b of bills as any[]) {
    const parts: string[] = [];
    if (b.electricAmount) parts.push(`ค่าไฟ ฿${b.electricAmount.toLocaleString()}`);
    if (b.waterAmount) parts.push(`ค่าน้ำ ฿${b.waterAmount.toLocaleString()}`);
    if (parts.length) {
      const arr = detailsByPeriod.get(b.period) ?? [];
      arr.push({ id: null, text: parts.join(", ") });
      detailsByPeriod.set(b.period, arr);
    }
  }

  const del = useMutation({
    mutationFn: async (id: number) =>
      (await api.delete(`/utility-ledger/${id}`)).data,
    onSuccess: () => {
      toast.success("ลบแล้ว");
      qc.invalidateQueries({ queryKey: ["utility-ledger"] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "ลบไม่สำเร็จ"),
  });

  const periods = Array.from(
    new Set([...incomeByPeriod.keys(), ...expenseByPeriod.keys()])
  ).sort((a, b) => b.localeCompare(a));

  const totalIncome = [...incomeByPeriod.values()].reduce((s, v) => s + v, 0);
  const totalExpense = [...expenseByPeriod.values()].reduce((s, v) => s + v, 0);
  const net = totalIncome - totalExpense;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">ค่าน้ำค่าไฟ</h1>
        <div className="flex gap-2">
          <button
            className="btn-primary bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setMode("INCOME")}
          >
            + เพิ่มรายได้
          </button>
          <button
            className="btn-primary bg-rose-600 hover:bg-rose-700"
            onClick={() => setMode("EXPENSE")}
          >
            + เพิ่มรายจ่าย
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card">
          <div className="text-sm text-slate-500">รายรับค่าน้ำค่าไฟรวม</div>
          <div className="text-2xl font-bold text-emerald-600">
            ฿{totalIncome.toLocaleString()}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">รายจ่ายค่าน้ำค่าไฟรวม</div>
          <div className="text-2xl font-bold text-rose-600">
            ฿{totalExpense.toLocaleString()}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">ผลรวมสุทธิ</div>
          <div className={`text-2xl font-bold ${net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            ฿{net.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left border-b">
            <tr>
              <th className="p-2">เดือน</th>
              <th className="p-2">รายละเอียด</th>
              <th className="p-2 text-right">รายรับค่าน้ำค่าไฟ</th>
              <th className="p-2 text-right">รายจ่ายค่าน้ำค่าไฟ</th>
              <th className="p-2 text-right">คงเหลือ</th>
            </tr>
          </thead>
          <tbody>
            {periods.length === 0 && (
              <tr><td className="p-4 text-center text-slate-400" colSpan={5}>ไม่มีข้อมูล</td></tr>
            )}
            {periods.map((p) => {
              const inc = incomeByPeriod.get(p) ?? 0;
              const exp = expenseByPeriod.get(p) ?? 0;
              const diff = inc - exp;
              return (
                <tr key={p} className="border-b align-top">
                  <td className="p-2">{p}</td>
                  <td className="p-2 text-slate-600">
                    {(detailsByPeriod.get(p) ?? []).length === 0 ? (
                      "-"
                    ) : (
                      <ul className="space-y-1">
                        {(detailsByPeriod.get(p) ?? []).map((d, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span>{d.text}</span>
                            {d.id !== null && (
                              <button
                                type="button"
                                className="text-rose-500 hover:text-rose-700 text-xs"
                                onClick={() => {
                                  if (confirm("ลบรายการนี้?")) del.mutate(d.id!);
                                }}
                              >
                                ลบ
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="p-2 text-right text-emerald-600">฿{inc.toLocaleString()}</td>
                  <td className="p-2 text-right text-rose-600">฿{exp.toLocaleString()}</td>
                  <td className={`p-2 text-right font-semibold ${diff >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    ฿{diff.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t font-bold bg-slate-50">
              <td className="p-2" colSpan={2}>รวมทั้งหมด</td>
              <td className="p-2 text-right text-emerald-600">฿{totalIncome.toLocaleString()}</td>
              <td className="p-2 text-right text-rose-600">฿{totalExpense.toLocaleString()}</td>
              <td className={`p-2 text-right ${net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                ฿{net.toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {mode && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setMode(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4">
              {mode === "INCOME" ? "เพิ่มรายได้ค่าน้ำค่าไฟ" : "เพิ่มรายจ่ายค่าน้ำค่าไฟ"}
            </h2>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
            >
              <div>
                <label className="label">วันที่</label>
                <input
                  type="date"
                  className="input"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">ประเภท</label>
                <select
                  className="input"
                  value={form.utilityType}
                  onChange={(e) =>
                    setForm({ ...form, utilityType: e.target.value as any })
                  }
                >
                  <option value="WATER">ค่าน้ำ</option>
                  <option value="ELECTRIC">ค่าไฟ</option>
                </select>
              </div>
              <div>
                <label className="label">
                  {mode === "INCOME" ? "ผู้จ่าย/ที่มา" : "ผู้รับเงิน/ที่จ่าย"}
                </label>
                <input
                  className="input"
                  value={form.party}
                  onChange={(e) => setForm({ ...form, party: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">จำนวนเงิน (บาท)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  value={form.amount}
                  onChange={(e) =>
                    setForm({ ...form, amount: Number(e.target.value) })
                  }
                  required
                />
              </div>
              <div>
                <label className="label">หมายเหตุ</label>
                <input
                  className="input"
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setMode(null)}
                >
                  ยกเลิก
                </button>
                <button
                  className={`btn-primary ${
                    mode === "INCOME"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  }`}
                  disabled={save.isPending}
                >
                  {save.isPending ? "กำลังบันทึก..." : "บันทึก"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
