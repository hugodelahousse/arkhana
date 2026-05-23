import { integer, pgTable, text } from "drizzle-orm/pg-core";

export const cards = pgTable("cards", {
  id: integer("id").primaryKey(), // 0–77 canonical index
  name: text("name").notNull(),
});
