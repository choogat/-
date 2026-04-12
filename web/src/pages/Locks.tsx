import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export default function Locks() {
  const { data: locks = [] } = useQuery({
    queryKey: ["locks"],
    queryFn: async () => (await api.get("/locks")).data,
  });

  const color: Record<string, string> = {
    VACANT: "bg-slate-200 text-slate-700",
    OCCUPIED: "bg-emerald-100 text-emerald-700",
    MAINTENANCE: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">ล็อคทั้งหมด</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {locks.map((l: any) => (
          <div key={l.id} className="card">
            <div className="flex justify-between items-start">
              <div className="font-bold text-lg">{l.code}</div>
              <span className={`badge ${color[l.status]}`}>{l.status}</span>
            </div>
            <div className="text-xs text-slate-500 mt-2">โซน {l.zone?.name}</div>
            <div className="text-sm mt-1">
              ค่าเช่า: ฿{l.baseRent.toLocaleString()}/ด.
            </div>
            {l.contracts?.[0] && (
              <div className="text-xs text-slate-600 mt-2 border-t pt-2">
                ผู้เช่า: {l.contracts[0].tenant.fullName}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
