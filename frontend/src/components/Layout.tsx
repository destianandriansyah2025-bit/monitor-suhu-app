import { Sidebar } from "./Sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import logoImg from "@assets/image_1768001340836.png";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Activity, 
  Database, 
  Settings 
} from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Activity, label: "Monitoring", href: "/monitoring" },
    { icon: Database, label: "Log Data", href: "/logs" },
    { icon: Settings, label: "Pengaturan", href: "/settings" },
  ];

  return (
    <div className="min-h-screen bg-background font-sans">
      <Sidebar />
      
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
        <div className="flex items-center gap-2">
           <img src={logoImg} alt="Logo" className="w-7 h-7 sm:w-8 sm:h-8 object-contain" />
           <span className="font-display font-bold text-base sm:text-lg">Smart Monitoring</span>
        </div>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="p-6 border-b">
              <div className="flex items-center gap-3">
                 <img src={logoImg} alt="Logo" className="w-8 h-8 object-contain" />
                 <span className="font-display font-bold text-lg">Smart Monitoring</span>
              </div>
            </div>
            <nav className="p-4 space-y-2">
              {menuItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href} onClick={() => setIsOpen(false)}>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer",
                        isActive 
                          ? "bg-primary text-primary-foreground font-medium" 
                          : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      <main className="md:ml-64 p-4 md:p-8 max-w-[1600px] mx-auto transition-all duration-300 ease-in-out">
        {children}
      </main>
    </div>
  );
}
