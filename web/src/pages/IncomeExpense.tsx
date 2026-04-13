import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api } from "../lib/api";

type Row = {
  kind: "income" | "expense";
  date: string;
  description: string;
  amount: number;
};

export default function IncomeExpense() {
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const { data, isLoading } = useQuery({
    queryKey: ["income-expense", date],
    queryFn: async () => (await api.get("/reports/daily", { params: { date } })).data,
  });

  const rows: Row[] = [
    ...(data?.payments ?? []).map((p: any) => ({
      kind: "income" as const,
      date: p.paidAt,
      description: `รับชำระใบแจ้งหนี้ #${p.invoiceId}${p.note ? ` — ${p.note}` : ""}`,
      amount: p.amount,
    })),
    ...(data?.expenses ?? []).map((e: any) => ({
      kind: "expense" as const,
      date: e.date,
      description: `${e.category?.name ?? ""}${e.description ? ` — ${e.description}` : ""}`,
      amount: e.amount,
    })),
  ].sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());

  const totalIncome = data?.totalIncome ?? 0;
  const totalExpense = data?.totalExpense ?? 0;
  const net = data?.net ?? 0;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">รายรับรายจ่าย</h1>

      <div className="card flex items-center gap-3">
        <label className="label mb-0">วันที่</label>
        <input
          type="date"
          className="input max-w-xs"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="card">
          <div className="text-sm text-slate-500">รายรับรวม</div>
          <div className="text-2xl font-bold text-emerald-600">
            ฿{totalIncome.toLocaleString()}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">รายจ่ายรวม</div>
          <div className="text-2xl font-bold text-rose-600">
            ฿{totalExpense.toLocaleString()}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">คงเหลือสุทธิ</div>
          <div className={`text-2xl font-bold ${net >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
            ฿{net.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left border-b">
            <tr>
              <th className="p-2">เวลา</th>
              <th className="p-2">ประเภท</th>
              <th className="p-2">รายละเอียด</th>
              <th className="p-2 text-right">รายรับ</th>
              <th className="p-2 text-right">รายจ่าย</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td className="p-4 text-center text-slate-400" colSpan={5}>กำลังโหลด...</td></tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr><td className="p-4 text-center text-slate-400" colSpan={5}>ไม่มีรายการในวันนี้</td></tr>
            )}
            {rows.map((r, i) => (
              <tr key={i} className="border-b">
                <td className="p-2">{dayjs(r.date).format("HH:mm")}</td>
                <td className="p-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    r.kind === "income" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                  }`}>
                    {r.kind === "income" ? "รายรับ" : "รายจ่าย"}
                  </span>
                </td>
                <td className="p-2">{r.description}</td>
                <td className="p-2 text-right text-emerald-600">
                  {r.kind === "income" ? `฿${r.amount.toLocaleString()}` : ""}
                </td>
                <td className="p-2 text-right text-rose-600">
                  {r.kind === "expense" ? `฿${r.amount.toLocaleString()}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
