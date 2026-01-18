import { pgTable, text, serial, real, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const readings = pgTable("readings", {
  id: serial("id").primaryKey(),
  temperature: real("temperature").notNull(),
  humidity: real("humidity").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  sensorId: text("sensor_id").default("ESP-DEFAULT"),
});

export const devices = pgTable("devices", {
  id: text("id").primaryKey(), // ESP-SERVER-01
  name: text("name").notNull(),
  status: text("status").default("offline"), // online, offline
  lastSeen: timestamp("last_seen"),
  firmwareVersion: text("firmware_version"),
  rssi: integer("rssi"),
  uptime: integer("uptime"),
  freeHeap: integer("free_heap"),
  // Configuration
  intervalSec: integer("interval_sec").default(5),
  tempMin: real("temp_min").default(18.0),
  tempMax: real("temp_max").default(27.0),
  humMin: real("hum_min").default(40.0),
  humMax: real("hum_max").default(70.0),
  deviceEnabled: boolean("device_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").references(() => devices.id),
  type: text("type").notNull(), // temperature, humidity
  severity: text("severity").notNull(), // warning, critical
  message: text("message").notNull(),
  value: real("value").notNull(),
  threshold: text("threshold").notNull(),
  acknowledged: boolean("acknowledged").default(false),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertReadingSchema = createInsertSchema(readings).omit({ id: true, timestamp: true });
export const insertDeviceSchema = createInsertSchema(devices).omit({ createdAt: true });
export const insertAlertSchema = createInsertSchema(alerts).omit({ id: true, timestamp: true });

export type Reading = typeof readings.$inferSelect;
export type InsertReading = z.infer<typeof insertReadingSchema>;
export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
