import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export default function Tenants() {
  const { data = [] } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => (await api.get("/tenants")).data,
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">ผู้เช่า</h1>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-600 border-b">
            <tr><th className="p-2">ชื่อ</th><th className="p-2">โทร</th><th className="p-2">สินค้า</th><th className="p-2">ล็อค</th></tr>
          </thead>
          <tbody>
            {data.map((t: any) => (
              <tr key={t.id} className="border-b hover:bg-slate-50">
                <td className="p-2">{t.fullName}</td>
                <td className="p-2">{t.phone ?? "-"}</td>
                <td className="p-2">{t.productType ?? "-"}</td>
                <td className="p-2">{t.contracts?.map((c: any) => c.lock.code).join(", ") || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
