import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import type { CsRole } from '@/lib/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GebruikerRow {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  telefoon: string | null;
  functie: string | null;
  created_at: string;
  roles: { id: string; role: CsRole }[];
  email?: string;
}

const ROLE_LABELS: Record<CsRole, string> = {
  admin: 'Admin',
  intaker: 'Intaker',
  trainer: 'Trainer',
  manager: 'Manager',
  readonly: 'Alleen lezen',
};

const ROLE_COLORS: Record<CsRole, string> = {
  admin: 'bg-red-100 text-red-700',
  intaker: 'bg-blue-100 text-blue-700',
  trainer: 'bg-green-100 text-green-700',
  manager: 'bg-purple-100 text-purple-700',
  readonly: 'bg-gray-100 text-gray-700',
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

function useGebruikers() {
  return useQuery({
    queryKey: ['gebruikers'],
    queryFn: async () => {
      // Fetch profiles
      const { data: profiles, error: pErr } = await supabase
        .from('cs_profiles')
        .select('*')
        .order('display_name');
      if (pErr) throw pErr;

      // Fetch all roles
      const { data: roles, error: rErr } = await supabase
        .from('cs_user_roles')
        .select('*');
      if (rErr) throw rErr;

      // Merge
      const result: GebruikerRow[] = (profiles ?? []).map((p: any) => ({
        ...p,
        roles: (roles ?? []).filter((r: any) => r.user_id === p.user_id),
      }));

      return result;
    },
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Gebruikers() {
  const queryClient = useQueryClient();
  const { data: gebruikers, isLoading } = useGebruikers();

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<GebruikerRow | null>(null);
  const [newRole, setNewRole] = useState<CsRole>('intaker');

  // New user form
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    display_name: '',
    functie: '',
    role: 'intaker' as CsRole,
  });

  // ── Create user ──
  const createUser = useMutation({
    mutationFn: async (data: typeof newUser) => {
      // 1. Sign up user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { full_name: data.display_name },
        },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Gebruiker kon niet worden aangemaakt');

      const userId = authData.user.id;

      // 2. Create profile
      const { error: profileError } = await supabase
        .from('cs_profiles')
        .insert({
          user_id: userId,
          display_name: data.display_name,
          functie: data.functie || null,
        });
      if (profileError) throw profileError;

      // 3. Assign role
      const { error: roleError } = await supabase
        .from('cs_user_roles')
        .insert({
          user_id: userId,
          role: data.role,
        });
      if (roleError) throw roleError;

      return userId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gebruikers'] });
      toast.success('Gebruiker aangemaakt');
      setAddDialogOpen(false);
      setNewUser({ email: '', password: '', display_name: '', functie: '', role: 'intaker' });
    },
    onError: (err) => {
      toast.error('Fout: ' + (err instanceof Error ? err.message : String(err)));
    },
  });

  // ── Add role ──
  const addRole = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: CsRole }) => {
      const { error } = await supabase
        .from('cs_user_roles')
        .insert({ user_id, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gebruikers'] });
      toast.success('Rol toegevoegd');
      setRoleDialogOpen(false);
    },
    onError: (err) => {
      toast.error('Fout: ' + (err instanceof Error ? err.message : String(err)));
    },
  });

  // ── Remove role ──
  const removeRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase
        .from('cs_user_roles')
        .delete()
        .eq('id', roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gebruikers'] });
      toast.success('Rol verwijderd');
    },
    onError: (err) => {
      toast.error('Fout: ' + (err instanceof Error ? err.message : String(err)));
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gebruikers</h1>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />Gebruiker Toevoegen
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !gebruikers?.length ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              Geen gebruikers gevonden
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Naam</TableHead>
                  <TableHead>Functie</TableHead>
                  <TableHead>Rol(len)</TableHead>
                  <TableHead>Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gebruikers.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{g.display_name}</p>
                        <p className="text-xs text-muted-foreground">{g.user_id.slice(0, 8)}...</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{g.functie ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {g.roles.map((r) => (
                          <Badge
                            key={r.id}
                            variant="secondary"
                            className={`${ROLE_COLORS[r.role]} cursor-pointer`}
                            onClick={() => {
                              if (confirm(`Rol "${ROLE_LABELS[r.role]}" verwijderen?`)) {
                                removeRole.mutate(r.id);
                              }
                            }}
                          >
                            {ROLE_LABELS[r.role]} &times;
                          </Badge>
                        ))}
                        {g.roles.length === 0 && (
                          <span className="text-xs text-muted-foreground">Geen rollen</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(g);
                          setNewRole('intaker');
                          setRoleDialogOpen(true);
                        }}
                      >
                        <Shield className="mr-1 h-4 w-4" />
                        Rol
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Add User Dialog ── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nieuwe Gebruiker</DialogTitle>
            <DialogDescription>
              Maak een nieuw account aan. De gebruiker ontvangt een bevestigingsmail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Naam *</Label>
              <Input
                value={newUser.display_name}
                onChange={(e) => setNewUser((u) => ({ ...u, display_name: e.target.value }))}
                placeholder="Volledige naam"
              />
            </div>
            <div className="space-y-2">
              <Label>E-mailadres *</Label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
                placeholder="naam@citysolid.nl"
              />
            </div>
            <div className="space-y-2">
              <Label>Wachtwoord *</Label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
                placeholder="Min. 6 tekens"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Functie</Label>
                <Input
                  value={newUser.functie}
                  onChange={(e) => setNewUser((u) => ({ ...u, functie: e.target.value }))}
                  placeholder="bijv. Intaker, Trainer"
                />
              </div>
              <div className="space-y-2">
                <Label>Rol *</Label>
                <Select
                  value={newUser.role}
                  onValueChange={(v) => setNewUser((u) => ({ ...u, role: v as CsRole }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_LABELS) as CsRole[]).map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              onClick={() => createUser.mutate(newUser)}
              disabled={!newUser.email || !newUser.password || !newUser.display_name || createUser.isPending}
            >
              {createUser.isPending ? 'Aanmaken...' : 'Aanmaken'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Role Dialog ── */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rol Toevoegen</DialogTitle>
            <DialogDescription>
              Voeg een rol toe aan {selectedUser?.display_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Huidige rollen</Label>
              <div className="flex flex-wrap gap-1">
                {selectedUser?.roles.map((r) => (
                  <Badge key={r.id} variant="secondary" className={ROLE_COLORS[r.role]}>
                    {ROLE_LABELS[r.role]}
                  </Badge>
                ))}
                {!selectedUser?.roles.length && (
                  <span className="text-sm text-muted-foreground">Geen rollen</span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nieuwe rol</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as CsRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ROLE_LABELS) as CsRole[])
                    .filter((r) => !selectedUser?.roles.some((ur) => ur.role === r))
                    .map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              onClick={() => {
                if (selectedUser) {
                  addRole.mutate({ user_id: selectedUser.user_id, role: newRole });
                }
              }}
              disabled={addRole.isPending}
            >
              {addRole.isPending ? 'Toevoegen...' : 'Rol Toevoegen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
