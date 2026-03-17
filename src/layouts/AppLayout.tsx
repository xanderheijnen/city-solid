import { Fragment } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';

import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/hooks/useAuth';

// ─── Breadcrumb mapping ─────────────────────────────────────────────────────

const BREADCRUMB_MAP: Record<string, string> = {
  dashboard: 'Dashboard',
  kandidaten: 'Kandidaten',
  aanmeldingen: 'Aanmeldingen',
  overzicht: 'Overzicht',
  nieuw: 'Nieuwe Aanmelding',
  intake: 'Intake Uitvoeren',
  trainingen: 'Trainingen',
  programmas: 'Certificaten',
  groepen: 'Groepen',
  voortgang: 'Voortgang & Resultaten',
  beheer: 'Beheer',
  gebruikers: 'Gebruikers',
  opties: 'Opties',
  audit: 'Audit Log',
};

function buildBreadcrumbs(pathname: string) {
  const parts = pathname.split('/').filter(Boolean);
  return parts.map((part, idx) => ({
    label: BREADCRUMB_MAP[part] ?? decodeURIComponent(part),
    href: '/' + parts.slice(0, idx + 1).join('/'),
    isLast: idx === parts.length - 1,
  }));
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AppLayout() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const breadcrumbs = buildBreadcrumbs(location.pathname);

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'CS';

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />

          {/* Breadcrumbs */}
          <Breadcrumb className="flex-1">
            <BreadcrumbList>
              {breadcrumbs.map((crumb, idx) => (
                <Fragment key={crumb.href}>
                  {idx > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {crumb.isLast ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={crumb.href}>
                        {crumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                {user?.email ?? 'Niet ingelogd'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => logout()}>
                <LogOut className="mr-2 h-4 w-4" />
                Uitloggen
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* ── Main content ───────────────────────────────────────────── */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
