'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  CalendarDays, ChevronDown, ChevronUp, Download, Loader2, RefreshCw, Filter,
} from 'lucide-react';
import { APPLICATION_TYPES, ZONES, APPLICATION_STATUSES } from '@/lib/constants';
import { formatApplicationType, formatStatus, getStatusColor, getZoneColor, formatDate } from '@/lib/formatters';

interface DailyApp {
  id: string;
  referenceNo: string;
  applicantName: string;
  applicantIc: string;
  applicationType: string;
  zone: string;
  status: string;
  fileNumber: string | null;
  businessType: string | null;
  createdAt: string;
  steps: { step: string; status: string; completedAt: string | null }[];
  ptStaff: { name: string } | null;
  ppkpStaff: { name: string } | null;
  pplStaff: { name: string } | null;
  plbStaff: { name: string } | null;
}

interface DayData {
  date: string;
  applications: DailyApp[];
  count: number;
  byType: Record<string, number>;
  byZone: Record<string, number>;
  byStatus: Record<string, number>;
}

interface Summary {
  totalApplications: number;
  totalDays: number;
  byType: Record<string, number>;
  byZone: Record<string, number>;
  byStatus: Record<string, number>;
}

interface ReportData {
  startDate: string;
  endDate: string;
  days: DayData[];
  summary: Summary;
}

interface DailyReceiptReportProps {
  userRole: string;
  userZone?: string | null;
}

const APP_TYPE_KEYS = Object.keys(APPLICATION_TYPES) as (keyof typeof APPLICATION_TYPES)[];

export default function DailyReceiptReport({ userRole, userZone }: DailyReceiptReportProps) {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Expand/collapse state for each day
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      if (zoneFilter !== 'all') params.set('zone', zoneFilter);
      const res = await fetch(`/api/report/daily-receipts?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Gagal memuatkan laporan' }));
        throw new Error(err.error || 'Gagal memuatkan laporan');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, zoneFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleDay = (date: string) => {
    setExpandedDays(prev => ({ ...prev, [date]: !prev[date] }));
  };

  // Client-side filtering for type and status
  const filteredDays = (data?.days || []).map(day => {
    let apps = day.applications;
    if (typeFilter !== 'all') {
      apps = apps.filter(a => a.applicationType === typeFilter);
    }
    if (statusFilter !== 'all') {
      apps = apps.filter(a => a.status === statusFilter);
    }
    return { ...day, applications: apps, count: apps.length };
  }).filter(day => day.count > 0);

  // Compute filtered summary
  const filteredSummary = {
    totalApplications: filteredDays.reduce((sum, d) => sum + d.count, 0),
    totalDays: filteredDays.length,
  };

  // Quick date presets
  const setPreset = (days: number) => {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setStartDate(start);
    setEndDate(end);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!data) return;
    const headers = ['Tarikh', 'No. Rujukan', 'Nama Pemohon', 'No. IC', 'Jenis Permohonan', 'Jenis Perniagaan', 'Zon', 'Status', 'No. Fail'];
    const rows: string[][] = [];
    for (const day of filteredDays) {
      for (const app of day.applications) {
        rows.push([
          day.date,
          app.referenceNo,
          app.applicantName,
          app.applicantIc,
          formatApplicationType(app.applicationType),
          app.businessType || '',
          `Zon ${app.zone}`,
          formatStatus(app.status),
          app.fileNumber || '',
        ]);
      }
    }
    const csvContent = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laporan-harian-${startDate}-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Zone options - PT users can only see their zone
  const zoneOptions = userRole === 'PT' ? [] : ZONES;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Laporan Senarai Permohonan Diterima Mengikut Hari
          </h2>
          <p className="text-sm text-muted-foreground">
            {startDate} hingga {endDate}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Muat Semula
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!data || filteredSummary.totalApplications === 0}>
            <Download className="h-4 w-4 mr-1" />
            CSV
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            {/* Date range */}
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="grid grid-cols-2 gap-3 flex-1">
                <div className="space-y-1.5">
                  <Label className="text-xs">Tarikh Mula</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tarikh Akhir</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <Button variant="outline" size="sm" className="text-xs h-9" onClick={() => setPreset(7)}>7 Hari</Button>
                <Button variant="outline" size="sm" className="text-xs h-9" onClick={() => setPreset(14)}>14 Hari</Button>
                <Button variant="outline" size="sm" className="text-xs h-9" onClick={() => setPreset(30)}>30 Hari</Button>
                <Button variant="outline" size="sm" className="text-xs h-9" onClick={() => setPreset(90)}>90 Hari</Button>
              </div>
            </div>

            {/* Other filters */}
            <div className="flex flex-wrap gap-2">
              {zoneOptions.length > 0 && (
                <Select value={zoneFilter} onValueChange={setZoneFilter}>
                  <SelectTrigger className="w-[120px] h-9 text-xs">
                    <SelectValue placeholder="Zon" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Zon</SelectItem>
                    {zoneOptions.map(z => (
                      <SelectItem key={z} value={z}>Zon {z}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px] h-9 text-xs">
                  <SelectValue placeholder="Jenis Permohonan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  {APP_TYPE_KEYS.map(key => (
                    <SelectItem key={key} value={key}>{APPLICATION_TYPES[key].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  {Object.entries(APPLICATION_STATUSES).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{filteredSummary.totalApplications}</p>
              <p className="text-xs text-muted-foreground">Jumlah Permohonan</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">{filteredSummary.totalDays}</p>
              <p className="text-xs text-muted-foreground">Hari Dengan Permohonan</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">
                {filteredSummary.totalDays > 0
                  ? (filteredSummary.totalApplications / filteredSummary.totalDays).toFixed(1)
                  : '0'}
              </p>
              <p className="text-xs text-muted-foreground">Purata Sehari</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold">
                {filteredDays.length > 0 ? filteredDays[0].count : 0}
              </p>
              <p className="text-xs text-muted-foreground">
                {filteredDays.length > 0
                  ? `Pada ${formatDate(filteredDays[0].date)}`
                  : 'Hari Terkini'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Summary breakdown by type */}
      {data && filteredSummary.totalApplications > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Ringkasan Mengikut Jenis Permohonan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {APP_TYPE_KEYS.map(key => {
                const count = data.summary.byType[key] || 0;
                if (count === 0 && typeFilter !== 'all' && typeFilter !== key) return null;
                const pct = filteredSummary.totalApplications > 0
                  ? Math.round((count / filteredSummary.totalApplications) * 100)
                  : 0;
                return (
                  <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{APPLICATION_TYPES[key].label}</p>
                      <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="ml-3 text-right shrink-0">
                      <p className="text-lg font-bold">{count}</p>
                      <p className="text-[10px] text-muted-foreground">{pct}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Senarai Mengikut Hari</CardTitle>
          <CardDescription>
            Klik pada tarikh untuk melihat senarai permohonan pada hari tersebut
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Memuatkan laporan...</span>
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={fetchData}>
                Cuba Lagi
              </Button>
            </div>
          ) : filteredDays.length === 0 ? (
            <div className="py-12 text-center">
              <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">Tiada permohonan dijumpai untuk tempoh yang dipilih</p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Tarikh</TableHead>
                    <TableHead className="w-[80px] text-center">Jumlah</TableHead>
                    <TableHead className="hidden sm:table-cell">Jenis Permohonan</TableHead>
                    <TableHead className="hidden md:table-cell">Zon</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDays.map(day => {
                    const isExpanded = expandedDays[day.date];
                    return (
                      <>
                        <TableRow
                          key={day.date}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => toggleDay(day.date)}
                        >
                          <TableCell className="font-medium">
                            {formatDate(day.date)}
                            <span className="text-xs text-muted-foreground ml-1">
                              ({new Date(day.date).toLocaleDateString('ms-MY', { weekday: 'short' })})
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="font-bold">
                              {day.count}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(day.byType).map(([type, count]) => (
                                <span key={type} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                                  {formatApplicationType(type)}: {count}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(day.byZone).map(([zone, count]) => (
                                <Badge key={zone} variant="outline" className={`text-[10px] ${getZoneColor(zone)}`}>
                                  Zon {zone}: {count}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                        </TableRow>

                        {/* Expanded detail rows */}
                        {isExpanded && (
                          <TableRow key={`${day.date}-detail`} className="bg-muted/20">
                            <TableCell colSpan={5} className="p-0">
                              <div className="p-3">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="text-[10px] h-8">No. Rujukan</TableHead>
                                      <TableHead className="text-[10px]">Nama Pemohon</TableHead>
                                      <TableHead className="text-[10px] hidden sm:table-cell">No. IC</TableHead>
                                      <TableHead className="text-[10px]">Jenis</TableHead>
                                      <TableHead className="text-[10px] hidden md:table-cell">Zon</TableHead>
                                      <TableHead className="text-[10px]">Status</TableHead>
                                      <TableHead className="text-[10px] hidden lg:table-cell">No. Fail</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {day.applications.map(app => (
                                      <TableRow key={app.id}>
                                        <TableCell className="font-mono text-xs">{app.referenceNo}</TableCell>
                                        <TableCell className="text-sm font-medium">{app.applicantName}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{app.applicantIc}</TableCell>
                                        <TableCell>
                                          <Badge variant="outline" className="text-[10px]">
                                            {formatApplicationType(app.applicationType)}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                          <Badge variant="outline" className={`text-[10px] ${getZoneColor(app.zone)}`}>
                                            Zon {app.zone}
                                          </Badge>
                                        </TableCell>
                                        <TableCell>
                                          <Badge variant="outline" className={`text-[10px] ${getStatusColor(app.status)}`}>
                                            {formatStatus(app.status)}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">
                                          {app.fileNumber || '-'}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
