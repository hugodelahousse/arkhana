import { createRequestHandler } from "@react-router/express";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { auth } from "./auth.js";
import { db } from "../db/index.js";
import { cards } from "../db/schema/cards.js";
import { CARDS } from "../app/lib/cards.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

await migrate(db, { migrationsFolder: join(__dirname, "../migrations") });
await db.insert(cards).values(CARDS.map((c) => ({ id: c.id, name: c.name }))).onConflictDoNothing();

const app = express();

// better-auth must be mounted BEFORE express.json()
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());
app.use(express.static("build/client", { maxAge: "1h" }));

app.all(
  "*splat",
  createRequestHandler({
    build: () => import("../build/server/index.js"),
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
            }
          : null,
      };
    },
  })
);

const { config } = await import("../config/index.js");
const port = config.port;

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
