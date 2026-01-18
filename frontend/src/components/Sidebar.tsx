import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Activity, 
  Database, 
  Settings,
  ThermometerSun
} from "lucide-react";
import logoImg from "@assets/image_1768001340836.png";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Activity, label: "Monitoring", href: "/monitoring" },
  { icon: Database, label: "Log Data", href: "/logs" },
  { icon: Settings, label: "Pengaturan", href: "/settings" },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen border-r bg-card/50 backdrop-blur-xl fixed left-0 top-0 z-30">
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 relative rounded-lg overflow-hidden bg-white shadow-sm border border-border/50 flex items-center justify-center p-1">
             <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg leading-tight text-primary">Smart<br/>Monitoring</h1>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 font-medium translate-x-1" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground hover:translate-x-1"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary")} />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border/50">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <ThermometerSun className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary">System Status</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-muted-foreground">Online</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
