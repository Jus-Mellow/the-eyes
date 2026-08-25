import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { Activity, Eye, LayoutDashboard, Link2, LogOut, PanelLeft, ShieldCheck } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/app" },
  { icon: Link2, label: "Connection", path: "/app/connection" },
  { icon: Activity, label: "Activity", path: "/app/activity" },
  { icon: ShieldCheck, label: "Privacy", path: "/app/privacy" },
];

const SIDEBAR_WIDTH_KEY = "eye-sidebar-width";
const DEFAULT_WIDTH = 246;
const MIN_WIDTH = 210;
const MAX_WIDTH = 380;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090714] px-6 text-white">
        <div className="glass-panel w-full max-w-md rounded-3xl p-8 text-center">
          <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl border border-violet-300/20 bg-violet-400/10 text-violet-200">
            <Eye className="h-7 w-7" />
          </div>
          <p className="eyebrow mb-3">THE EYE / ACCESS REQUIRED</p>
          <h1 className="font-[Space_Grotesk] text-3xl font-semibold tracking-tight">Enter your private room.</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">Your dashboard is only available to your authenticated account. Location controls stay off until you explicitly turn them on.</p>
          <Button onClick={() => startLogin()} className="glow-button mt-7 h-12 w-full rounded-xl bg-violet-500 text-white hover:bg-violet-400">Sign in to continue</Button>
        </div>
      </div>
    );
  }

  return <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}><DashboardLayoutContent setSidebarWidth={setSidebarWidth}>{children}</DashboardLayoutContent></SidebarProvider>;
}

type DashboardLayoutContentProps = { children: React.ReactNode; setSidebarWidth: (width: number) => void };

function DashboardLayoutContent({ children, setSidebarWidth }: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location) ?? menuItems[0];
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = event.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-white/10 bg-[#0b0919]" disableTransition={isResizing}>
          <SidebarHeader className="h-20 justify-center border-b border-white/8">
            <div className="flex items-center gap-3 px-2 w-full">
              <button onClick={toggleSidebar} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-400 transition hover:border-violet-300/30 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/60" aria-label="Toggle navigation"><PanelLeft className="h-4 w-4" /></button>
              {!isCollapsed && <div className="min-w-0"><p className="font-[Space_Grotesk] text-sm font-bold tracking-[0.18em] text-white">THE EYE</p><p className="font-[JetBrains_Mono] text-[9px] uppercase tracking-[0.22em] text-violet-300/70">private relay</p></div>}
            </div>
          </SidebarHeader>
          <SidebarContent className="gap-0 px-2 py-5">
            <p className="eyebrow mb-3 px-3 text-[9px] group-data-[collapsible=icon]:hidden">Your room</p>
            <SidebarMenu>
              {menuItems.map(item => {
                const isActive = location === item.path;
                return <SidebarMenuItem key={item.path}><SidebarMenuButton isActive={isActive} onClick={() => setLocation(item.path)} tooltip={item.label} className={`h-11 rounded-xl font-[Manrope] text-sm transition ${isActive ? "bg-violet-400/14 text-white shadow-[inset_0_0_0_1px_rgba(202,145,255,.16)]" : "text-slate-500 hover:bg-white/[0.04] hover:text-slate-200"}`}><item.icon className={`h-[17px] w-[17px] ${isActive ? "text-violet-200" : ""}`} /><span>{item.label}</span></SidebarMenuButton></SidebarMenuItem>;
              })}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="border-t border-white/8 p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><button className="flex w-full items-center gap-3 rounded-xl px-1 py-1 text-left transition hover:bg-white/[0.05] focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/60 group-data-[collapsible=icon]:justify-center"><Avatar className="h-9 w-9 shrink-0 border border-violet-300/20 bg-violet-300/10"><AvatarFallback className="bg-transparent text-xs font-semibold text-violet-100">{user?.name?.charAt(0).toUpperCase() ?? "E"}</AvatarFallback></Avatar><div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-medium text-white">{user?.name || "The watcher"}</p><p className="mt-1 truncate font-[JetBrains_Mono] text-[10px] text-slate-600">{user?.email || "authenticated"}</p></div></button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 border-white/10 bg-[#151126] text-white"><DropdownMenuItem onClick={logout} className="cursor-pointer text-rose-300 focus:bg-rose-300/10 focus:text-rose-200"><LogOut className="mr-2 h-4 w-4" /><span>Sign out</span></DropdownMenuItem></DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div className={`absolute right-0 top-0 h-full w-1 cursor-col-resize transition-colors hover:bg-violet-300/20 ${isCollapsed ? "hidden" : ""}`} onMouseDown={() => !isCollapsed && setIsResizing(true)} style={{ zIndex: 50 }} />
      </div>
      <SidebarInset className="bg-transparent">
        {isMobile && <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/8 bg-[#0b0919]/90 px-3 backdrop-blur-xl"><div className="flex items-center gap-2"><SidebarTrigger className="h-9 w-9 rounded-lg border border-white/10 bg-white/[0.03]" /><span className="font-[Space_Grotesk] text-sm font-semibold tracking-[0.12em] text-white">{activeMenuItem.label.toUpperCase()}</span></div><div className="flex items-center gap-2"><span className="status-dot" /><span className="font-[JetBrains_Mono] text-[9px] tracking-[0.12em] text-emerald-200/80">PRIVATE</span></div></div>}
        <main className="min-h-screen flex-1">{children}</main>
      </SidebarInset>
    </>
  );
}
