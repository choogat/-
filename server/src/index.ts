import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { errorHandler } from "./middleware/error.js";
import { authRouter } from "./modules/auth/router.js";
import { usersRouter } from "./modules/users/router.js";
import { locksRouter } from "./modules/locks/router.js";
import { tenantsRouter } from "./modules/tenants/router.js";
import { contractsRouter } from "./modules/contracts/router.js";
import { invoicesRouter } from "./modules/invoices/router.js";
import { paymentsRouter } from "./modules/payments/router.js";
import { waterRouter } from "./modules/water/router.js";
import { electricRouter } from "./modules/electric/router.js";
import { expensesRouter } from "./modules/expenses/router.js";
import { assetsRouter } from "./modules/assets/router.js";
import { reportsRouter } from "./modules/reports/router.js";
import { settingsRouter } from "./modules/settings/router.js";
import { startCronJobs } from "./jobs/index.js";

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? "*", credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/locks", locksRouter);
app.use("/api/tenants", tenantsRouter);
app.use("/api/contracts", contractsRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/water-readings", waterRouter);
app.use("/api/electric-readings", electricRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/assets", assetsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/settings", settingsRouter);

app.use(errorHandler);

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`🚀 API running on http://localhost:${port}`);
  startCronJobs();
});
