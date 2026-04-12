import { prisma } from "../../lib/prisma.js";
import { simpleCrud } from "../../utils/crud.js";

export const locksRouter = simpleCrud(prisma.lock as any, {
  include: { zone: true, contracts: { where: { status: "ACTIVE" }, include: { tenant: true } } },
});
