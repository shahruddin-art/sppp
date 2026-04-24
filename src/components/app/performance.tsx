'use client';

import { useFetch } from '@/hooks/use-fetch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Target,
  Timer,
} from 'lucide-react';
import { formatStepName } from '@/lib/formatters';

interface PerformanceData {
  period: number;
  zonePerformance: Record<string, { total: number; completed: number; overdue: number; avgDays: number; slaRate: number }>;
  stepPerformance: Record<string, { total: number; completedOnTime: number; completedLate: number; inProgress: number; overdue: number; avgDays: number }>;
  typePerformance: Record<string, { total: number; completed: number; avgDays: number }>;
  dailyThroughput: Array<{ date: string; received: number; completed: number }>;
}

export default function Performance() {
  const { data, loading } = useFetch<PerformanceData>('/api/performance?period=30');

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-40 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const { zonePerformance, stepPerformance, typePerformance } = data;

  // Calculate overall metrics
  const totalApps = Object.values(zonePerformance).reduce((s, z) => s + z.total, 0);
  const totalCompleted = Object.values(zonePerformance).reduce((s, z) => s + z.completed, 0);
  const totalOverdue = Object.values(zonePerformance).reduce((s, z) => s + z.overdue, 0);
  const overallSlaRate = totalApps > 0 ? Math.round(Object.values(zonePerformance).reduce((s, z) => s + z.slaRate * z.total, 0) / totalApps) : 100;

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-sky-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-sky-100 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Kadar Kepatuhan SLA</p>
                <p className="text-2xl font-bold">{overallSlaRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Target className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Kadar Penyelesaian</p>
                <p className="text-2xl font-bold">{totalApps > 0 ? Math.round((totalCompleted / totalApps) * 100) : 0}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Timer className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Purata Masa Proses</p>
                <p className="text-2xl font-bold">
                  {Object.values(zonePerformance).filter(z => z.avgDays > 0).length > 0
                    ? (Object.values(zonePerformance).reduce((s, z) => s + z.avgDays, 0) / Object.values(zonePerformance).filter(z => z.avgDays > 0).length).toFixed(1)
                    : '0'}
                  <span className="text-sm font-normal ml-1">hari</span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Jumlah Lewat SLA</p>
                <p className="text-2xl font-bold">{totalOverdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zone Performance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Prestasi Mengikut Zon
          </CardTitle>
          <CardDescription>Perbandingan prestasi permohonan bagi setiap zon</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {Object.entries(zonePerformance).map(([zone, perf]) => {
              const completionRate = perf.total > 0 ? Math.round((perf.completed / perf.total) * 100) : 0;
              const zoneColors: Record<string, string> = {
                A: 'border-rose-300 bg-rose-50',
                B: 'border-amber-300 bg-amber-50',
                C: 'border-emerald-300 bg-emerald-50',
                D: 'border-sky-300 bg-sky-50',
                E: 'border-violet-300 bg-violet-50',
              };

              return (
                <div key={zone} className={`rounded-xl border-2 p-4 ${zoneColors[zone] || 'bg-gray-50'}`}>
                  <div className="text-center mb-3">
                    <p className="text-lg font-bold">Zon {zone}</p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Kepatuhan SLA</span>
                        <span className="font-bold">{perf.slaRate}%</span>
                      </div>
                      <Progress value={perf.slaRate} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Penyelesaian</span>
                        <span className="font-bold">{completionRate}%</span>
                      </div>
                      <Progress value={completionRate} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center pt-1">
                      <div>
                        <p className="text-lg font-bold">{perf.total}</p>
                        <p className="text-[9px] text-muted-foreground">Jumlah</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-red-600">{perf.overdue}</p>
                        <p className="text-[9px] text-muted-foreground">Lewat</p>
                      </div>
                    </div>
                    {perf.avgDays > 0 && (
                      <p className="text-[10px] text-center text-muted-foreground">
                        Purata: {perf.avgDays} hari
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Step SLA Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Prestasi SLA Mengikut Langkah
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stepPerformance).map(([step, perf]) => {
                const onTimeRate = perf.total > 0 ? Math.round((perf.completedOnTime / perf.total) * 100) : 0;
                const lateRate = perf.total > 0 ? Math.round((perf.completedLate / perf.total) * 100) : 0;
                const overdueRate = perf.total > 0 ? Math.round((perf.overdue / perf.total) * 100) : 0;

                return (
                  <div key={step} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{formatStepName(step)}</span>
                      <span className="text-xs text-muted-foreground">
                        Purata: {perf.avgDays > 0 ? `${perf.avgDays} hari` : '-'}
                      </span>
                    </div>

                    {/* Stacked bar */}
                    <div className="flex h-6 rounded-full overflow-hidden bg-gray-100">
                      {perf.completedOnTime > 0 && (
                        <div
                          className="bg-emerald-400 flex items-center justify-center"
                          style={{ width: `${onTimeRate}%` }}
                        >
                          {onTimeRate > 15 && <span className="text-[9px] text-white font-medium">{onTimeRate}%</span>}
                        </div>
                      )}
                      {perf.completedLate > 0 && (
                        <div
                          className="bg-amber-400 flex items-center justify-center"
                          style={{ width: `${lateRate}%` }}
                        >
                          {lateRate > 10 && <span className="text-[9px] text-white font-medium">{lateRate}%</span>}
                        </div>
                      )}
                      {perf.overdue > 0 && (
                        <div
                          className="bg-red-400 flex items-center justify-center"
                          style={{ width: `${overdueRate}%` }}
                        >
                          {overdueRate > 10 && <span className="text-[9px] text-white font-medium">{overdueRate}%</span>}
                        </div>
                      )}
                      {perf.inProgress > 0 && (
                        <div
                          className="bg-sky-300 flex items-center justify-center"
                          style={{ width: `${perf.total > 0 ? Math.round((perf.inProgress / perf.total) * 100) : 0}%` }}
                        />
                      )}
                    </div>

                    <div className="flex gap-3 text-[10px]">
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" /> Tepat masa: {perf.completedOnTime}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-amber-400" /> Lewat siap: {perf.completedLate}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full bg-red-400" /> Belum siap (lewat): {perf.overdue}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Type Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Prestasi Mengikut Jenis Permohonan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(typePerformance)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([type, perf]) => {
                  const completionRate = perf.total > 0 ? Math.round((perf.completed / perf.total) * 100) : 0;

                  return (
                    <div key={type} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{type}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {perf.total} permohonan
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Penyelesaian</span>
                            <span>{completionRate}%</span>
                          </div>
                          <Progress value={completionRate} className="h-2" />
                        </div>
                        <div className="text-right min-w-[60px]">
                          <p className="text-xs text-muted-foreground">Purata</p>
                          <p className="text-sm font-bold">{perf.avgDays > 0 ? `${perf.avgDays}h` : '-'}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SLA Rules Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Ringkasan Peraturan SLA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-full bg-sky-200 flex items-center justify-center">
                  <span className="text-sm font-bold text-sky-700">1</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-sky-800">Pembukaan Fail PT</p>
                  <p className="text-xs text-sky-600">SLA: 3 hari</p>
                </div>
              </div>
              <p className="text-[10px] text-sky-600">
                PT perlu menyelesaikan pembukaan fail permohonan dalam masa 3 hari dari tarikh penerimaan di kaunter.
              </p>
            </div>

            <div className="rounded-lg border border-violet-200 bg-violet-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-full bg-violet-200 flex items-center justify-center">
                  <span className="text-sm font-bold text-violet-700">2</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-violet-800">PPKP + PPL</p>
                  <p className="text-xs text-violet-600">SLA: Maks 7 hari</p>
                </div>
              </div>
              <p className="text-[10px] text-violet-600">
                Proses PPKP dan PPL berjumlah maksimum 7 hari. PPKP (4 hari) dan PPL (3 hari ulasan).
              </p>
            </div>

            <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-full bg-teal-200 flex items-center justify-center">
                  <span className="text-sm font-bold text-teal-700">3</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-teal-800">Ulasan PPL</p>
                  <p className="text-xs text-teal-600">SLA: 3 hari</p>
                </div>
              </div>
              <p className="text-[10px] text-teal-600">
                PPL perlu memasukkan ulasan dalam tempoh 3 hari setelah menerima fail dari PPKP.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
