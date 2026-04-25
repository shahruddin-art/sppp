'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  UserPlus,
  FileText,
  MapPin,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { postData } from '@/hooks/use-fetch';
import { APPLICATION_TYPES, ZONES, getPPKPRole, getPPLRole } from '@/lib/constants';
import { formatApplicationType, formatStaffRole } from '@/lib/formatters';
import { toast } from 'sonner';

export default function ApplicationForm() {
  const [formData, setFormData] = useState({
    applicantName: '',
    applicantIc: '',
    applicantPhone: '',
    applicantAddress: '',
    applicationType: '',
    zone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.applicantName || !formData.applicantIc || !formData.applicationType || !formData.zone) {
      toast.error('Sila lengkapkan semua ruangan yang diperlukan');
      return;
    }

    setSubmitting(true);
    try {
      const result = await postData('/api/applications', formData);
      setSubmitted(result);
      toast.success('Permohonan berjaya didaftarkan!');
      setFormData({
        applicantName: '',
        applicantIc: '',
        applicantPhone: '',
        applicantAddress: '',
        applicationType: '',
        zone: '',
      });
    } catch (error: any) {
      toast.error(error.message || 'Gagal mendaftarkan permohonan');
    } finally {
      setSubmitting(false);
    }
  };

  const ppkpRoute = formData.applicationType ? getPPKPRole(formData.applicationType) : null;
  const pplRoute = ppkpRoute ? getPPLRole(ppkpRoute) : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Registration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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
                    onValueChange={(val) => setFormData({ ...formData, applicationType: val })}
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
                      {ZONES.map(z => (
                        <SelectItem key={z} value={z}>Zon {z}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Routing Preview */}
            {formData.applicationType && (
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-xs font-semibold mb-2">Penghalaan Automatik:</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    Kaunter
                  </Badge>
                  <span className="text-xs text-muted-foreground">→</span>
                  <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
                    PT (Zon {formData.zone || '?'})
                  </Badge>
                  <span className="text-xs text-muted-foreground">→</span>
                  <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
                    {ppkpRoute === 'PPKP_L' ? 'PPKP(L) - Lesen' : 'PPKP(P) - Pasar'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">→</span>
                  <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                    {pplRoute === 'PPL_L' ? 'PPL(L)' : 'PPL(P)'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">→</span>
                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                    PLB
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  SLA: Pembukaan Fail (3 hari) → PPKP (4 hari) → PPL (3 hari)
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
                  <p>No. Rujukan: <span className="font-mono font-bold">{submitted.referenceNo}</span></p>
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
