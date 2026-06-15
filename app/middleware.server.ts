import { auth } from "../server/auth.js";
import type { Request as ExpressRequest } from "express";

export async function getSessionUser(
  req: ExpressRequest
): Promise<{ id: string; name: string; email: string } | null> {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const v of value) headers.append(key, v);
    } else if (value != null) {
      headers.set(key, value);
    }
  }
  const session = await auth.api.getSession({ headers });
  return session?.user ?? null;
}
