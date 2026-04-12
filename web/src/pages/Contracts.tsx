import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api } from "../lib/api";

export default function Contracts() {
  const { data = [] } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => (await api.get("/contracts")).data,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">สัญญาเช่า</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-600 border-b">
            <tr>
              <th className="p-2">ล็อค</th><th className="p-2">ผู้เช่า</th>
              <th className="p-2">เริ่ม</th><th className="p-2">สิ้นสุด</th>
              <th className="p-2 text-right">ค่าเช่า</th><th className="p-2 text-right">ส่วนกลาง</th>
              <th className="p-2">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c: any) => (
              <tr key={c.id} className="border-b">
                <td className="p-2 font-medium">{c.lock.code}</td>
                <td className="p-2">{c.tenant.fullName}</td>
                <td className="p-2">{dayjs(c.startDate).format("DD/MM/YYYY")}</td>
                <td className="p-2">{c.endDate ? dayjs(c.endDate).format("DD/MM/YYYY") : "-"}</td>
                <td className="p-2 text-right">฿{c.rentAmount.toLocaleString()}</td>
                <td className="p-2 text-right">฿{c.commonFee.toLocaleString()}</td>
                <td className="p-2"><span className="badge bg-slate-100">{c.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
