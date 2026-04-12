import { Router } from "express";
import { ah } from "./asyncHandler.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { Role } from "../lib/enums.js";

type ModelDelegate = {
  findMany: (args?: any) => Promise<any>;
  findUnique: (args: any) => Promise<any>;
  create: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
  delete: (args: any) => Promise<any>;
};

export function simpleCrud(model: ModelDelegate, opts: { include?: any } = {}) {
  const router = Router();
  router.use(requireAuth);

  router.get(
    "/",
    ah(async (_req, res) => {
      const items = await model.findMany({ include: opts.include });
      res.json(items);
    })
  );

  router.get(
    "/:id",
    ah(async (req, res) => {
      const item = await model.findUnique({
        where: { id: Number(req.params.id) },
        include: opts.include,
      });
      res.json(item);
    })
  );

  router.post(
    "/",
    requireRole(Role.ADMIN, Role.MANAGER),
    ah(async (req, res) => {
      const item = await model.create({ data: req.body });
      res.status(201).json(item);
    })
  );

  router.patch(
    "/:id",
    requireRole(Role.ADMIN, Role.MANAGER),
    ah(async (req, res) => {
      const item = await model.update({
        where: { id: Number(req.params.id) },
        data: req.body,
      });
      res.json(item);
    })
  );

  router.delete(
    "/:id",
    requireRole(Role.ADMIN),
    ah(async (req, res) => {
      await model.delete({ where: { id: Number(req.params.id) } });
      res.status(204).end();
    })
  );

  return router;
}
