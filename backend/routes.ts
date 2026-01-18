import type { Express } from "express";
import type { Server } from "http";
import { firebaseStorage } from "./firebase-storage";
import { api } from "@shared/routes";
import { sendTelegramAlert } from "./telegram";
import { alertMonitor } from "./firebase-alerts";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  console.log('🔥 Using Firebase real-time data');

  // Readings endpoints
  app.get(api.readings.current.path, async (req, res) => {
    const reading = await firebaseStorage.getLatestReading();
    res.json(reading || null);
  });

  app.get(api.readings.list.path, async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const readings = await firebaseStorage.getRecentReadings('ESP-SERVER-01', limit);
    res.json(readings);
  });

  app.post(api.readings.create.path, async (req, res) => {
    try {
      const reading = await firebaseStorage.saveReading(req.body);
      res.status(201).json(reading);
    } catch (error) {
      res.status(400).json({ message: "Failed to save reading" });
    }
  });

  // Alert endpoints
  app.get(api.alerts.list.path, async (req, res) => {
    try {
      const alerts = await alertMonitor.getAlerts('ESP-SERVER-01');
      res.json(alerts);
    } catch (error) {
      res.json([]);
    }
  });

  // Device status endpoint
  app.get('/api/device-status/:id', async (req, res) => {
    const status = await firebaseStorage.getDeviceStatus(req.params.id);
    res.json(status);
  });

  // Device config endpoint
  app.get('/api/device-config/:id', async (req, res) => {
    const config = await firebaseStorage.getDeviceConfig(req.params.id);
    res.json(config);
  });

  // Device config update endpoint
  app.put('/api/devices/:id/config', async (req, res) => {
    try {
      await firebaseStorage.pushConfigToFirebase(req.params.id, {
        interval: req.body.intervalSec,
        temp_min: req.body.tempMin,
        temp_max: req.body.tempMax,
        hum_min: req.body.humMin,
        hum_max: req.body.humMax,
        device_enabled: req.body.deviceEnabled
      });
      
      res.json({ success: true, message: "Configuration sent to device" });
    } catch (err) {
      res.status(500).json({ message: "Failed to send configuration" });
    }
  });

  // Notification schedule endpoint
  app.put('/api/notification-schedule/:id', async (req, res) => {
    try {
      await firebaseStorage.saveNotificationSchedule(req.params.id, req.body);
      res.json({ success: true, message: "Notification schedule saved" });
    } catch (err) {
      console.error('Save notification schedule error:', err);
      res.status(500).json({ message: "Failed to save notification schedule" });
    }
  });

  // Telegram test endpoint
  app.post('/api/telegram/test', async (req, res) => {
    try {
      const result = await sendTelegramAlert("🧪 Test Alert", "This is a test notification from your monitoring system.");
      res.json({ success: true, message: "Test alert sent successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to send test alert" });
    }
  });

  return httpServer;
}