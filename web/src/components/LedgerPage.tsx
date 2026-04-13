import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { api } from "../lib/api";

type Mode = "INCOME" | "EXPENSE";

type Props = {
  title: string;
  ledgerType: string; // utilityType value used as discriminator
};

export default function LedgerPage({ title, ledgerType }: Props) {
  const qc = useQueryClient();
  const queryKey = ["utility-ledger", ledgerType];
  const { data: ledger = [] } = useQuery({
    queryKey,
    queryFn: async () =>
      (await api.get("/utility-ledger", { params: { utilityType: ledgerType } })).data,
  });

  const [mode, setMode] = useState<Mode | null>(null);
  const [form, setForm] = useState({
    date: dayjs().format("YYYY-MM-DD"),
    party: "",
    amount: 0,
    note: "",
  });

  const resetForm = () =>
    setForm({
      date: dayjs().format("YYYY-MM-DD"),
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
          utilityType: ledgerType,
          party: form.party,
          amount: Number(form.amount),
          note: form.note || undefined,
        })
      ).data,
    onSuccess: () => {
      toast.success("บันทึกแล้ว");
      qc.invalidateQueries({ queryKey });
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
      qc.invalidateQueries({ queryKey });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? "ลบไม่สำเร็จ"),
  });

  const rows = (ledger as any[])
    .map((l) => ({
      id: l.id,
      period: l.period,
      date: dayjs(l.date).format("YYYY-MM-DD"),
      detail: `${l.kind === "INCOME" ? "จาก" : "ให้"} ${l.party}${l.note ? ` (${l.note})` : ""}`,
      income: l.kind === "INCOME" ? l.amount : 0,
      expense: l.kind === "EXPENSE" ? l.amount : 0,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const allMonths = Array.from(new Set(rows.map((r) => r.period))).sort((a, b) =>
    b.localeCompare(a)
  );
  const [filterMonth, setFilterMonth] = useState<string>("");
  const visibleRows = filterMonth ? rows.filter((r) => r.period === filterMonth) : rows;

  const totalIncome = visibleRows.reduce((s, r) => s + r.income, 0);
  const totalExpense = visibleRows.reduce((s, r) => s + r.expense, 0);
  const net = totalIncome - totalExpense;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">{title}</h1>
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

      <div className="card flex items-center gap-3 flex-wrap">
        <label className="label mb-0">ดูย้อนหลังรายเดือน</label>
        <select
          className="input max-w-xs"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
        >
          <option value="">ทั้งหมด</option>
          {allMonths.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {filterMonth && (
          <button className="btn-secondary" onClick={() => setFilterMonth("")}>
            ล้างตัวกรอง
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card">
          <div className="text-sm text-slate-500">รายรับรวม</div>
          <div className="text-2xl font-bold text-emerald-600">฿{totalIncome.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">รายจ่ายรวม</div>
          <div className="text-2xl font-bold text-rose-600">฿{totalExpense.toLocaleString()}</div>
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
              <th className="p-2">วันที่</th>
              <th className="p-2">รายละเอียด</th>
              <th className="p-2 text-right">รายรับ</th>
              <th className="p-2 text-right">รายจ่าย</th>
              <th className="p-2 text-right">คงเหลือ</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 && (
              <tr><td className="p-4 text-center text-slate-400" colSpan={6}>ไม่มีข้อมูล</td></tr>
            )}
            {visibleRows.map((r) => {
              const diff = r.income - r.expense;
              return (
                <tr key={r.id} className="border-b align-top">
                  <td className="p-2">{r.date}</td>
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
                    <button
                      type="button"
                      className="text-rose-600 hover:text-rose-800 text-xs"
                      onClick={() => {
                        if (confirm("ลบรายการนี้?")) del.mutate(r.id);
                      }}
                    >
                      ลบ
                    </button>
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
              {mode === "INCOME" ? `เพิ่มรายได้ ${title}` : `เพิ่มรายจ่าย ${title}`}
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
                  onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
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
