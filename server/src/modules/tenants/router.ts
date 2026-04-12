import { prisma } from "../../lib/prisma.js";
import { simpleCrud } from "../../utils/crud.js";

export const tenantsRouter = simpleCrud(prisma.tenant as any, {
  include: { contracts: { include: { lock: true } } },
});
