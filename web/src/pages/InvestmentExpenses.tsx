import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import LedgerPage from "../components/LedgerPage";
import { api } from "../lib/api";

type ConstructionInstallment = {
  id: number;
  projectName: string;
  contractor: string | null;
  date: string;
  description: string;
  amount: number;
  receiptNo: string | null;
};

export default function InvestmentExpenses() {
  const { data: installments = [] } = useQuery<ConstructionInstallment[]>({
    queryKey: ["construction-installments-all"],
    queryFn: async () => (await api.get("/construction/installments")).data,
  });

  const extraRows = installments.map((i) => {
    const d = dayjs(i.date);
    return {
      period: d.format("YYYY-MM"),
      date: d.format("YYYY-MM-DD"),
      party: i.contractor ?? "",
      category: "ก่อสร้าง",
      detail: `[ก่อสร้าง] ${i.projectName} — ${i.description}${
        i.receiptNo ? ` #${i.receiptNo}` : ""
      }`,
      income: 0,
      expense: i.amount,
    };
  });

  return (
    <LedgerPage
      title="ค่าใช้จ่ายในการลงทุน"
      ledgerType="INVESTMENT"
      hideIncome
      expenseLabel="ยอดลงทุน"
      categoryOptions={["เงินสด", "โครงสร้าง"]}
      categoryLabel="ประเภท"
      showPartyFilter
      partyLabel="ผู้รับเงิน"
      defaultAllMonths
      showPartyColumn
      extraRows={extraRows}
    />
  );
}
