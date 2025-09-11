import { sql } from "drizzle-orm";
import { pgTable, text, varchar, real, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const mapProjects = pgTable("map_projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileName: text("file_name").notNull(),
  originalImageUrl: text("original_image_url").notNull(),
  settings: jsonb("settings").notNull(),
  scale: real("scale").notNull().default(1),
  offsetX: real("offset_x").notNull().default(0),
  offsetY: real("offset_y").notNull().default(0),
  pdfUrl: text("pdf_url"),
  status: text("status").notNull().default("uploaded"), // uploaded, calibrated, processing, completed
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertMapProjectSchema = createInsertSchema(mapProjects).omit({
  id: true,
  createdAt: true,
});

export type InsertMapProject = z.infer<typeof insertMapProjectSchema>;
export type MapProject = typeof mapProjects.$inferSelect;

// Settings schema for map generation
export const mapSettingsSchema = z.object({
  gridStyle: z.enum(["square", "hexagon", "isometric", "universal"]).default("square"),
  unitOfMeasurement: z.enum(["imperial", "metric"]).default("imperial"),
  paperSize: z.enum(["a4", "a3", "a2", "a1", "a0", "letter", "legal", "tabloid"]).default("a4"),
  gridOverlay: z.boolean().default(false),
  backgroundColor: z.string().default("#ffffff"),
  averageBackgroundColor: z.boolean().default(false),
  gridMarkerColor: z.string().default("#ffffff"),
  guideColor: z.string().default("#ffffff"),
  generateBacksideNumbers: z.boolean().default(true),
  outlineStyle: z.enum(["dash", "solid", "dotted"]).default("dash"),
  outlineThickness: z.number().min(1).max(10).default(3),
  outlineColor: z.string().default("#ffffff"),
});

export type MapSettings = z.infer<typeof mapSettingsSchema>;
