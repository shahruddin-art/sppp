'use client';

import { useState } from 'react';
import { useFetch } from '@/hooks/use-fetch';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  FileText,
  Clock,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  formatStatus,
  getStatusColor,
  getZoneColor,
  formatDateTime,
  getRemainingTime,
  formatPlbDecision,
} from '@/lib/formatters';
import { ZONES, APPLICATION_TYPES } from '@/lib/constants';

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

interface SenaraiPermohonanProps {
  onSelectApp: (appId: string) => void;
}

export default function SenaraiPermohonan({ onSelectApp }: SenaraiPermohonanProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const queryParams = new URLSearchParams();
  if (statusFilter !== 'all') queryParams.set('status', statusFilter);
  if (zoneFilter !== 'all') queryParams.set('zone', zoneFilter);
  if (typeFilter !== 'all') queryParams.set('type', typeFilter);
  if (search) queryParams.set('search', search);

  const { data, loading, refetch } = useFetch<Application[]>(
    `/api/applications?${queryParams.toString()}`,
    { refreshInterval: 15000 }
  );

  const hasFilters = statusFilter !== 'all' || zoneFilter !== 'all' || typeFilter !== 'all' || search !== '';

  const clearFilters = () => {
    setStatusFilter('all');
    setZoneFilter('all');
    setTypeFilter('all');
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
                  <SelectItem value="PLB_DECISION">Keputusan PLB</SelectItem>
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

                  {/* Current step info for active applications */}
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

                  {/* Completed/Rejected info */}
                  {(app.status === 'COMPLETED' || app.status === 'REJECTED') && app.plbDecision && (
                    <div className={`rounded-md p-2 mb-3 ${
                      app.status === 'REJECTED'
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-emerald-50 border border-emerald-200'
                    }`}>
                      <p className={`text-xs ${
                        app.status === 'REJECTED' ? 'text-red-700' : 'text-emerald-700'
                      }`}>
                        Keputusan: {formatPlbDecision(app.plbDecision)}
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
