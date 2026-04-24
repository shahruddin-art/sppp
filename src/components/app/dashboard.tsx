'use client';

import { useFetch } from '@/hooks/use-fetch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatStatus, getStatusColor, formatApplicationType, getZoneColor, getRemainingTime, formatDateTime, getDuration } from '@/lib/formatters';
import { WORKFLOW_STEPS, APPLICATION_TYPES } from '@/lib/constants';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Activity,
  Users,
  ArrowRight,
  Timer,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface DashboardData {
  summary: {
    totalApplications: number;
    activeApplications: number;
    completedApplications: number;
    overdueApplications: number;
    slaComplianceRate: number;
    avgProcessingDays: number;
  };
  statusCounts: Record<string, number>;
  zoneCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  stepPerformance: Record<string, { total: number; onTime: number; overdue: number; avgDays: number }>;
  recentActivity: Array<{ appName: string; step: string; completedAt: string; staffName: string }>;
}

export default function Dashboard() {
  const { data, loading } = useFetch<DashboardData>('/api/dashboard', { refreshInterval: 30000 });

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const { summary, statusCounts, zoneCounts, stepPerformance } = data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-sky-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Jumlah Permohonan</p>
                <p className="text-3xl font-bold mt-1">{summary.totalApplications}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-sky-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-sky-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{summary.activeApplications} sedang aktif</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Kepatuhan SLA</p>
                <p className="text-3xl font-bold mt-1">{summary.slaComplianceRate}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
            <Progress value={summary.slaComplianceRate} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Purata Masa Proses</p>
                <p className="text-3xl font-bold mt-1">{summary.avgProcessingDays}<span className="text-lg font-normal ml-1">hari</span></p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Timer className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">dari penerimaan hingga selesai</p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${summary.overdueApplications > 0 ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Permohonan Lewat</p>
                <p className="text-3xl font-bold mt-1">{summary.overdueApplications}</p>
              </div>
              <div className={`h-12 w-12 rounded-full ${summary.overdueApplications > 0 ? 'bg-red-100' : 'bg-emerald-100'} flex items-center justify-center`}>
                {summary.overdueApplications > 0 ? (
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                ) : (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {summary.overdueApplications > 0 ? 'Melebihi had masa SLA' : 'Semua dalam had masa'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution & Zone Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Taburan Status Permohonan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(statusCounts).map(([status, count]) => {
                const percentage = summary.totalApplications > 0 ? Math.round((count / summary.totalApplications) * 100) : 0;
                return (
                  <div key={status} className="flex items-center gap-3">
                    <Badge variant="outline" className={`min-w-[140px] justify-center text-xs ${getStatusColor(status)}`}>
                      {formatStatus(status)}
                    </Badge>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{count}</span>
                        <span className="text-xs text-muted-foreground">{percentage}%</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Zone Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Permohonan Mengikut Zon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-3">
              {['A', 'B', 'C', 'D', 'E'].map(zone => {
                const count = zoneCounts[zone] || 0;
                return (
                  <div key={zone} className="text-center">
                    <div className={`rounded-xl p-4 ${getZoneColor(zone)} border`}>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-xs mt-1 opacity-80">Zon {zone}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator className="my-4" />

            {/* SLA Performance by Step */}
            <div>
              <p className="text-sm font-medium mb-3">Prestasi SLA Mengikut Langkah</p>
              <div className="space-y-3">
                {Object.entries(stepPerformance).map(([step, perf]) => {
                  const slaRate = perf.total > 0 ? Math.round((perf.onTime / perf.total) * 100) : 100;
                  const stepLabel = (WORKFLOW_STEPS as any)[step]?.label || step;
                  return (
                    <div key={step} className="flex items-center gap-3">
                      <span className="text-xs min-w-[130px] truncate">{stepLabel}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground">{perf.onTime}/{perf.total} tepat masa</span>
                          <span className={`text-xs font-medium ${slaRate >= 80 ? 'text-emerald-600' : slaRate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                            {slaRate}%
                          </span>
                        </div>
                        <Progress value={slaRate} className="h-1.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Process Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRight className="h-4 w-4" />
            Aliran Proses Permohonan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { label: 'Kaunter', desc: 'Penerimaan', sla: '-' },
              { label: 'PT', desc: 'Pembukaan Fail', sla: '3 hari' },
              { label: 'PT', desc: 'Daftar No. Fail', sla: 'Segera' },
              { label: 'PPKP(L/P)', desc: 'Pemprosesan', sla: '4 hari' },
              { label: 'PPL(L/P)', desc: 'Ulasan', sla: '3 hari' },
              { label: 'PLB', desc: 'Keputusan', sla: '-' },
            ].map((item, i, arr) => (
              <div key={i} className="flex items-center gap-2">
                <div className="rounded-lg border bg-card p-3 text-center min-w-[100px]">
                  <p className="text-xs font-semibold">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                  <Badge variant="outline" className="mt-1 text-[9px] h-4">
                    {item.sla}
                  </Badge>
                </div>
                {i < arr.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
              <p className="text-xs font-semibold text-emerald-700">PPKP(L) - Lesen</p>
              <p className="text-[10px] text-emerald-600 mt-1">
                G1, G1/P, G7, G8, G9, G11, Papan Iklan
              </p>
              <p className="text-[10px] text-emerald-600">→ PPL(L)</p>
            </div>
            <div className="rounded-lg bg-teal-50 border border-teal-200 p-3">
              <p className="text-xs font-semibold text-teal-700">PPKP(P) - Pasar</p>
              <p className="text-[10px] text-teal-600 mt-1">
                G2, G3, Permit Sementara
              </p>
              <p className="text-[10px] text-teal-600">→ PPL(P)</p>
            </div>
            <div className="rounded-lg bg-orange-50 border border-orange-200 p-3">
              <p className="text-xs font-semibold text-orange-700">Keputusan PLB</p>
              <p className="text-[10px] text-orange-600 mt-1">
                Simpan Fail / Jabatan Kesihatan / Jabatan Perancang Bandar
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Completed & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Permohonan Selesai
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <p className="text-5xl font-bold text-emerald-600">{summary.completedApplications}</p>
              <p className="text-sm text-muted-foreground mt-2">permohonan telah selesai diproses</p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1">
                <TrendingUp className="h-3 w-3 text-emerald-600" />
                <span className="text-xs text-emerald-700">
                  {summary.totalApplications > 0 ? Math.round((summary.completedApplications / summary.totalApplications) * 100) : 0}% kadar penyelesaian
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Jenis Permohonan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(data.typeCounts).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <span className="text-sm">{formatApplicationType(type)}</span>
                  <Badge variant="secondary" className="font-mono">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
