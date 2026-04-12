import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export default function UtilityBills() {
  const { data = [] } = useQuery({
    queryKey: ["utility-bills"],
    queryFn: async () => (await api.get("/expenses/utility-bills")).data,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">ค่าสาธารณูปโภครายเดือน</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left border-b">
            <tr>
              <th className="p-2">งวด</th><th className="p-2 text-right">ไฟ</th>
              <th className="p-2 text-right">น้ำ</th><th className="p-2 text-right">เน็ต</th>
              <th className="p-2 text-right">ขยะ</th><th className="p-2 text-right">บำบัดน้ำเสีย</th>
              <th className="p-2 text-right">รวม</th>
            </tr>
          </thead>
          <tbody>
            {data.map((b: any) => (
              <tr key={b.id} className="border-b">
                <td className="p-2">{b.period}</td>
                <td className="p-2 text-right">฿{b.electricAmount.toLocaleString()}</td>
                <td className="p-2 text-right">฿{b.waterAmount.toLocaleString()}</td>
                <td className="p-2 text-right">฿{b.internetAmount.toLocaleString()}</td>
                <td className="p-2 text-right">฿{b.garbageAmount.toLocaleString()}</td>
                <td className="p-2 text-right">฿{b.wasteWaterAmount.toLocaleString()}</td>
                <td className="p-2 text-right font-bold">฿{b.totalAmount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
