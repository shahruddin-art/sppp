'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  FileText,
  UserPlus,
  BarChart3,
  Database,
  Loader2,
} from 'lucide-react';
import Dashboard from '@/components/app/dashboard';
import ApplicationList from '@/components/app/application-list';
import ApplicationForm from '@/components/app/application-form';
import ApplicationDetail from '@/components/app/application-detail';
import Performance from '@/components/app/performance';
import { postData } from '@/hooks/use-fetch';
import { toast } from 'sonner';

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
  poDecision: string | null;
  poDecisionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  steps: any[];
  ptStaff: any;
  ppkpStaff: any;
  pplStaff: any;
  poStaff: any;
  currentStepStatus: string | null;
  currentStepName: string | null;
  isOverdue: boolean;
  remainingDays: number | null;
  applicationTypeLabel: string;
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await postData('/api/seed', {});
      setSeeded(true);
      toast.success('Data contoh berjaya dimuatkan!');
      // Refresh page data
      window.location.reload();
    } catch (error: any) {
      toast.error('Gagal memuatkan data contoh');
    } finally {
      setSeeding(false);
    }
  };

  const handleSelectApp = (app: Application) => {
    setSelectedAppId(app.id);
    setActiveTab('detail');
  };

  const handleBackFromDetail = () => {
    setSelectedAppId(null);
    setActiveTab('applications');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center">
                <FileText className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">
                  Sistem Pengurusan Prestasi
                </h1>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  Proses Permohonan Berpandukan Hari & Masa
                </p>
              </div>
            </div>

            {!seeded && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSeed}
                disabled={seeding}
                className="gap-2"
              >
                {seeding ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Database className="h-3.5 w-3.5" />
                )}
                Muat Data Contoh
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-5">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-5 w-full sm:w-auto grid grid-cols-5 sm:inline-flex h-auto gap-1 bg-white border p-1 rounded-lg shadow-sm">
            <TabsTrigger value="dashboard" className="gap-1.5 text-xs px-3 py-2">
              <LayoutDashboard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Papan Pemuka</span>
              <span className="sm:hidden">Papan</span>
            </TabsTrigger>
            <TabsTrigger value="applications" className="gap-1.5 text-xs px-3 py-2">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Senarai</span>
              <span className="sm:hidden">Senarai</span>
            </TabsTrigger>
            <TabsTrigger value="register" className="gap-1.5 text-xs px-3 py-2">
              <UserPlus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Daftar</span>
              <span className="sm:hidden">Daftar</span>
            </TabsTrigger>
            <TabsTrigger value="detail" className="gap-1.5 text-xs px-3 py-2" disabled={!selectedAppId}>
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Butiran</span>
              <span className="sm:hidden">Butiran</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-1.5 text-xs px-3 py-2">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Prestasi</span>
              <span className="sm:hidden">Analisis</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard />
          </TabsContent>

          <TabsContent value="applications">
            <ApplicationList onSelect={handleSelectApp} />
          </TabsContent>

          <TabsContent value="register">
            <ApplicationForm />
          </TabsContent>

          <TabsContent value="detail">
            {selectedAppId ? (
              <ApplicationDetail applicationId={selectedAppId} onBack={handleBackFromDetail} />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Sila pilih permohonan dari senarai</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="performance">
            <Performance />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-white py-3">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Sistem Pengurusan Prestasi Proses Permohonan © {new Date().getFullYear()}
            </p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>SLA: PT (3 hari) | PPKP (4 hari) | PPL (3 hari)</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
