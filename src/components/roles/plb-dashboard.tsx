'use client';

import { useState } from 'react';
import { useFetch, postData } from '@/hooks/use-fetch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Clock,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  User,
  Gavel,
  RefreshCw,
  Archive,
  Building2,
  Landmark,
} from 'lucide-react';
import {
  formatStatus,
  getStatusColor,
  formatApplicationType,
  getZoneColor,
  formatDateTime,
  getRemainingTime,
  formatStepName,
  formatStaffRole,
  formatPlbDecision,
} from '@/lib/formatters';
import { APPLICATION_TYPES, WORKFLOW_STEPS, PLB_DECISIONS } from '@/lib/constants';
import { toast } from 'sonner';

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

interface PLBDashboardProps {
  user: { id: string; username: string; role: string; name: string; zone: string | null };
  onSelectApp: (appId: string) => void;
}

export default function PLBDashboard({ user, onSelectApp }: PLBDashboardProps) {
  const [decisionMap, setDecisionMap] = useState<Record<string, string>>({});
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<string, boolean>>({});

  const { data: allApplications, loading, error, refetch } = useFetch<Application[]>(
    '/api/applications',
    { refreshInterval: 15000 }
  );

  // Applications waiting for PLB decision
  const pendingApplications = (allApplications || []).filter(
    (app) => app.status === 'PLB_DECISION'
  );

  // Recently completed applications with PLB decisions
  const completedApplications = (allApplications || [])
    .filter((app) => app.status === 'COMPLETED' && app.plbDecision)
    .slice(0, 10);

  const handleDecisionChange = (appId: string, value: string) => {
    setDecisionMap((prev) => ({ ...prev, [appId]: value }));
  };

  const handleNotesChange = (appId: string, value: string) => {
    setNotesMap((prev) => ({ ...prev, [appId]: value }));
  };

  const handlePLBDecide = async (appId: string) => {
    const decision = decisionMap[appId] || '';
    if (!decision) {
      toast.error('Sila pilih keputusan terlebih dahulu.');
      return;
    }

    setActionLoadingMap((prev) => ({ ...prev, [appId]: true }));
    try {
      const notes = notesMap[appId] || '';
      await postData(`/api/applications/${appId}/action`, {
        action: 'PLB_DECIDE',
        plbDecision: decision,
        plbDecisionNotes: notes,
      });
      toast.success('Keputusan berjaya disahkan!');
      setDecisionMap((prev) => {
        const next = { ...prev };
        delete next[appId];
        return next;
      });
      setNotesMap((prev) => {
        const next = { ...prev };
        delete next[appId];
        return next;
      });
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Tindakan gagal diproses');
    } finally {
      setActionLoadingMap((prev) => ({ ...prev, [appId]: false }));
    }
  };

  // Helper to get PPKP comments from the PPKP step
  const getPPKPComments = (app: Application): string => {
    const ppkpStep = app.steps.find((s) => s.step === 'PPKP_PROCESSING');
    return ppkpStep?.comments || '-';
  };

  // Helper to get PPL ulasan from the PPL step
  const getPPLUlasan = (app: Application): string => {
    const pplStep = app.steps.find((s) => s.step === 'PPL_REVIEW');
    return pplStep?.comments || '-';
  };

  const getDecisionIcon = (decision: string | null) => {
    if (!decision) return <Gavel className="h-4 w-4" />;
    switch (decision) {
      case 'SIMPAN_FAIL':
        return <Archive className="h-4 w-4" />;
      case 'JABATAN_KESIHATAN':
        return <Building2 className="h-4 w-4" />;
      case 'JABATAN_PERANCANG_BANDAR':
        return <Landmark className="h-4 w-4" />;
      default:
        return <Gavel className="h-4 w-4" />;
    }
  };

  const getDecisionBadgeColor = (decision: string | null) => {
    if (!decision) return '';
    switch (decision) {
      case 'SIMPAN_FAIL':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'JABATAN_KESIHATAN':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'JABATAN_PERANCANG_BANDAR':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return '';
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-600 font-medium">Ralat memuatkan data</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
          <Button variant="outline" className="mt-3" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Cuba Semula
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-orange-100 p-2.5">
                <Gavel className="h-5 w-5 text-orange-700" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-orange-900">
                  Pengarah Pelesenan Bandaraya
                </h2>
                <p className="text-sm text-orange-600">
                  Menerima fail yang telah diulas oleh PPL
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200 max-w-[150px] truncate">
                <User className="h-3 w-3 mr-1 shrink-0" />
                <span className="truncate">{user.name}</span>
              </Badge>
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-700">{pendingApplications.length}</p>
            <p className="text-xs text-muted-foreground">Menunggu Keputusan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{completedApplications.length}</p>
            <p className="text-xs text-muted-foreground">Selesai</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-sky-600">
              {completedApplications.filter((a) => a.plbDecision === 'JABATAN_KESIHATAN').length}
            </p>
            <p className="text-xs text-muted-foreground">Hantar ke J. Kesihatan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {completedApplications.filter((a) => a.plbDecision === 'JABATAN_PERANCANG_BANDAR').length}
            </p>
            <p className="text-xs text-muted-foreground">Hantar ke J. Perancang</p>
          </CardContent>
        </Card>
      </div>

      {/* Fail Menunggu Keputusan */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Gavel className="h-4 w-4 text-orange-600" />
          <h3 className="font-semibold text-sm">Fail Menunggu Keputusan</h3>
          <Badge variant="outline" className="text-[10px] bg-orange-50">
            {pendingApplications.length} fail
          </Badge>
        </div>

        {loading && !allApplications ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-64 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : pendingApplications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">Tiada fail menunggu keputusan</p>
              <p className="text-xs text-muted-foreground mt-1">
                Semua fail telah diputuskan
              </p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="max-h-[calc(100vh-420px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-2">
              {pendingApplications.map((app) => {
                const ppkpComments = getPPKPComments(app);
                const pplUlasan = getPPLUlasan(app);
                const decisionValue = decisionMap[app.id] || '';
                const notesValue = notesMap[app.id] || '';
                const isLoading = actionLoadingMap[app.id] || false;

                return (
                  <Card
                    key={app.id}
                    className="border-l-4 border-l-orange-500 transition-all hover:shadow-md"
                  >
                    <CardContent className="p-4 space-y-3">
                      {/* Card Header */}
                      <div
                        className="flex items-start justify-between cursor-pointer"
                        onClick={() => onSelectApp(app.id)}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate">{app.applicantName}</p>
                          <p className="text-xs text-muted-foreground">{app.referenceNo}</p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ml-2 ${getStatusColor(app.status)}`}>
                          {formatStatus(app.status)}
                        </Badge>
                      </div>

                      {/* Tags */}
                      <div
                        className="flex flex-wrap gap-1.5 cursor-pointer"
                        onClick={() => onSelectApp(app.id)}
                      >
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

                      {/* PPKP Comments */}
                      <div
                        className="rounded-md bg-violet-50 border border-violet-100 p-2.5 cursor-pointer"
                        onClick={() => onSelectApp(app.id)}
                      >
                        <p className="text-[10px] font-medium text-violet-700 mb-1">
                          Catatan PPKP:
                        </p>
                        <p className="text-xs text-violet-800 italic line-clamp-2">
                          {ppkpComments}
                        </p>
                      </div>

                      {/* PPL Ulasan */}
                      <div
                        className="rounded-md bg-teal-50 border border-teal-100 p-2.5 cursor-pointer"
                        onClick={() => onSelectApp(app.id)}
                      >
                        <p className="text-[10px] font-medium text-teal-700 mb-1">
                          Ulasan PPL:
                        </p>
                        <p className="text-xs text-teal-800 italic line-clamp-2">
                          {pplUlasan}
                        </p>
                      </div>

                      {/* Staff & Date info */}
                      <div
                        className="flex items-center justify-between text-[10px] text-muted-foreground cursor-pointer"
                        onClick={() => onSelectApp(app.id)}
                      >
                        <div className="flex gap-3">
                          {app.ppkpStaff && (
                            <span>
                              {formatStaffRole(app.ppkpStaff.role)}: {app.ppkpStaff.name}
                            </span>
                          )}
                          {app.pplStaff && (
                            <span>
                              {formatStaffRole(app.pplStaff.role)}: {app.pplStaff.name}
                            </span>
                          )}
                        </div>
                        <span>{formatDateTime(app.updatedAt)}</span>
                      </div>

                      <Separator />

                      {/* Decision Action Area */}
                      <div className="space-y-2.5">
                        <div className="space-y-1.5">
                          <Label htmlFor={`plb-decision-${app.id}`} className="text-xs">
                            Keputusan *
                          </Label>
                          <Select
                            value={decisionValue}
                            onValueChange={(val) => handleDecisionChange(app.id, val)}
                          >
                            <SelectTrigger
                              id={`plb-decision-${app.id}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <SelectValue placeholder="Pilih keputusan" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(PLB_DECISIONS).map(([key, val]) => (
                                <SelectItem key={key} value={key}>
                                  {val.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor={`plb-notes-${app.id}`} className="text-xs">
                            Catatan Keputusan
                          </Label>
                          <Textarea
                            id={`plb-notes-${app.id}`}
                            value={notesValue}
                            onChange={(e) => handleNotesChange(app.id, e.target.value)}
                            placeholder="Masukkan catatan keputusan..."
                            rows={2}
                            className="text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePLBDecide(app.id);
                          }}
                          disabled={isLoading || !decisionValue}
                          className="w-full"
                          size="sm"
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                          )}
                          Sahkan Keputusan
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Keputusan Terkini */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <h3 className="font-semibold text-sm">Keputusan Terkini</h3>
          <Badge variant="outline" className="text-[10px] bg-emerald-50">
            {completedApplications.length} keputusan
          </Badge>
        </div>

        {completedApplications.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Tiada keputusan terkini</p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="max-h-72">
            <div className="space-y-2 pr-2">
              {completedApplications.map((app) => (
                <Card
                  key={app.id}
                  className="cursor-pointer transition-all hover:shadow-sm"
                  onClick={() => onSelectApp(app.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{app.applicantName}</p>
                          <Badge variant="outline" className={`text-[10px] ${getZoneColor(app.zone)}`}>
                            Zon {app.zone}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{app.referenceNo}</span>
                          {app.fileNumber && (
                            <span className="text-[10px] text-muted-foreground">
                              | {app.fileNumber}
                            </span>
                          )}
                        </div>
                        {app.plbDecisionNotes && (
                          <p className="text-xs text-muted-foreground italic mt-0.5 truncate">
                            {app.plbDecisionNotes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={`text-[10px] max-w-[160px] truncate ${getDecisionBadgeColor(app.plbDecision)}`}>
                          {getDecisionIcon(app.plbDecision)}
                          <span className="ml-1 truncate">{formatPlbDecision(app.plbDecision || '')}</span>
                        </Badge>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatDateTime(app.updatedAt)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
