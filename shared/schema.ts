import { z } from "zod";

export const insertReadingSchema = z.object({
  temperature: z.number(),
  humidity: z.number(),
  sensorId: z.string().default("ESP-DEFAULT"),
});

export const insertDeviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string().default("offline"),
  lastSeen: z.coerce.date().optional(),
  firmwareVersion: z.string().optional(),
  rssi: z.number().optional(),
  uptime: z.number().optional(),
  freeHeap: z.number().optional(),
  intervalSec: z.number().default(5),
  tempMin: z.number().default(18.0),
  tempMax: z.number().default(27.0),
  humMin: z.number().default(40.0),
  humMax: z.number().default(70.0),
  deviceEnabled: z.boolean().default(true),
});

export const insertAlertSchema = z.object({
  deviceId: z.string().nullable(),
  type: z.string(),
  severity: z.string(),
  message: z.string(),
  value: z.number(),
  threshold: z.string(),
  acknowledged: z.boolean().default(false),
});

export type InsertReading = z.infer<typeof insertReadingSchema>;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

export interface Reading extends InsertReading {
  id: number;
  timestamp: Date;
}

export interface Device extends InsertDevice {
  createdAt: Date;
}

export interface Alert extends InsertAlert {
  id: number;
  timestamp: Date;
}
