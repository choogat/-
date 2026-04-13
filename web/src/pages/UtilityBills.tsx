import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { api } from "../lib/api";

type Mode = "INCOME" | "EXPENSE";

type Row = {
  key: string;
  period: string;
  detail: string;
  income: number;
  expense: number;
  ledgerId: number | null;
  sortDate: string;
};

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

  const rows: Row[] = [];

  const invoiceIncomeByPeriod = new Map<string, number>();
  for (const inv of waterInvoices as any[]) {
    if (inv.type !== "WATER" && inv.type !== "ELECTRIC") continue;
    invoiceIncomeByPeriod.set(
      inv.period,
      (invoiceIncomeByPeriod.get(inv.period) ?? 0) + (inv.paidAmount ?? 0)
    );
  }
  for (const [period, amount] of invoiceIncomeByPeriod) {
    if (!amount) continue;
    rows.push({
      key: `inv-${period}`,
      period,
      detail: "รายรับจากใบแจ้งหนี้ค่าน้ำ/ค่าไฟ",
      income: amount,
      expense: 0,
      ledgerId: null,
      sortDate: `${period}-01`,
    });
  }

  for (const b of bills as any[]) {
    const parts: string[] = [];
    if (b.electricAmount) parts.push(`ค่าไฟ ฿${b.electricAmount.toLocaleString()}`);
    if (b.waterAmount) parts.push(`ค่าน้ำ ฿${b.waterAmount.toLocaleString()}`);
    if (!parts.length) continue;
    rows.push({
      key: `bill-${b.id}`,
      period: b.period,
      detail: parts.join(", "),
      income: 0,
      expense: (b.electricAmount ?? 0) + (b.waterAmount ?? 0),
      ledgerId: null,
      sortDate: `${b.period}-01`,
    });
  }

  for (const l of ledger as any[]) {
    const utility = l.utilityType === "WATER" ? "ค่าน้ำ" : "ค่าไฟ";
    const partyLabel = l.kind === "INCOME" ? "จาก" : "ให้";
    const detail = `${utility} ${partyLabel} ${l.party}${l.note ? ` (${l.note})` : ""}`;
    rows.push({
      key: `led-${l.id}`,
      period: l.period,
      detail,
      income: l.kind === "INCOME" ? l.amount : 0,
      expense: l.kind === "EXPENSE" ? l.amount : 0,
      ledgerId: l.id,
      sortDate: dayjs(l.date).format("YYYY-MM-DD"),
    });
  }

  rows.sort((a, b) => b.sortDate.localeCompare(a.sortDate));

  const totalIncome = rows.reduce((s, r) => s + r.income, 0);
  const totalExpense = rows.reduce((s, r) => s + r.expense, 0);
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
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td className="p-4 text-center text-slate-400" colSpan={6}>ไม่มีข้อมูล</td></tr>
            )}
            {rows.map((r) => {
              const diff = r.income - r.expense;
              return (
                <tr key={r.key} className="border-b align-top">
                  <td className="p-2">{r.period}</td>
                  <td className="p-2 text-slate-600">{r.detail}</td>
                  <td className="p-2 text-right text-emerald-600">
                    {r.income ? `฿${r.income.toLocaleString()}` : "-"}
                  </td>
                  <td className="p-2 text-right text-rose-600">
                    {r.expense ? `฿${r.expense.toLocaleString()}` : "-"}
                  </td>
                  <td className={`p-2 text-right font-semibold ${diff >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    ฿{diff.toLocaleString()}
                  </td>
                  <td className="p-2 text-right">
                    {r.ledgerId !== null && (
                      <button
                        type="button"
                        className="text-rose-600 hover:text-rose-800 text-xs"
                        onClick={() => {
                          if (confirm("ลบรายการนี้?")) del.mutate(r.ledgerId!);
                        }}
                      >
                        ลบ
                      </button>
                    )}
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
              <td className="p-2"></td>
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
