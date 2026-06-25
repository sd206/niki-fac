import { Router, type Request, type Response, type Router as ExpressRouter } from "express";
import { z } from "zod";
import { withCaller } from "./context.js";
import {
  getFamilyMetrics,
  getPlatformMetrics,
  isFamilyMember,
  isFamilyOwner,
  resolveUserId,
} from "./repository.js";

export const analyticsRouter: ExpressRouter = Router();
analyticsRouter.use(withCaller);

async function requireOwner(
  req: Request,
  res: Response,
  familyId: string,
): Promise<string | null> {
  const userId = await resolveUserId(req.caller!.uid);
  if (!userId || !(await isFamilyMember(familyId, userId))) {
    res.status(403).json({ error: { code: "forbidden", message: "Not a member of this family" } });
    return null;
  }
  if (!(await isFamilyOwner(familyId, userId))) {
    res.status(403).json({ error: { code: "insufficient_role", message: "Analytics requires owner role" } });
    return null;
  }
  return userId;
}

analyticsRouter.get("/family/:familyId", async (req, res) => {
  const parsed = z.object({ familyId: z.string().uuid() }).safeParse({
    familyId: req.params.familyId,
  });
  if (!parsed.success) {
    res.status(400).json({ error: { code: "invalid_request", message: parsed.error.message } });
    return;
  }
  const userId = await requireOwner(req, res, parsed.data.familyId);
  if (!userId) return;
  const metrics = await getFamilyMetrics(parsed.data.familyId);
  res.json({ data: metrics });
});

analyticsRouter.get("/platform", async (_req, res) => {
  const metrics = await getPlatformMetrics();
  res.json({ data: metrics });
});
