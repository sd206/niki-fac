import { ROLE_RANK, type FamilyRole } from "@niki/shared-types";
import type { NextFunction, Request, Response } from "express";

/**
 * Resolves the caller's role within a family. The gateway forwards this to
 * downstream services; in this MVP slice it is sourced from the family-service
 * via the X-Family-Role header set by an upstream lookup, or rejected.
 *
 * Returns middleware that enforces a minimum role for the route.
 */
export function requireFamilyRole(minRole: FamilyRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.header("x-family-role") as FamilyRole | undefined;
    if (!role || !(role in ROLE_RANK)) {
      res.status(403).json({ error: { code: "forbidden", message: "No family role in context" } });
      return;
    }
    if (ROLE_RANK[role] < ROLE_RANK[minRole]) {
      res.status(403).json({
        error: { code: "insufficient_role", message: `Requires at least ${minRole}` },
      });
      return;
    }
    next();
  };
}
