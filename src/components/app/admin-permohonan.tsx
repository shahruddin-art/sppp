'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  FileText,
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { APPLICATION_TYPES, ZONES, APPLICATION_STATUSES } from '@/lib/constants';
import {
  formatStatus,
  getStatusColor,
  getZoneColor,
  formatDateTime,
  formatApplicationType,
} from '@/lib/formatters';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Application {
  id: string;
  referenceNo: string;
  applicantName: string;
  applicantIc: string;
  applicantPhone: string | null;
  applicantAddress: string | null;
  businessType: string | null;
  licenseeName: string | null;
  accountNumber: string | null;
  applicationType: string;
  zone: string;
  status: string;
  fileNumber: string | null;
  currentStep: string;
  plbDecision: string | null;
  plbDecisionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  applicationTypeLabel: string;
  isOverdue: boolean;
  remainingDays: number | null;
}

interface PaginatedResponse {
  data: Application[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface AdminPermohonanProps {
  onSelectApp: (appId: string) => void;
}

const PAGE_SIZE = 10;

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminPermohonan({ onSelectApp }: AdminPermohonanProps) {
  // Filters & pagination
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Data
  const [applications, setApplications] = useState<Application[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editApp, setEditApp] = useState<Application | null>(null);
  const [deleteApp, setDeleteApp] = useState<Application | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    applicantName: '',
    applicantIc: '',
    applicantPhone: '',
    applicantAddress: '',
    businessType: '',
    licenseeName: '',
    accountNumber: '',
    applicationType: '',
    zone: '',
  });

  const resetForm = useCallback(() => {
    setForm({
      applicantName: '',
      applicantIc: '',
      applicantPhone: '',
      applicantAddress: '',
      businessType: '',
      licenseeName: '',
      accountNumber: '',
      applicationType: '',
      zone: '',
    });
  }, []);

  // ── Fetch data ──
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(PAGE_SIZE));
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (zoneFilter !== 'all') params.set('zone', zoneFilter);
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (search) params.set('search', search);

      const res = await fetch(`/api/applications?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json: PaginatedResponse = await res.json();

      setApplications(json.data);
      setTotalPages(json.pagination.totalPages);
      setTotal(json.pagination.total);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, zoneFilter, typeFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, zoneFilter, typeFilter, search]);

  const hasFilters = statusFilter !== 'all' || zoneFilter !== 'all' || typeFilter !== 'all' || search !== '';
  const clearFilters = () => {
    setStatusFilter('all');
    setZoneFilter('all');
    setTypeFilter('all');
    setSearch('');
  };

  // ── Create ──
  const openCreate = () => {
    resetForm();
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!form.applicantName || !form.applicantIc || !form.applicationType || !form.zone) {
      toast.error('Sila isi semua medan yang diperlukan');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal mencipta permohonan');
      }
      toast.success('Permohonan baharu berjaya dicipta');
      setCreateOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Ralat semasa mencipta');
    } finally {
      setSaving(false);
    }
  };

  // ── Edit ──
  const openEdit = (app: Application) => {
    setEditApp(app);
    setForm({
      applicantName: app.applicantName,
      applicantIc: app.applicantIc,
      applicantPhone: app.applicantPhone || '',
      applicantAddress: app.applicantAddress || '',
      businessType: app.businessType || '',
      licenseeName: app.licenseeName || '',
      accountNumber: app.accountNumber || '',
      applicationType: app.applicationType,
      zone: app.zone,
    });
  };

  const handleEdit = async () => {
    if (!editApp) return;
    if (!form.applicantName || !form.applicantIc || !form.applicationType || !form.zone) {
      toast.error('Sila isi semua medan yang diperlukan');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/applications/${editApp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal mengemas kini permohonan');
      }
      toast.success('Permohonan berjaya dikemas kini');
      setEditApp(null);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Ralat semasa mengemas kini');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (!deleteApp) return;
    try {
      const res = await fetch(`/api/applications/${deleteApp.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal memadam permohonan');
      }
      toast.success('Permohonan berjaya dipadam');
      setDeleteApp(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Ralat semasa memadam');
    }
  };

  // ── Pagination helpers ──
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  // ── Form Dialog (shared for create/edit) ──
  const renderFormDialog = (isOpen: boolean, onClose: () => void, onSave: () => void, title: string, isEdit: boolean) => (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); resetForm(); } }}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Kemas kini maklumat permohonan. Perubahan akan disimpan serta-merta.'
              : 'Isikan maklumat permohonan baharu untuk didaftarkan ke dalam sistem.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="f-name">Nama Pemohon *</Label>
            <Input
              id="f-name"
              value={form.applicantName}
              onChange={(e) => setForm((f) => ({ ...f, applicantName: e.target.value }))}
              placeholder="Cth: Ahmad bin Ali"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="f-ic">No. Kad Pengenalan *</Label>
              <Input
                id="f-ic"
                value={form.applicantIc}
                onChange={(e) => setForm((f) => ({ ...f, applicantIc: e.target.value }))}
                placeholder="Cth: 850101-01-1234"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="f-phone">No. Telefon</Label>
              <Input
                id="f-phone"
                value={form.applicantPhone}
                onChange={(e) => setForm((f) => ({ ...f, applicantPhone: e.target.value }))}
                placeholder="Cth: 012-3456789"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="f-address">Alamat</Label>
            <Input
              id="f-address"
              value={form.applicantAddress}
              onChange={(e) => setForm((f) => ({ ...f, applicantAddress: e.target.value }))}
              placeholder="Cth: No 1, Jalan Utama, 50000 KL"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="f-businessType">Jenis Perniagaan / Jenis Lesen</Label>
            <Input
              id="f-businessType"
              value={form.businessType}
              onChange={(e) => setForm((f) => ({ ...f, businessType: e.target.value }))}
              placeholder="Cth: Restoran, Kedai Runcit, Pengangkutan"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="f-licenseeName">Nama Pelesen</Label>
              <Input
                id="f-licenseeName"
                value={form.licenseeName}
                onChange={(e) => setForm((f) => ({ ...f, licenseeName: e.target.value }))}
                placeholder="Nama pelesen (individu)"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="f-accountNumber">No. Akaun</Label>
              <Input
                id="f-accountNumber"
                value={form.accountNumber}
                onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                placeholder="No. akaun lesen"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Jenis Permohonan *</Label>
              <Select value={form.applicationType || 'NONE'} onValueChange={(v) => setForm((f) => ({ ...f, applicationType: v === 'NONE' ? '' : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Pilih Jenis</SelectItem>
                  {Object.entries(APPLICATION_TYPES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Zon *</Label>
              <Select value={form.zone || 'NONE'} onValueChange={(v) => setForm((f) => ({ ...f, zone: v === 'NONE' ? '' : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Zon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">Pilih Zon</SelectItem>
                  {ZONES.map((z) => (
                    <SelectItem key={z} value={z}>Zon {z}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); resetForm(); }}>
            Batal
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? 'Simpan Perubahan' : 'Cipta Permohonan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-4">
      {/* Header + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Senarai Permohonan</h2>
          <p className="text-sm text-muted-foreground">
            Urus semua permohonan — tambah, edit, papar, atau padam
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Permohonan Baharu
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, no. rujukan, no. fail, IC..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  {Object.entries(APPLICATION_STATUSES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={zoneFilter} onValueChange={setZoneFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Zon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Zon</SelectItem>
                  {ZONES.map((z) => (
                    <SelectItem key={z} value={z}>Zon {z}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  {Object.entries(APPLICATION_TYPES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon" onClick={fetchData} title="Muat semula">
                <RefreshCw className="h-4 w-4" />
              </Button>

              {hasFilters && (
                <Button variant="ghost" size="icon" onClick={clearFilters} title="Padam tapisan">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {loading ? 'Memuatkan...' : `${total} permohonan dijumpai`}
        </p>
        {totalPages > 1 && (
          <p className="text-xs text-muted-foreground">
            Halaman {page} daripada {totalPages}
          </p>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading && applications.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Memuatkan...</span>
            </div>
          ) : applications.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Tiada permohonan dijumpai</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[130px]">No. Rujukan</TableHead>
                    <TableHead className="min-w-[140px]">Nama Pemohon</TableHead>
                    <TableHead className="min-w-[100px]">No. KP</TableHead>
                    <TableHead className="min-w-[130px]">Jenis</TableHead>
                    <TableHead className="min-w-[70px]">Zon</TableHead>
                    <TableHead className="min-w-[120px]">Status</TableHead>
                    <TableHead className="min-w-[90px]">No. Fail</TableHead>
                    <TableHead className="min-w-[120px]">Tarikh</TableHead>
                    <TableHead className="min-w-[140px] text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow
                      key={app.id}
                      className={`cursor-pointer hover:bg-muted/50 ${app.isOverdue ? 'bg-red-50/50' : ''}`}
                      onClick={() => onSelectApp(app.id)}
                    >
                      <TableCell className="font-mono text-xs">{app.referenceNo}</TableCell>
                      <TableCell className="font-medium text-sm max-w-[140px] truncate">{app.applicantName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{app.applicantIc}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] max-w-[130px] truncate">
                          {app.applicationTypeLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${getZoneColor(app.zone)}`}>
                          Zon {app.zone}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${getStatusColor(app.status)}`}>
                          {formatStatus(app.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{app.fileNumber || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(app.createdAt)}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onSelectApp(app.id)}
                            title="Lihat Butiran"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(app)}
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteApp(app)}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {getPageNumbers().map((p, i) =>
            typeof p === 'string' ? (
              <span key={`dots-${i}`} className="px-2 text-muted-foreground">...</span>
            ) : (
              <Button
                key={p}
                variant={page === p ? 'default' : 'outline'}
                size="sm"
                className="w-9 h-9 p-0"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            )
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Create Dialog */}
      {renderFormDialog(
        createOpen,
        () => setCreateOpen(false),
        handleCreate,
        'Cipta Permohonan Baharu',
        false
      )}

      {/* Edit Dialog */}
      {editApp && renderFormDialog(
        true,
        () => { setEditApp(null); resetForm(); },
        handleEdit,
        'Edit Permohonan',
        true
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteApp} onOpenChange={(open) => { if (!open) setDeleteApp(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700">⚠️ Padam Permohonan</AlertDialogTitle>
            <AlertDialogDescription>
              Adakah anda pasti ingin memadam permohonan <strong>{deleteApp?.referenceNo}</strong> atas nama <strong>{deleteApp?.applicantName}</strong> secara kekal?
              Tindakan ini <strong>tidak boleh dibatalkan</strong>. Semua data permohonan dan langkah aliran kerja akan dipadamkan.
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
