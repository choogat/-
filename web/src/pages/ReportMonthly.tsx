import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api } from "../lib/api";

export default function ReportMonthly() {
  const [period, setPeriod] = useState(dayjs().format("YYYY-MM"));
  const { data } = useQuery({
    queryKey: ["monthly", period],
    queryFn: async () => (await api.get(`/reports/monthly?period=${period}`)).data,
  });
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">สรุปรายเดือน</h1>
        <input type="month" className="input w-auto" value={period} onChange={(e) => setPeriod(e.target.value)} />
      </div>
      {data && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card">
            <h2 className="font-bold mb-2">รายรับแยกตามประเภท</h2>
            <ul className="space-y-1 text-sm">
              {data.incomeByType.map((i: any) => (
                <li key={i.type} className="flex justify-between border-b py-1">
                  <span>{i.type}</span>
                  <span>฿{(i._sum.paidAmount ?? 0).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h2 className="font-bold mb-2">รายจ่ายตามหมวด (category id)</h2>
            <ul className="space-y-1 text-sm">
              {data.expenseByCategory.map((e: any) => (
                <li key={e.categoryId} className="flex justify-between border-b py-1">
                  <span>Category #{e.categoryId}</span>
                  <span>฿{(e._sum.amount ?? 0).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
