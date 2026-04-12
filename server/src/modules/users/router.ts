import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role } from "../../lib/enums.js";
import { prisma } from "../../lib/prisma.js";
import { ah } from "../../utils/asyncHandler.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";

export const usersRouter = Router();
usersRouter.use(requireAuth, requireRole(Role.ADMIN));

usersRouter.get(
  "/",
  ah(async (_req, res) => {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, fullName: true, role: true, email: true, phone: true, isActive: true },
    });
    res.json(users);
  })
);

usersRouter.post(
  "/",
  ah(async (req, res) => {
    const body = z
      .object({
        username: z.string().min(3),
        password: z.string().min(6),
        fullName: z.string(),
        role: z.nativeEnum(Role),
        email: z.string().email().optional(),
        phone: z.string().optional(),
      })
      .parse(req.body);
    const user = await prisma.user.create({
      data: {
        username: body.username,
        passwordHash: await bcrypt.hash(body.password, 10),
        fullName: body.fullName,
        role: body.role,
        email: body.email,
        phone: body.phone,
      },
    });
    res.status(201).json({ id: user.id });
  })
);

usersRouter.patch(
  "/:id",
  ah(async (req, res) => {
    const id = Number(req.params.id);
    const body = req.body as any;
    const data: any = { ...body };
    if (body.password) {
      data.passwordHash = await bcrypt.hash(body.password, 10);
      delete data.password;
    }
    const user = await prisma.user.update({ where: { id }, data });
    res.json({ id: user.id });
  })
);
