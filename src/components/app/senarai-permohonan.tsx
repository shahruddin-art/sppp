'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import {
  Search,
  FileText,
  RefreshCw,
  X,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { getSessionToken } from '@/lib/auth-store';
import {
  formatStatus,
  getStatusColor,
  getZoneColor,
  formatDateTime,
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
  businessName: string | null;
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

interface ApiResponse {
  data: Application[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface SenaraiPermohonanProps {
  onSelectApp: (appId: string) => void;
}

const ITEMS_PER_PAGE = 20;

export default function SenaraiPermohonan({ onSelectApp }: SenaraiPermohonanProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState<Application[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const hasFilters = statusFilter !== 'all' || zoneFilter !== 'all' || typeFilter !== 'all' || search !== '';

  const clearFilters = () => {
    setStatusFilter('all');
    setZoneFilter('all');
    setTypeFilter('all');
    setSearch('');
  };

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, zoneFilter, typeFilter, search]);

  // Fetch data with pagination
  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (statusFilter !== 'all') queryParams.set('status', statusFilter);
        if (zoneFilter !== 'all') queryParams.set('zone', zoneFilter);
        if (typeFilter !== 'all') queryParams.set('type', typeFilter);
        if (search) queryParams.set('search', search);
        queryParams.set('page', currentPage.toString());
        queryParams.set('limit', ITEMS_PER_PAGE.toString());

        const token = getSessionToken();
        const res = await fetch(`/api/applications?${queryParams.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('Failed to fetch');
        const json: ApiResponse = await res.json();
        if (!cancelled) {
          setData(json.data || []);
          setTotalCount(json.totalCount || 0);
          setTotalPages(json.totalPages || 1);
        }
      } catch {
        if (!cancelled) {
          setData([]);
          setTotalCount(0);
          setTotalPages(1);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [statusFilter, zoneFilter, typeFilter, search, currentPage]);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
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

              <Button variant="outline" size="icon" onClick={() => setCurrentPage((p) => p)} title="Muat semula">
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
          {loading ? 'Memuatkan...' : `${totalCount} permohonan dijumpai`}
        </p>
      </div>

      {/* Application List Table */}
      {loading && data.length === 0 ? (
        <Card>
          <CardContent className="p-8 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
            <span className="text-sm text-muted-foreground">Memuatkan...</span>
          </CardContent>
        </Card>
      ) : data.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Tiada permohonan dijumpai</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[130px]">No. Rujukan</TableHead>
                    <TableHead className="min-w-[130px]">Nama Pemohon</TableHead>
                    <TableHead className="min-w-[100px]">No. IC/ROC</TableHead>
                    <TableHead className="min-w-[120px]">Jenis</TableHead>
                    <TableHead className="min-w-[80px]">Zon</TableHead>
                    <TableHead className="min-w-[100px]">No. Fail</TableHead>
                    <TableHead className="min-w-[110px]">Status</TableHead>
                    <TableHead className="min-w-[90px]">Dicipta</TableHead>
                    <TableHead className="w-[40px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((app) => (
                    <TableRow
                      key={app.id}
                      className={`cursor-pointer hover:bg-muted/50 ${app.isOverdue ? 'bg-red-50/50' : ''}`}
                      onClick={() => onSelectApp(app.id)}
                    >
                      <TableCell className="font-mono text-xs">{app.referenceNo}</TableCell>
                      <TableCell className="font-medium max-w-[130px] truncate">{app.applicantName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{app.applicantIc}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] max-w-[140px] truncate">
                          {app.applicationTypeLabel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${getZoneColor(app.zone)}`}>
                          Zon {app.zone}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{app.fileNumber || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${getStatusColor(app.status)}`}>
                          {formatStatus(app.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDateTime(app.createdAt)}</TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {!loading && totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Menunjukkan {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} daripada {totalCount} permohonan
          </p>
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                {getPageNumbers().map((page, i) =>
                  page === 'ellipsis' ? (
                    <PaginationItem key={`ellipsis-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={page}>
                      <PaginationLink
                        isActive={currentPage === page}
                        onClick={() => setCurrentPage(page)}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}
    </div>
  );
}
