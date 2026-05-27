import { Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  Home,
  Layers,
  Dumbbell,
  Mic,
  AlertTriangle,
  BarChart3,
  Settings as SettingsIcon,
  MoreHorizontal,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const NAV = [
  { to: "/", label: "Обзор", icon: Home },
  { to: "/groups", label: "Группы", icon: Layers },
  { to: "/practice", label: "Тренировка", icon: Dumbbell },
  { to: "/shadowing", label: "Shadowing", icon: Mic },
  { to: "/weak", label: "Сложные", icon: AlertTriangle },
  { to: "/progress", label: "Прогресс", icon: BarChart3 },
  { to: "/settings", label: "Настройки", icon: SettingsIcon },
] as const;

const MOBILE_PRIMARY = NAV.slice(0, 4);
const MOBILE_MORE = NAV.slice(4);

export function AppLayout() {
  const loc = useLocation();
  const path = loc.pathname;
  const [moreOpen, setMoreOpen] = useState(false);
  const isActive = (to: string) =>
    to === "/" ? path === "/" : path === to || path.startsWith(to + "/");
  const moreActive = MOBILE_MORE.some((i) => isActive(i.to));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-background px-3 py-2 text-sm font-medium text-foreground shadow focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        К содержимому
      </a>

      {/* Top nav (desktop) — 80px */}
      <header className="sticky top-0 z-30 hidden border-b border-border bg-background/90 backdrop-blur md:block">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3 group">
            <Logo className="h-11 w-11 shrink-0 text-primary transition-transform duration-200 group-hover:scale-105" />
            <div className="leading-tight">
              <div className="text-base font-extrabold">онлайн-школа Актив</div>
              <div className="text-[11px] font-medium text-muted-foreground">Irregular Verbs</div>
            </div>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                aria-current={isActive(item.to) ? "page" : undefined}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-semibold transition-all duration-200",
                  isActive(item.to)
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur md:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-9 w-9 shrink-0 text-primary" />
            <span className="text-base font-extrabold">онлайн-школа Актив</span>
          </Link>
        </div>
      </header>

      <main
        id="main-content"
        className="mx-auto max-w-6xl px-4 pb-32 pt-6 md:px-6 md:pb-12 md:pt-10"
      >
        <Outlet />
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-0.5 px-1 py-1.5">
          {MOBILE_PRIMARY.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center rounded-md px-1 py-1.5 text-[11px] leading-tight transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("mb-0.5 h-5 w-5", active && "stroke-[2.5]")} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Ещё разделы"
                aria-expanded={moreOpen}
                aria-current={moreActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center justify-center rounded-md px-1 py-1.5 text-[11px] leading-tight transition-colors",
                  moreActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                <MoreHorizontal className={cn("mb-0.5 h-5 w-5", moreActive && "stroke-[2.5]")} />
                <span className="truncate">Ещё</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-xl pb-[env(safe-area-inset-bottom)]">
              <SheetHeader>
                <SheetTitle>Ещё</SheetTitle>
                <SheetDescription className="sr-only">
                  Дополнительные разделы приложения
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 grid gap-1">
                {MOBILE_MORE.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      aria-current={active ? "page" : undefined}
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-3 text-sm transition-colors",
                        active ? "bg-secondary text-secondary-foreground" : "hover:bg-secondary/60",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}
