'use client';

import { useState, useMemo } from 'react';
import { useFetch, postData } from '@/hooks/use-fetch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FolderOpen,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  MapPin,
  Loader2,
  Bell,
  ClipboardList,
  ArrowRight,
  Hash,
  Inbox,
  Activity,
  CircleCheck,
  CircleAlert,
  CircleDot,
  Briefcase,
  CalendarDays,
} from 'lucide-react';
import DailyReceivedReport from '@/components/reports/daily-received-report';
import {
  formatStatus,
  getStatusColor,
  formatApplicationType,
  getZoneColor,
  formatDateTime,
  getRemainingTime,
  getDuration,
} from '@/lib/formatters';
import { APPLICATION_TYPES, getPPKPRole } from '@/lib/constants';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

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
  assignedTo?: { id: string; name: string; role: string } | null;
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
  applicantPhone: string | null;
  applicantAddress: string | null;
  applicationType: string;
  zone: string;
  status: string;
  fileNumber: string | null;
  currentStep: string;
  plbDecision: string | null;
  plbDecisionNotes: string | null;
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

interface PTDashboardProps {
  user: {
    id: string;
    username: string;
    role: string;
    name: string;
    zone: string | null;
  };
  onSelectApp: (appId: string) => void;
}

// ─── SLA Badge Component ─────────────────────────────────────────────────────

function SLABadge({ deadline }: { deadline: string | null }) {
  const { text, isOverdue, isWarning } = getRemainingTime(deadline);

  if (!deadline) return null;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
        isOverdue
          ? 'bg-red-100 text-red-700 border border-red-200'
          : isWarning
          ? 'bg-amber-100 text-amber-700 border border-amber-200'
          : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
      }`}
    >
      {isOverdue ? (
        <CircleAlert className="h-3.5 w-3.5" />
      ) : isWarning ? (
        <AlertTriangle className="h-3.5 w-3.5" />
      ) : (
        <Clock className="h-3.5 w-3.5" />
      )}
      {text}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function PTDashboard({ user, onSelectApp }: PTDashboardProps) {
  const { data: applications, loading, refetch } = useFetch<Application[]>(
    `/api/applications${user.zone ? `?zone=${user.zone}` : ''}`,
    { refreshInterval: 30000 }
  );

  // Dialog state
  const [openFileDialog, setOpenFileDialog] = useState(false);
  const [registerFileDialog, setRegisterFileDialog] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [comments, setComments] = useState('');
  const [fileNumber, setFileNumber] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // ─── Filtered Data ───────────────────────────────────────────────────────

  const { pendingApps, inProgressApps, completedApps } = useMemo(() => {
    if (!applications) return { pendingApps: [], inProgressApps: [], completedApps: [] };

    const zoneApps = applications.filter((app) => !user.zone || app.zone === user.zone);

    const pending = zoneApps.filter((app) => app.status === 'PENDING_PT');
    const inProgress = zoneApps.filter((app) => app.status === 'PT_PROCESSING');
    const completed = zoneApps.filter(
      (app) =>
        app.status !== 'PENDING_PT' &&
        app.status !== 'PT_PROCESSING' &&
        app.steps.some(
          (s) =>
            (s.step === 'PT_FILE_OPENING' || s.step === 'PT_FILE_REGISTRATION') &&
            s.status === 'COMPLETED' &&
            s.assignedToId === user.id
        )
    );

    // Sort by most urgent (overdue first, then by deadline)
    const sortByUrgency = (a: Application, b: Application) => {
      const aStep = a.steps.find((s) => s.status === 'IN_PROGRESS' || s.status === 'PENDING');
      const bStep = b.steps.find((s) => s.status === 'IN_PROGRESS' || s.status === 'PENDING');
      const aOverdue = aStep?.slaDeadline ? new Date(aStep.slaDeadline) < new Date() : false;
      const bOverdue = bStep?.slaDeadline ? new Date(bStep.slaDeadline) < new Date() : false;
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      if (aStep?.slaDeadline && bStep?.slaDeadline) {
        return new Date(aStep.slaDeadline).getTime() - new Date(bStep.slaDeadline).getTime();
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    };

    pending.sort(sortByUrgency);
    inProgress.sort(sortByUrgency);
    completed.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return { pendingApps: pending, inProgressApps: inProgress, completedApps: completed.slice(0, 10) };
  }, [applications, user.zone, user.id]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const getSLADeadline = (app: Application): string | null => {
    const step = app.steps.find((s) => s.status === 'IN_PROGRESS' || s.status === 'PENDING');
    return step?.slaDeadline || null;
  };

  const getPPKPRouteLabel = (applicationType: string): string => {
    const ppkpRole = getPPKPRole(applicationType);
    return ppkpRole === 'PPKP_L' ? 'PPKP(L)' : 'PPKP(P)';
  };

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleOpenFile = async () => {
    if (!selectedAppId) return;
    setActionLoading(true);
    try {
      await postData(`/api/applications/${selectedAppId}/action`, {
        action: 'OPEN_FILE',
        comments: comments || 'Fail berjaya dibuka',
      });
      toast.success('Fail berjaya dibuka!');
      setOpenFileDialog(false);
      setComments('');
      setSelectedAppId(null);
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Gagal membuka fail');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegisterFile = async () => {
    if (!selectedAppId || !fileNumber.trim()) return;
    setActionLoading(true);
    try {
      await postData(`/api/applications/${selectedAppId}/action`, {
        action: 'REGISTER_FILE',
        fileNumber: fileNumber.trim(),
      });
      toast.success('Nombor fail berjaya didaftarkan!');
      setRegisterFileDialog(false);
      setFileNumber('');
      setSelectedAppId(null);
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Gagal mendaftarkan nombor fail');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Loading State ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-10 bg-muted rounded w-1/2" />
              <div className="h-24 bg-muted rounded" />
              <div className="h-24 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ── Header Card ───────────────────────────────────────────────────── */}
      <Card className="border-sky-200 bg-gradient-to-r from-sky-50 to-white">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-sky-600" />
                <h2 className="text-lg font-bold text-sky-900">Dashboard Pembantu Tadbir (PT)</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Selamat datang, <span className="font-medium">{user.name}</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              {user.zone && (
                <Badge variant="outline" className={`text-sm px-3 py-1 ${getZoneColor(user.zone)}`}>
                  <MapPin className="h-3.5 w-3.5 mr-1" />
                  Zon {user.zone}
                </Badge>
              )}
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1.5 rounded-md bg-amber-100 border border-amber-200 px-3 py-1.5">
                  <Inbox className="h-3.5 w-3.5 text-amber-600" />
                  <span className="font-semibold text-amber-700">{pendingApps.length}</span>
                  <span className="text-amber-600">Menunggu</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-md bg-sky-100 border border-sky-200 px-3 py-1.5">
                  <Activity className="h-3.5 w-3.5 text-sky-600" />
                  <span className="font-semibold text-sky-700">{inProgressApps.length}</span>
                  <span className="text-sky-600">Aktif</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Pending Applications ──────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center h-7 w-7 rounded-md bg-amber-100">
            <Bell className="h-4 w-4 text-amber-600" />
          </div>
          <h3 className="text-base font-semibold">Permohonan Menunggu</h3>
          <Badge variant="secondary" className="text-xs">
            {pendingApps.length}
          </Badge>
        </div>

        {pendingApps.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Tiada permohonan menunggu pembukaan fail</p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="max-h-[600px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-2">
              {pendingApps.map((app) => {
                const slaDeadline = getSLADeadline(app);
                const ptStep = app.steps.find((s) => s.step === 'PT_FILE_OPENING');
                const { isOverdue: stepOverdue } = getRemainingTime(slaDeadline);

                return (
                  <Card
                    key={app.id}
                    className={`transition-all hover:shadow-md ${
                      stepOverdue ? 'border-red-300 bg-red-50/30' : 'border-amber-200'
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm font-semibold truncate">
                            {app.applicantName}
                          </CardTitle>
                          <CardDescription className="text-xs font-mono mt-0.5">
                            {app.referenceNo}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${getStatusColor(app.status)}`}>
                          {formatStatus(app.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Application details */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">Jenis:</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 max-w-[120px] truncate">
                            {app.applicationTypeLabel}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">Zon:</span>
                          <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${getZoneColor(app.zone)}`}>
                            {app.zone}
                          </Badge>
                        </div>
                      </div>

                      {/* Routing info */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ArrowRight className="h-3 w-3 shrink-0" />
                        <span>Akan dihantar ke:</span>
                        <span className="font-medium text-foreground">
                          {getPPKPRouteLabel(app.applicationType)}
                        </span>
                      </div>

                      {/* SLA Countdown */}
                      <div className="flex items-center justify-between">
                        <SLABadge deadline={slaDeadline} />
                        <span className="text-[10px] text-muted-foreground">
                          Diterima: {formatDateTime(app.createdAt)}
                        </span>
                      </div>

                      {/* Overdue warning */}
                      {stepOverdue && (
                        <div className="rounded-md bg-red-50 border border-red-200 p-2">
                          <p className="text-[11px] text-red-700 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            SLA telah melebihi tempoh 3 hari! Sila buka fail dengan segera.
                          </p>
                        </div>
                      )}

                      <Separator />

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedAppId(app.id);
                            setOpenFileDialog(true);
                          }}
                        >
                          <FolderOpen className="h-3.5 w-3.5 mr-1.5" />
                          Buka Fail
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSelectApp(app.id)}
                        >
                          <ClipboardList className="h-3.5 w-3.5 mr-1" />
                          Butiran
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </section>

      {/* ── In Progress Applications ──────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center h-7 w-7 rounded-md bg-sky-100">
            <Activity className="h-4 w-4 text-sky-600" />
          </div>
          <h3 className="text-base font-semibold">Permohonan Aktif</h3>
          <Badge variant="secondary" className="text-xs">
            {inProgressApps.length}
          </Badge>
        </div>

        {inProgressApps.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Tiada permohonan sedang diproses</p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="max-h-[600px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-2">
              {inProgressApps.map((app) => {
                const ptStep = app.steps.find((s) => s.step === 'PT_FILE_OPENING');
                const regStep = app.steps.find((s) => s.step === 'PT_FILE_REGISTRATION');

                return (
                  <Card
                    key={app.id}
                    className="border-sky-200 transition-all hover:shadow-md"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-sm font-semibold truncate">
                            {app.applicantName}
                          </CardTitle>
                          <CardDescription className="text-xs font-mono mt-0.5">
                            {app.referenceNo}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${getStatusColor(app.status)}`}>
                          {formatStatus(app.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* File opening info */}
                      <div className="rounded-md bg-sky-50 border border-sky-200 p-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <FolderOpen className="h-3.5 w-3.5 text-sky-600" />
                          <span className="text-xs font-medium text-sky-700">Fail Telah Dibuka</span>
                        </div>
                        <div className="text-[11px] text-sky-600 space-y-0.5">
                          {ptStep?.completedAt && (
                            <p>Dibuka pada: {formatDateTime(ptStep.completedAt)}</p>
                          )}
                          {ptStep?.comments && (
                            <p className="italic">{ptStep.comments}</p>
                          )}
                        </div>
                      </div>

                      {/* Application details */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">Jenis:</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 max-w-[120px] truncate">
                            {app.applicationTypeLabel}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">Zon:</span>
                          <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${getZoneColor(app.zone)}`}>
                            {app.zone}
                          </Badge>
                        </div>
                      </div>

                      {/* Routing info */}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ArrowRight className="h-3 w-3 shrink-0" />
                        <span>Akan dihantar ke:</span>
                        <span className="font-medium text-foreground">
                          {getPPKPRouteLabel(app.applicationType)}
                        </span>
                      </div>

                      {/* Registration step info */}
                      {regStep && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Hash className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Status pendaftaran:</span>
                          <Badge variant="outline" className="text-[10px] h-4 bg-sky-50 text-sky-700 border-sky-200 max-w-[180px] truncate">
                            Menunggu pendaftaran nombor fail
                          </Badge>
                        </div>
                      )}

                      <Separator />

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedAppId(app.id);
                            setRegisterFileDialog(true);
                          }}
                        >
                          <Hash className="h-3.5 w-3.5 mr-1.5" />
                          Daftar No. Fail
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSelectApp(app.id)}
                        >
                          <ClipboardList className="h-3.5 w-3.5 mr-1" />
                          Butiran
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </section>

      {/* ── Recently Completed ────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center h-7 w-7 rounded-md bg-emerald-100">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <h3 className="text-base font-semibold">Baru Selesai</h3>
          <Badge variant="secondary" className="text-xs">
            {completedApps.length}
          </Badge>
        </div>

        {completedApps.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Tiada permohonan yang baru selesai</p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2 pr-2">
              {completedApps.map((app) => {
                const ptStep = app.steps.find((s) => s.step === 'PT_FILE_OPENING');
                const regStep = app.steps.find((s) => s.step === 'PT_FILE_REGISTRATION');
                const completedWithinSLA =
                  ptStep?.slaDeadline && ptStep?.completedAt
                    ? new Date(ptStep.completedAt) <= new Date(ptStep.slaDeadline)
                    : null;

                return (
                  <Card
                    key={app.id}
                    className="border-emerald-200 hover:shadow-sm transition-all cursor-pointer"
                    onClick={() => onSelectApp(app.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{app.applicantName}</span>
                            <Badge variant="outline" className={`text-[10px] shrink-0 ${getStatusColor(app.status)}`}>
                              {formatStatus(app.status)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="font-mono">{app.referenceNo}</span>
                            {app.fileNumber && (
                              <>
                                <span className="text-muted-foreground/50">|</span>
                                <span className="font-mono font-medium text-foreground">{app.fileNumber}</span>
                              </>
                            )}
                            <span className="text-muted-foreground/50">|</span>
                            <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${getZoneColor(app.zone)}`}>
                              Zon {app.zone}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {completedWithinSLA !== null && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] h-5 ${
                                completedWithinSLA
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-red-50 text-red-700 border-red-200'
                              }`}
                            >
                              {completedWithinSLA ? (
                                <>
                                  <CircleCheck className="h-3 w-3 mr-0.5" />
                                  Tepat Masa
                                </>
                              ) : (
                                <>
                                  <CircleAlert className="h-3 w-3 mr-0.5" />
                                  Lewat
                                </>
                              )}
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            {formatDateTime(app.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </section>

      {/* ── Daily Report Section ──────────────────────────────────────────────── */}
      <section>
        <Separator className="my-4" />
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center h-7 w-7 rounded-md bg-sky-100">
            <CalendarDays className="h-4 w-4 text-sky-600" />
          </div>
          <h3 className="text-base font-semibold">Laporan Penerimaan Harian</h3>
        </div>
        <DailyReceivedReport userRole={user.role} />
      </section>

      {/* ── Open File Dialog ──────────────────────────────────────────────── */}
      <Dialog open={openFileDialog} onOpenChange={setOpenFileDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-sky-600" />
              Buka Fail Permohonan
            </DialogTitle>
            <DialogDescription>
              Sahkan pembukaan fail untuk permohonan ini. Tindakan ini akan memulakan proses pendaftaran nombor fail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedAppId && applications && (
              <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
                {(() => {
                  const app = applications.find((a) => a.id === selectedAppId);
                  if (!app) return null;
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pemohon</span>
                        <span className="font-medium">{app.applicantName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">No. Rujukan</span>
                        <span className="font-mono">{app.referenceNo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Jenis</span>
                        <span>{app.applicationTypeLabel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Zon</span>
                        <Badge variant="outline" className={`text-[10px] ${getZoneColor(app.zone)}`}>
                          Zon {app.zone}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dihantar ke</span>
                        <span className="font-medium">{getPPKPRouteLabel(app.applicationType)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="open-comments">Catatan Pembukaan Fail</Label>
              <Textarea
                id="open-comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Masukkan catatan pembukaan fail (pilihan)..."
                rows={3}
              />
            </div>
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-700 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Pastikan fail dibuka dalam tempoh SLA (3 hari dari penerimaan permohonan).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpenFileDialog(false);
                setComments('');
                setSelectedAppId(null);
              }}
              disabled={actionLoading}
            >
              Batal
            </Button>
            <Button onClick={handleOpenFile} disabled={actionLoading}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <FolderOpen className="h-4 w-4 mr-2" />
              )}
              Sahkan Buka Fail
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Register File Number Dialog ───────────────────────────────────── */}
      <Dialog open={registerFileDialog} onOpenChange={setRegisterFileDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-sky-600" />
              Daftar Nombor Fail
            </DialogTitle>
            <DialogDescription>
              Masukkan nombor fail rasmi. Fail akan dihantar kepada PPKP untuk pemprosesan seterusnya.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {selectedAppId && applications && (
              <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
                {(() => {
                  const app = applications.find((a) => a.id === selectedAppId);
                  if (!app) return null;
                  return (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pemohon</span>
                        <span className="font-medium">{app.applicantName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">No. Rujukan</span>
                        <span className="font-mono">{app.referenceNo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Jenis</span>
                        <span>{app.applicationTypeLabel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Dihantar ke</span>
                        <span className="font-medium">{getPPKPRouteLabel(app.applicationType)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="file-number">Nombor Fail Rasmi *</Label>
              <Input
                id="file-number"
                value={fileNumber}
                onChange={(e) => setFileNumber(e.target.value)}
                placeholder="cth: MPSP/L/2024/001"
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                Masukkan nombor fail rasmi mengikut format yang ditetapkan.
              </p>
            </div>
            <div className="rounded-md bg-sky-50 border border-sky-200 p-3">
              <p className="text-xs text-sky-700 flex items-center gap-1.5">
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                Fail akan dihantar kepada PPKP secara automatik selepas pendaftaran nombor fail.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRegisterFileDialog(false);
                setFileNumber('');
                setSelectedAppId(null);
              }}
              disabled={actionLoading}
            >
              Batal
            </Button>
            <Button onClick={handleRegisterFile} disabled={actionLoading || !fileNumber.trim()}>
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Hash className="h-4 w-4 mr-2" />
              )}
              Sahkan Pendaftaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
