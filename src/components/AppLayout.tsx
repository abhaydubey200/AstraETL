import { useState } from "react";
import AppSidebar from "./AppSidebar";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronDown, Globe } from "lucide-react";

export const WorkspaceSwitcher = () => (
  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-all bg-card/30 mr-4">
    <div className="w-5 h-5 rounded bg-primary/20 flex items-center justify-center">
       <Globe className="w-3 h-3 text-primary" />
    </div>
    <div className="text-left">
       <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1">Tenant</p>
       <p className="text-[11px] font-bold text-foreground flex items-center gap-1 leading-none">
          AstraFlow Global
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
       </p>
    </div>
  </button>
);

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={isMobile ? `fixed inset-y-0 left-0 z-50 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}` : undefined}>
        <AppSidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col overflow-auto">
        <header className="flex items-center justify-between px-4 md:px-6 h-14 border-b border-border bg-card/50 sticky top-0 z-30 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            {isMobile && (
              <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                <Menu className="w-5 h-5" />
              </button>
            )}
            {!isMobile && <WorkspaceSwitcher />}
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>
        <main className="flex-1 animate-fade-in">{children}</main>
      </div>
    </div>
  );
};

export default AppLayout;
