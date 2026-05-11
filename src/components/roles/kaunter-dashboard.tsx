'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { postData } from '@/hooks/use-fetch';
import { APPLICATION_TYPES, ZONES, getPPKPRole, getPPLRole } from '@/lib/constants';
import { useBusinessTypes } from '@/hooks/use-business-types';
import {
  formatApplicationType,
} from '@/lib/formatters';
import { toast } from 'sonner';
import {
  UserPlus,
  FileText,
  Send,
  Loader2,
  CheckCircle2,
  ClipboardList,
  ArrowRight,
  CalendarDays,
} from 'lucide-react';
import DailyReceivedReport from '@/components/reports/daily-received-report';
import SenaraiPermohonan from '@/components/app/senarai-permohonan';

interface KaunterDashboardProps {
  user: {
    id: string;
    username: string;
    role: string;
    name: string;
    zone: string | null;
  };
  onSelectApp: (appId: string) => void;
}

// ============================================================
// Tab 1 – Daftar Permohonan
// ============================================================
function DaftarPermohonan({ user }: { user: KaunterDashboardProps['user'] }) {
  const { businessTypes } = useBusinessTypes();
  const [formData, setFormData] = useState({
    applicantName: '',
    applicantIc: '',
    applicantPhone: '',
    applicantAddress: '',
    applicationType: '',
    businessType: '',
    businessTypeOther: '',
    businessName: '',
    accountNo: '',
    zone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<any>(null);

  const ppkpRoute = formData.applicationType ? getPPKPRole(formData.applicationType) : null;
  const pplRoute = ppkpRoute ? getPPLRole(ppkpRoute) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.applicantName || !formData.applicantIc || !formData.applicationType || !formData.zone) {
      toast.error('Sila lengkapkan semua ruangan yang diperlukan');
      return;
    }

    if (formData.applicationType === 'PERMOHONAN_BARU' && !formData.businessType) {
      toast.error('Jenis Perniagaan diperlukan untuk Permohonan Baru');
      return;
    }

    if (formData.businessType === 'Lain-lain' && !formData.businessTypeOther) {
      toast.error('Sila nyatakan jenis perniagaan');
      return;
    }

    setSubmitting(true);
    try {
      const submitData = {
        ...formData,
        businessType: formData.businessType === 'Lain-lain' ? formData.businessTypeOther : formData.businessType,
      };
      delete (submitData as any).businessTypeOther;
      const result = await postData('/api/applications', submitData);
      setSubmitted(result);
      toast.success('Permohonan berjaya didaftarkan!');
      setFormData({
        applicantName: '',
        applicantIc: '',
        applicantPhone: '',
        applicantAddress: '',
        applicationType: '',
        businessType: '',
        businessTypeOther: '',
        businessName: '',
        accountNo: '',
        zone: '',
      });
    } catch (error: any) {
      console.error('Daftar permohonan error:', error);
      const errMsg = error?.message || 'Gagal mendaftarkan permohonan';
      if (errMsg.includes('Sesi telah tamat') || errMsg.includes('tidak sah')) {
        toast.error('Sesi telah tamat. Sila log masuk semula.', { duration: 5000 });
      } else {
        toast.error(errMsg, { duration: 5000 });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header with user info */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-700">
          <UserPlus className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs text-muted-foreground">Kaunter — Mendaftar permohonan baru</p>
        </div>
      </div>

      {/* Registration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5" />
            Pendaftaran Permohonan Baru
          </CardTitle>
          <CardDescription>
            Daftar permohonan baru di kaunter. PT akan menerima notifikasi serta-merta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Applicant Info */}
            <div className="space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Maklumat Pemohon
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="applicantName">Nama Pemohon *</Label>
                  <Input
                    id="applicantName"
                    value={formData.applicantName}
                    onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
                    placeholder="Nama penuh / syarikat"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="applicantIc">No. Kad Pengenalan / ROC *</Label>
                  <Input
                    id="applicantIc"
                    value={formData.applicantIc}
                    onChange={(e) => setFormData({ ...formData, applicantIc: e.target.value })}
                    placeholder="IC / No. pendaftaran syarikat"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="applicantPhone">No. Telefon</Label>
                  <Input
                    id="applicantPhone"
                    value={formData.applicantPhone}
                    onChange={(e) => setFormData({ ...formData, applicantPhone: e.target.value })}
                    placeholder="01x-xxxxxxx"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="applicantAddress">Alamat</Label>
                  <Input
                    id="applicantAddress"
                    value={formData.applicantAddress}
                    onChange={(e) => setFormData({ ...formData, applicantAddress: e.target.value })}
                    placeholder="Alamat pemohon"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Application Details */}
            <div className="space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Maklumat Permohonan
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="applicationType">Jenis Permohonan *</Label>
                  <Select
                    value={formData.applicationType}
                    onValueChange={(val) => setFormData({ ...formData, applicationType: val, businessType: val !== 'PERMOHONAN_BARU' ? '' : formData.businessType, businessTypeOther: val !== 'PERMOHONAN_BARU' ? '' : formData.businessTypeOther })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis permohonan" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(APPLICATION_TYPES).map(([key, val]) => (
                        <SelectItem key={key} value={key}>
                          {val.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="zone">Zon *</Label>
                  <Select
                    value={formData.zone}
                    onValueChange={(val) => setFormData({ ...formData, zone: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih zon" />
                    </SelectTrigger>
                    <SelectContent>
                      {ZONES.map((z) => (
                        <SelectItem key={z} value={z}>
                          Zon {z}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Business Type - only for PERMOHONAN_BARU */}
              {formData.applicationType === 'PERMOHONAN_BARU' && (
                <div className="space-y-1.5">
                  <Label htmlFor="businessType">Jenis Perniagaan *</Label>
                  <Select
                    value={formData.businessType}
                    onValueChange={(val) => setFormData({ ...formData, businessType: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih jenis perniagaan" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessTypes.map((bt) => (
                        <SelectItem key={bt} value={bt}>
                          {bt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formData.businessType === 'Lain-lain' && (
                    <Input
                      value={formData.businessTypeOther || ''}
                      onChange={(e) => setFormData({ ...formData, businessTypeOther: e.target.value })}
                      placeholder="Nyatakan jenis perniagaan..."
                      className="mt-2"
                    />
                  )}
                </div>
              )}

              {/* Business Name and Account No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="businessName">Nama Perniagaan</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="Nama syarikat / perniagaan"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="accountNo">No. Akaun</Label>
                  <Input
                    id="accountNo"
                    value={formData.accountNo}
                    onChange={(e) => setFormData({ ...formData, accountNo: e.target.value })}
                    placeholder="No. akaun"
                  />
                </div>
              </div>
            </div>

            {/* Routing Preview */}
            {formData.applicationType && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-xs font-semibold mb-2">Penghalaan Automatik:</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                    Kaunter
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                    PT (Zon {formData.zone || '?'})
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
                    {ppkpRoute === 'PPKP_L' ? 'PPKP(L) - Lesen' : 'PPKP(P) - Pasar'}
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 max-w-[180px] truncate">
                    {pplRoute === 'PPL_L' ? 'PPL(L) - Penolong Pengarah' : 'PPL(P) - Penolong Pengarah'}
                  </Badge>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 max-w-[180px] truncate">
                    PLB - Pengarah Pelesenan Bandaraya
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  SLA: Pembukaan Fail (3 hari) &rarr; PPKP (4 hari) &rarr; PPL (3 hari)
                </p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Mendaftar...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Daftar Permohonan
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Success Message */}
      {submitted && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-800">Permohonan Berjaya Didaftarkan</p>
                <div className="mt-2 space-y-1 text-sm text-emerald-700">
                  <p>
                    No. Rujukan:{' '}
                    <span className="font-mono font-bold">{submitted.referenceNo}</span>
                  </p>
                  <p>Pemohon: {submitted.applicantName}</p>
                  <p>Jenis: {formatApplicationType(submitted.applicationType)}</p>
                  <p>Zon: {submitted.zone}</p>
                  <p>Status: Menunggu PT untuk pembukaan fail</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setSubmitted(null)}
                >
                  Daftar Permohonan Baru
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// Main Dashboard
// ============================================================
export default function KaunterDashboard({ user, onSelectApp }: KaunterDashboardProps) {
  return (
    <div className="space-y-4">
      {/* Role header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-700">
          <ClipboardList className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Dashboard Kaunter</h2>
          <p className="text-sm text-muted-foreground">
            {user.name} — Daftar &amp; urus permohonan baharu
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="daftar" className="w-full">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="daftar" className="gap-1.5">
            <UserPlus className="h-4 w-4" />
            Daftar Permohonan
          </TabsTrigger>
          <TabsTrigger value="senarai" className="gap-1.5">
            <ClipboardList className="h-4 w-4" />
            Senarai Permohonan
          </TabsTrigger>
          <TabsTrigger value="laporan" className="gap-1.5">
            <CalendarDays className="h-4 w-4" />
            Laporan Harian
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daftar">
          <DaftarPermohonan user={user} />
        </TabsContent>

        <TabsContent value="senarai">
          <SenaraiPermohonan onSelectApp={onSelectApp} />
        </TabsContent>

        <TabsContent value="laporan">
          <DailyReceivedReport userRole={user.role} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
