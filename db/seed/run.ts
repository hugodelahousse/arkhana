import { CARDS } from "../../app/lib/cards.js";
import { db } from "../index.js";
import { cards } from "../schema/cards.js";

await db
  .insert(cards)
  .values(CARDS.map((c) => ({ id: c.id, name: c.name })))
  .onConflictDoNothing();

console.log(`Seeded ${CARDS.length} cards.`);
process.exit(0);
