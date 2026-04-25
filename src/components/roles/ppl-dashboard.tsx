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
  MessageSquare,
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

interface PPLDashboardProps {
  user: { id: string; username: string; role: string; name: string; zone: string | null };
  onSelectApp: (appId: string) => void;
}

export default function PPLDashboard({ user, onSelectApp }: PPLDashboardProps) {
  const [ulasanMap, setUlasanMap] = useState<Record<string, string>>({});
  const [actionLoadingMap, setActionLoadingMap] = useState<Record<string, boolean>>({});

  const isPPLL = user.role === 'PPL_L';
  const roleLabel = isPPLL ? 'PPL(L) - Penolong Pengarah Pelesenan' : 'PPL(P) - Penolong Pengarah Pelesenan';
  const assignmentLabel = isPPLL
    ? 'Menerima fail daripada PPKP(L)'
    : 'Menerima fail daripada PPKP(P)';

  const { data: allApplications, loading, error, refetch } = useFetch<Application[]>(
    '/api/applications',
    { refreshInterval: 15000 }
  );

  // Filter applications for this PPL role
  const applications = (allApplications || []).filter(
    (app) => app.status === 'PPL_REVIEW' && app.pplStaff?.role === user.role
  );

  const handleUlasanChange = (appId: string, value: string) => {
    setUlasanMap((prev) => ({ ...prev, [appId]: value }));
  };

  const handlePPLReviewComplete = async (appId: string) => {
    const ulasan = ulasanMap[appId] || '';
    if (!ulasan.trim()) {
      toast.error('Sila masukkan ulasan sebelum menghantar.');
      return;
    }

    setActionLoadingMap((prev) => ({ ...prev, [appId]: true }));
    try {
      await postData(`/api/applications/${appId}/action`, {
        action: 'PPL_REVIEW_COMPLETE',
        comments: ulasan,
      });
      toast.success('Ulasan berjaya dihantar ke PLB!');
      setUlasanMap((prev) => {
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

  // Helper to get PPKP comments from the PPKP step
  const getPPKPComments = (app: Application): string => {
    const ppkpStep = app.steps.find((s) => s.step === 'PPKP_PROCESSING');
    return ppkpStep?.comments || '-';
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
      <Card className="border-teal-200 bg-gradient-to-r from-teal-50 to-cyan-50">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-teal-100 p-2.5">
                <MessageSquare className="h-5 w-5 text-teal-700" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-teal-900">
                  Dashboard {roleLabel}
                </h2>
                <p className="text-sm text-teal-600">
                  {assignmentLabel}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-teal-100 text-teal-800 border-teal-200">
                <User className="h-3 w-3 mr-1" />
                {user.name}
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
            <p className="text-2xl font-bold text-teal-700">{applications.length}</p>
            <p className="text-xs text-muted-foreground">Menunggu Ulasan</p>
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
                const step = a.steps.find((s) => s.step === 'PPL_REVIEW');
                if (!step?.slaDeadline) return false;
                const { isWarning, isOverdue } = getRemainingTime(step.slaDeadline);
                return isWarning && !isOverdue;
              }).length}
            </p>
            <p className="text-xs text-muted-foreground">Amaran SLA</p>
          </CardContent>
        </Card>
      </div>

      {/* Fail Menunggu Ulasan */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-teal-600" />
          <h3 className="font-semibold text-sm">Fail Menunggu Ulasan</h3>
          <Badge variant="outline" className="text-[10px] bg-teal-50">
            {applications.length} fail
          </Badge>
        </div>

        {loading && !allApplications ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-56 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : applications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">Tiada fail menunggu ulasan</p>
              <p className="text-xs text-muted-foreground mt-1">
                Semua fail telah diulas
              </p>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="max-h-[calc(100vh-320px)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pr-2">
              {applications.map((app) => {
                const pplStep = app.steps.find((s) => s.step === 'PPL_REVIEW');
                const { text: remainingText, isOverdue: stepOverdue, isWarning } = getRemainingTime(
                  pplStep?.slaDeadline || null
                );
                const ppkpComments = getPPKPComments(app);
                const ulasanValue = ulasanMap[app.id] || '';
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
                        <div>
                          <p className="font-semibold text-sm">{app.applicantName}</p>
                          <p className="text-xs text-muted-foreground">{app.referenceNo}</p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] ${getStatusColor(app.status)}`}>
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
                        <Badge variant="outline" className="text-[10px]">
                          {app.applicationTypeLabel}
                        </Badge>
                        {app.fileNumber && (
                          <Badge variant="outline" className="text-[10px] bg-gray-50">
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
                            <span className="text-xs font-medium">SLA PPL (3 hari)</span>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${getSlaBadgeClass(stepOverdue, isWarning)}`}
                          >
                            {remainingText}
                          </Badge>
                        </div>
                      </div>

                      {/* PPKP Comments */}
                      <div
                        className="rounded-md bg-violet-50 border border-violet-100 p-2.5"
                        onClick={() => onSelectApp(app.id)}
                      >
                        <p className="text-[10px] font-medium text-violet-700 mb-1">
                          Catatan PPKP:
                        </p>
                        <p className="text-xs text-violet-800 italic line-clamp-2">
                          {ppkpComments}
                        </p>
                      </div>

                      {/* Staff & Date info */}
                      <div
                        className="flex items-center justify-between text-[10px] text-muted-foreground"
                        onClick={() => onSelectApp(app.id)}
                      >
                        {app.ppkpStaff && (
                          <span>
                            {formatStaffRole(app.ppkpStaff.role)}: {app.ppkpStaff.name}
                          </span>
                        )}
                        <span>{formatDateTime(app.createdAt)}</span>
                      </div>

                      <Separator />

                      {/* Action Area */}
                      <div className="space-y-2.5">
                        <div className="space-y-1.5">
                          <Label htmlFor={`ppl-ulasan-${app.id}`} className="text-xs">
                            Ulasan PPL *
                          </Label>
                          <Textarea
                            id={`ppl-ulasan-${app.id}`}
                            value={ulasanValue}
                            onChange={(e) => handleUlasanChange(app.id, e.target.value)}
                            placeholder="Masukkan ulasan PPL..."
                            rows={3}
                            className="text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePPLReviewComplete(app.id);
                          }}
                          disabled={isLoading || !ulasanValue.trim()}
                          className="w-full"
                          size="sm"
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Hantar Ulasan ke PLB
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
