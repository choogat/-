import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { api } from "../lib/api";

type Mode = "INCOME" | "EXPENSE";

type Props = {
  title: string;
  ledgerType: string; // utilityType value used as discriminator
  showPartyFilter?: boolean;
  hideIncome?: boolean;
  expenseLabel?: string;
  categoryOptions?: string[];
  categoryLabel?: string;
  partyLabel?: string;
  defaultAllMonths?: boolean;
  showPartyColumn?: boolean;
  extraRows?: Array<{
    period: string;
    date: string;
    detail: string;
    income: number;
    expense: number;
    party?: string;
    category?: string;
    sortPriority?: number;
  }>;
};

export default function LedgerPage({
  title,
  ledgerType,
  showPartyFilter,
  hideIncome,
  expenseLabel,
  categoryOptions,
  categoryLabel,
  partyLabel,
  defaultAllMonths,
  showPartyColumn,
  extraRows,
}: Props) {
  const qc = useQueryClient();
  const queryKey = ["utility-ledger", ledgerType];
  const { data: ledger = [] } = useQuery({
    queryKey,
    queryFn: async () =>
      (await api.get("/utility-ledger", { params: { utilityType: ledgerType } })).data,
  });

  const [mode, setMode] = useState<Mode | null>(null);
  const [confirmDelId, setConfirmDelId] = useState<number | null>(null);
  const [form, setForm] = useState({
    date: dayjs().format("YYYY-MM-DD"),
    party: "",
    amount: 0,
    note: "",
    category: categoryOptions?.[0] ?? "",
  });

  const resetForm = () =>
    setForm({
      date: dayjs().format("YYYY-MM-DD"),
      party: "",
      amount: 0,
      note: "",
      category: categoryOptions?.[0] ?? "",
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
          note:
            [form.category ? `[${form.category}]` : "", form.note]
              .filter(Boolean)
              .join(" ")
              .trim() || undefined,
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

  const ledgerRows = (ledger as any[]).map((l) => {
    const m = (l.note ?? "").match(/^\[([^\]]+)\]\s*(.*)$/);
    const category = m ? m[1] : "";
    return {
      id: l.id as number,
      period: l.period as string,
      date: dayjs(l.date).format("YYYY-MM-DD"),
      party: l.party as string,
      category,
      detail: showPartyColumn
        ? (l.note ?? "")
        : `${l.kind === "INCOME" ? "จาก" : "ให้"} ${l.party}${l.note ? ` (${l.note})` : ""}`,
      income: l.kind === "INCOME" ? l.amount : 0,
      expense: l.kind === "EXPENSE" ? l.amount : 0,
      readonly: false as boolean,
      sortPriority: 100,
    };
  });
  const extra = (extraRows ?? []).map((r, i) => ({
    id: -1 - i,
    period: r.period,
    date: r.date,
    party: r.party ?? "",
    category: r.category ?? "",
    detail: r.detail,
    income: r.income,
    expense: r.expense,
    readonly: true as boolean,
    sortPriority: r.sortPriority ?? 0,
  }));
  const rows = [...ledgerRows, ...extra].sort((a, b) => {
    const d = b.date.localeCompare(a.date);
    if (d !== 0) return d;
    return a.sortPriority - b.sortPriority;
  });

  const allMonths = Array.from(
    new Set([dayjs().format("YYYY-MM"), ...rows.map((r) => r.period)])
  ).sort((a, b) => b.localeCompare(a));
  const [filterMonth, setFilterMonth] = useState<string>(
    defaultAllMonths ? "" : dayjs().format("YYYY-MM")
  );
  const [filterParty, setFilterParty] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const allParties = Array.from(new Set(rows.map((r) => r.party).filter(Boolean))).sort();
  const visibleRows = rows.filter(
    (r) =>
      (!filterMonth || r.period === filterMonth) &&
      (!filterParty || r.party === filterParty) &&
      (!filterCategory || r.category === filterCategory)
  );

  const totalIncome = visibleRows.reduce((s, r) => s + r.income, 0);
  const totalExpense = visibleRows.reduce((s, r) => s + r.expense, 0);
  const net = totalIncome - totalExpense;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="flex gap-2">
          {!hideIncome && (
            <button
              className="btn-primary bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setMode("INCOME")}
            >
              + เพิ่มรายได้
            </button>
          )}
          <button
            className="btn-primary bg-rose-600 hover:bg-rose-700"
            onClick={() => setMode("EXPENSE")}
          >
            + {expenseLabel ?? "เพิ่มรายจ่าย"}
          </button>
        </div>
      </div>

      <div className="card flex items-center gap-2 flex-nowrap overflow-x-auto">
        <label className="label mb-0">ดูย้อนหลังรายเดือน</label>
        <select
          className="input w-40"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
        >
          <option value="">ทั้งหมด</option>
          {allMonths.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {categoryOptions && categoryOptions.length > 0 && (
          <>
            <label className="label mb-0 ml-2">{categoryLabel ?? "หมวด"}</label>
            <select
              className="input w-40"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="">ทั้งหมด</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </>
        )}
        {showPartyFilter && (
          <>
            <label className="label mb-0 ml-2">{partyLabel ?? "ผู้จ่าย"}</label>
            <select
              className="input w-40"
              value={filterParty}
              onChange={(e) => setFilterParty(e.target.value)}
            >
              <option value="">ทั้งหมด</option>
              {allParties.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </>
        )}
        {(filterMonth || filterParty || filterCategory) && (
          <button
            className="btn-secondary"
            onClick={() => {
              setFilterMonth("");
              setFilterParty("");
              setFilterCategory("");
            }}
          >
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
              {showPartyColumn && <th className="p-2">{partyLabel ?? "ผู้รับเงิน"}</th>}
              <th className="p-2">{categoryLabel ?? "ประเภท"}</th>
              <th className="p-2">รายละเอียด</th>
              <th className="p-2 text-right">รายรับ</th>
              <th className="p-2 text-right">รายจ่าย</th>
              <th className="p-2 text-right">คงเหลือ</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 && (
              <tr><td className="p-4 text-center text-slate-400" colSpan={showPartyColumn ? 8 : 7}>ไม่มีข้อมูล</td></tr>
            )}
            {visibleRows.map((r) => {
              const diff = r.income - r.expense;
              return (
                <tr key={r.id} className="border-b align-top">
                  <td className="p-2">{dayjs(r.date).format("DD/MM/YYYY")}</td>
                  {showPartyColumn && <td className="p-2">{r.party}</td>}
                  <td className="p-2">{r.category || "-"}</td>
                  <td className="p-2 text-slate-600">{r.detail || "-"}</td>
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
                    {!r.readonly && (
                      <button
                        type="button"
                        className="text-rose-600 hover:text-rose-800 text-xs"
                        onClick={() => setConfirmDelId(r.id)}
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
              <td className="p-2" colSpan={showPartyColumn ? 3 : 2}>รวมทั้งหมด</td>
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

      {confirmDelId !== null && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setConfirmDelId(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-sm p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-2">ยืนยันการลบ</h2>
            <p className="text-sm text-slate-600 mb-4">
              ต้องการลบรายการนี้ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้
            </p>
            <div className="flex gap-2 justify-end">
              <button
                className="btn-secondary"
                onClick={() => setConfirmDelId(null)}
              >
                ยกเลิก
              </button>
              <button
                className="btn-primary bg-rose-600 hover:bg-rose-700"
                onClick={() => {
                  del.mutate(confirmDelId);
                  setConfirmDelId(null);
                }}
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}

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
              {mode === "INCOME"
                ? `เพิ่มรายได้ ${title}`
                : `${expenseLabel ?? "เพิ่มรายจ่าย"} ${title}`}
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
              {categoryOptions && categoryOptions.length > 0 && (
                <div>
                  <label className="label">{categoryLabel ?? "หมวด"}</label>
                  <select
                    className="input"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    required
                  >
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="label">
                  {partyLabel ?? (mode === "INCOME" ? "ผู้จ่าย/ที่มา" : "ผู้รับเงิน/ที่จ่าย")}
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
