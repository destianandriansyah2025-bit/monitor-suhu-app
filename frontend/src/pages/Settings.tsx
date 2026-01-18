import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

// Get API base URL
const API_BASE = import.meta.env.VITE_API_URL || '';

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [simulationActive, setSimulationActive] = useState(false);
  const [scheduleExpanded, setScheduleExpanded] = useState(false);
  
  // Config state with localStorage persistence
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('monitor-config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved config:', e);
      }
    }
    return {
      intervalSec: 5,
      tempMin: 18,
      tempMax: 27,
      humMin: 40,
      humMax: 70,
      deviceEnabled: true,
      telegramEnabled: false,
      notificationSchedule: {
        enabled: true,
        scheduleType: 'fixed',
        fixedTimes: ['08:00', '13:00', '18:00'],
        intervalHours: 4,
        maxPerDay: 3,
        emergencyEnabled: true,
        quietHours: {
          start: '22:00',
          end: '06:00'
        }
      }
    };
  });

  // Save config to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('monitor-config', JSON.stringify(config));
  }, [config]);

  // Send config mutation (ESP8266 only)
  const sendConfig = useMutation({
    mutationFn: async (configData: any) => {
      const res = await fetch(`${API_BASE}/api/devices/ESP-SERVER-01/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configData)
      });
      if (!res.ok) throw new Error('Failed to send config');
      return res.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Configuration Sent", 
        description: "ESP8266 will update in ~60 seconds" 
      });
    },
    onError: () => {
      toast({ 
        title: "Error", 
        description: "Failed to send configuration", 
        variant: "destructive" 
      });
    }
  });

  // Save notification schedule mutation (separate)
  const saveNotificationSchedule = useMutation({
    mutationFn: async (scheduleData: any) => {
      const res = await fetch(`${API_BASE}/api/notification-schedule/ESP-SERVER-01`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleData)
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to save schedule');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Schedule Saved", 
        description: "Notification schedule updated successfully" 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save notification schedule", 
        variant: "destructive" 
      });
    }
  });



  const handleSendConfig = () => {
    sendConfig.mutate(config);
  };

  const handleReset = () => {
    setConfig({
      intervalSec: 5,
      tempMin: 18,
      tempMax: 27,
      humMin: 40,
      humMax: 70,
      deviceEnabled: true,
      telegramEnabled: false
    });
    toast({ title: "Configuration Reset" });
  };

  // Simulation logic
  const simulateMutation = useMutation({
    mutationFn: async () => {
      const temp = 25 + Math.random() * 10;
      const hum = 40 + Math.random() * 40;
      
      const res = await fetch(api.readings.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temperature: temp,
          humidity: hum,
          sensorId: "SIMULATOR-01"
        })
      });
      if(!res.ok) throw new Error("Sim failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.readings.current.path] });
      queryClient.invalidateQueries({ queryKey: [api.readings.list.path] });
    }
  });

  const toggleSimulation = () => {
    if (simulationActive) {
      setSimulationActive(false);
      toast({ title: "Simulation Stopped" });
    } else {
      setSimulationActive(true);
      toast({ title: "Simulation Started", description: "Generating data every 3 seconds..." });
      
      const interval = setInterval(() => {
        simulateMutation.mutate();
      }, 3000);
      
      setTimeout(() => {
        clearInterval(interval);
        setSimulationActive(false);
        toast({ title: "Simulation Finished", description: "Auto-stopped after 30s." });
      }, 30000);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Settings</h1>
        <p className="text-sm sm:text-base text-muted-foreground">System configuration and preferences.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Manage how you receive alerts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Telegram Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive alerts via Telegram bot.</p>
              </div>
              <Switch 
                checked={config.telegramEnabled}
                onCheckedChange={(checked) => setConfig(prev => ({...prev, telegramEnabled: checked}))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Alerts</Label>
                <p className="text-sm text-muted-foreground">Receive emails for critical temperature events.</p>
              </div>
              <Switch disabled />
            </div>
            
            <div className="space-y-4 pt-4 border-t">
              <div 
                className="flex items-center justify-between cursor-pointer hover:opacity-80"
                onClick={() => setScheduleExpanded(!scheduleExpanded)}
              >
                <h4 className="font-medium">Notification Schedule</h4>
                {scheduleExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </div>
              
              {scheduleExpanded && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Scheduled Notifications</Label>
                      <p className="text-sm text-muted-foreground">Send status reports at scheduled times.</p>
                    </div>
                    <Switch 
                      checked={config.notificationSchedule?.enabled || false}
                      onCheckedChange={(checked) => setConfig(prev => ({
                        ...prev, 
                        notificationSchedule: {
                          ...prev.notificationSchedule,
                          enabled: checked
                        }
                      }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <select 
                      className="w-full p-2 border rounded-md"
                      value={config.notificationSchedule?.fixedTimes?.length || 3}
                      onChange={(e) => {
                        const count = parseInt(e.target.value);
                        const defaultTimes = ['08:00', '12:00', '16:00', '20:00', '00:00'];
                        const newTimes = defaultTimes.slice(0, count);
                        setConfig(prev => ({
                          ...prev,
                          notificationSchedule: {
                            ...prev.notificationSchedule,
                            scheduleType: 'fixed',
                            fixedTimes: newTimes
                          }
                        }));
                      }}
                    >
                      <option value="1">1x daily</option>
                      <option value="2">2x daily</option>
                      <option value="3">3x daily</option>
                      <option value="4">4x daily</option>
                      <option value="5">5x daily</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm">Schedule Times</Label>
                    <div className="space-y-2">
                      {(config.notificationSchedule?.fixedTimes || ['08:00', '12:00', '16:00']).map((time, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Label className="text-xs sm:text-sm min-w-[50px] sm:min-w-[60px]">Time {index + 1}:</Label>
                          <Input 
                            type="time" 
                            value={time}
                            onChange={(e) => {
                              const newTimes = [...(config.notificationSchedule?.fixedTimes || [])];
                              newTimes[index] = e.target.value;
                              setConfig(prev => ({
                                ...prev,
                                notificationSchedule: {
                                  ...prev.notificationSchedule,
                                  fixedTimes: newTimes
                                }
                              }));
                            }}
                            className="text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      checked={config.notificationSchedule?.emergencyEnabled || false}
                      onCheckedChange={(checked) => setConfig(prev => ({
                        ...prev,
                        notificationSchedule: {
                          ...prev.notificationSchedule,
                          emergencyEnabled: checked
                        }
                      }))}
                    />
                    <Label className="text-sm">Emergency Alerts</Label>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => saveNotificationSchedule.mutate(config.notificationSchedule)}
                      disabled={saveNotificationSchedule.isPending}
                      className="w-full sm:w-auto"
                    >
                      {saveNotificationSchedule.isPending ? 'Saving...' : 'Save Schedule'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ESP8266 Configuration</CardTitle>
            <CardDescription>Remote configuration for ESP8266 devices.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Device ID</Label>
                <Input value="ESP-SERVER-01" disabled className="text-sm" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Sampling Interval (seconds)</Label>
                <Input 
                  type="number" 
                  value={config.intervalSec} 
                  min="2" 
                  max="300"
                  onChange={(e) => setConfig(prev => ({...prev, intervalSec: parseInt(e.target.value)}))}
                  className="text-sm"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-sm md:text-base">Temperature Thresholds</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Min Temperature (°C)</Label>
                  <Input 
                    type="number" 
                    value={config.tempMin} 
                    step="0.1"
                    onChange={(e) => setConfig(prev => ({...prev, tempMin: parseFloat(e.target.value)}))}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Max Temperature (°C)</Label>
                  <Input 
                    type="number" 
                    value={config.tempMax} 
                    step="0.1"
                    onChange={(e) => setConfig(prev => ({...prev, tempMax: parseFloat(e.target.value)}))}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-sm md:text-base">Humidity Thresholds</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Min Humidity (%)</Label>
                  <Input 
                    type="number" 
                    value={config.humMin} 
                    step="0.1"
                    onChange={(e) => setConfig(prev => ({...prev, humMin: parseFloat(e.target.value)}))}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Max Humidity (%)</Label>
                  <Input 
                    type="number" 
                    value={config.humMax} 
                    step="0.1"
                    onChange={(e) => setConfig(prev => ({...prev, humMax: parseFloat(e.target.value)}))}
                    className="text-sm"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Device Enabled</Label>
                <p className="text-sm text-muted-foreground">Enable/disable sensor readings.</p>
              </div>
              <Switch 
                checked={config.deviceEnabled}
                onCheckedChange={(checked) => setConfig(prev => ({...prev, deviceEnabled: checked}))}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button variant="outline" onClick={handleReset} className="w-full sm:w-auto">
                Reset to Default
              </Button>
              <Button 
                onClick={handleSendConfig}
                disabled={sendConfig.isPending}
                className="w-full sm:w-auto"
              >
                {sendConfig.isPending ? 'Sending...' : 'Send to Device'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/10">
          <CardHeader>
            <CardTitle className="text-orange-700 dark:text-orange-400">Developer Tools</CardTitle>
            <CardDescription>Tools for testing and debugging.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <Label className="text-sm md:text-base">Data Simulation</Label>
                <p className="text-xs sm:text-sm text-muted-foreground">Generate random reading data for 30 seconds.</p>
              </div>
              <Button 
                variant={simulationActive ? "destructive" : "default"}
                onClick={toggleSimulation}
                className="w-full sm:w-auto"
              >
                {simulationActive ? "Stop Simulation" : "Start Simulation"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}