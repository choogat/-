# ระบบจัดการตลาดให้เช่าล็อค (Market Management System)

Full-stack web application สำหรับจัดการตลาดให้เช่าล็อค — รายรับ รายจ่าย ผู้เช่า มิเตอร์น้ำ/ไฟ ทรัพย์สิน และรายงาน

## Stack
- **Backend**: Node.js 20 + Express + Prisma + SQLite (dev) / PostgreSQL (prod) + JWT
- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS + React Router + Recharts
- **Infra**: Docker Compose

## โครงสร้าง
```
.
├── server/          # Backend API
├── web/             # Frontend
├── docker-compose.yml
└── ออกแบบระบบจัดการตลาด.md   # เอกสารออกแบบ
```

## เริ่มต้นใช้งาน (Dev)

### 1. ติดตั้ง dependencies
```bash
cd server && npm install
cd ../web && npm install
```

### 2. ตั้งค่า env
```bash
cp server/.env.example server/.env
cp web/.env.example web/.env
```

### 3. สร้างฐานข้อมูล + seed
```bash
cd server
npx prisma migrate dev --name init
npm run seed
```

### 4. รัน dev
```bash
# terminal 1
cd server && npm run dev

# terminal 2
cd web && npm run dev
```

เปิด http://localhost:5173

### Login เริ่มต้น
- admin / admin123
- manager / manager123
- staff / staff123

## Phase
ดู `ออกแบบระบบจัดการตลาด.md` §8
