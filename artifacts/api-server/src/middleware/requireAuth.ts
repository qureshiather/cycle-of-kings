import type { Request, Response, NextFunction } from "express";
import { verifySupabaseAccessToken } from "../lib/supabaseAuth.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const authUserId = await verifySupabaseAccessToken(header.slice(7));
    res.locals["authUserId"] = authUserId;
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

export function authUserIdFrom(res: Response): string {
  const id = res.locals["authUserId"];
  if (typeof id !== "string") throw new Error("Missing auth user");
  return id;
}
