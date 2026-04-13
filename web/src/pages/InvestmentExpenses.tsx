import LedgerPage from "../components/LedgerPage";

export default function InvestmentExpenses() {
  return (
    <LedgerPage
      title="ค่าใช้จ่ายในการลงทุน"
      ledgerType="INVESTMENT"
      hideIncome
      expenseLabel="ยอดลงทุน"
      categoryOptions={["เงินสด", "โครงสร้าง"]}
      categoryLabel="ประเภท"
      showPartyFilter
      partyLabel="ผู้รับเงิน (ผู้รับเหมา)"
      defaultAllMonths
    />
  );
}
