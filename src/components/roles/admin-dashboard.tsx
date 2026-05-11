'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
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
  Store,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CalendarDays,
} from 'lucide-react';
import { useFetch, postData, putData, deleteData, buildAuthHeaders } from '@/hooks/use-fetch';
import { getSessionToken } from '@/lib/auth-store';
import { toast } from 'sonner';
import { APPLICATION_TYPES, ZONES, STAFF_ROLES, APPLICATION_STATUSES, PLB_DECISIONS } from '@/lib/constants';
import { useBusinessTypes } from '@/hooks/use-business-types';
import {
  formatStaffRole,
  getZoneColor,
  formatApplicationType,
  formatStatus,
  getStatusColor,
  formatDateTime,
  formatPlbDecision,
} from '@/lib/formatters';
import Dashboard from '@/components/app/dashboard';
import Performance from '@/components/app/performance';
import DailyReceivedReport from '@/components/reports/daily-received-report';

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

interface ApplicationRow {
  id: string;
  referenceNo: string;
  applicantName: string;
  applicantIc: string;
  applicantPhone: string | null;
  applicantAddress: string | null;
  applicationType: string;
  businessType: string | null;
  businessName: string | null;
  accountNo: string | null;
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
  ptStaff: { id: string; name: string; role: string } | null;
  ppkpStaff: { id: string; name: string; role: string } | null;
  pplStaff: { id: string; name: string; role: string } | null;
  plbStaff: { id: string; name: string; role: string } | null;
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

type TabKey = 'permohonan' | 'pengguna' | 'konfigurasi' | 'jenisPerniagaan' | 'kpi' | 'laporan';

// ─── Tab definitions ─────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'permohonan', label: 'Permohonan', icon: <FileText className="h-4 w-4" /> },
  { key: 'pengguna', label: 'Pengguna', icon: <Users className="h-4 w-4" /> },
  { key: 'konfigurasi', label: 'Konfigurasi', icon: <Settings className="h-4 w-4" /> },
  { key: 'jenisPerniagaan', label: 'Jenis Perniagaan', icon: <Store className="h-4 w-4" /> },
  { key: 'kpi', label: 'KPI', icon: <Target className="h-4 w-4" /> },
  { key: 'laporan', label: 'Laporan', icon: <BarChart3 className="h-4 w-4" /> },
];

// ─── Role options for selects ────────────────────────────────────────────────

const ROLE_OPTIONS = Object.entries(STAFF_ROLES).map(([key, val]) => ({
  value: key,
  label: val.label,
}));

const STATUS_OPTIONS = Object.entries(APPLICATION_STATUSES).map(([key, val]) => ({
  value: key,
  label: val.label,
}));

const ITEMS_PER_PAGE = 20;

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminDashboard({ user: _user }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('permohonan');

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
      {activeTab === 'permohonan' && <PermohonanTab />}
      {activeTab === 'pengguna' && <PenggunaTab />}
      {activeTab === 'konfigurasi' && <KonfigurasiTab />}
      {activeTab === 'jenisPerniagaan' && <JenisPerniagaanTab />}
      {activeTab === 'kpi' && <KpiTab />}
      {activeTab === 'laporan' && <LaporanTab />}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TAB 0: PERMOHONAN (Application Management - Admin CRUD)
// ═════════════════════════════════════════════════════════════════════════════

function PermohonanTab() {
  const { businessTypes } = useBusinessTypes();
  // Server-side pagination state
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<ApplicationRow | null>(null);
  const [viewingApp, setViewingApp] = useState<ApplicationRow | null>(null);
  const [deleteApp, setDeleteApp] = useState<ApplicationRow | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    applicantName: '',
    applicantIc: '',
    applicantPhone: '',
    applicantAddress: '',
    applicationType: '',
    businessType: '',
    businessTypeOther: '',
    businessName: '',
    accountNo: '',
    zone: '',
    fileNumber: '',
    status: '',
    plbDecision: '',
    plbDecisionNotes: '',
  });

  // Track original applicationType for change warning
  const [originalApplicationType, setOriginalApplicationType] = useState<string>('');

  const resetForm = useCallback(() => {
    setForm({
      applicantName: '',
      applicantIc: '',
      applicantPhone: '',
      applicantAddress: '',
      applicationType: '',
      businessType: '',
      businessTypeOther: '',
      businessName: '',
      accountNo: '',
      zone: '',
      fileNumber: '',
      status: '',
      plbDecision: '',
      plbDecisionNotes: '',
    });
    setEditingApp(null);
    setOriginalApplicationType('');
  }, []);

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (app: ApplicationRow) => {
    setEditingApp(app);
    setOriginalApplicationType(app.applicationType);
    setForm({
      applicantName: app.applicantName,
      applicantIc: app.applicantIc,
      applicantPhone: app.applicantPhone || '',
      applicantAddress: app.applicantAddress || '',
      applicationType: app.applicationType,
      businessType: app.businessType || '',
      businessTypeOther: '',
      businessName: app.businessName || '',
      accountNo: app.accountNo || '',
      zone: app.zone,
      fileNumber: app.fileNumber || '',
      status: app.status,
      plbDecision: app.plbDecision || '',
      plbDecisionNotes: app.plbDecisionNotes || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.applicantName || !form.applicantIc || !form.applicationType || !form.zone) {
      toast.error('Sila lengkapkan semua ruangan yang diperlukan');
      return;
    }

    if (!editingApp && form.applicationType === 'PERMOHONAN_BARU' && !form.businessType) {
      toast.error('Jenis Perniagaan diperlukan untuk Permohonan Baru');
      return;
    }

    setSaving(true);
    try {
      if (editingApp) {
        // Update
        const body: Record<string, unknown> = {
          applicantName: form.applicantName,
          applicantIc: form.applicantIc,
          applicantPhone: form.applicantPhone || null,
          applicantAddress: form.applicantAddress || null,
          applicationType: form.applicationType,
          businessType: form.applicationType === 'PERMOHONAN_BARU'
            ? (form.businessType === 'Lain-lain' ? form.businessTypeOther : (form.businessType || null))
            : (form.businessType || null),
          businessName: form.businessName || null,
          accountNo: form.accountNo || null,
          zone: form.zone,
          fileNumber: form.fileNumber || null,
          status: form.status,
          plbDecision: form.plbDecision || null,
          plbDecisionNotes: form.plbDecisionNotes || null,
        };

        await putData(`/api/applications/${editingApp.id}`, body);
        toast.success('Permohonan berjaya dikemas kini');
      } else {
        // Create - use same logic as Kaunter
        const submitData = {
          applicantName: form.applicantName,
          applicantIc: form.applicantIc,
          applicantPhone: form.applicantPhone || undefined,
          applicantAddress: form.applicantAddress || undefined,
          applicationType: form.applicationType,
          businessType: form.applicationType === 'PERMOHONAN_BARU'
            ? (form.businessType === 'Lain-lain' ? form.businessTypeOther : form.businessType)
            : undefined,
          businessName: form.businessName || undefined,
          accountNo: form.accountNo || undefined,
          zone: form.zone,
        };
        await postData('/api/applications', submitData);
        toast.success('Permohonan baharu berjaya ditambah');
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Ralat semasa menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteApp) return;
    try {
      await deleteData(`/api/applications/${deleteApp.id}`);
      toast.success('Permohonan berjaya dipadam');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Ralat semasa memadam');
    } finally {
      setDeleteApp(null);
    }
  };

  // Server-side data fetching with pagination
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'ALL') queryParams.set('status', statusFilter);
      if (typeFilter !== 'ALL') queryParams.set('type', typeFilter);
      if (zoneFilter !== 'ALL') queryParams.set('zone', zoneFilter);
      if (searchQuery) queryParams.set('search', searchQuery);
      queryParams.set('page', currentPage.toString());
      queryParams.set('limit', ITEMS_PER_PAGE.toString());

      const token = getSessionToken();
      const res = await fetch(`/api/applications?${queryParams.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Gagal memuatkan data');
      const json = await res.json();
      setApplications(json.data || []);
      setTotalCount(json.totalCount || 0);
      setServerTotalPages(json.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Gagal memuatkan data');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, zoneFilter, searchQuery, currentPage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter, zoneFilter]);

  // Pagination (server-side)
  const totalPages = serverTotalPages;
  const paginatedApps = applications;

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="space-y-4">
      {/* Header + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Pengurusan Permohonan</h2>
          <p className="text-sm text-muted-foreground">Tambah, edit, papar, dan padam permohonan</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" /> Tambah Permohonan
        </Button>
      </div>

      {/* Error banner */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-600">Gagal memuatkan data: {error}</p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => fetchData()}>
              <RefreshCw className="h-3 w-3 mr-1" /> Cuba Lagi
            </Button>
          </CardContent>
        </Card>
      )}

      {!error && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari nama, no. rujukan, no. fail, IC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Jenis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Jenis</SelectItem>
                  {Object.entries(APPLICATION_TYPES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>
                      {val.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={zoneFilter} onValueChange={setZoneFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Zon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Zon</SelectItem>
                  {ZONES.map((z) => (
                    <SelectItem key={z} value={z}>
                      Zon {z}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon" onClick={() => fetchData()} title="Muat semula">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
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
                        <TableHead className="min-w-[130px]">Nama Pemohon</TableHead>
                        <TableHead className="min-w-[100px]">No. IC/ROC</TableHead>
                        <TableHead className="min-w-[120px]">Jenis</TableHead>
                        <TableHead className="min-w-[80px]">Zon</TableHead>
                        <TableHead className="min-w-[100px]">No. Fail</TableHead>
                        <TableHead className="min-w-[110px]">Status</TableHead>
                        <TableHead className="min-w-[90px]">Dicipta</TableHead>
                        <TableHead className="min-w-[130px] text-right">Tindakan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedApps.map((app) => (
                        <TableRow key={app.id} className={app.isOverdue ? 'bg-red-50/50' : undefined}>
                          <TableCell className="font-mono text-xs">{app.referenceNo}</TableCell>
                          <TableCell className="font-medium max-w-[130px] truncate">{app.applicantName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">{app.applicantIc}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] max-w-[140px] truncate">
                              {app.applicationTypeLabel}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${getZoneColor(app.zone)}`}>
                              Zon {app.zone}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono">{app.fileNumber || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] ${getStatusColor(app.status)}`}>
                              {formatStatus(app.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDateTime(app.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewingApp(app)}
                                title="Papar"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(app)}
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
          {!loading && totalCount > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Menunjukkan {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} daripada {totalCount} permohonan
              </p>
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                    {getPageNumbers().map((page, i) =>
                      page === 'ellipsis' ? (
                        <PaginationItem key={`ellipsis-${i}`}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={page}>
                          <PaginationLink
                            isActive={currentPage === page}
                            onClick={() => setCurrentPage(page)}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}
        </>
      )}

      {/* View Dialog */}
      <Dialog open={!!viewingApp} onOpenChange={(open) => { if (!open) setViewingApp(null); }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Butiran Permohonan</DialogTitle>
            <DialogDescription>
              {viewingApp?.referenceNo}
            </DialogDescription>
          </DialogHeader>
          {viewingApp && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Nama Pemohon</p>
                  <p className="font-medium">{viewingApp.applicantName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">No. IC/ROC</p>
                  <p className="font-mono">{viewingApp.applicantIc}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Telefon</p>
                  <p>{viewingApp.applicantPhone || '-'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Zon</p>
                  <Badge variant="outline" className={`text-xs ${getZoneColor(viewingApp.zone)}`}>
                    Zon {viewingApp.zone}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Jenis Permohonan</p>
                  <p>{viewingApp.applicationTypeLabel}</p>
                </div>
                {viewingApp.businessType && (
                  <div>
                    <p className="text-muted-foreground text-xs">Jenis Perniagaan</p>
                    <p>{viewingApp.businessType}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-xs">No. Fail</p>
                  <p className="font-mono">{viewingApp.fileNumber || 'Belum didaftarkan'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Status</p>
                  <Badge variant="outline" className={`text-xs ${getStatusColor(viewingApp.status)}`}>
                    {formatStatus(viewingApp.status)}
                  </Badge>
                </div>
                {viewingApp.plbDecision && (
                  <>
                    <div>
                      <p className="text-muted-foreground text-xs">Keputusan PLB</p>
                      <p>{formatPlbDecision(viewingApp.plbDecision)}</p>
                    </div>
                    {viewingApp.plbDecisionNotes && (
                      <div className="col-span-2">
                        <p className="text-muted-foreground text-xs">Catatan Keputusan</p>
                        <p>{viewingApp.plbDecisionNotes}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
              {viewingApp.applicantAddress && (
                <div className="text-sm">
                  <p className="text-muted-foreground text-xs">Alamat</p>
                  <p>{viewingApp.applicantAddress}</p>
                </div>
              )}
              <Separator />
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground text-xs">Staf Bertugas</p>
                {viewingApp.ptStaff && <p><span className="text-muted-foreground">PT:</span> {viewingApp.ptStaff.name}</p>}
                {viewingApp.ppkpStaff && <p><span className="text-muted-foreground">{formatStaffRole(viewingApp.ppkpStaff.role)}:</span> {viewingApp.ppkpStaff.name}</p>}
                {viewingApp.pplStaff && <p><span className="text-muted-foreground">{formatStaffRole(viewingApp.pplStaff.role)}:</span> {viewingApp.pplStaff.name}</p>}
                {viewingApp.plbStaff && <p><span className="text-muted-foreground">PLB:</span> {viewingApp.plbStaff.name}</p>}
              </div>
              <Separator />
              <div className="text-xs text-muted-foreground">
                <p>Dicipta: {formatDateTime(viewingApp.createdAt)}</p>
                <p>Kemas kini: {formatDateTime(viewingApp.updatedAt)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingApp(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm(); } }}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingApp ? 'Edit Permohonan' : 'Tambah Permohonan Baharu'}</DialogTitle>
            <DialogDescription>
              {editingApp
                ? 'Kemas kini maklumat permohonan. Nombor rujukan tidak boleh diubah.'
                : 'Isikan maklumat permohonan baharu.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Applicant Info */}
            <div className="space-y-3">
              <p className="text-sm font-semibold">Maklumat Pemohon</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="app-applicantName">Nama Pemohon *</Label>
                  <Input
                    id="app-applicantName"
                    value={form.applicantName}
                    onChange={(e) => setForm((f) => ({ ...f, applicantName: e.target.value }))}
                    placeholder="Nama penuh / syarikat"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="app-applicantIc">No. IC / ROC *</Label>
                  <Input
                    id="app-applicantIc"
                    value={form.applicantIc}
                    onChange={(e) => setForm((f) => ({ ...f, applicantIc: e.target.value }))}
                    placeholder="IC / No. pendaftaran syarikat"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="app-applicantPhone">No. Telefon</Label>
                  <Input
                    id="app-applicantPhone"
                    value={form.applicantPhone}
                    onChange={(e) => setForm((f) => ({ ...f, applicantPhone: e.target.value }))}
                    placeholder="01x-xxxxxxx"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="app-applicantAddress">Alamat</Label>
                  <Input
                    id="app-applicantAddress"
                    value={form.applicantAddress}
                    onChange={(e) => setForm((f) => ({ ...f, applicantAddress: e.target.value }))}
                    placeholder="Alamat pemohon"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Application Details */}
            <div className="space-y-3">
              <p className="text-sm font-semibold">Maklumat Permohonan</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Jenis Permohonan *</Label>
                  <Select
                    value={form.applicationType}
                    onValueChange={(v) => setForm((f) => ({
                      ...f,
                      applicationType: v,
                      // Only reset businessType when creating new (not editing)
                      ...(editingApp ? {} : { businessType: v !== 'PERMOHONAN_BARU' ? '' : f.businessType, businessTypeOther: v !== 'PERMOHONAN_BARU' ? '' : f.businessTypeOther }),
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(APPLICATION_TYPES).map(([key, val]) => (
                        <SelectItem key={key} value={key}>
                          {val.label}
                        </SelectItem>
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
                      {ZONES.map((z) => (
                        <SelectItem key={z} value={z}>
                          Zon {z}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Warning when changing application type */}
              {editingApp && originalApplicationType && form.applicationType !== originalApplicationType && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800">Perubahan Jenis Permohonan</p>
                      <p className="text-amber-700 text-xs mt-1">
                        Anda menukar jenis daripada <strong>{(APPLICATION_TYPES as any)[originalApplicationType]?.label || originalApplicationType}</strong> kepada <strong>{(APPLICATION_TYPES as any)[form.applicationType]?.label || form.applicationType}</strong>.
                        PPKP dan PPL yang bertugas akan dikemas kini mengikut jenis baharu.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Business Type - shown for PERMOHONAN_BARU as required, optional for others */}
              {form.applicationType === 'PERMOHONAN_BARU' ? (
                <div className="grid gap-2">
                  <Label>Jenis Perniagaan *</Label>
                  <Select
                    value={form.businessType}
                    onValueChange={(v) => setForm((f) => ({ ...f, businessType: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis perniagaan" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessTypes.map((bt) => (
                        <SelectItem key={bt} value={bt}>
                          {bt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.businessType === 'Lain-lain' && (
                    <Input
                      value={form.businessTypeOther}
                      onChange={(e) => setForm((f) => ({ ...f, businessTypeOther: e.target.value }))}
                      placeholder="Nyatakan jenis perniagaan..."
                      className="mt-1"
                    />
                  )}
                </div>
              ) : editingApp ? (
                <div className="grid gap-2">
                  <Label>Jenis Perniagaan / Lesen</Label>
                  <Input
                    value={form.businessType}
                    onChange={(e) => setForm((f) => ({ ...f, businessType: e.target.value }))}
                    placeholder="Cth: Restoran, Kedai Runcit, G1, G2..."
                  />
                </div>
              ) : null}

              {/* Business Name and Account No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Nama Perniagaan</Label>
                  <Input
                    value={form.businessName}
                    onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                    placeholder="Nama syarikat / perniagaan"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>No. Akaun</Label>
                  <Input
                    value={form.accountNo}
                    onChange={(e) => setForm((f) => ({ ...f, accountNo: e.target.value }))}
                    placeholder="No. akaun"
                  />
                </div>
              </div>
            </div>

            {/* Edit-only fields */}
            {editingApp && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Pentadbiran</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label>Nombor Fail</Label>
                      <Input
                        value={form.fileNumber}
                        onChange={(e) => setForm((f) => ({ ...f, fileNumber: e.target.value }))}
                        placeholder="cth: MPSP/L/2024/001"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Status</Label>
                      <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {(form.status === 'COMPLETED' || form.status === 'REJECTED') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label>Keputusan PLB</Label>
                        <Select value={form.plbDecision || 'NONE'} onValueChange={(v) => setForm((f) => ({ ...f, plbDecision: v === 'NONE' ? '' : v }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih keputusan" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">Tiada</SelectItem>
                            {Object.entries(PLB_DECISIONS).map(([key, val]) => (
                              <SelectItem key={key} value={key}>
                                {val.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label>Catatan Keputusan</Label>
                        <Input
                          value={form.plbDecisionNotes}
                          onChange={(e) => setForm((f) => ({ ...f, plbDecisionNotes: e.target.value }))}
                          placeholder="Catatan..."
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingApp ? 'Simpan Perubahan' : 'Tambah Permohonan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteApp} onOpenChange={(open) => { if (!open) setDeleteApp(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700">⚠️ Padam Permohonan</AlertDialogTitle>
            <AlertDialogDescription>
              Adakah anda pasti ingin memadam permohonan <strong>{deleteApp?.referenceNo}</strong> ({deleteApp?.applicantName})?
              Tindakan ini <strong>tidak boleh dibatalkan</strong>. Semua data permohonan dan langkah proses akan dipadamkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="h-4 w-4 mr-2" />
              Padam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

        await putData(`/api/admin/users/${editingUser.id}`, body);
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
      await deleteData(`/api/admin/users/${deactivateUser.id}`);
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
      await deleteData(`/api/admin/users/${deleteUser.id}?permanent=true`);
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

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-600">Gagal memuatkan data pengguna: {error}</p>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => refetch()}>
              <RefreshCw className="h-3 w-3 mr-1" /> Cuba Lagi
            </Button>
          </CardContent>
        </Card>
      )}

      {!error && (
      <>
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
                      <TableCell className="font-medium max-w-[150px] truncate">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[120px] truncate">{u.username}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs max-w-[180px] truncate">
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
                      <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">{u.email || '-'}</TableCell>
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

      {!loading && filteredUsers.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          Menunjukkan {filteredUsers.length} daripada {users?.length || 0} pengguna
        </p>
      )}
      </>
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
// TAB 2.5: JENIS PERNIAGAAN (Business Type Management)
// ═════════════════════════════════════════════════════════════════════════════

interface BusinessTypeRow {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

function JenisPerniagaanTab() {
  const [businessTypes, setBusinessTypes] = useState<BusinessTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBt, setEditingBt] = useState<BusinessTypeRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', sortOrder: '0', isActive: true });

  // Delete state
  const [deleteBt, setDeleteBt] = useState<BusinessTypeRow | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/business-types?active=false', {
        headers: buildAuthHeaders(),
      });
      if (!res.ok) throw new Error('Gagal memuatkan data');
      const data = await res.json();
      setBusinessTypes(data);
    } catch (err: any) {
      setError(err.message || 'Gagal memuatkan data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = useCallback(() => {
    setForm({ name: '', sortOrder: '0', isActive: true });
    setEditingBt(null);
  }, []);

  const openCreateDialog = () => {
    resetForm();
    // Default sort order to last + 1
    const maxSort = businessTypes.reduce((max, bt) => Math.max(max, bt.sortOrder), 0);
    setForm((f) => ({ ...f, sortOrder: String(maxSort + 1) }));
    setDialogOpen(true);
  };

  const openEditDialog = (bt: BusinessTypeRow) => {
    setEditingBt(bt);
    setForm({
      name: bt.name,
      sortOrder: String(bt.sortOrder),
      isActive: bt.isActive,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Nama jenis perniagaan diperlukan');
      return;
    }

    setSaving(true);
    try {
      if (editingBt) {
        await putData(`/api/business-types/${editingBt.id}`, {
          name: form.name.trim(),
          sortOrder: form.sortOrder,
          isActive: form.isActive,
        });
        toast.success('Jenis perniagaan berjaya dikemas kini');
      } else {
        await postData('/api/business-types', {
          name: form.name.trim(),
          sortOrder: form.sortOrder,
        });
        toast.success('Jenis perniagaan baharu berjaya ditambah');
      }

      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Ralat semasa menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteBt) return;
    try {
      const result = await deleteData(`/api/business-types/${deleteBt.id}`);
      if (result.deactivated) {
        toast.info(result.message, { duration: 5000 });
      } else {
        toast.success('Jenis perniagaan berjaya dipadam');
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Ralat semasa memadam');
    } finally {
      setDeleteBt(null);
    }
  };

  const handleToggleActive = async (bt: BusinessTypeRow) => {
    try {
      await putData(`/api/business-types/${bt.id}`, { isActive: !bt.isActive });
      toast.success(bt.isActive ? 'Jenis perniagaan dinyahaktifkan' : 'Jenis perniagaan diaktifkan');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Ralat semasa mengemas kini');
    }
  };

  const activeTypes = businessTypes.filter((bt) => bt.isActive);
  const inactiveTypes = businessTypes.filter((bt) => !bt.isActive);

  return (
    <div className="space-y-4">
      {/* Header + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Pengurusan Jenis Perniagaan</h2>
          <p className="text-sm text-muted-foreground">Tambah, edit, padam, dan urus senarai jenis perniagaan untuk dropdown</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => fetchData()} title="Muat semula">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" /> Tambah Jenis Perniagaan
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Active Types */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="h-4 w-4" />
            Aktif ({activeTypes.length})
          </CardTitle>
          <CardDescription>Jenis perniagaan yang muncul dalam dropdown permohonan</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Memuatkan...</span>
            </div>
          ) : activeTypes.length === 0 ? (
            <div className="py-8 text-center">
              <Store className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Tiada jenis perniagaan aktif</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Susun</TableHead>
                  <TableHead>Nama Jenis Perniagaan</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[130px] text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeTypes.map((bt) => (
                  <TableRow key={bt.id}>
                    <TableCell className="text-center text-muted-foreground text-xs font-mono">
                      {bt.sortOrder}
                    </TableCell>
                    <TableCell className="font-medium">{bt.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                        Aktif
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(bt)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(bt)}
                          title="Nyahaktifkan"
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteBt(bt)}
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
          )}
        </CardContent>
      </Card>

      {/* Inactive Types */}
      {inactiveTypes.length > 0 && (
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
              <Ban className="h-4 w-4" />
              Tidak Aktif ({inactiveTypes.length})
            </CardTitle>
            <CardDescription>Jenis perniagaan yang telah dinyahaktifkan dan tidak muncul dalam dropdown</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Susun</TableHead>
                  <TableHead>Nama Jenis Perniagaan</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[130px] text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inactiveTypes.map((bt) => (
                  <TableRow key={bt.id} className="opacity-60">
                    <TableCell className="text-center text-muted-foreground text-xs font-mono">
                      {bt.sortOrder}
                    </TableCell>
                    <TableCell className="font-medium">{bt.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] bg-gray-50 text-gray-500 border-gray-200">
                        Tidak Aktif
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(bt)}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(bt)}
                          title="Aktifkan semula"
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteBt(bt)}
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
          </CardContent>
        </Card>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm(); } }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{editingBt ? 'Edit Jenis Perniagaan' : 'Tambah Jenis Perniagaan Baharu'}</DialogTitle>
            <DialogDescription>
              {editingBt
                ? 'Kemas kini maklumat jenis perniagaan.'
                : 'Tambah jenis perniagaan baharu yang akan muncul dalam dropdown permohonan.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="bt-name">Nama Jenis Perniagaan *</Label>
              <Input
                id="bt-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Cth: Restoran / Kedai Makan"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="bt-sortOrder">Susunan</Label>
                <Input
                  id="bt-sortOrder"
                  type="number"
                  min="0"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  placeholder="0"
                />
              </div>

              {editingBt && (
                <div className="grid gap-2">
                  <Label htmlFor="bt-active">Status</Label>
                  <div className="flex items-center gap-2 h-9">
                    <Switch
                      id="bt-active"
                      checked={form.isActive}
                      onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
                    />
                    <span className="text-sm">{form.isActive ? 'Aktif' : 'Tidak Aktif'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingBt ? 'Simpan Perubahan' : 'Tambah'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteBt} onOpenChange={(open) => { if (!open) setDeleteBt(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-700">⚠️ Padam Jenis Perniagaan</AlertDialogTitle>
            <AlertDialogDescription>
              Adakah anda pasti ingin memadam <strong>{deleteBt?.name}</strong>?
              {deleteBt?.isActive
                ? ' Jika jenis perniagaan ini sedang digunakan oleh permohonan, ia akan dinyahaktifkan sahaja dan tidak akan dipadam.'
                : ' Tindakan ini tidak boleh dibatalkan.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="h-4 w-4 mr-2" />
              Padam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
                            <p className="font-medium text-sm">{formatStepNameLocal(config.stepName)}</p>
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

// Helper to format step names (local fallback)
function formatStepNameLocal(step: string): string {
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

      {/* Daily Received Report */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="h-5 w-5 text-sky-600" />
          <h3 className="text-base font-semibold">Laporan Penerimaan Harian</h3>
        </div>
        <DailyReceivedReport userRole="ADMIN" />
      </div>

      <Separator />

      {/* Dashboard */}
      <div>
        <h3 className="text-base font-semibold mb-4">Papan Pemuka</h3>
        <Dashboard />
      </div>

      <Separator />

      {/* Performance */}
      <div>
        <h3 className="text-base font-semibold mb-4">Prestasi Proses</h3>
        <Performance />
      </div>
    </div>
  );
}
