import { Link } from 'react-router-dom';
import { UserCog, List, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const ADMIN_CARDS = [
  { title: 'Gebruikers', desc: 'Beheer gebruikers en rollen', href: '/beheer/gebruikers', icon: UserCog },
  { title: 'Opties', desc: 'Beheer dropdown-waarden (wijken, gebieden, etc.)', href: '/beheer/opties', icon: List },
  { title: 'Audit Log', desc: 'Bekijk alle wijzigingen in het systeem', href: '/beheer/audit', icon: FileText },
];

export default function Beheer() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Beheer</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {ADMIN_CARDS.map((card) => (
          <Link key={card.href} to={card.href}>
            <Card className="transition-colors hover:border-primary/50">
              <CardHeader>
                <card.icon className="h-8 w-8 text-primary mb-2" />
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>{card.desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
