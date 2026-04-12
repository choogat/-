// Enum-like string constants (SQLite ไม่รองรับ Prisma enum)

export const Role = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  STAFF: "STAFF",
  ACCOUNTANT: "ACCOUNTANT",
  VIEWER: "VIEWER",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const LockStatus = {
  VACANT: "VACANT",
  OCCUPIED: "OCCUPIED",
  MAINTENANCE: "MAINTENANCE",
} as const;
export type LockStatus = (typeof LockStatus)[keyof typeof LockStatus];

export const ContractStatus = {
  ACTIVE: "ACTIVE",
  ENDED: "ENDED",
  TERMINATED: "TERMINATED",
} as const;
export type ContractStatus = (typeof ContractStatus)[keyof typeof ContractStatus];

export const InvoiceType = {
  RENT: "RENT",
  COMMON: "COMMON",
  WATER: "WATER",
  ELECTRIC: "ELECTRIC",
  OTHER: "OTHER",
} as const;
export type InvoiceType = (typeof InvoiceType)[keyof typeof InvoiceType];

export const InvoiceStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  OVERDUE: "OVERDUE",
  PARTIAL: "PARTIAL",
  CANCELLED: "CANCELLED",
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const PaymentMethod = {
  CASH: "CASH",
  TRANSFER: "TRANSFER",
  QR: "QR",
  OTHER: "OTHER",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const ExpenseType = {
  OPERATION: "OPERATION",
  CONSTRUCTION: "CONSTRUCTION",
  EVENT: "EVENT",
  UTILITY: "UTILITY",
  GENERAL: "GENERAL",
} as const;
export type ExpenseType = (typeof ExpenseType)[keyof typeof ExpenseType];

export const AssetType = {
  LAND: "LAND",
  BUILDING: "BUILDING",
  UTILITY_SYSTEM: "UTILITY_SYSTEM",
  EQUIPMENT: "EQUIPMENT",
} as const;
export type AssetType = (typeof AssetType)[keyof typeof AssetType];
