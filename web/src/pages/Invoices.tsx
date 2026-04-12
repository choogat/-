import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { api } from "../lib/api";

const statusColor: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-700",
  PAID: "bg-emerald-100 text-emerald-700",
  OVERDUE: "bg-rose-100 text-rose-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-slate-100 text-slate-400",
};

export default function Invoices() {
  const qc = useQueryClient();
  const [period, setPeriod] = useState(dayjs().format("YYYY-MM"));

  const { data = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => (await api.get("/invoices")).data,
  });

  const generate = useMutation({
    mutationFn: async () => (await api.post("/invoices/generate-monthly", { period })).data,
    onSuccess: (d) => {
      toast.success(`สร้าง ${d.created} ใบแจ้งหนี้`);
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const pay = useMutation({
    mutationFn: async ({ id, amount }: any) =>
      (await api.post("/payments", { invoiceId: id, amount })).data,
    onSuccess: () => {
      toast.success("บันทึกการชำระแล้ว");
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ใบแจ้งหนี้</h1>
        <div className="flex gap-2">
          <input type="month" className="input w-auto" value={period} onChange={(e) => setPeriod(e.target.value)} />
          <button className="btn-primary" onClick={() => generate.mutate()}>
            สร้างใบแจ้งหนี้รายเดือน
          </button>
        </div>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-600 border-b">
            <tr>
              <th className="p-2">เลขที่</th><th className="p-2">ประเภท</th>
              <th className="p-2">ล็อค/ผู้เช่า</th><th className="p-2">งวด</th>
              <th className="p-2">กำหนด</th><th className="p-2 text-right">ยอด</th>
              <th className="p-2 text-right">ชำระแล้ว</th><th className="p-2">สถานะ</th><th></th>
            </tr>
          </thead>
          <tbody>
            {data.map((i: any) => (
              <tr key={i.id} className="border-b">
                <td className="p-2 font-mono text-xs">{i.invoiceNo}</td>
                <td className="p-2">{i.type}</td>
                <td className="p-2">
                  {i.contract ? `${i.contract.lock.code} · ${i.contract.tenant.fullName}` : "-"}
                </td>
                <td className="p-2">{i.period}</td>
                <td className="p-2">{dayjs(i.dueDate).format("DD/MM/YYYY")}</td>
                <td className="p-2 text-right">฿{i.amount.toLocaleString()}</td>
                <td className="p-2 text-right">฿{i.paidAmount.toLocaleString()}</td>
                <td className="p-2"><span className={`badge ${statusColor[i.status]}`}>{i.status}</span></td>
                <td className="p-2">
                  {i.status !== "PAID" && (
                    <button
                      className="btn-ghost text-xs"
                      onClick={() => pay.mutate({ id: i.id, amount: i.amount - i.paidAmount })}
                    >
                      รับชำระ
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
