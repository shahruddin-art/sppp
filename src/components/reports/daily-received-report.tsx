'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useFetch } from '@/hooks/use-fetch';
import { APPLICATION_TYPES, ZONES } from '@/lib/constants';
import {
  formatStatus,
  getStatusColor,
  getZoneColor,
  formatDateTime,
} from '@/lib/formatters';
import { toast } from 'sonner';
import {
  CalendarDays,
  Printer,
  Download,
  Loader2,
  FileText,
  BarChart3,
  MapPin,
  ClipboardList,
  Search,
} from 'lucide-react';

interface DailyReportApp {
  id: string;
  referenceNo: string;
  applicantName: string;
  applicantIc: string;
  applicantPhone: string | null;
  applicationType: string;
  applicationTypeLabel: string;
  businessType: string | null;
  zone: string;
  status: string;
  fileNumber: string | null;
  currentStep: string;
  plbDecision: string | null;
  createdAt: string;
  updatedAt: string;
  ptStaffName: string | null;
  ppkpStaffName: string | null;
  isOverdue: boolean;
}

interface DailyReportData {
  date: string;
  totalApplications: number;
  typeCounts: Record<string, number>;
  zoneCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  applications: DailyReportApp[];
}

interface DailyReceivedReportProps {
  userRole: string;
}

export default function DailyReceivedReport({ userRole }: DailyReceivedReportProps) {
  // Default to today's date
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [searchDate, setSearchDate] = useState(today);

  const { data, loading, refetch } = useFetch<DailyReportData>(
    `/api/reports/daily-received?date=${searchDate}`,
    { refreshInterval: 0 }
  );

  const printRef = useRef<HTMLDivElement>(null);

  const handleSearch = () => {
    if (!selectedDate) {
      toast.error('Sila pilih tarikh');
      return;
    }
    setSearchDate(selectedDate);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Penerimaan Harian - ${searchDate}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          h1 { font-size: 18px; text-align: center; margin-bottom: 4px; }
          h2 { font-size: 14px; text-align: center; color: #666; margin-bottom: 16px; }
          .summary { display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
          .summary-card { border: 1px solid #ddd; padding: 10px 16px; border-radius: 4px; min-width: 120px; }
          .summary-card .label { font-size: 11px; color: #666; }
          .summary-card .value { font-size: 20px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 12px; }
          th { background: #f5f5f5; border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-weight: 600; }
          td { border: 1px solid #ddd; padding: 5px 8px; }
          tr:nth-child(even) { background: #fafafa; }
          .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 10px; }
          .footer { margin-top: 20px; font-size: 10px; color: #999; text-align: center; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
        <div class="footer">Dijana oleh Sistem Pengurusan Prestasi Proses Permohonan pada ${new Date().toLocaleString('ms-MY')}</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handleExportCSV = () => {
    if (!data || !data.applications.length) {
      toast.error('Tiada data untuk dieksport');
      return;
    }

    const headers = ['No.', 'No. Rujukan', 'Nama Pemohon', 'No. IC', 'Jenis Permohonan', 'Jenis Perniagaan', 'Zon', 'Status', 'No. Fail', 'Staf PT', 'Diterima Pada'];
    const rows = data.applications.map((app, i) => [
      i + 1,
      app.referenceNo,
      app.applicantName,
      app.applicantIc,
      app.applicationTypeLabel,
      app.businessType || '-',
      `Zon ${app.zone}`,
      formatStatus(app.status),
      app.fileNumber || '-',
      app.ptStaffName || '-',
      formatDateTime(app.createdAt),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `laporan-penerimaan-${searchDate}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Fail CSV berjaya dimuat turun');
  };

  // Format date for display
  const formatDateDisplay = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('ms-MY', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {/* Date Picker Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Pilih Tarikh
              </label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={today}
                className="max-w-xs"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Cari
              </Button>
              {data && data.applications.length > 0 && (
                <>
                  <Button variant="outline" onClick={handlePrint} title="Cetak laporan">
                    <Printer className="h-4 w-4 mr-2" />
                    Cetak
                  </Button>
                  <Button variant="outline" onClick={handleExportCSV} title="Eksport CSV">
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content (for both display and print) */}
      <div ref={printRef}>
        {loading && !data ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Memuatkan laporan...</p>
            </CardContent>
          </Card>
        ) : data ? (
          <>
            {/* Report Header */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Laporan Penerimaan Harian
                </CardTitle>
                <CardDescription>
                  Senarai permohonan yang diterima pada {formatDateDisplay(data.date)}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-sky-600" />
                    <span className="text-xs text-muted-foreground">Jumlah Penerimaan</span>
                  </div>
                  <p className="text-2xl font-bold text-sky-700">{data.totalApplications}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <BarChart3 className="h-4 w-4 text-violet-600" />
                    <span className="text-xs text-muted-foreground">Jenis Permohonan</span>
                  </div>
                  <p className="text-2xl font-bold text-violet-700">{Object.keys(data.typeCounts).length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs text-muted-foreground">Zon Terlibat</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700">{Object.keys(data.zoneCounts).length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <ClipboardList className="h-4 w-4 text-orange-600" />
                    <span className="text-xs text-muted-foreground">Masih Aktif</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-700">
                    {data.applications.filter(a => a.status !== 'COMPLETED' && a.status !== 'REJECTED').length}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Breakdown by Type */}
            {Object.keys(data.typeCounts).length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Mengikut Jenis Permohonan</CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(data.typeCounts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, count]) => (
                        <Badge key={type} variant="outline" className="text-xs py-1 px-3">
                          {type}: <span className="font-bold ml-1">{count}</span>
                        </Badge>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Breakdown by Zone */}
            {Object.keys(data.zoneCounts).length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Mengikut Zon</CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="flex flex-wrap gap-2">
                    {ZONES.map(zone => {
                      const count = data.zoneCounts[zone] || 0;
                      if (count === 0) return null;
                      return (
                        <Badge key={zone} variant="outline" className={`text-xs py-1 px-3 ${getZoneColor(zone)}`}>
                          Zon {zone}: <span className="font-bold ml-1">{count}</span>
                        </Badge>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Applications Table */}
            {data.applications.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground font-medium">Tiada permohonan diterima pada tarikh ini</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatDateDisplay(data.date)}</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">
                    Senarai Permohonan ({data.applications.length} rekod)
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[40px] text-center">No.</TableHead>
                          <TableHead>No. Rujukan</TableHead>
                          <TableHead>Nama Pemohon</TableHead>
                          <TableHead>No. IC</TableHead>
                          <TableHead>Jenis</TableHead>
                          <TableHead className="text-center">Zon</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>No. Fail</TableHead>
                          <TableHead>Masa Diterima</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.applications.map((app, index) => (
                          <TableRow key={app.id} className={app.isOverdue ? 'bg-red-50' : ''}>
                            <TableCell className="text-center text-xs">{index + 1}</TableCell>
                            <TableCell className="font-mono text-xs">{app.referenceNo}</TableCell>
                            <TableCell className="text-xs font-medium">{app.applicantName}</TableCell>
                            <TableCell className="font-mono text-xs">{app.applicantIc}</TableCell>
                            <TableCell className="text-xs">
                              <div>{app.applicationTypeLabel}</div>
                              {app.businessType && (
                                <div className="text-[10px] text-muted-foreground">{app.businessType}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={`text-[10px] ${getZoneColor(app.zone)}`}>
                                {app.zone}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-[10px] ${getStatusColor(app.status)}`}>
                                {formatStatus(app.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{app.fileNumber || '-'}</TableCell>
                            <TableCell className="text-xs">{formatDateTime(app.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status Summary */}
            {Object.keys(data.statusCounts).length > 0 && data.applications.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Ringkasan Status Semasa</CardTitle>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(data.statusCounts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([status, count]) => (
                        <Badge key={status} variant="outline" className={`text-xs py-1 px-3 ${getStatusColor(status)}`}>
                          {formatStatus(status)}: <span className="font-bold ml-1">{count}</span>
                        </Badge>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
