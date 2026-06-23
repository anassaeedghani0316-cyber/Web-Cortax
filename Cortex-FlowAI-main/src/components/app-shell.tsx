import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  BarChart3,
  Lightbulb,
  FileBarChart,
  Settings,
  LogOut,
  Sparkles,
} from "lucide-react";
import { type ReactNode } from "react";
import { Brand } from "./brand";
import { AuroraBackground } from "./aurora-background";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/chat", label: "AI Chat", icon: MessageSquare },
  { to: "/documents", label: "Documents", icon: FileText },
  { to: "/analysis", label: "Analysis", icon: BarChart3 },
  { to: "/recommendations", label: "Insights", icon: Lightbulb },
  { to: "/reports", label: "Reports", icon: FileBarChart },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

// Mobile bottom nav: 5 primary destinations
const mobileNav = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/documents", label: "Docs", icon: FileText },
  { to: "/analysis", label: "Stats", icon: BarChart3 },
  { to: "/settings", label: "More", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["me-profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
      return data ?? { id: u.user.id, name: u.user.email?.split("@")[0], email: u.user.email, avatar_url: null };
    },
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const isActive = (to: string) =>
    pathname === to || (to !== "/dashboard" && pathname.startsWith(to));

  return (
    <div className="grain relative min-h-screen">
      <AuroraBackground />

      <div className="relative z-10 flex">
        {/* Sidebar — hidden on mobile, icon-only on tablet, full on desktop */}
        <aside
          className="sticky top-0 z-20 hidden h-screen shrink-0 border-r border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl md:flex md:w-[76px] xl:w-[252px]"
          style={{ backdropFilter: "blur(24px) saturate(180%)" }}
        >
          <div className="flex h-full w-full flex-col px-3 py-5 xl:px-4">
            <div className="mb-6 flex items-center justify-center px-1 xl:justify-start xl:px-2">
              <div className="xl:hidden"><Brand size="sm" /></div>
              <div className="hidden xl:block"><Brand /></div>
            </div>

            <nav className="flex-1 space-y-1">
              {nav.map((item) => {
                const active = isActive(item.to);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    title={item.label}
                    className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 xl:justify-start justify-center ${
                      active
                        ? "bg-gradient-to-r from-violet/25 to-indigo/10 text-foreground xl:shadow-[inset_3px_0_0_0_var(--violet)]"
                        : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground hover:translate-x-0.5"
                    }`}
                  >
                    <Icon
                      size={18}
                      className={`shrink-0 transition ${active ? "text-violet drop-shadow-[0_0_8px_var(--violet)]" : "group-hover:text-violet"}`}
                    />
                    <span className="hidden xl:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Upgrade card — desktop only */}
            <div className="my-4 hidden overflow-hidden rounded-xl border border-violet/30 bg-gradient-to-br from-violet/20 via-indigo/15 to-transparent p-4 xl:block">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles size={16} className="text-violet" />
                <span className="text-xs font-semibold uppercase tracking-wider text-violet">Pro</span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Unlock deeper insights, unlimited documents and advanced AI analysis.
              </p>
              <button className="mt-3 w-full rounded-md gradient-violet px-3 py-1.5 text-xs font-semibold text-white btn-glow">
                Upgrade
              </button>
            </div>

            {/* User */}
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] p-2 xl:p-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full gradient-violet text-sm font-bold text-white">
                {(profile?.name ?? profile?.email ?? "U").slice(0, 1).toUpperCase()}
              </div>
              <div className="hidden min-w-0 flex-1 xl:block">
                <div className="truncate text-sm font-medium">{profile?.name ?? "—"}</div>
                <div className="truncate text-xs text-muted-foreground">{profile?.email ?? ""}</div>
              </div>
              <button
                onClick={signOut}
                className="hidden rounded-md p-1.5 text-muted-foreground transition hover:bg-white/[0.08] hover:text-rose xl:block"
                aria-label="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile top bar */}
        <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-white/[0.08] bg-background/60 px-4 backdrop-blur-2xl md:hidden">
          <Brand size="sm" />
          <button
            onClick={signOut}
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-2 text-muted-foreground transition hover:text-rose"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </header>

        {/* Main */}
        <main className="min-w-0 flex-1 pt-14 md:pt-0">
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10 animate-fade-up">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-5 border-t border-white/[0.08] bg-background/70 backdrop-blur-2xl md:hidden"
        style={{ backdropFilter: "blur(24px) saturate(180%)", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {mobileNav.map((item) => {
          const active = isActive(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex min-h-[44px] flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition ${
                active ? "text-violet" : "text-muted-foreground"
              }`}
            >
              <div className={`relative grid h-9 w-9 place-items-center rounded-xl transition ${active ? "bg-violet/20 shadow-[0_0_20px_var(--violet)]" : ""}`}>
                <Icon size={18} />
              </div>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
