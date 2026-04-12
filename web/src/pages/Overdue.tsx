import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api } from "../lib/api";

export default function Overdue() {
  const { data = [] } = useQuery({
    queryKey: ["overdue"],
    queryFn: async () => (await api.get("/reports/overdue")).data,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-rose-600">ลูกค้าค้างชำระ</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left border-b">
            <tr>
              <th className="p-2">เลขที่</th><th className="p-2">ล็อค/ผู้เช่า</th>
              <th className="p-2">ประเภท</th><th className="p-2">กำหนดชำระ</th>
              <th className="p-2 text-right">ยอดค้าง</th><th className="p-2 text-right">ค้างมาแล้ว</th>
            </tr>
          </thead>
          <tbody>
            {data.map((i: any) => (
              <tr key={i.id} className="border-b">
                <td className="p-2 font-mono text-xs">{i.invoiceNo}</td>
                <td className="p-2">{i.contract ? `${i.contract.lock.code} · ${i.contract.tenant.fullName}` : "-"}</td>
                <td className="p-2">{i.type}</td>
                <td className="p-2">{dayjs(i.dueDate).format("DD/MM/YYYY")}</td>
                <td className="p-2 text-right">฿{(i.amount - i.paidAmount).toLocaleString()}</td>
                <td className="p-2 text-right text-rose-600 font-medium">{i.daysOverdue} วัน</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
