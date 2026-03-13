import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, GitBranch, Database, Activity, 
  Settings, Layers, Shield, ChevronLeft, ChevronRight, 
  ScrollText, LogOut, Bell, BookOpen, DollarSign,
  Monitor, Cpu, Zap, Search
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/AuthProvider";

const sections = [
  {
    title: "Data Engine",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
      { icon: GitBranch, label: "Pipelines", path: "/pipelines" },
      { icon: Database, label: "Connections", path: "/connections" },
      { icon: Layers, label: "Data Catalog", path: "/catalog" },
    ]
  },
  {
    title: "Operations Hub",
    items: [
      { icon: Activity, label: "Monitoring", path: "/monitoring" },
      { icon: ScrollText, label: "Execution Logs", path: "/logs" },
      { icon: DollarSign, label: "Costs", path: "/costs" },
      { icon: Shield, label: "Audit Logs", path: "/audit" },
      { icon: Zap, label: "Marketplace", path: "/marketplace" },
      { icon: Bell, label: "Alerting", path: "/alerts" },
    ]
  },
  {
    title: "Platform",
    items: [
      { icon: Shield, label: "Governance", path: "/governance" },
      { icon: BookOpen, label: "User Guide", path: "/docs" },
      { icon: Settings, label: "Settings", path: "/settings" },
    ]
  }
];

const AppSidebar = ({ onClose }: { onClose?: () => void }) => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <aside className={cn("flex flex-col border-r border-border bg-sidebar transition-all duration-300 h-screen sticky top-0", collapsed ? "w-16" : "w-60")}>
      <div className="flex items-center gap-2 px-4 h-14 border-b border-border">
        <div className="w-8 h-8 rounded-md bg-primary/20 flex items-center justify-center glow-primary">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        {!collapsed && <span className="font-display font-bold text-foreground tracking-tight">AstraFlow</span>}
      </div>
      
      <div className="flex-1 py-6 px-3 space-y-8 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title} className="space-y-2">
            {!collapsed && (
              <h4 className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">
                {section.title}
              </h4>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link 
                    key={item.path} 
                    to={item.path} 
                    onClick={onClose} 
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all group", 
                      isActive 
                        ? "bg-primary/10 text-primary font-bold" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className={cn("w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110", isActive ? "text-primary" : "text-muted-foreground")} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User + Sign Out */}
      <div className="px-3 py-4 border-t border-border space-y-3 bg-muted/20">
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-3">
             <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/20">
               {user.email?.[0].toUpperCase()}
             </div>
             <div className="min-w-0">
               <p className="text-xs font-bold text-foreground truncate">Admin User</p>
               <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
             </div>
          </div>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors w-full group"
        >
          <LogOut className="w-4 h-4 flex-shrink-0 group-hover:-translate-x-1 transition-transform" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>

      <button onClick={() => setCollapsed(!collapsed)} className="flex items-center justify-center h-10 border-t border-border text-muted-foreground hover:text-foreground transition-colors group">
        {collapsed ? <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" /> : <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />}
      </button>
    </aside>
  );
};

export default AppSidebar;
