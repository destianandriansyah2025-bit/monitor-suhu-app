import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  status?: "normal" | "warning" | "critical";
  icon: LucideIcon;
  trend?: string;
  loading?: boolean;
}

export function MetricCard({ 
  title, 
  value, 
  unit, 
  status = "normal", 
  icon: Icon,
  trend,
  loading = false
}: MetricCardProps) {
  
  const statusColors = {
    normal: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    warning: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    critical: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  };

  const bgGradient = {
    normal: "from-emerald-500/5 to-transparent",
    warning: "from-amber-500/5 to-transparent",
    critical: "from-rose-500/5 to-transparent",
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border p-4 sm:p-6 transition-all duration-300 hover:shadow-lg glass-card group",
      `bg-gradient-to-br ${bgGradient[status]}`
    )}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">{title}</p>
          {loading ? (
            <div className="h-8 sm:h-9 w-20 sm:w-24 bg-muted animate-pulse rounded-md" />
          ) : (
            <h3 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-foreground">
              {value}
              {unit && <span className="text-base sm:text-lg text-muted-foreground ml-1 font-normal">{unit}</span>}
            </h3>
          )}
        </div>
        <div className={cn("p-2 sm:p-3 rounded-xl transition-colors", statusColors[status])}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>
      </div>
      
      {trend && !loading && (
        <div className="mt-3 sm:mt-4 flex items-center gap-2 text-xs sm:text-sm">
          <span className={cn("font-medium", statusColors[status].split(" ")[0])}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
          <span className="text-muted-foreground text-xs">• {trend}</span>
        </div>
      )}
      
      {/* Decorative background element */}
      <Icon className="absolute -right-6 -bottom-6 w-24 h-24 sm:w-32 sm:h-32 text-foreground/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -rotate-12 pointer-events-none" />
    </div>
  );
}
