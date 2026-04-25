'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useFetch, postData } from '@/hooks/use-fetch';
import { APPLICATION_TYPES, ZONES, getPPKPRole, getPPLRole } from '@/lib/constants';
import {
  formatStatus,
  getStatusColor,
  formatApplicationType,
  getZoneColor,
  formatDateTime,
  getRemainingTime,
} from '@/lib/formatters';
import { toast } from 'sonner';
import {
  UserPlus,
  FileText,
  Send,
  Loader2,
  CheckCircle2,
  Search,
  RefreshCw,
  X,
  Clock,
  AlertTriangle,
  ChevronRight,
  ClipboardList,
  ArrowRight,
} from 'lucide-react';

interface KaunterDashboardProps {
  user: {
    id: string;
    username: string;
    role: string;
    name: string;
    zone: string | null;
  };
  onSelectApp: (appId: string) => void;
}

// --- Inline types matching API response ---
interface ApplicationStep {
  id: string;
  step: string;
  status: string;
  assignedToId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  slaDays: number;
  slaDeadline: string | null;
  comments: string | null;
}

interface StaffInfo {
  id: string;
  name: string;
  role: string;
}

interface Application {
  id: string;
  referenceNo: string;
  applicantName: string;
  applicantIc: string;
  applicationType: string;
  zone: string;
  status: string;
  fileNumber: string | null;
  currentStep: string;
  plbDecision: string | null;
  createdAt: string;
  updatedAt: string;
  steps: ApplicationStep[];
  ptStaff: StaffInfo | null;
  ppkpStaff: StaffInfo | null;
  pplStaff: StaffInfo | null;
  plbStaff: StaffInfo | null;
  currentStepStatus: string | null;
  currentStepName: string | null;
  isOverdue: boolean;
  remainingDays: number | null;
  applicationTypeLabel: string;
}

// ============================================================
// Tab 1 – Daftar Permohonan
// ============================================================
function DaftarPermohonan({ user }: { user: KaunterDashboardProps['user'] }) {
  const [formData, setFormData] = useState({
    applicantName: '',
    applicantIc: '',
    applicantPhone: '',
    applicantAddress: '',
    applicationType: '',
    zone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<any>(null);

  const ppkpRoute = formData.applicationType ? getPPKPRole(formData.applicationType) : null;
  const pplRoute = ppkpRoute ? getPPLRole(ppkpRoute) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.applicantName || !formData.applicantIc || !formData.applicationType || !formData.zone) {
      toast.error('Sila lengkapkan semua ruangan yang diperlukan');
      return;
    }

    setSubmitting(true);
    try {
      const result = await postData('/api/applications', formData);
      setSubmitted(result);
      toast.success('Permohonan berjaya didaftarkan!');
      setFormData({
        applicantName: '',
        applicantIc: '',
        applicantPhone: '',
        applicantAddress: '',
        applicationType: '',
        zone: '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Gagal mendaftarkan permohonan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header with user info */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-700">
          <UserPlus className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">Kaunter — Mendaftar permohonan baru</p>
        </div>
      </div>

      {/* Registration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5" />
            Pendaftaran Permohonan Baru
          </CardTitle>
          <CardDescription>
            Daftar permohonan baru di kaunter. PT akan menerima notifikasi serta-merta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Applicant Info */}
            <div className="space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Maklumat Pemohon
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="applicantName">Nama Pemohon *</Label>
                  <Input
                    id="applicantName"
                    value={formData.applicantName}
                    onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
                    placeholder="Nama penuh / syarikat"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="applicantIc">No. Kad Pengenalan / ROC *</Label>
                  <Input
                    id="applicantIc"
                    value={formData.applicantIc}
                    onChange={(e) => setFormData({ ...formData, applicantIc: e.target.value })}
                    placeholder="IC / No. pendaftaran syarikat"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="applicantPhone">No. Telefon</Label>
                  <Input
                    id="applicantPhone"
                    value={formData.applicantPhone}
                    onChange={(e) => setFormData({ ...formData, applicantPhone: e.target.value })}
                    placeholder="01x-xxxxxxx"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="applicantAddress">Alamat</Label>
                  <Input
                    id="applicantAddress"
                    value={formData.applicantAddress}
                    onChange={(e) => setFormData({ ...formData, applicantAddress: e.target.value })}
                    placeholder="Alamat pemohon"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Application Details */}
            <div className="space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Maklumat Permohonan
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="applicationType">Jenis Permohonan *</Label>
                  <Select
                    value={formData.applicationType}
                    onValueChange={(val) => setFormData({ ...formData, applicationType: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis permohonan" />
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

                <div className="space-y-1.5">
                  <Label htmlFor="zone">Zon *</Label>
                  <Select
                    value={formData.zone}
                    onValueChange={(val) => setFormData({ ...formData, zone: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih zon" />
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
            </div>

            {/* Routing Preview */}
            {formData.applicationType && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-xs font-semibold mb-2">Penghalaan Automatik:</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                    Kaunter
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                    PT (Zon {formData.zone || '?'})
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
                    {ppkpRoute === 'PPKP_L' ? 'PPKP(L) - Lesen' : 'PPKP(P) - Pasar'}
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 max-w-[180px] truncate">
                    {pplRoute === 'PPL_L' ? 'PPL(L) - Penolong Pengarah' : 'PPL(P) - Penolong Pengarah'}
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 max-w-[180px] truncate">
                    PLB - Pengarah Pelesenan Bandaraya
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  SLA: Pembukaan Fail (3 hari) &rarr; PPKP (4 hari) &rarr; PPL (3 hari)
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Mendaftar...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Daftar Permohonan
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Success Message */}
      {submitted && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-800">Permohonan Berjaya Didaftarkan</p>
                <div className="mt-2 space-y-1 text-sm text-emerald-700">
                  <p>
                    No. Rujukan:{' '}
                    <span className="font-mono font-bold">{submitted.referenceNo}</span>
                  </p>
                  <p>Pemohon: {submitted.applicantName}</p>
                  <p>Jenis: {formatApplicationType(submitted.applicationType)}</p>
                  <p>Zon: {submitted.zone}</p>
                  <p>Status: Menunggu PT untuk pembukaan fail</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setSubmitted(null)}
                >
                  Daftar Permohonan Baru
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// Tab 2 – Senarai Permohonan
// ============================================================
function SenaraiPermohonan({
  user,
  onSelectApp,
}: {
  user: KaunterDashboardProps['user'];
  onSelectApp: (appId: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const queryParams = new URLSearchParams();
  if (statusFilter !== 'all') queryParams.set('status', statusFilter);
  if (zoneFilter !== 'all') queryParams.set('zone', zoneFilter);
  if (search) queryParams.set('search', search);

  const { data, loading, refetch } = useFetch<Application[]>(
    `/api/applications?${queryParams.toString()}`,
    { refreshInterval: 15000 }
  );

  const hasFilters = statusFilter !== 'all' || zoneFilter !== 'all' || search !== '';

  const clearFilters = () => {
    setStatusFilter('all');
    setZoneFilter('all');
    setSearch('');
  };

  return (
    <div className="space-y-4">
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
                  <SelectItem value="PENDING_PT">Menunggu PT</SelectItem>
                  <SelectItem value="PT_PROCESSING">PT Memproses</SelectItem>
                  <SelectItem value="PPKP_PROCESSING">PPKP Memproses</SelectItem>
                  <SelectItem value="PPL_REVIEW">PPL Mengulas</SelectItem>
                  <SelectItem value="PLB_DECISION">Pengarah Pelesenan Bandaraya (PLB)</SelectItem>
                  <SelectItem value="COMPLETED">Selesai</SelectItem>
                  <SelectItem value="REJECTED">Ditolak</SelectItem>
                </SelectContent>
              </Select>

              <Select value={zoneFilter} onValueChange={setZoneFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Zon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Zon</SelectItem>
                  {ZONES.map((z) => (
                    <SelectItem key={z} value={z}>
                      Zon {z}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline" size="icon" onClick={() => refetch()} title="Muat semula">
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

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data ? `${data.length} permohonan dijumpai` : 'Memuatkan...'}
        </p>
      </div>

      {/* Application Cards */}
      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-36 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data && data.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Tiada permohonan dijumpai</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.map((app) => {
            const currentStepData = app.steps.find(
              (s) => s.status === 'IN_PROGRESS' || s.status === 'PENDING'
            );
            const { text: remainingText, isOverdue: stepOverdue, isWarning } = getRemainingTime(
              currentStepData?.slaDeadline || null
            );

            return (
              <Card
                key={app.id}
                className={`cursor-pointer transition-all hover:shadow-md border-l-4 ${
                  app.isOverdue
                    ? 'border-l-red-500'
                    : app.status === 'COMPLETED'
                      ? 'border-l-emerald-500'
                      : app.status === 'REJECTED'
                        ? 'border-l-red-400'
                        : 'border-l-sky-500'
                }`}
                onClick={() => onSelectApp(app.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">{app.applicantName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{app.referenceNo}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ml-2 ${getStatusColor(app.status)}`}>
                      {formatStatus(app.status)}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <Badge variant="outline" className={`text-[10px] ${getZoneColor(app.zone)}`}>
                      Zon {app.zone}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] max-w-[140px] truncate">
                      {app.applicationTypeLabel}
                    </Badge>
                    {app.fileNumber && (
                      <Badge variant="outline" className="text-[10px] bg-gray-50 max-w-[120px] truncate">
                        {app.fileNumber}
                      </Badge>
                    )}
                  </div>

                  {/* Current step info - simplified for Kaunter (no action required) */}
                  {app.status !== 'COMPLETED' && app.status !== 'REJECTED' && currentStepData && (
                    <div
                      className={`rounded-md p-2 mb-3 ${
                        stepOverdue
                          ? 'bg-red-50 border border-red-200'
                          : isWarning
                            ? 'bg-amber-50 border border-amber-200'
                            : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {stepOverdue ? (
                          <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {app.currentStepName || 'Memproses'}
                        </span>
                      </div>
                      {currentStepData.slaDeadline && (
                        <p
                          className={`text-[10px] mt-1 ml-5 ${
                            stepOverdue ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-muted-foreground'
                          }`}
                        >
                          {remainingText}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Completed info */}
                  {(app.status === 'COMPLETED' || app.status === 'REJECTED') && app.plbDecision && (
                    <div className={`rounded-md p-2 mb-3 ${
                      app.status === 'REJECTED'
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-emerald-50 border border-emerald-200'
                    }`}>
                      <p className={`text-xs ${
                        app.status === 'REJECTED' ? 'text-red-700' : 'text-emerald-700'
                      }`}>
                        Keputusan:{' '}
                        {app.plbDecision === 'SIMPAN_FAIL'
                          ? 'Simpan Fail'
                          : app.plbDecision === 'JABATAN_KESIHATAN'
                            ? 'Hantar ke J. Kesihatan'
                            : app.plbDecision === 'JABATAN_PERANCANG_BANDAR'
                              ? 'Hantar ke J. Perancang Bandar'
                              : 'Ditolak'}
                      </p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Diterima: {formatDateTime(app.createdAt)}</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main Dashboard
// ============================================================
export default function KaunterDashboard({ user, onSelectApp }: KaunterDashboardProps) {
  return (
    <div className="space-y-4">
      {/* Role header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-700">
          <ClipboardList className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Dashboard Kaunter</h2>
          <p className="text-sm text-muted-foreground">
            {user.name} — Daftar &amp; urus permohonan baharu
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="daftar" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="daftar" className="gap-1.5">
            <UserPlus className="h-4 w-4" />
            Daftar Permohonan
          </TabsTrigger>
          <TabsTrigger value="senarai" className="gap-1.5">
            <ClipboardList className="h-4 w-4" />
            Senarai Permohonan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daftar">
          <DaftarPermohonan user={user} />
        </TabsContent>

        <TabsContent value="senarai">
          <SenaraiPermohonan user={user} onSelectApp={onSelectApp} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
