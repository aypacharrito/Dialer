import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const inboundLeads = sqliteTable("inbound_leads", {
  id: text("id").primaryKey(),
  vendorId: text("vendor_id"),
  source: text("source").notNull().default("SmartFinancial"),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  phoneDigits: text("phone_digits").notNull().unique(),
  email: text("email").notNull().default(""),
  city: text("city").notNull().default("Imported"),
  product: text("product").notNull().default("Home & Auto"),
  line: text("line").notNull().default("home-auto"),
  disposition: text("disposition").notNull().default("Received - not worked yet"),
  notes: text("notes").notNull().default(""),
  cost: real("cost").notNull().default(0),
  createdAt: text("created_at").notNull(),
  syncedAt: integer("synced_at", { mode: "boolean" }).notNull().default(false),
}, table => [index("inbound_leads_created_at_idx").on(table.createdAt), index("inbound_leads_line_idx").on(table.line)]);
