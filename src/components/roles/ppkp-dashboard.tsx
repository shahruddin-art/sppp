'use client';

import { useState } from 'react';
import { useFetch, postData } from '@/hooks/use-fetch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
  FolderOpen,
  RefreshCw,
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
} from '@/lib/formatters';
import { APPLICATION_TYPES, WORKFLOW_STEPS } from '@/lib/constants';
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

interface PPKPDashboardProps {
  user: { id: string; username: string; role: string; name: string; zone: string | null };
  onSelectApp: (appId: string) => void;
}

export default function PPKPDashboard({ user, onSelectApp }: PPKPDashboardProps) {
  const [commentsMap, setCommentsMap] = useState<Record<string, string>>({});
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<string, boolean>>({});

  const isPPKPL = user.role === 'PPKP_L';
  const roleLabel = isPPKPL ? 'PPKP(L)' : 'PPKP(P)';
  const assignmentLabel = isPPKPL
    ? 'G1, G1/P, G7, G8, G9, G11, Papan Iklan'
    : 'G2, G3, Permit Sementara';

  const { data: allApplications, loading, error, refetch } = useFetch<Application[]>(
    '/api/applications',
    { refreshInterval: 15000 }
  );

  // Filter applications for this PPKP role
  const applications = (allApplications || []).filter(
    (app) => app.status === 'PPKP_PROCESSING' && app.ppkpStaff?.role === user.role
  );

  const handleCommentChange = (appId: string, value: string) => {
    setCommentsMap((prev) => ({ ...prev, [appId]: value }));
  };

  const handlePPKPComplete = async (appId: string) => {
    setActionLoadingMap((prev) => ({ ...prev, [appId]: true }));
    try {
      const comments = commentsMap[appId] || '';
      await postData(`/api/applications/${appId}/action`, {
        action: 'PPKP_COMPLETE',
        comments,
      });
      toast.success('Pemprosesan selesai! Fail telah dihantar ke PPL.');
      setCommentsMap((prev) => {
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

  const getSlaColorClass = (isOverdue: boolean, isWarning: boolean) => {
    if (isOverdue) return 'text-red-600';
    if (isWarning) return 'text-amber-600';
    return 'text-emerald-600';
  };

  const getSlaBadgeClass = (isOverdue: boolean, isWarning: boolean) => {
    if (isOverdue) return 'bg-red-100 text-red-800 border-red-200';
    if (isWarning) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  };

  const getSlaBorderClass = (isOverdue: boolean, isWarning: boolean) => {
    if (isOverdue) return 'border-l-red-500';
    if (isWarning) return 'border-l-amber-500';
    return 'border-l-emerald-500';
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
      <Card className="border-violet-200 bg-gradient-to-r from-violet-50 to-purple-50">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-violet-100 p-2.5">
                <FolderOpen className="h-5 w-5 text-violet-700" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-violet-900">
                  Dashboard {roleLabel}
                </h2>
                <p className="text-sm text-violet-600">
                  Jenis Fail: {assignmentLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-violet-100 text-violet-800 border-violet-200 max-w-[150px] truncate">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-violet-700">{applications.length}</p>
            <p className="text-xs text-muted-foreground">Menunggu Pemprosesan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {applications.filter((a) => a.isOverdue).length}
            </p>
            <p className="text-xs text-muted-foreground">Lewat SLA</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {applications.filter((a) => {
                const step = a.steps.find((s) => s.step === 'PPKP_PROCESSING');
                if (!step?.slaDeadline) return false;
                const { isWarning, isOverdue } = getRemainingTime(step.slaDeadline);
                return isWarning && !isOverdue;
              }).length}
            </p>
            <p className="text-xs text-muted-foreground">Amaran SLA</p>
          </CardContent>
        </Card>
      </div>

      {/* Permohonan Menunggu */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-4 w-4 text-violet-600" />
          <h3 className="font-semibold text-sm">Permohonan Menunggu</h3>
          <Badge variant="outline" className="text-[10px] bg-violet-50">
            {applications.length} permohonan
          </Badge>
        </div>

        {loading && !allApplications ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-48 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : applications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">Tiada permohonan menunggu</p>
              <p className="text-xs text-muted-foreground mt-1">
                Semua permohonan telah diproses
              </p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="max-h-[calc(100vh-320px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-2">
              {applications.map((app) => {
                const ppkpStep = app.steps.find((s) => s.step === 'PPKP_PROCESSING');
                const { text: remainingText, isOverdue: stepOverdue, isWarning } = getRemainingTime(
                  ppkpStep?.slaDeadline || null
                );
                const isLoading = actionLoadingMap[app.id] || false;

                return (
                  <Card
                    key={app.id}
                    className={`border-l-4 transition-all hover:shadow-md cursor-pointer ${getSlaBorderClass(stepOverdue, isWarning)}`}
                  >
                    <CardContent className="p-4 space-y-3">
                      {/* Card Header */}
                      <div
                        className="flex items-start justify-between"
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
                        className="flex flex-wrap gap-1.5"
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

                      {/* SLA Countdown */}
                      <div
                        className={`rounded-md p-2.5 ${
                          stepOverdue
                            ? 'bg-red-50 border border-red-200'
                            : isWarning
                            ? 'bg-amber-50 border border-amber-200'
                            : 'bg-emerald-50 border border-emerald-200'
                        }`}
                        onClick={() => onSelectApp(app.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {stepOverdue ? (
                              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                            ) : (
                              <Clock className="h-4 w-4 text-emerald-500 shrink-0" />
                            )}
                            <span className="text-xs font-medium">SLA PPKP (4 hari)</span>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${getSlaBadgeClass(stepOverdue, isWarning)}`}
                          >
                            {remainingText}
                          </Badge>
                        </div>
                      </div>

                      {/* PT Staff Info */}
                      {app.ptStaff && (
                        <div
                          className="text-xs text-muted-foreground"
                          onClick={() => onSelectApp(app.id)}
                        >
                          <span className="font-medium">PT:</span> {app.ptStaff.name}
                        </div>
                      )}

                      {/* Date info */}
                      <div
                        className="text-[10px] text-muted-foreground"
                        onClick={() => onSelectApp(app.id)}
                      >
                        Diterima: {formatDateTime(app.createdAt)}
                      </div>

                      <Separator />

                      {/* Action Area */}
                      <div className="space-y-2.5">
                        <div className="space-y-1.5">
                          <Label htmlFor={`ppkp-comment-${app.id}`} className="text-xs">
                            Catatan Pemprosesan
                          </Label>
                          <Textarea
                            id={`ppkp-comment-${app.id}`}
                            value={commentsMap[app.id] || ''}
                            onChange={(e) => handleCommentChange(app.id, e.target.value)}
                            placeholder="Masukkan catatan pemprosesan PPKP..."
                            rows={2}
                            className="text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePPKPComplete(app.id);
                          }}
                          disabled={isLoading}
                          className="w-full"
                          size="sm"
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Selesai Pemprosesan & Hantar ke PPL
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
    </div>
  );
}
