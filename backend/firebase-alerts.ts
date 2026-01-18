import { firebaseStorage } from './firebase-storage';
import { sendTelegramAlert } from './telegram';

class AlertMonitor {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private sentToday: Record<string, boolean> = {};
  private lastResetDate: string = '';
  private emergencyState = {
    isActive: false,
    sentCount: 0,
    lastSentTime: 0,
    lastAlertState: false
  };

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚨 Alert monitor started');
    
    // Check for alerts every 30 seconds
    this.intervalId = setInterval(async () => {
      console.log('[Alert] Running alert check...');
      await this.checkAlerts();
    }, 30000);
    
    // Run first check immediately
    setTimeout(async () => {
      console.log('[Alert] Running initial alert check...');
      await this.checkAlerts();
    }, 5000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🚨 Alert monitor stopped');
  }

  private async checkAlerts() {
    try {
      // Reset daily tracking if new day
      this.resetDailyTracking();
      
      // Check device status first
      const deviceStatus = await firebaseStorage.getDeviceStatus('ESP-SERVER-01');
      if (!deviceStatus.isOnline) {
        console.log('[Alert] Device offline, skipping alert check');
        return;
      }

      const reading = await firebaseStorage.getLatestReading();
      if (!reading) return;

      // Check if data is fresh (within last 5 minutes)
      const dataAge = (Date.now() - new Date(reading.timestamp).getTime()) / (1000 * 60);
      if (dataAge > 5) {
        console.log(`[Alert] Data too old (${dataAge.toFixed(1)} minutes), skipping alert`);
        return;
      }

      const config = await firebaseStorage.getDeviceConfig('ESP-SERVER-01');
      if (!config) return;

      // Get notification schedule from Firebase (user settings)
      const notificationSchedule = await this.getNotificationSchedule();
      
      if (!notificationSchedule.enabled) {
        console.log('[Alert] Scheduled notifications disabled');
        return;
      }

      // Check for alert conditions
      const tempAlert = reading.temperature < config.temp_min || reading.temperature > config.temp_max;
      const humAlert = reading.humidity < config.hum_min || reading.humidity > config.hum_max;
      const hasAlert = tempAlert || humAlert;
      
      console.log(`[Alert] Temp: ${reading.temperature}°C (${config.temp_min}-${config.temp_max}), Alert: ${tempAlert}`);
      console.log(`[Alert] Humidity: ${reading.humidity}% (${config.hum_min}-${config.hum_max}), Alert: ${humAlert}`);
      console.log(`[Alert] Emergency enabled: ${notificationSchedule.emergencyEnabled}`);
      
      // Handle Emergency Alerts (max 3x, 15min interval)
      if (notificationSchedule.emergencyEnabled) {
        await this.handleEmergencyAlert(hasAlert, reading, config);
      }

      // Check for scheduled status reports (time-based trigger)
      await this.checkScheduledReports(reading, notificationSchedule);
      
    } catch (error) {
      console.error('Alert check failed:', error);
    }
  }

  private async handleEmergencyAlert(hasAlert: boolean, reading: any, config: any) {
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;

    // Deteksi perubahan: Normal → Alert (mulai emergency)
    if (hasAlert && !this.emergencyState.lastAlertState) {
      console.log('[Emergency] Alert detected! Starting emergency mode');
      this.emergencyState.isActive = true;
      this.emergencyState.sentCount = 0;
      this.emergencyState.lastSentTime = 0;
    }

    // Deteksi perubahan: Alert → Normal (reset emergency)
    if (!hasAlert && this.emergencyState.lastAlertState) {
      console.log('[Emergency] Alert cleared! Stopping emergency mode');
      this.emergencyState.isActive = false;
      this.emergencyState.sentCount = 0;
      this.emergencyState.lastSentTime = 0;
    }

    // Update state terakhir
    this.emergencyState.lastAlertState = hasAlert;

    // Kirim emergency alert jika kondisi terpenuhi
    if (this.emergencyState.isActive && hasAlert) {
      const timeSinceLastSent = now - this.emergencyState.lastSentTime;
      const canSend = this.emergencyState.sentCount === 0 || timeSinceLastSent >= fifteenMinutes;

      if (canSend && this.emergencyState.sentCount < 3) {
        this.emergencyState.sentCount++;
        this.emergencyState.lastSentTime = now;

        const tempMsg = reading.temperature < config.temp_min 
          ? `Temperature ${reading.temperature}°C is below minimum (${config.temp_min}°C)`
          : reading.temperature > config.temp_max
          ? `Temperature ${reading.temperature}°C exceeds maximum (${config.temp_max}°C)`
          : '';
        
        const humMsg = reading.humidity < config.hum_min
          ? `Humidity ${reading.humidity}% is below minimum (${config.hum_min}%)`
          : reading.humidity > config.hum_max
          ? `Humidity ${reading.humidity}% exceeds maximum (${config.hum_max}%)`
          : '';

        const message = [tempMsg, humMsg].filter(m => m).join('\n');

        await sendTelegramAlert(
          `🚨 EMERGENCY ALERT (${this.emergencyState.sentCount}/3)`,
          message
        );
        
        console.log(`[Emergency] Alert sent (${this.emergencyState.sentCount}/3)`);
      } else if (this.emergencyState.sentCount >= 3) {
        console.log('[Emergency] Max alerts reached (3/3), stopping');
      }
    }
  }

  private async getNotificationSchedule() {
    try {
      // Get schedule from Firebase (user settings)
      const schedule = await firebaseStorage.getNotificationSchedule('ESP-SERVER-01');
      
      // Ensure all required fields exist with proper defaults
      return {
        enabled: schedule?.enabled ?? true,
        scheduleType: schedule?.scheduleType || 'fixed',
        fixedTimes: schedule?.fixedTimes || ['08:00', '13:00', '18:00'],
        intervalHours: schedule?.intervalHours || 4,
        maxPerDay: schedule?.maxPerDay || 3,
        emergencyEnabled: schedule?.emergencyEnabled ?? false,
        quietHours: schedule?.quietHours || { start: '22:00', end: '06:00' }
      };
    } catch (error) {
      console.log('[Alert] Error getting schedule, using defaults:', error.message);
      // Fallback to default if error
      return {
        enabled: true,
        scheduleType: 'fixed',
        fixedTimes: ['08:00', '13:00', '18:00'],
        intervalHours: 4,
        maxPerDay: 3,
        emergencyEnabled: false,
        quietHours: { start: '22:00', end: '06:00' }
      };
    }
  }

  private resetDailyTracking() {
    const today = new Date().toDateString();
    if (this.lastResetDate !== today) {
      console.log('[Alert] Resetting daily tracking for new day');
      this.sentToday = {};
      this.lastResetDate = today;
    }
  }

  private async checkScheduledReports(reading: any, schedule: any) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
    
    console.log(`[Schedule] Current time: ${currentTime}`);
    console.log(`[Schedule] Fixed times: ${schedule.fixedTimes?.join(', ')}`);
    
    // Check if current time matches any scheduled time
    const scheduledTimes = schedule.fixedTimes || [];
    
    for (const scheduledTime of scheduledTimes) {
      if (currentTime === scheduledTime && !this.sentToday[scheduledTime]) {
        console.log(`[Schedule] Time match! Sending status report for ${scheduledTime}`);
        
        // Send status report
        await sendTelegramAlert(
          '📈 Status Report',
          `Temperature: ${reading.temperature}°C\nHumidity: ${reading.humidity}%\nTime: ${currentTime}`
        );
        
        // Mark as sent for today
        this.sentToday[scheduledTime] = true;
        console.log(`[Schedule] Status report sent for ${scheduledTime}`);
        
        break; // Only send one report per check
      }
    }
  }

  // Get alerts from Firebase
  async getAlerts(deviceId: string = 'ESP-SERVER-01') {
    try {
      const alerts = await firebaseStorage.fetchFirebase(`/devices/${deviceId}/alerts`);
      
      if (alerts) {
        return Object.entries(alerts).map(([key, alert]: [string, any]) => ({
          id: parseInt(key.replace(/[^0-9]/g, '')) || Math.random() * 1000,
          deviceId,
          type: alert.temperature ? 'temperature' : 'humidity',
          severity: alert.temperature > 28 || alert.humidity > 80 ? 'critical' : 'warning',
          message: alert.temperature > 28 ? 'Temperature exceeded maximum threshold' : 'Humidity threshold violation',
          value: alert.temperature || alert.humidity,
          threshold: alert.temp_range || alert.hum_range || 'N/A',
          acknowledged: false,
          timestamp: new Date(alert.timestamp * 1000)
        }));
      }
      return [];
    } catch (error) {
      console.error('Failed to get alerts:', error.message);
      return [];
    }
  }
}

export const alertMonitor = new AlertMonitor();