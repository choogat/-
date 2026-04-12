import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api";

export default function Settings() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await api.get("/settings")).data,
  });
  const [form, setForm] = useState<Record<string, string>>({});
  useEffect(() => { if (data) setForm(data); }, [data]);

  const save = useMutation({
    mutationFn: async () => (await api.patch("/settings", form)).data,
    onSuccess: () => {
      toast.success("บันทึกแล้ว");
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const fields = [
    { key: "MARKET_NAME", label: "ชื่อตลาด" },
    { key: "WATER_RATE", label: "อัตราค่าน้ำ (บาท/หน่วย)" },
    { key: "ELECTRIC_RATE", label: "อัตราค่าไฟ (บาท/หน่วย)" },
    { key: "DUE_DAY", label: "วันครบกำหนดชำระ (วันที่ของเดือน)" },
  ];

  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold">ตั้งค่าระบบ</h1>
      <form className="card space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        {fields.map((f) => (
          <div key={f.key}>
            <label className="label">{f.label}</label>
            <input
              className="input"
              value={form[f.key] ?? ""}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
            />
          </div>
        ))}
        <button className="btn-primary">บันทึก</button>
      </form>
    </div>
  );
}
