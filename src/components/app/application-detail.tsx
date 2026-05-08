'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/use-fetch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  MapPin,
  FolderOpen,
  Send,
  Loader2,
  Circle,
  CircleCheck,
  CircleAlert,
  CircleDot,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { postData } from '@/hooks/use-fetch';
import {
  formatStatus,
  getStatusColor,
  formatApplicationType,
  getZoneColor,
  formatDateTime,
  getRemainingTime,
  getDuration,
  formatStepName,
  getStepStatusColor,
  formatStaffRole,
  formatPlbDecision,
} from '@/lib/formatters';
import { WORKFLOW_STEPS, PLB_DECISIONS } from '@/lib/constants';
import DocumentChecklist from './document-checklist';
import { canPerformAction, WorkflowAction } from '@/lib/rbac';
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
  businessType: string | null;
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

interface UserInfo {
  id: string;
  username: string;
  role: string;
  name: string;
  zone: string | null;
}

interface ApplicationDetailProps {
  applicationId: string;
  onBack: () => void;
  user: UserInfo;
}

export default function ApplicationDetail({ applicationId, onBack, user }: ApplicationDetailProps) {
  const { data: app, loading, refetch } = useFetch<Application>(`/api/applications/${applicationId}`);
  const [actionLoading, setActionLoading] = useState(false);
  const [fileNumber, setFileNumber] = useState('');
  const [comments, setComments] = useState('');
  const [plbDecision, setPlbDecision] = useState('');
  const [plbDecisionNotes, setPlbDecisionNotes] = useState('');

  const handleAction = async (action: string) => {
    setActionLoading(true);
    try {
      const body: any = { action };
      if (action === 'REGISTER_FILE') body.fileNumber = fileNumber;
      if (action === 'PPKP_COMPLETE' || action === 'PPL_REVIEW_COMPLETE' || action === 'OPEN_FILE') body.comments = comments;
      if (action === 'PLB_DECIDE') {
        body.plbDecision = plbDecision;
        body.plbDecisionNotes = plbDecisionNotes;
      }

      await postData(`/api/applications/${applicationId}/action`, body);
      toast.success('Tindakan berjaya diproses!');
      setFileNumber('');
      setComments('');
      setPlbDecision('');
      setPlbDecisionNotes('');
      refetch();
    } catch (error: any) {
      toast.error(error.message || 'Tindakan gagal');
    } finally {
      setActionLoading(false);
    }
  };

  // ── RBAC: Determine which actions the current user can perform ──
  const canOpenFile = canPerformAction(user.role, 'OPEN_FILE');
  const canRegisterFile = canPerformAction(user.role, 'REGISTER_FILE');
  const canPPKPComplete = canPerformAction(user.role, 'PPKP_COMPLETE');
  const canPPLReview = canPerformAction(user.role, 'PPL_REVIEW_COMPLETE');
  const canPLBDecide = canPerformAction(user.role, 'PLB_DECIDE');

  // ── Zone check for PT ──
  const ptZoneMatch = user.role === 'PT' ? user.zone === app?.zone : true;

  if (loading || !app) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-32 bg-muted rounded" />
            <div className="h-64 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeStep = app.steps.find(s => s.status === 'IN_PROGRESS' || s.status === 'PENDING');

  // ── Determine if the user can see the action panel at all ──
  const canSeeActionPanel = 
    (activeStep?.step === 'PT_FILE_OPENING' && canOpenFile && ptZoneMatch) ||
    (activeStep?.step === 'PT_FILE_REGISTRATION' && canRegisterFile && ptZoneMatch) ||
    (activeStep?.step === 'PPKP_PROCESSING' && canPPKPComplete) ||
    (activeStep?.step === 'PPL_REVIEW' && canPPLReview) ||
    (activeStep?.step === 'PLB_DECISION' && canPLBDecide);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-lg truncate">{app.applicantName}</h2>
          <p className="text-sm text-muted-foreground font-mono">{app.referenceNo}</p>
        </div>
        <Badge variant="outline" className={`shrink-0 ${getStatusColor(app.status)}`}>
          {formatStatus(app.status)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left - Application Info */}
        <div className="space-y-4">
          {/* Applicant Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="h-4 w-4" />
                Maklumat Pemohon
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between min-w-0 gap-2">
                <span className="text-muted-foreground shrink-0">Nama</span>
                <span className="font-medium truncate">{app.applicantName}</span>
              </div>
              <div className="flex justify-between min-w-0 gap-2">
                <span className="text-muted-foreground shrink-0">No. IC/ROC</span>
                <span className="font-mono truncate">{app.applicantIc}</span>
              </div>
              {app.applicantPhone && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Telefon</span>
                  <span>{app.applicantPhone}</span>
                </div>
              )}
              {app.applicantAddress && (
                <div>
                  <span className="text-muted-foreground">Alamat</span>
                  <p className="mt-0.5">{app.applicantAddress}</p>
                </div>
              )}
              <Separator />
              <div className="flex justify-between items-center min-w-0 gap-2">
                <span className="text-muted-foreground shrink-0">Jenis</span>
                <Badge variant="outline" className="text-[10px] max-w-[140px] truncate">{app.applicationTypeLabel}</Badge>
              </div>
              {app.businessType && (
                <div className="flex justify-between items-center min-w-0 gap-2">
                  <span className="text-muted-foreground shrink-0">Jenis Perniagaan</span>
                  <span className="font-medium text-sm truncate">{app.businessType}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Zon</span>
                <Badge variant="outline" className={`text-[10px] ${getZoneColor(app.zone)}`}>Zon {app.zone}</Badge>
              </div>
              {app.fileNumber && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">No. Fail</span>
                  <span className="font-mono font-bold">{app.fileNumber}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Diterima</span>
                <span className="text-xs">{formatDateTime(app.createdAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Staff Assignments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Staf Bertugas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {app.ptStaff && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">PT</span>
                  <div className="text-right">
                    <p className="font-medium">{app.ptStaff.name}</p>
                    <p className="text-[10px] text-muted-foreground">Zon {app.zone}</p>
                  </div>
                </div>
              )}
              {app.ppkpStaff && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{formatStaffRole(app.ppkpStaff.role)}</span>
                  <p className="font-medium">{app.ppkpStaff.name}</p>
                </div>
              )}
              {app.pplStaff && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">{formatStaffRole(app.pplStaff.role)}</span>
                  <p className="font-medium">{app.pplStaff.name}</p>
                </div>
              )}
              {app.plbStaff && (
                <div className="flex justify-between items-center min-w-0 gap-2">
                  <span className="text-muted-foreground shrink-0 text-xs sm:text-sm">PLB - Pengarah Pelesenan Bandaraya</span>
                  <p className="font-medium truncate">{app.plbStaff.name}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* PLB Decision */}
          {app.plbDecision && (
            <Card className={app.status === 'REJECTED' ? 'border-red-200' : 'border-emerald-200'}>
              <CardHeader className="pb-3">
                <CardTitle className={`text-sm flex items-center gap-2 ${app.status === 'REJECTED' ? 'text-red-700' : 'text-emerald-700'}`}>
                  {app.status === 'REJECTED' ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  Keputusan PLB
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={app.status === 'REJECTED' ? 'bg-red-100 text-red-800 mb-2' : 'bg-emerald-100 text-emerald-800 mb-2'}>
                  {formatPlbDecision(app.plbDecision)}
                </Badge>
                {app.plbDecisionNotes && (
                  <p className="text-sm text-muted-foreground mt-1">{app.plbDecisionNotes}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Document Checklist Card - always visible for PT and ADMIN */}
          {(user.role === 'PT' || user.role === 'ADMIN') && (
            <DocumentChecklist application={app} />
          )}
        </div>

        {/* Middle & Right - Timeline and Actions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Workflow Timeline */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Garis Masa Proses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {app.steps.map((step, index) => {
                  const isLast = index === app.steps.length - 1;
                  const { text: remainingText, isOverdue: stepOverdue, isWarning } = getRemainingTime(step.slaDeadline);
                  const isActive = step.status === 'IN_PROGRESS';
                  const isCompleted = step.status === 'COMPLETED';

                  return (
                    <div key={step.id} className="flex gap-3">
                      {/* Timeline indicator */}
                      <div className="flex flex-col items-center">
                        <div className={`rounded-full p-1 ${
                          isCompleted ? 'text-emerald-600' :
                          stepOverdue ? 'text-red-600' :
                          isActive ? 'text-sky-600' :
                          'text-gray-400'
                        }`}>
                          {isCompleted ? (
                            <CircleCheck className="h-5 w-5" />
                          ) : stepOverdue ? (
                            <CircleAlert className="h-5 w-5" />
                          ) : isActive ? (
                            <CircleDot className="h-5 w-5" />
                          ) : (
                            <Circle className="h-5 w-5" />
                          )}
                        </div>
                        {!isLast && (
                          <div className={`w-0.5 flex-1 min-h-[40px] my-1 ${
                            isCompleted ? 'bg-emerald-300' : 'bg-gray-200'
                          }`} />
                        )}
                      </div>

                      {/* Step content */}
                      <div className={`pb-4 flex-1 ${!isLast ? '' : ''}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-medium ${
                            isCompleted ? 'text-emerald-700' :
                            stepOverdue ? 'text-red-700' :
                            isActive ? 'text-sky-700' :
                            'text-gray-500'
                          }`}>
                            {formatStepName(step.step)}
                          </span>
                          <Badge variant="outline" className={`text-[9px] h-4 ${getStepStatusColor(step.status)}`}>
                            {step.status === 'PENDING' ? 'Menunggu' :
                             step.status === 'IN_PROGRESS' ? 'Dalam Proses' :
                             step.status === 'COMPLETED' ? 'Selesai' :
                             'Lewat'}
                          </Badge>
                          {step.slaDays > 0 && (
                            <Badge variant="outline" className="text-[9px] h-4 bg-gray-50">
                              SLA: {step.slaDays} hari
                            </Badge>
                          )}
                        </div>

                        {/* Time info */}
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          {step.startedAt && (
                            <p>Mula: {formatDateTime(step.startedAt)}</p>
                          )}
                          {step.completedAt && (
                            <p>Selesai: {formatDateTime(step.completedAt)}</p>
                          )}
                          {step.startedAt && (
                            <p>
                              Tempoh: {getDuration(step.startedAt, step.completedAt)}
                              {step.slaDays > 0 && isCompleted && step.slaDeadline && (
                                <span className={new Date(step.completedAt) <= new Date(step.slaDeadline) ? ' text-emerald-600' : ' text-red-600'}>
                                  {' '}(SLA: {new Date(step.completedAt) <= new Date(step.slaDeadline) ? 'Tepat masa ✓' : 'Lewat ✗'})
                                </span>
                              )}
                            </p>
                          )}
                          {step.slaDeadline && !isCompleted && (
                            <p className={stepOverdue ? 'text-red-600 font-medium' : isWarning ? 'text-amber-600 font-medium' : ''}>
                              {remainingText}
                            </p>
                          )}
                          {step.comments && (
                            <p className="italic line-clamp-3">{step.comments}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Action Panel - Only shown if user has permission for the current step. Kaunter users never see this. */}
          {app.status !== 'COMPLETED' && app.status !== 'REJECTED' && activeStep && canSeeActionPanel && user.role !== 'KAUNTER' && (
            <Card className="border-sky-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-sky-700">
                  <Send className="h-4 w-4" />
                  Tindakan Diperlukan
                </CardTitle>
                <CardDescription>
                  {formatStepName(activeStep.step)} — {activeStep.status === 'PENDING' ? 'Belum dimulakan' : 'Sedang diproses'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* PT File Opening Action */}
                {activeStep.step === 'PT_FILE_OPENING' && app.status === 'PENDING_PT' && canOpenFile && (
                  <div className="space-y-3">
                    <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
                      <p className="text-xs text-amber-700">
                        <AlertTriangle className="h-3 w-3 inline mr-1" />
                        Sila buka fail permohonan dalam tempoh SLA (3 hari dari penerimaan).
                      </p>
                    </div>
                    {!ptZoneMatch && (
                      <div className="rounded-md bg-red-50 border border-red-200 p-3">
                        <p className="text-xs text-red-700 flex items-center gap-1.5">
                          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                          Anda (Zon {user.zone}) tidak dibenarkan memproses permohonan di Zon {app.zone}.
                        </p>
                      </div>
                    )}
                    {ptZoneMatch && (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="openFileComments">Catatan Pembukaan Fail</Label>
                          <Textarea
                            id="openFileComments"
                            value={comments}
                            onChange={(e) => setComments(e.target.value)}
                            placeholder="Masukkan catatan pembukaan fail..."
                            rows={2}
                          />
                        </div>
                        <Button onClick={() => handleAction('OPEN_FILE')} disabled={actionLoading}>
                          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FolderOpen className="h-4 w-4 mr-2" />}
                          Buka Fail Permohonan
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {/* PT File Registration Action */}
                {activeStep.step === 'PT_FILE_REGISTRATION' && app.status === 'PT_PROCESSING' && canRegisterFile && (
                  <div className="space-y-3">
                    <div className="rounded-md bg-sky-50 border border-sky-200 p-3">
                      <p className="text-xs text-sky-700">
                        Fail telah dibuka. Sila daftarkan nombor fail ke dalam sistem.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="fileNumber">Nombor Fail *</Label>
                      <Input
                        id="fileNumber"
                        value={fileNumber}
                        onChange={(e) => setFileNumber(e.target.value)}
                        placeholder="cth: MPSP/L/2024/001"
                      />
                    </div>
                    <Button onClick={() => handleAction('REGISTER_FILE')} disabled={actionLoading || !fileNumber}>
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
                      Daftar Nombor Fail
                    </Button>
                  </div>
                )}

                {/* PPKP Processing Action */}
                {activeStep.step === 'PPKP_PROCESSING' && app.status === 'PPKP_PROCESSING' && canPPKPComplete && (
                  <div className="space-y-3">
                    <div className="rounded-md bg-violet-50 border border-violet-200 p-3">
                      <p className="text-xs text-violet-700">
                        Sila selesaikan pemprosesan PPKP. SLA maksimum 4 hari.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ppkpComments">Catatan Pemprosesan</Label>
                      <Textarea
                        id="ppkpComments"
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        placeholder="Masukkan catatan pemprosesan PPKP..."
                        rows={2}
                      />
                    </div>
                    <Button onClick={() => handleAction('PPKP_COMPLETE')} disabled={actionLoading}>
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                      Selesai Pemprosesan & Hantar ke PPL
                    </Button>
                  </div>
                )}

                {/* PPL Review Action */}
                {activeStep.step === 'PPL_REVIEW' && app.status === 'PPL_REVIEW' && canPPLReview && (
                  <div className="space-y-3">
                    <div className="rounded-md bg-teal-50 border border-teal-200 p-3">
                      <p className="text-xs text-teal-700">
                        Sila berikan ulasan dalam tempoh SLA (3 hari dari penerimaan fail).
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="pplComments">Ulasan PPL *</Label>
                      <Textarea
                        id="pplComments"
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        placeholder="Masukkan ulasan PPL..."
                        rows={3}
                      />
                    </div>
                    <Button onClick={() => handleAction('PPL_REVIEW_COMPLETE')} disabled={actionLoading || !comments}>
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                      Hantar Ulasan ke PLB
                    </Button>
                  </div>
                )}

                {/* PLB Decision Action */}
                {activeStep.step === 'PLB_DECISION' && app.status === 'PLB_DECISION' && canPLBDecide && (
                  <div className="space-y-3">
                    <div className="rounded-md bg-orange-50 border border-orange-200 p-3">
                      <p className="text-xs text-orange-700">
                        Sila buat keputusan untuk permohonan ini.
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="plbDecision">Keputusan *</Label>
                      <Select value={plbDecision} onValueChange={setPlbDecision}>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih keputusan" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PLB_DECISIONS).map(([key, val]) => (
                            <SelectItem key={key} value={key}>{val.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="plbNotes">Catatan Keputusan</Label>
                      <Textarea
                        id="plbNotes"
                        value={plbDecisionNotes}
                        onChange={(e) => setPlbDecisionNotes(e.target.value)}
                        placeholder="Masukkan catatan keputusan..."
                        rows={2}
                      />
                    </div>
                    <Button onClick={() => handleAction('PLB_DECIDE')} disabled={actionLoading || !plbDecision}>
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                      Sahkan Keputusan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* No Permission Notice - shown when user views an application but doesn't have action permission. Kaunter users never see this. */}
          {app.status !== 'COMPLETED' && app.status !== 'REJECTED' && activeStep && !canSeeActionPanel && user.role !== 'KAUNTER' && (
            <Card className="border-gray-200 bg-gray-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <ShieldAlert className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Tiada kebenaran tindakan</p>
                    <p className="text-xs mt-0.5">
                      Langkah semasa ({formatStepName(activeStep.step)}) memerlukan peranan {activeStep.step === 'PT_FILE_OPENING' || activeStep.step === 'PT_FILE_REGISTRATION' ? 'PT' : activeStep.step === 'PPKP_PROCESSING' ? 'PPKP' : activeStep.step === 'PPL_REVIEW' ? 'PPL' : 'PLB'} untuk melakukan tindakan.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Info for Kaunter - simplified view without action panel */}
          {app.status !== 'COMPLETED' && app.status !== 'REJECTED' && activeStep && user.role === 'KAUNTER' && (
            <Card className="border-sky-100 bg-sky-50/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-sky-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-sky-800">Status Semasa</p>
                    <p className="text-xs mt-0.5 text-sky-700">
                      Permohonan ini sedang di proses oleh {activeStep.step === 'PT_FILE_OPENING' || activeStep.step === 'PT_FILE_REGISTRATION' ? 'PT' : activeStep.step === 'PPKP_PROCESSING' ? 'PPKP' : activeStep.step === 'PPL_REVIEW' ? 'PPL' : 'PLB'} — {formatStepName(activeStep.step)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
