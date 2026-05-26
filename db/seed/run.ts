import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { CARDS } from "../../app/lib/cards.js";
import { cards } from "../schema/cards.js";
import * as schema from "../schema/index.js";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const client = postgres(url);
const db = drizzle(client, { schema });

await db
  .insert(cards)
  .values(CARDS.map((c) => ({ id: c.id, name: c.name })))
  .onConflictDoNothing();

console.log(`Seeded ${CARDS.length} cards.`);

await client.end();
process.exit(0);
