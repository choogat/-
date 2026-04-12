import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api } from "../lib/api";

export default function ReportDaily() {
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const { data } = useQuery({
    queryKey: ["daily", date],
    queryFn: async () => (await api.get(`/reports/daily?date=${date}`)).data,
  });
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">สรุปรายวัน</h1>
        <input type="date" className="input w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card"><div className="text-sm text-slate-500">รายรับ</div><div className="text-2xl font-bold text-emerald-600">฿{data.totalIncome.toLocaleString()}</div></div>
          <div className="card"><div className="text-sm text-slate-500">รายจ่าย</div><div className="text-2xl font-bold text-rose-600">฿{data.totalExpense.toLocaleString()}</div></div>
          <div className="card"><div className="text-sm text-slate-500">กำไรสุทธิ</div><div className="text-2xl font-bold">฿{data.net.toLocaleString()}</div></div>
        </div>
      )}
    </div>
  );
}
