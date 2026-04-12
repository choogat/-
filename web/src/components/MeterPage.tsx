import { useState } from "react";
import dayjs from "dayjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api";

type Props = {
  title: string;
  endpoint: string; // "/water-readings" | "/electric-readings"
  unitLabel: string; // "น้ำ" | "ไฟ"
};

export default function MeterPage({ title, endpoint, unitLabel }: Props) {
  const qc = useQueryClient();
  const { data: locks = [] } = useQuery({
    queryKey: ["locks"],
    queryFn: async () => (await api.get("/locks")).data,
  });
  const { data: readings = [] } = useQuery({
    queryKey: [endpoint],
    queryFn: async () => (await api.get(endpoint)).data,
  });

  const [form, setForm] = useState({
    lockId: 0,
    readingDate: dayjs().format("YYYY-MM-DD"),
    period: dayjs().format("YYYY-MM"),
    meterStart: 0,
    meterEnd: 0,
  });

  const save = useMutation({
    mutationFn: async () => (await api.post(endpoint, { ...form, lockId: Number(form.lockId) })).data,
    onSuccess: () => {
      toast.success(`บันทึกมิเตอร์${unitLabel}แล้ว`);
      qc.invalidateQueries({ queryKey: [endpoint] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? "ผิดพลาด"),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>

      <form
        className="card grid grid-cols-2 md:grid-cols-6 gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="col-span-2">
          <label className="label">ล็อค</label>
          <select
            className="input"
            value={form.lockId}
            onChange={(e) => setForm({ ...form, lockId: Number(e.target.value) })}
            required
          >
            <option value="">-- เลือก --</option>
            {locks.map((l: any) => (
              <option key={l.id} value={l.id}>{l.code}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">วันที่จด</label>
          <input type="date" className="input" value={form.readingDate}
            onChange={(e) => setForm({ ...form, readingDate: e.target.value })} />
        </div>
        <div>
          <label className="label">งวด</label>
          <input type="month" className="input" value={form.period}
            onChange={(e) => setForm({ ...form, period: e.target.value })} />
        </div>
        <div>
          <label className="label">เริ่มต้น</label>
          <input type="number" className="input" value={form.meterStart}
            onChange={(e) => setForm({ ...form, meterStart: Number(e.target.value) })} />
        </div>
        <div>
          <label className="label">สิ้นสุด</label>
          <input type="number" className="input" value={form.meterEnd}
            onChange={(e) => setForm({ ...form, meterEnd: Number(e.target.value) })} />
        </div>
        <div className="col-span-2 md:col-span-6">
          <button className="btn-primary w-full justify-center">บันทึก + ออกใบแจ้งหนี้</button>
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left border-b">
            <tr>
              <th className="p-2">วันที่</th><th className="p-2">ล็อค</th><th className="p-2">งวด</th>
              <th className="p-2 text-right">เริ่ม</th><th className="p-2 text-right">สิ้นสุด</th>
              <th className="p-2 text-right">หน่วย</th><th className="p-2 text-right">อัตรา</th>
              <th className="p-2 text-right">ยอด</th>
            </tr>
          </thead>
          <tbody>
            {readings.map((r: any) => (
              <tr key={r.id} className="border-b">
                <td className="p-2">{dayjs(r.readingDate).format("DD/MM/YYYY")}</td>
                <td className="p-2">{r.lock.code}</td>
                <td className="p-2">{r.period}</td>
                <td className="p-2 text-right">{r.meterStart}</td>
                <td className="p-2 text-right">{r.meterEnd}</td>
                <td className="p-2 text-right">{r.unitsUsed}</td>
                <td className="p-2 text-right">{r.ratePerUnit}</td>
                <td className="p-2 text-right font-medium">฿{r.totalAmount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
