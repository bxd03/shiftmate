// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
export {};
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const workspaceState = sqliteTable("shiftmate_workspace_state", {
  id: text("id").primaryKey(),
  revision: integer("revision").notNull().default(1),
  stateJson: text("state_json").notNull(),
  updatedAt: text("updated_at").notNull(),
});
