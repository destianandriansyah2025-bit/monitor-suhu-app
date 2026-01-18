import { storage } from './storage';

interface FirebaseConfig {
  intervalSec: number;
  tempMin: number;
  tempMax: number;
  humMin: number;
  humMax: number;
  deviceEnabled: boolean;
}

interface FirebaseStatus {
  online: boolean;
  last_seen: number;
  firmware_version: string;
  uptime_sec: number;
  rssi: number;
  free_heap: number;
}

interface FirebaseSensorData {
  temperature: number;
  humidity: number;
  status: string;
  timestamp: number;
  device_id: string;
}

class FirebaseService {
  private devices = new Map<string, any>();

  // Simulate Firebase config sync
  async syncDeviceConfig(deviceId: string): Promise<FirebaseConfig | null> {
    const device = await storage.getDevice(deviceId);
    if (!device) return null;

    return {
      intervalSec: device.intervalSec || 5,
      tempMin: device.tempMin || 18.0,
      tempMax: device.tempMax || 27.0,
      humMin: device.humMin || 40.0,
      humMax: device.humMax || 70.0,
      deviceEnabled: device.deviceEnabled || true
    };
  }

  // Handle ESP8266 status updates
  async updateDeviceStatus(deviceId: string, status: FirebaseStatus): Promise<void> {
    await storage.updateDevice(deviceId, {
      status: status.online ? 'online' : 'offline',
      lastSeen: new Date(status.last_seen * 1000),
      firmwareVersion: status.firmware_version,
      rssi: status.rssi,
      uptime: status.uptime_sec,
      freeHeap: status.free_heap
    });
  }

  // Handle sensor data from ESP8266
  async processSensorData(data: FirebaseSensorData): Promise<void> {
    // Create reading
    const reading = await storage.createReading({
      temperature: data.temperature,
      humidity: data.humidity,
      sensorId: data.device_id
    });

    // Check for alerts
    await storage.checkAndCreateAlert(reading);

    console.log(`Processed sensor data from ${data.device_id}: ${data.temperature}°C, ${data.humidity}%`);
  }

  // Get device configuration for ESP8266
  async getDeviceConfig(deviceId: string): Promise<any> {
    const device = await storage.getDevice(deviceId);
    if (!device) {
      // Create default device if not exists
      return await storage.createDevice({
        id: deviceId,
        name: `Device ${deviceId}`,
        status: 'offline',
        intervalSec: 5,
        tempMin: 18.0,
        tempMax: 27.0,
        humMin: 40.0,
        humMax: 70.0,
        deviceEnabled: true
      });
    }
    return device;
  }
}

export const firebaseService = new FirebaseService();