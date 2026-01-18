import { useReadings } from "@/hooks/use-readings";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useState } from "react";
import { RefreshCw, Download } from "lucide-react";

export default function Monitoring() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const { data: readings, isLoading, refetch } = useReadings(period, 100);
  const isMobile = useIsMobile();

  const data = readings?.map(r => ({
    timestamp: new Date(r.timestamp).getTime(),
    formattedTime: format(new Date(r.timestamp), period === 'day' ? "HH:mm" : "dd/MM HH:mm"),
    temperature: r.temperature,
    humidity: r.humidity
  })).reverse() || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Detailed Monitoring</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Deep dive into sensor data trends.</p>
        </div>
        <div className="flex flex-wrap items-center gap-1 sm:gap-2 bg-card p-1 rounded-lg border shadow-sm self-end sm:self-auto">
          <Button
            variant={period === 'day' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setPeriod('day')}
            className="text-xs font-medium px-2 sm:px-3 flex-1 sm:flex-none"
          >
            <span className="hidden sm:inline">24 Hours</span>
            <span className="sm:hidden">24h</span>
          </Button>
          <Button
            variant={period === 'week' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setPeriod('week')}
            className="text-xs font-medium px-2 sm:px-3 flex-1 sm:flex-none"
          >
            <span className="hidden sm:inline">7 Days</span>
            <span className="sm:hidden">7d</span>
          </Button>
          <Button
            variant={period === 'month' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setPeriod('month')}
            className="text-xs font-medium px-2 sm:px-3 flex-1 sm:flex-none"
          >
            <span className="hidden sm:inline">30 Days</span>
            <span className="sm:hidden">30d</span>
          </Button>
        </div>
      </div>

      <Card className="h-[500px] sm:h-[600px] border-border/50 shadow-lg">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 sm:space-y-0 pb-4">
          <div>
            <CardTitle className="text-base sm:text-lg">Combined Metrics</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Temperature vs Humidity Correlation</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="h-[400px] sm:h-[500px] pt-4 pb-10">
          {isLoading ? (
            <div className="h-full w-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 110
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis
                  dataKey="formattedTime"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  yAxisId="left"
                  stroke="hsl(var(--muted-foreground))"
                  unit="°C"
                  tick={{ fontSize: 10 }}
                  width={35}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="hsl(var(--muted-foreground))"
                  unit="%"
                  tick={{ fontSize: 10 }}
                  width={35}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                />
                <Legend
                  wrapperStyle={{
                    fontSize: '12px',
                    paddingTop: '40px'
                  }}
                  iconSize={12}
                  verticalAlign="bottom"
                />
                {!isMobile && (
                  <Brush
                    dataKey="formattedTime"
                    height={25}
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--card))"
                  />
                )}
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="temperature"
                  stroke="#f97316"
                  dot={false}
                  activeDot={{ r: 4 }}
                  strokeWidth={2}
                  name="Temp (°C)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="humidity"
                  stroke="#3b82f6"
                  dot={false}
                  activeDot={{ r: 4 }}
                  strokeWidth={2}
                  name="Humidity (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
