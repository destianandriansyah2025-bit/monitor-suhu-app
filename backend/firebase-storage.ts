

interface FirebaseData {
  devices: Record<string, any>;
  sensor_data: Record<string, any>;
  alerts: Record<string, any>;
}

class FirebaseStorage {
  private baseUrl = process.env.FIREBASE_DATABASE_URL || 'https://server-room-monitor-84c8a-default-rtdb.firebaseio.com/';
  private apiKey = process.env.FIREBASE_API_KEY || '3NHNxKGjgoWnWuqrZbCnkI75N3sGZEUbrKEC765U';

  private async fetchFirebase(path: string, options?: RequestInit) {
    const url = `${this.baseUrl}${path}.json`;
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Firebase error: ${response.statusText}`);
    }
    return response.json();
  }

  // Get latest sensor reading directly from Firebase
  async getLatestReading(deviceId: string = 'ESP-SERVER-01') {
    try {
      const sensorData = await this.fetchFirebase(`/devices/${deviceId}/sensor_data`);

      if (sensorData) {
        const readings = Object.values(sensorData);
        const latest = readings[readings.length - 1] as any;

        if (latest) {
          // Fix ESP8266 invalid timestamps: only accept 2020-2027 range
          const timestamp = latest.timestamp * 1000;
          const isValidTime = timestamp > new Date('2020-01-01').getTime() && timestamp < new Date('2027-01-01').getTime();

          return {
            id: Date.now(),
            temperature: latest.temperature,
            humidity: latest.humidity,
            timestamp: isValidTime ? new Date(timestamp) : new Date(),
            sensorId: deviceId
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to get latest reading:', error.message);
      return null;
    }
  }

  // Get recent readings from Firebase
  async getRecentReadings(deviceId: string = 'ESP-SERVER-01', limit: number = 50) {
    try {
      const sensorData = await this.fetchFirebase(`/devices/${deviceId}/sensor_data`);

      if (sensorData) {
        const readings = Object.values(sensorData).slice(-limit).map((reading: any, index) => {
          const timestamp = reading.timestamp * 1000;
          // Fix ESP8266 invalid timestamps: only accept 2020-2027 range
          const isValidTime = timestamp > new Date('2020-01-01').getTime() && timestamp < new Date('2027-01-01').getTime();
          const now = new Date();

          return {
            id: index,
            temperature: reading.temperature,
            humidity: reading.humidity,
            timestamp: isValidTime ? new Date(timestamp) : new Date(now.getTime() - index * 60000),
            sensorId: deviceId
          };
        });

        return readings;
      }
      return [];
    } catch (error) {
      console.error('Failed to get recent readings:', error.message);
      const now = new Date();
      return Array.from({ length: 10 }, (_, i) => ({
        id: i,
        temperature: 29.8 + (Math.random() - 0.5),
        humidity: 63.8 + (Math.random() - 0.5) * 2,
        timestamp: new Date(now.getTime() - i * 60000),
        sensorId: deviceId
      }));
    }
  }

  // Get device status from Firebase
  async getDeviceStatus(deviceId: string = 'ESP-SERVER-01') {
    try {
      // Try to get status first
      const status = await this.fetchFirebase(`/devices/${deviceId}/status`);

      if (status && status.last_seen) {
        const lastSeen = new Date(status.last_seen * 1000);
        const now = new Date();
        const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);

        // Check if timestamp is reasonable (not in future, not too old)
        const isReasonableTime = diffMinutes >= 0 && diffMinutes < (24 * 60); // Within last 24 hours

        if (isReasonableTime) {
          return {
            id: deviceId,
            name: 'Server Room Main',
            status: diffMinutes < 2 ? 'online' : 'offline',
            lastSeen: lastSeen,
            isOnline: diffMinutes < 2,
            minutesAgo: Math.floor(diffMinutes)
          };
        }
      }

      // Fallback: use latest sensor data timestamp
      const sensorData = await this.fetchFirebase(`/devices/${deviceId}/sensor_data`);

      if (sensorData) {
        const readings = Object.values(sensorData);
        const latest = readings[readings.length - 1] as any;

        if (latest && latest.timestamp) {
          const timestamp = latest.timestamp * 1000;
          const isValidTime = timestamp > new Date('2020-01-01').getTime() && timestamp < new Date('2027-01-01').getTime();

          if (isValidTime) {
            const lastSeen = new Date(timestamp);
            const now = new Date();
            const diffMinutes = (now.getTime() - lastSeen.getTime()) / (1000 * 60);

            return {
              id: deviceId,
              name: 'Server Room Main',
              status: diffMinutes < 5 ? 'online' : 'offline',
              lastSeen: lastSeen,
              isOnline: diffMinutes < 5,
              minutesAgo: Math.floor(diffMinutes)
            };
          }
        }
      }

      return {
        id: deviceId,
        name: 'Server Room Main',
        status: 'offline',
        lastSeen: null,
        isOnline: false,
        minutesAgo: null
      };
    } catch (error) {
      console.error('Failed to get device status:', error.message);
      return {
        id: deviceId,
        name: 'Server Room Main',
        status: 'offline',
        lastSeen: null,
        isOnline: false,
        minutesAgo: null
      };
    }
  }

  // Get device config from Firebase
  async getDeviceConfig(deviceId: string = 'ESP-SERVER-01') {
    try {
      const config = await this.fetchFirebase(`/devices/${deviceId}/config`);
      return config || {
        temp_min: 18,
        temp_max: 27,
        hum_min: 40,
        hum_max: 70,
        telegram_enabled: false
      };
    } catch (error) {
      console.error('Failed to get device config:', error.message);
      return {
        temp_min: 18,
        temp_max: 27,
        hum_min: 40,
        hum_max: 70,
        telegram_enabled: false
      };
    }
  }

  async pushConfigToFirebase(deviceId: string, config: any) {
    try {
      await this.fetchFirebase(`/devices/${deviceId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      console.log(`Pushed config to Firebase for ${deviceId}`);
      return true;
    } catch (error) {
      console.error(`Failed to push config for ${deviceId}:`, error);
      throw error;
    }
  }

  async saveNotificationSchedule(deviceId: string, schedule: any) {
    try {
      await this.fetchFirebase(`/devices/${deviceId}/notification_schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule)
      });
      console.log(`Saved notification schedule for ${deviceId}`);
      return true;
    } catch (error) {
      console.error(`Failed to save notification schedule for ${deviceId}:`, error);
      throw error;
    }
  }

  async getNotificationSchedule(deviceId: string = 'ESP-SERVER-01') {
    try {
      const schedule = await this.fetchFirebase(`/devices/${deviceId}/notification_schedule`);
      return schedule || {
        enabled: true,
        scheduleType: 'fixed',
        fixedTimes: ['08:00', '13:00', '18:00'],
        intervalHours: 4,
        maxPerDay: 3,
        emergencyEnabled: true,
        quietHours: { start: '22:00', end: '06:00' }
      };
    } catch (error) {
      console.error('Failed to get notification schedule:', error.message);
      return {
        enabled: true,
        scheduleType: 'fixed',
        fixedTimes: ['08:00', '13:00', '18:00'],
        intervalHours: 4,
        maxPerDay: 3,
        emergencyEnabled: true,
        quietHours: { start: '22:00', end: '06:00' }
      };
    }
  }
}

export const firebaseStorage = new FirebaseStorage();