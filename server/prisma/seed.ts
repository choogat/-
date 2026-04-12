import { PrismaClient } from "@prisma/client";
import { Role, LockStatus, ExpenseType, AssetType } from "../src/lib/enums.js";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Settings
  const settings = [
    { key: "MARKET_NAME", value: "ตลาดตัวอย่าง" },
    { key: "WATER_RATE", value: "18" },
    { key: "ELECTRIC_RATE", value: "7" },
    { key: "DUE_DAY", value: "5" },
  ];
  for (const s of settings) {
    await prisma.setting.upsert({ where: { key: s.key }, update: {}, create: s });
  }

  // Users
  const users = [
    { username: "admin", password: "admin123", fullName: "ผู้ดูแลระบบ", role: Role.ADMIN },
    { username: "manager", password: "manager123", fullName: "ผู้จัดการตลาด", role: Role.MANAGER },
    { username: "staff", password: "staff123", fullName: "พนักงาน", role: Role.STAFF },
  ];
  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        username: u.username,
        passwordHash: await bcrypt.hash(u.password, 10),
        fullName: u.fullName,
        role: u.role,
      },
    });
  }

  // Zones + Locks
  const zones = ["A", "B", "C"];
  for (const name of zones) {
    const zone = await prisma.zone.upsert({
      where: { name },
      update: {},
      create: { name, description: `โซน ${name}` },
    });
    for (let i = 1; i <= 5; i++) {
      const code = `${name}-${String(i).padStart(2, "0")}`;
      await prisma.lock.upsert({
        where: { code },
        update: {},
        create: {
          code,
          zoneId: zone.id,
          sizeSqm: 6,
          baseRent: 2500,
          baseCommonFee: 300,
          status: LockStatus.VACANT,
        },
      });
    }
  }

  // Expense categories
  const cats = [
    { code: "SALARY", name: "เงินเดือนพนักงาน", type: ExpenseType.OPERATION },
    { code: "SECURITY", name: "ค่ารักษาความปลอดภัย", type: ExpenseType.OPERATION },
    { code: "CLEANING", name: "ค่าทำความสะอาด", type: ExpenseType.OPERATION },
    { code: "INSURANCE", name: "ค่าประกันภัย", type: ExpenseType.OPERATION },
    { code: "TAX", name: "ค่าภาษีที่ดิน/โรงเรือน", type: ExpenseType.OPERATION },
    { code: "MARKETING", name: "ค่าการตลาด/โฆษณา", type: ExpenseType.OPERATION },
    { code: "OFFICE", name: "อุปกรณ์สำนักงาน", type: ExpenseType.GENERAL },
    { code: "TRAVEL", name: "ค่าเดินทาง", type: ExpenseType.GENERAL },
    { code: "REPAIR", name: "ค่าซ่อมแซมเล็กน้อย", type: ExpenseType.GENERAL },
    { code: "MISC", name: "เบ็ดเตล็ด", type: ExpenseType.GENERAL },
  ];
  for (const c of cats) {
    await prisma.expenseCategory.upsert({ where: { code: c.code }, update: {}, create: c });
  }

  // Asset categories
  const assetCats = [
    { name: "ที่ดินและสิ่งปลูกสร้าง", type: AssetType.LAND },
    { name: "ระบบสาธารณูปโภค", type: AssetType.UTILITY_SYSTEM },
    { name: "เครื่องมือและอุปกรณ์", type: AssetType.EQUIPMENT },
  ];
  for (const a of assetCats) {
    await prisma.assetCategory.upsert({ where: { name: a.name }, update: {}, create: a });
  }

  console.log("✅ Seed completed");
}

main().finally(() => prisma.$disconnect());
