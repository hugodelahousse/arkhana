import type { Route } from "./+types/root.js";
import { auth } from "../server/auth.js";
import { toWebRequest } from "@react-router/express";
import type { Request as ExpressRequest } from "express";

export async function getSessionUser(
  req: ExpressRequest
): Promise<{ id: string; name: string; email: string } | null> {
  const webReq = toWebRequest(req as Parameters<typeof toWebRequest>[0]);
  const session = await auth.api.getSession({ headers: webReq.headers });
  return session?.user ?? null;
}
