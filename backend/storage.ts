import { db } from "./db";
import {
  readings,
  devices,
  alerts,
  type InsertReading,
  type Reading,
  type InsertDevice,
  type Device,
  type InsertAlert,
  type Alert
} from "@shared/schema";
import { desc, sql, gte, eq, and } from "drizzle-orm";

export interface IStorage {
  // Readings
  createReading(reading: InsertReading): Promise<Reading>;
  getLatestReading(): Promise<Reading | undefined>;
  getReadings(limit?: number, period?: string): Promise<Reading[]>;
  
  // Devices
  createDevice(device: InsertDevice): Promise<Device>;
  getDevices(): Promise<Device[]>;
  getDevice(id: string): Promise<Device | undefined>;
  updateDevice(id: string, updates: Partial<InsertDevice>): Promise<Device | undefined>;
  updateDeviceConfig(id: string, config: any): Promise<Device | undefined>;
  
  // Alerts
  createAlert(alert: InsertAlert): Promise<Alert>;
  getAlerts(filters: { deviceId?: string; acknowledged?: boolean; limit?: number }): Promise<Alert[]>;
  acknowledgeAlert(id: number): Promise<Alert | undefined>;
  checkAndCreateAlert(reading: Reading): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Readings
  async createReading(reading: InsertReading): Promise<Reading> {
    const [newReading] = await db!.insert(readings).values(reading).returning();
    return newReading;
  }

  async getLatestReading(): Promise<Reading | undefined> {
    const [reading] = await db!
      .select()
      .from(readings)
      .orderBy(desc(readings.timestamp))
      .limit(1);
    return reading;
  }

  async getReadings(limit = 100, period?: string): Promise<Reading[]> {
    let query = db!.select().from(readings).orderBy(desc(readings.timestamp));
    
    if (period) {
      const now = new Date();
      let startDate = new Date();
      
      if (period === 'day') {
        startDate.setDate(now.getDate() - 1);
      } else if (period === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      }
      
      query = query.where(gte(readings.timestamp, startDate)) as any;
    }

    return await query.limit(limit);
  }

  // Devices
  async createDevice(device: InsertDevice): Promise<Device> {
    const [newDevice] = await db!.insert(devices).values(device).returning();
    return newDevice;
  }

  async getDevices(): Promise<Device[]> {
    return await db!.select().from(devices).orderBy(desc(devices.createdAt));
  }

  async getDevice(id: string): Promise<Device | undefined> {
    const [device] = await db!.select().from(devices).where(eq(devices.id, id));
    return device;
  }

  async updateDevice(id: string, updates: Partial<InsertDevice>): Promise<Device | undefined> {
    const [updated] = await db!.update(devices).set(updates).where(eq(devices.id, id)).returning();
    return updated;
  }

  async updateDeviceConfig(id: string, config: any): Promise<Device | undefined> {
    const [updated] = await db!.update(devices).set(config).where(eq(devices.id, id)).returning();
    return updated;
  }

  // Alerts
  async createAlert(alert: InsertAlert): Promise<Alert> {
    const [newAlert] = await db!.insert(alerts).values(alert).returning();
    return newAlert;
  }

  async getAlerts(filters: { deviceId?: string; acknowledged?: boolean; limit?: number }): Promise<Alert[]> {
    let query = db!.select().from(alerts).orderBy(desc(alerts.timestamp));
    
    const conditions = [];
    if (filters.deviceId) {
      conditions.push(eq(alerts.deviceId, filters.deviceId));
    }
    if (filters.acknowledged !== undefined) {
      conditions.push(eq(alerts.acknowledged, filters.acknowledged));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.limit(filters.limit || 50);
  }

  async acknowledgeAlert(id: number): Promise<Alert | undefined> {
    const [updated] = await db!.update(alerts).set({ acknowledged: true }).where(eq(alerts.id, id)).returning();
    return updated;
  }

  async checkAndCreateAlert(reading: Reading): Promise<void> {
    if (!reading.sensorId) return;
    
    const device = await this.getDevice(reading.sensorId);
    if (!device || !device.deviceEnabled) return;
    
    const alerts = [];
    
    // Temperature alerts
    if (reading.temperature < device.tempMin) {
      alerts.push({
        deviceId: device.id,
        type: 'temperature',
        severity: 'warning',
        message: 'Temperature below minimum threshold',
        value: reading.temperature,
        threshold: `${device.tempMin}°C`
      });
    } else if (reading.temperature > device.tempMax) {
      alerts.push({
        deviceId: device.id,
        type: 'temperature',
        severity: 'critical',
        message: 'Temperature exceeded maximum threshold',
        value: reading.temperature,
        threshold: `${device.tempMax}°C`
      });
    }
    
    // Humidity alerts
    if (reading.humidity < device.humMin) {
      alerts.push({
        deviceId: device.id,
        type: 'humidity',
        severity: 'warning',
        message: 'Humidity below minimum threshold',
        value: reading.humidity,
        threshold: `${device.humMin}%`
      });
    } else if (reading.humidity > device.humMax) {
      alerts.push({
        deviceId: device.id,
        type: 'humidity',
        severity: 'critical',
        message: 'Humidity exceeded maximum threshold',
        value: reading.humidity,
        threshold: `${device.humMax}%`
      });
    }
    
    // Create alerts
    for (const alert of alerts) {
      await this.createAlert(alert);
    }
  }
}

class InMemoryStorage implements IStorage {
  private readingsList: Reading[] = [];
  private devicesList: Device[] = [];
  private alertsList: Alert[] = [];

  // Readings
  async createReading(reading: InsertReading): Promise<Reading> {
    const newReading: Reading = {
      id: this.readingsList.length + 1,
      sensorId: reading.sensorId,
      temperature: reading.temperature,
      humidity: reading.humidity,
      timestamp: new Date(),
    };

    this.readingsList.unshift(newReading);
    return newReading;
  }

  async getLatestReading(): Promise<Reading | undefined> {
    return this.readingsList[0];
  }

  async getReadings(limit = 100, period?: string): Promise<Reading[]> {
    let res = this.readingsList.slice(0, limit);

    if (period) {
      const now = new Date();
      let startDate = new Date();

      if (period === 'day') {
        startDate.setDate(now.getDate() - 1);
      } else if (period === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      }

      res = res.filter((r) => new Date(r.timestamp) >= startDate);
    }

    return res.slice(0, limit);
  }

  // Devices
  async createDevice(device: InsertDevice): Promise<Device> {
    const newDevice: Device = {
      ...device,
      createdAt: new Date(),
      lastSeen: device.lastSeen || null,
      firmwareVersion: device.firmwareVersion || null,
      rssi: device.rssi || null,
      uptime: device.uptime || null,
      freeHeap: device.freeHeap || null,
    };
    this.devicesList.push(newDevice);
    return newDevice;
  }

  async getDevices(): Promise<Device[]> {
    return this.devicesList;
  }

  async getDevice(id: string): Promise<Device | undefined> {
    return this.devicesList.find(d => d.id === id);
  }

  async updateDevice(id: string, updates: Partial<InsertDevice>): Promise<Device | undefined> {
    const index = this.devicesList.findIndex(d => d.id === id);
    if (index === -1) return undefined;
    
    this.devicesList[index] = { ...this.devicesList[index], ...updates };
    return this.devicesList[index];
  }

  async updateDeviceConfig(id: string, config: any): Promise<Device | undefined> {
    return this.updateDevice(id, config);
  }

  // Alerts
  async createAlert(alert: InsertAlert): Promise<Alert> {
    const newAlert: Alert = {
      id: this.alertsList.length + 1,
      ...alert,
      acknowledged: alert.acknowledged || false,
      timestamp: new Date(),
    };
    this.alertsList.unshift(newAlert);
    return newAlert;
  }

  async getAlerts(filters: { deviceId?: string; acknowledged?: boolean; limit?: number }): Promise<Alert[]> {
    let result = this.alertsList;
    
    if (filters.deviceId) {
      result = result.filter(a => a.deviceId === filters.deviceId);
    }
    if (filters.acknowledged !== undefined) {
      result = result.filter(a => a.acknowledged === filters.acknowledged);
    }
    
    return result.slice(0, filters.limit || 50);
  }

  async acknowledgeAlert(id: number): Promise<Alert | undefined> {
    const alert = this.alertsList.find(a => a.id === id);
    if (alert) {
      alert.acknowledged = true;
    }
    return alert;
  }

  async checkAndCreateAlert(reading: Reading): Promise<void> {
    // In-memory implementation for alerts checking
    if (!reading.sensorId) return;
    
    const device = await this.getDevice(reading.sensorId);
    if (!device || !device.deviceEnabled) return;
    
    // Temperature alerts
    if (reading.temperature < device.tempMin!) {
      await this.createAlert({
        deviceId: device.id,
        type: 'temperature',
        severity: 'warning',
        message: 'Temperature below minimum threshold',
        value: reading.temperature,
        threshold: `${device.tempMin}°C`
      });
    } else if (reading.temperature > device.tempMax!) {
      await this.createAlert({
        deviceId: device.id,
        type: 'temperature',
        severity: 'critical',
        message: 'Temperature exceeded maximum threshold',
        value: reading.temperature,
        threshold: `${device.tempMax}°C`
      });
    }
    
    // Humidity alerts
    if (reading.humidity < device.humMin!) {
      await this.createAlert({
        deviceId: device.id,
        type: 'humidity',
        severity: 'warning',
        message: 'Humidity below minimum threshold',
        value: reading.humidity,
        threshold: `${device.humMin}%`
      });
    } else if (reading.humidity > device.humMax!) {
      await this.createAlert({
        deviceId: device.id,
        type: 'humidity',
        severity: 'critical',
        message: 'Humidity exceeded maximum threshold',
        value: reading.humidity,
        threshold: `${device.humMax}%`
      });
    }
  }
}

// Export an appropriate storage implementation depending on whether DB is available
export const storage: IStorage = typeof db === 'undefined' || process.env.SKIP_DB === 'true'
  ? new InMemoryStorage()
  : new DatabaseStorage();
