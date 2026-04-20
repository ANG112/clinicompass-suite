import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { CenterSelector } from "./CenterSelector";
import doobotLogo from "@/assets/doobot-logo.png";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b bg-card/50 backdrop-blur-sm px-4 gap-3 sticky top-0 z-30">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="h-5 w-px bg-border" />
            <CenterSelector />
            <div className="flex-1" />
          </header>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
          <footer className="py-3 flex items-center justify-center gap-2 border-t bg-card/30">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Powered by</span>
            <img src={doobotLogo} alt="doobot.ai" className="h-7 w-auto object-contain" />
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}
