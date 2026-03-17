import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Award,
  Layers,
  TrendingUp,
  UserCog,
  List,
  FileText,
  HelpCircle,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { PermissionGate } from '@/components/PermissionGate';
import { Separator } from '@/components/ui/separator';

// ─── Navigation configuration ───────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string | null;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: null,
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'KANDIDATEN',
    items: [
      { label: 'Aanmeldingen', href: '/kandidaten/aanmeldingen', icon: ClipboardList },
      { label: 'Overzicht', href: '/kandidaten/overzicht', icon: Users },
    ],
  },
  {
    title: 'TRAININGEN',
    items: [
      { label: 'Certificaten', href: '/trainingen/programmas', icon: Award },
      { label: 'Groepen', href: '/trainingen/groepen', icon: Layers },
    ],
  },
  {
    title: 'VOORTGANG',
    items: [
      { label: 'Voortgang & Resultaten', href: '/voortgang', icon: TrendingUp },
    ],
  },
  {
    title: 'HULP',
    items: [
      { label: 'Help Center', href: '/help', icon: HelpCircle },
    ],
  },
];

const ADMIN_SECTION: NavSection = {
  title: 'BEHEER',
  items: [
    { label: 'Gebruikers', href: '/beheer/gebruikers', icon: UserCog },
    { label: 'Opties', href: '/beheer/opties', icon: List },
    { label: 'Audit Log', href: '/beheer/audit', icon: FileText },
  ],
};

// ─── Component ──────────────────────────────────────────────────────────────

export function AppSidebar() {
  const location = useLocation();

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/';
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <Sidebar>
      {/* ── Logo / title ─────────────────────────────────────────────── */}
      <SidebarHeader className="p-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img
            src="/citysolid-logo.png"
            alt="City Solid"
            className="h-10 w-auto"
          />
        </Link>
      </SidebarHeader>
      <Separator />

      {/* ── Navigation sections ──────────────────────────────────────── */}
      <SidebarContent>
        {NAV_SECTIONS.map((group, gi) => (
          <SidebarGroup key={gi}>
            {group.title && (
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            )}
            <SidebarMenu>
              {group.items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                  >
                    <Link to={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}

        {/* Admin-only section */}
        <PermissionGate roles={['admin']}>
          <SidebarGroup>
            <SidebarGroupLabel>{ADMIN_SECTION.title}</SidebarGroupLabel>
            <SidebarMenu>
              {ADMIN_SECTION.items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                  >
                    <Link to={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </PermissionGate>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
