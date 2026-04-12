import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { api } from "../lib/api";

export default function Expenses() {
  const qc = useQueryClient();
  const { data: categories = [] } = useQuery({
    queryKey: ["expense-categories"],
    queryFn: async () => (await api.get("/expenses/categories")).data,
  });
  const { data: items = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => (await api.get("/expenses")).data,
  });
  const [form, setForm] = useState({
    date: dayjs().format("YYYY-MM-DD"),
    categoryId: 0,
    description: "",
    amount: 0,
  });
  const save = useMutation({
    mutationFn: async () => (await api.post("/expenses", { ...form, categoryId: Number(form.categoryId), amount: Number(form.amount) })).data,
    onSuccess: () => {
      toast.success("บันทึกรายจ่ายแล้ว");
      qc.invalidateQueries({ queryKey: ["expenses"] });
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">รายจ่าย</h1>

      <form
        className="card grid grid-cols-2 md:grid-cols-5 gap-3"
        onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
      >
        <div>
          <label className="label">วันที่</label>
          <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </div>
        <div>
          <label className="label">หมวด</label>
          <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })} required>
            <option value="">-- เลือก --</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.id}>[{c.type}] {c.name}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="label">รายละเอียด</label>
          <input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <label className="label">จำนวนเงิน</label>
          <input type="number" className="input" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} required />
        </div>
        <div className="col-span-2 md:col-span-5">
          <button className="btn-primary w-full justify-center">บันทึก</button>
        </div>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left border-b">
            <tr><th className="p-2">วันที่</th><th className="p-2">หมวด</th><th className="p-2">รายละเอียด</th><th className="p-2 text-right">ยอด</th></tr>
          </thead>
          <tbody>
            {items.map((x: any) => (
              <tr key={x.id} className="border-b">
                <td className="p-2">{dayjs(x.date).format("DD/MM/YYYY")}</td>
                <td className="p-2">{x.category.name}</td>
                <td className="p-2">{x.description}</td>
                <td className="p-2 text-right">฿{x.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
