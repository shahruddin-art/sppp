'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Users,
  Settings,
  Target,
  BarChart3,
  Plus,
  Pencil,
  Ban,
  Trash2,
  Search,
  Loader2,
  MapPin,
  ArrowRight,
  Save,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { useFetch, postData } from '@/hooks/use-fetch';
import { toast } from 'sonner';
import { APPLICATION_TYPES, ZONES, STAFF_ROLES } from '@/lib/constants';
import { formatStaffRole, getZoneColor } from '@/lib/formatters';
import Dashboard from '@/components/app/dashboard';
import Performance from '@/components/app/performance';

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserRow {
  id: string;
  username: string;
  name: string;
  role: string;
  zone: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface KpiConfig {
  id: string;
  stepName: string;
  slaDays: number;
  warningDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AdminDashboardProps {
  user: {
    id: string;
    username: string;
    role: string;
    name: string;
    zone: string | null;
  };
}

type TabKey = 'pengguna' | 'konfigurasi' | 'kpi' | 'laporan';

// ─── Tab definitions ─────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'pengguna', label: 'Pengguna', icon: <Users className="h-4 w-4" /> },
  { key: 'konfigurasi', label: 'Konfigurasi', icon: <Settings className="h-4 w-4" /> },
  { key: 'kpi', label: 'KPI', icon: <Target className="h-4 w-4" /> },
  { key: 'laporan', label: 'Laporan', icon: <BarChart3 className="h-4 w-4" /> },
];

// ─── Role options for selects ────────────────────────────────────────────────

const ROLE_OPTIONS = Object.entries(STAFF_ROLES).map(([key, val]) => ({
  value: key,
  label: val.label,
}));

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminDashboard({ user: _user }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('pengguna');

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b">
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
              }`}
              role="tab"
              aria-selected={activeTab === tab.key}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'pengguna' && <PenggunaTab />}
      {activeTab === 'konfigurasi' && <KonfigurasiTab />}
      {activeTab === 'kpi' && <KpiTab />}
      {activeTab === 'laporan' && <LaporanTab />}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 1: PENGGUNA (User Management)
// ═════════════════════════════════════════════════════════════════════════════

function PenggunaTab() {
  const { data: users, loading, error, refetch } = useFetch<UserRow[]>('/api/admin/users');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [deactivateUser, setDeactivateUser] = useState<UserRow | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    username: '',
    password: '',
    name: '',
    role: 'PT',
    zone: '',
    email: '',
    phone: '',
  });

  const resetForm = useCallback(() => {
    setForm({ username: '', password: '', name: '', role: 'PT', zone: '', email: '', phone: '' });
    setEditingUser(null);
  }, []);

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (u: UserRow) => {
    setEditingUser(u);
    setForm({
      username: u.username,
      password: '',
      name: u.name,
      role: u.role,
      zone: u.zone || '',
      email: u.email || '',
      phone: u.phone || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.role) {
      toast.error('Nama dan peranan diperlukan');
      return;
    }

    if (!editingUser && (!form.username || !form.password)) {
      toast.error('Username dan kata laluan diperlukan untuk pengguna baharu');
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        // Update
        const body: Record<string, unknown> = {
          name: form.name,
          role: form.role,
          zone: form.zone || null,
          email: form.email || null,
          phone: form.phone || null,
        };
        if (form.password) body.password = form.password;

        const res = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Gagal mengemas kini pengguna');
        }
        toast.success('Pengguna berjaya dikemas kini');
      } else {
        // Create
        await postData('/api/admin/users', {
          username: form.username,
          password: form.password,
          name: form.name,
          role: form.role,
          zone: form.zone || null,
          email: form.email || null,
          phone: form.phone || null,
        });
        toast.success('Pengguna baharu berjaya ditambah');
      }

      setDialogOpen(false);
      resetForm();
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Ralat semasa menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateUser) return;
    try {
      const res = await fetch(`/api/admin/users/${deactivateUser.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyahaktifkan pengguna');
      }
      toast.success('Pengguna berjaya dinyahaktifkan');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Ralat semasa menyahaktifkan');
    } finally {
      setDeactivateUser(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    try {
      const res = await fetch(`/api/admin/users/${deleteUser.id}?permanent=true`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memadam pengguna');
      }
      toast.success('Pengguna berjaya dipadam secara kekal');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Ralat semasa memadam');
    } finally {
      setDeleteUser(null);
    }
  };

  // Filtered users
  const filteredUsers = (users || []).filter((u) => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesSearch =
      !searchQuery ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto text-red-500 mb-2" />
          <p className="text-sm text-red-600">Gagal memuatkan data pengguna</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            <RefreshCw className="h-3 w-3 mr-1" /> Cuba Lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Pengurusan Pengguna</h2>
          <p className="text-sm text-muted-foreground">Tambah, edit, dan nyahaktifkan pengguna mengikut peranan</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" /> Tambah Pengguna
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama, username, atau emel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Tapis Peranan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua Peranan</SelectItem>
            {ROLE_OPTIONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Memuatkan...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Tiada pengguna dijumpai</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Nama</TableHead>
                    <TableHead className="min-w-[120px]">Username</TableHead>
                    <TableHead className="min-w-[130px]">Peranan</TableHead>
                    <TableHead className="min-w-[70px]">Zon</TableHead>
                    <TableHead className="min-w-[160px]">Emel</TableHead>
                    <TableHead className="min-w-[90px]">Status</TableHead>
                    <TableHead className="min-w-[120px] text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id} className={!u.isActive ? 'opacity-50' : undefined}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.username}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {formatStaffRole(u.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.zone ? (
                          <Badge variant="outline" className={`text-xs ${getZoneColor(u.zone)}`}>
                            Zon {u.zone}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{u.email || '-'}</TableCell>
                      <TableCell>
                        {u.isActive ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs border-0">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            Tidak Aktif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(u)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {u.isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeactivateUser(u)}
                              title="Nyahaktif"
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteUser(u)}
                            title="Padam"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User count */}
      {!loading && filteredUsers.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          Menunjukkan {filteredUsers.length} daripada {users?.length || 0} pengguna
        </p>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm(); } }}>
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baharu'}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Kemas kini maklumat pengguna. Kosongkan kata laluan jika tidak ingin menukarnya.'
                : 'Isikan maklumat pengguna baharu untuk mendaftarkan akaun.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nama Penuh *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Cth: Ahmad bin Ali"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="username">Username {!editingUser && '*'}</Label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  disabled={!!editingUser}
                  placeholder="Cth: ahmad.pt"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Kata Laluan {!editingUser && '*'}</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={editingUser ? 'Kosongkan jika tidak ubah' : 'Minimum 6 aksara'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Peranan *</Label>
                <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Zon</Label>
                <Select value={form.zone || 'NONE'} onValueChange={(v) => setForm((f) => ({ ...f, zone: v === 'NONE' ? '' : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Zon" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Tiada Zon</SelectItem>
                    {ZONES.map((z) => (
                      <SelectItem key={z} value={z}>
                        Zon {z}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="email">Emel</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="Cth: ahmad@mpks.gov.my"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Cth: 012-3456789"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingUser ? 'Simpan Perubahan' : 'Tambah Pengguna'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <AlertDialog open={!!deactivateUser} onOpenChange={(open) => { if (!open) setDeactivateUser(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nyahaktif Pengguna</AlertDialogTitle>
            <AlertDialogDescription>
              Adakah anda pasti ingin menyahaktifkan pengguna <strong>{deactivateUser?.name}</strong>?
              Pengguna ini tidak akan dapat mengakses sistem lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeactivate} className="bg-amber-600 hover:bg-amber-700">
              Nyahaktif
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Permanently Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => { if (!open) setDeleteUser(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700">⚠️ Padam Pengguna Secara Kekal</AlertDialogTitle>
            <AlertDialogDescription>
              Adakah anda pasti ingin memadam pengguna <strong>{deleteUser?.name}</strong> ({deleteUser?.username}) secara kekal?
              Tindakan ini <strong>tidak boleh dibatalkan</strong>. Semua data pengguna ini akan dipadamkan daripada sistem.
              {deleteUser?.isActive && (
                <span className="block mt-2 text-amber-600">
                  💡 Tip: Anda boleh menyahaktifkan pengguna ini sebagai alternatif yang lebih selamat.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="h-4 w-4 mr-2" />
              Padam Kekal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 2: KONFIGURASI (System Configuration)
// ═════════════════════════════════════════════════════════════════════════════

function KonfigurasiTab() {
  const { data: users } = useFetch<UserRow[]>('/api/admin/users');

  // Group PT users by zone
  const ptByZone: Record<string, UserRow[]> = {};
  ZONES.forEach((z) => {
    ptByZone[z] = (users || []).filter((u) => u.role === 'PT' && u.zone === z && u.isActive);
  });

  // Group application types by PPKP route
  const ppkpLTypes = Object.entries(APPLICATION_TYPES)
    .filter(([, val]) => val.ppkpRoute === 'PPKP_L')
    .map(([key, val]) => ({ key, label: val.label }));

  const ppkpPTypes = Object.entries(APPLICATION_TYPES)
    .filter(([, val]) => val.ppkpRoute === 'PPKP_P')
    .map(([key, val]) => ({ key, label: val.label }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Konfigurasi Sistem</h2>
        <p className="text-sm text-muted-foreground">Paparan zon, peranan, dan peraturan penghalaan permohonan</p>
      </div>

      {/* Zones & PT Staff */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Zon &amp; Kakitangan PT
          </CardTitle>
          <CardDescription>
            Setiap zon mempunyai kakitangan PT yang bertanggungjawab membuka fail permohonan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {ZONES.map((zone) => {
              const staff = ptByZone[zone] || [];
              return (
                <div key={zone} className={`rounded-xl border-2 p-4 ${getZoneColor(zone)}`}>
                  <div className="text-center mb-3">
                    <p className="text-lg font-bold">Zon {zone}</p>
                  </div>
                  {staff.length > 0 ? (
                    <div className="space-y-1.5">
                      {staff.map((s) => (
                        <div key={s.id} className="flex items-center gap-2 text-xs bg-white/60 rounded-md px-2 py-1.5">
                          <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span className="truncate font-medium">{s.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-center opacity-70">Tiada PT ditugaskan</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Application Type Routing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            Penghalaan Jenis Permohonan
          </CardTitle>
          <CardDescription>
            Setiap jenis permohonan dihala ke PPKP(L) atau PPKP(P) berdasarkan kategori
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PPKP(L) Route */}
            <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-full bg-emerald-200 flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-emerald-700" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-800">PPKP(L) - Lesen</p>
                  <p className="text-xs text-emerald-600">Diarahkan ke PPL(L) - Penolong Pengarah</p>
                </div>
              </div>
              <div className="space-y-2">
                {ppkpLTypes.map((t) => (
                  <div key={t.key} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="bg-white border-emerald-300 text-emerald-700 text-xs">
                      {t.key}
                    </Badge>
                    <span className="text-emerald-800">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* PPKP(P) Route */}
            <div className="rounded-xl border-2 border-teal-200 bg-teal-50 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-full bg-teal-200 flex items-center justify-center">
                  <ArrowRight className="h-4 w-4 text-teal-700" />
                </div>
                <div>
                  <p className="font-semibold text-teal-800">PPKP(P) - Pasar</p>
                  <p className="text-xs text-teal-600">Diarahkan ke PPL(P) - Penolong Pengarah</p>
                </div>
              </div>
              <div className="space-y-2">
                {ppkpPTypes.map((t) => (
                  <div key={t.key} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="bg-white border-teal-300 text-teal-700 text-xs">
                      {t.key}
                    </Badge>
                    <span className="text-teal-800">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Staff Roles Reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Senarai Peranan Kakitangan
          </CardTitle>
          <CardDescription>Peranan yang tersedia dalam sistem dan fungsi masing-masing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {ROLE_OPTIONS.map((r) => (
              <div key={r.value} className="rounded-lg border p-3">
                <Badge variant="outline" className="mb-2 text-xs">{r.value}</Badge>
                <p className="text-sm font-medium">{r.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 3: KPI (KPI Control)
// ═════════════════════════════════════════════════════════════════════════════

function KpiTab() {
  const { data: configs, loading, error, refetch } = useFetch<KpiConfig[]>('/api/admin/kpi');
  const [editMap, setEditMap] = useState<Record<string, { slaDays: string; warningDays: string; isActive: boolean }>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Sync edit state when configs load
  useEffect(() => {
    if (configs) {
      const map: Record<string, { slaDays: string; warningDays: string; isActive: boolean }> = {};
      configs.forEach((c) => {
        map[c.stepName] = {
          slaDays: String(c.slaDays),
          warningDays: String(c.warningDays),
          isActive: c.isActive,
        };
      });
      setEditMap(map);
    }
  }, [configs]);

  const handleSave = async (stepName: string) => {
    const edit = editMap[stepName];
    if (!edit) return;

    const slaDays = parseFloat(edit.slaDays);
    const warningDays = parseFloat(edit.warningDays);

    if (isNaN(slaDays) || slaDays <= 0) {
      toast.error('Hari SLA mesti lebih daripada 0');
      return;
    }
    if (isNaN(warningDays) || warningDays < 0) {
      toast.error('Hari amaran tidak boleh negatif');
      return;
    }
    if (warningDays >= slaDays) {
      toast.error('Hari amaran mesti kurang daripada hari SLA');
      return;
    }

    setSavingKey(stepName);
    try {
      await postData('/api/admin/kpi', {
        stepName,
        slaDays,
        warningDays,
        isActive: edit.isActive,
      });
      toast.success('Konfigurasi KPI berjaya dikemas kini');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan konfigurasi');
    } finally {
      setSavingKey(null);
    }
  };

  const handleToggleActive = async (stepName: string) => {
    const edit = editMap[stepName];
    if (!edit) return;

    const newActive = !edit.isActive;
    setEditMap((m) => ({
      ...m,
      [stepName]: { ...m[stepName], isActive: newActive },
    }));

    const slaDays = parseFloat(edit.slaDays);
    const warningDays = parseFloat(edit.warningDays);

    setSavingKey(stepName);
    try {
      await postData('/api/admin/kpi', {
        stepName,
        slaDays,
        warningDays,
        isActive: newActive,
      });
      toast.success(newActive ? 'KPI diaktifkan' : 'KPI dinyahaktifkan');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengemas kini status');
      // Revert on error
      setEditMap((m) => ({
        ...m,
        [stepName]: { ...m[stepName], isActive: !newActive },
      }));
    } finally {
      setSavingKey(null);
    }
  };

  const updateEdit = (stepName: string, field: 'slaDays' | 'warningDays', value: string) => {
    setEditMap((m) => ({
      ...m,
      [stepName]: { ...m[stepName], [field]: value },
    }));
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto text-red-500 mb-2" />
          <p className="text-sm text-red-600">Gagal memuatkan konfigurasi KPI</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            <RefreshCw className="h-3 w-3 mr-1" /> Cuba Lagi
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Kawalan KPI</h2>
        <p className="text-sm text-muted-foreground">
          Tetapkan parameter masa SLA dan amaran untuk setiap langkah proses
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Memuatkan...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Langkah Proses</TableHead>
                    <TableHead className="min-w-[120px]">Hari SLA</TableHead>
                    <TableHead className="min-w-[140px]">Hari Amaran</TableHead>
                    <TableHead className="min-w-[80px]">Aktif</TableHead>
                    <TableHead className="min-w-[100px] text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs?.map((config) => {
                    const edit = editMap[config.stepName];
                    if (!edit) return null;
                    const isSaving = savingKey === config.stepName;

                    return (
                      <TableRow key={config.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{formatStepName(config.stepName)}</p>
                            <p className="text-xs text-muted-foreground">{config.stepName}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            step="0.5"
                            value={edit.slaDays}
                            onChange={(e) => updateEdit(config.stepName, 'slaDays', e.target.value)}
                            className="w-24 h-8 text-sm"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            value={edit.warningDays}
                            onChange={(e) => updateEdit(config.stepName, 'warningDays', e.target.value)}
                            className="w-24 h-8 text-sm"
                          />
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Amaran sebelum {edit.slaDays} hari
                          </p>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={edit.isActive}
                            onCheckedChange={() => handleToggleActive(config.stepName)}
                            disabled={isSaving}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSave(config.stepName)}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Save className="h-3 w-3 mr-1" />
                            )}
                            Simpan
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-sky-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Hari SLA</p>
            <p className="text-sm font-medium mt-1">Had masa maksimum untuk menyelesaikan sesuatu langkah proses</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Hari Amaran</p>
            <p className="text-sm font-medium mt-1">Bilangan hari sebelum tarikh akhir SLA untuk mengaktifkan amaran</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Aktif</p>
            <p className="text-sm font-medium mt-1">Nyahaktif untuk melumpuhkan penjejakan SLA bagi langkah tersebut</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Helper to format step names (same as in formatters but local fallback)
function formatStepName(step: string): string {
  const map: Record<string, string> = {
    PT_FILE_OPENING: 'Pembukaan Fail PT',
    PPKP_PROCESSING: 'Pemprosesan PPKP',
    PPL_REVIEW: 'Ulasan PPL',
  };
  return map[step] || step;
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 4: LAPORAN (Performance Reports)
// ═════════════════════════════════════════════════════════════════════════════

function LaporanTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Laporan Prestasi</h2>
        <p className="text-sm text-muted-foreground">
          Paparan statistik keseluruhan proses permohonan dan prestasi sistem
        </p>
      </div>

      <Separator />

      {/* Dashboard Component */}
      <div>
        <Dashboard />
      </div>

      <Separator />

      {/* Performance Component */}
      <div>
        <Performance />
      </div>
    </div>
  );
}
