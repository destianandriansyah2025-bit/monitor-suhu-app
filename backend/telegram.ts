class TelegramService {
  private botToken = process.env.TELEGRAM_BOT_TOKEN;
  private chatId = process.env.TELEGRAM_CHAT_ID;

  async sendAlert(temperature: number, humidity: number, deviceId: string, thresholds: any) {
    if (!this.botToken || !this.chatId) {
      console.log('[Telegram] Bot not configured');
      return false;
    }

    const tempAlert = temperature < thresholds.temp_min || temperature > thresholds.temp_max;
    const humAlert = humidity < thresholds.hum_min || humidity > thresholds.hum_max;
    
    if (!tempAlert && !humAlert) return false;

    const message = this.formatAlertMessage(temperature, humidity, deviceId, thresholds, tempAlert, humAlert);
    
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: message,
          parse_mode: 'HTML'
        })
      });

      if (response.ok) {
        console.log('[Telegram] Alert sent successfully');
        return true;
      } else {
        console.error('[Telegram] Failed to send alert');
        return false;
      }
    } catch (error) {
      console.error('[Telegram] Error sending alert:', error);
      return false;
    }
  }

  async sendMessage(title: string, message: string) {
    if (!this.botToken || !this.chatId) {
      console.log('[Telegram] Bot not configured');
      return false;
    }

    const fullMessage = `${title}\n\n${message}`;
    
    try {
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: fullMessage,
          parse_mode: 'HTML'
        })
      });

      return response.ok;
    } catch (error) {
      console.error('[Telegram] Error sending message:', error);
      return false;
    }
  }

  private formatAlertMessage(temp: number, hum: number, deviceId: string, thresholds: any, tempAlert: boolean, humAlert: boolean): string {
    const now = new Date();
    const time = now.toLocaleTimeString('id-ID');
    
    let message = `🚨 <b>ALERT: Server Room Monitor</b>\n\n`;
    
    if (tempAlert) {
      message += `🌡️ <b>Suhu:</b> ${temp.toFixed(1)}°C (Range: ${thresholds.temp_min}-${thresholds.temp_max}°C)\n`;
    }
    
    if (humAlert) {
      message += `💧 <b>Kelembaban:</b> ${hum.toFixed(1)}% (Range: ${thresholds.hum_min}-${thresholds.hum_max}%)\n`;
    }
    
    message += `📍 <b>Device:</b> ${deviceId}\n`;
    message += `⏰ <b>Waktu:</b> ${time}`;
    
    return message;
  }
}

export const telegramService = new TelegramService();
export const sendTelegramAlert = (title: string, message: string) => telegramService.sendMessage(title, message);