import { Link, useRouterState } from "@tanstack/react-router";
import { FilePlus2, LayoutDashboard, LogOut, Menu, Users, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useAuth, useSignOut } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, admin: false },
  { to: "/fichas/nova", label: "Nova Ficha", icon: FilePlus2, admin: false },
  { to: "/admin/usuarios", label: "Usuários", icon: Users, admin: true },
] as const;

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { isAdmin, displayName, role } = useAuth();
  const signOut = useSignOut();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = nav.filter((n) => !n.admin || isAdmin);

  const NavLinks = () => (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const UserBlock = () => (
    <div className="mt-auto border-t border-sidebar-border pt-4">
      <div className="flex min-w-0 items-center gap-3 px-1">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
          {displayName.slice(0, 1).toUpperCase() || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">{displayName}</p>
          <p className="text-xs text-sidebar-foreground/60">{role === "admin" ? "Administrador" : "Corretor"}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={signOut}
          title="Sair"
          className="shrink-0 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:gap-6 lg:border-r lg:border-sidebar-border lg:bg-sidebar lg:p-5 lg:sticky lg:top-0 lg:h-screen">
        <div className="rounded-lg bg-card px-4 py-3 shadow-sm">
          <Logo className="h-9" />
        </div>
        <NavLinks />
        <UserBlock />
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
        <Logo className="h-8" />
        <Button variant="ghost" size="icon" onClick={() => setOpen((o) => !o)} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>
      {open && (
        <div className="fixed inset-0 top-[57px] z-20 flex flex-col gap-6 bg-sidebar p-5 lg:hidden">
          <NavLinks />
          <UserBlock />
        </div>
      )}

      <div className="flex min-w-0 flex-col">
        <div className="border-b border-border bg-card">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-5 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-foreground sm:text-2xl">{title}</h1>
              {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
          </div>
        </div>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
