import { useCurrentReading, useReadings } from "@/hooks/use-readings";
import { MetricCard } from "@/components/MetricCard";
import { Thermometer, Droplets, Activity, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { useState, useEffect } from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// Get API base URL
const API_BASE = import.meta.env.VITE_API_URL || '';

export default function Dashboard() {
  const { data: current, isLoading: isCurrentLoading } = useCurrentReading();
  const { data: history, isLoading: isHistoryLoading } = useReadings('day', 24);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [deviceStatus, setDeviceStatus] = useState<any>(null);
  const [deviceConfig, setDeviceConfig] = useState<any>(null);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check device status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/device-status/ESP-SERVER-01`);
        const status = await res.json();
        setDeviceStatus(status);
      } catch (error) {
        console.error('Failed to get device status:', error);
      }
    };
    
    checkStatus();
    const statusTimer = setInterval(checkStatus, 30000); // Check every 30s
    return () => clearInterval(statusTimer);
  }, []);

  // Get device config for dynamic thresholds
  useEffect(() => {
    const getConfig = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/device-config/ESP-SERVER-01`);
        const config = await res.json();
        setDeviceConfig(config);
      } catch (error) {
        console.error('Failed to get device config:', error);
      }
    };
    
    getConfig();
  }, []);

  // Derive status using dynamic thresholds from Firebase
  const tempStatus = !current || !deviceConfig ? 'normal' : 
    current.temperature < deviceConfig.temp_min || current.temperature > deviceConfig.temp_max ? 'critical' : 'normal';
  const humidityStatus = !current || !deviceConfig ? 'normal' : 
    (current.humidity < deviceConfig.hum_min || current.humidity > deviceConfig.hum_max) ? 'warning' : 'normal';
  
  // Format history for charts
  const chartData = history?.map(reading => ({
    time: format(new Date(reading.timestamp), "HH:mm"),
    temperature: reading.temperature,
    humidity: reading.humidity,
  })) || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Dashboard Overview</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Real-time sensor data and system status.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Temperature"
          value={current?.temperature?.toFixed(1) || "--"}
          unit="°C"
          status={tempStatus}
          icon={Thermometer}
          loading={isCurrentLoading}
          trend={tempStatus === 'normal' ? 'Optimal Range' : 'Attention Needed'}
        />
        <MetricCard
          title="Humidity"
          value={current?.humidity?.toFixed(1) || "--"}
          unit="%"
          status={humidityStatus}
          icon={Droplets}
          loading={isCurrentLoading}
          trend="Relative Humidity"
        />
        <MetricCard
          title="System Status"
          value={deviceStatus?.isOnline === true ? "Active" : "Offline"}
          status={deviceStatus?.isOnline === true ? "normal" : "critical"}
          icon={Activity}
          loading={isCurrentLoading}
          trend={current ? `Last update: ${format(new Date(current.timestamp), 'HH:mm:ss')}` : 'No data'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-orange-500" />
                  Temperature History
                </CardTitle>
                <CardDescription>24 Hour Trend</CardDescription>
              </div>
              <div className="bg-orange-500/10 p-2 rounded-lg">
                <TrendingUp className="w-4 h-4 text-orange-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] sm:h-[300px] w-full">
              {isHistoryLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="time" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      unit="°C"
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="temperature" 
                      stroke="#f97316" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorTemp)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-blue-500" />
                  Humidity History
                </CardTitle>
                <CardDescription>24 Hour Trend</CardDescription>
              </div>
              <div className="bg-blue-500/10 p-2 rounded-lg">
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] sm:h-[300px] w-full">
              {isHistoryLoading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="time" 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      unit="%"
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="humidity" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorHum)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}