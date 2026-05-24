import { createRequestHandler } from "@react-router/express";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";

export const app = express();

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.use(
  createRequestHandler({
    // @ts-expect-error virtual module resolved by Vite/React Router
    build: () => import("virtual:react-router/server-build"),
    async getLoadContext(req) {
      const session = await auth.api.getSession({
        headers: new Headers(req.headers as Record<string, string>),
      });
      return {
        user: session?.user
          ? {
              id: session.user.id,
              name: session.user.name,
              email: session.user.email,
              username: (session.user as any).username ?? null,
              isAnonymous: (session.user as any).isAnonymous ?? false,
            }
          : null,
      };
    },
  })
);
