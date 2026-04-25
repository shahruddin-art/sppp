'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import LoginForm from '@/components/auth/login-form';
import AdminDashboard from '@/components/roles/admin-dashboard';
import KaunterDashboard from '@/components/roles/kaunter-dashboard';
import PTDashboard from '@/components/roles/pt-dashboard';
import PPKPDashboard from '@/components/roles/ppkp-dashboard';
import PPLDashboard from '@/components/roles/ppl-dashboard';
import PLBDashboard from '@/components/roles/plb-dashboard';
import ApplicationDetail from '@/components/app/application-detail';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  LogOut,
  User,
  Shield,
  Loader2,
  Database,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { postData } from '@/hooks/use-fetch';
import { toast } from 'sonner';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Pentadbir',
  KAUNTER: 'Kaunter',
  PT: 'Pembantu Tadbir (PT)',
  PPKP_L: 'PPKP(L)',
  PPKP_P: 'PPKP(P)',
  PPL_L: 'PPL(L)',
  PPL_P: 'PPL(P)',
  PLB: 'Pegawai Lesen Bandar (PLB)',
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-800 border-red-200',
  KAUNTER: 'bg-sky-100 text-sky-800 border-sky-200',
  PT: 'bg-amber-100 text-amber-800 border-amber-200',
  PPKP_L: 'bg-violet-100 text-violet-800 border-violet-200',
  PPKP_P: 'bg-violet-100 text-violet-800 border-violet-200',
  PPL_L: 'bg-teal-100 text-teal-800 border-teal-200',
  PPL_P: 'bg-teal-100 text-teal-800 border-teal-200',
  PLB: 'bg-orange-100 text-orange-800 border-orange-200',
};

const ROLE_ICONS: Record<string, string> = {
  ADMIN: '🛡️',
  KAUNTER: '📋',
  PT: '📁',
  PPKP_L: '🔬',
  PPKP_P: '🔬',
  PPL_L: '📝',
  PPL_P: '📝',
  PLB: '⚖️',
};

export default function HomePage() {
  const { user, initialized, initialize, logout } = useAuthStore();
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await postData('/api/seed', {});
      setSeeded(true);
      toast.success('Data contoh berjaya dimuatkan! Sila log masuk semula.');
    } catch (error: any) {
      toast.error('Gagal memuatkan data contoh');
    } finally {
      setSeeding(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Log keluar berjaya');
  };

  const handleSelectApp = (appId: string) => {
    setSelectedAppId(appId);
  };

  const handleBackFromDetail = () => {
    setSelectedAppId(null);
  };

  // Loading state while checking session
  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Memuatkan sistem...</p>
        </div>
      </div>
    );
  }

  // Not logged in - show login form
  if (!user) {
    return (
      <div className="relative">
        {!seeded && (
          <div className="absolute top-4 right-4 z-50">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeed}
              disabled={seeding}
              className="gap-2 bg-white shadow-sm"
            >
              {seeding ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Database className="h-3.5 w-3.5" />
              )}
              Muat Data Contoh
            </Button>
          </div>
        )}
        <LoginForm />
      </div>
    );
  }

  // Application detail view (overlay for any role)
  if (selectedAppId) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50/50">
        <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900 leading-tight">
                    Butiran Permohonan
                  </h1>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    {user.name} — {ROLE_LABELS[user.role] || user.role}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleBackFromDetail}>
                ← Kembali
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-5">
          <ApplicationDetail applicationId={selectedAppId} onBack={handleBackFromDetail} />
        </main>
        <footer className="mt-auto border-t bg-white py-3">
          <div className="max-w-7xl mx-auto px-4">
            <p className="text-xs text-muted-foreground text-center">
              Sistem Pengurusan Prestasi Proses Permohonan © {new Date().getFullYear()}
            </p>
          </div>
        </footer>
      </div>
    );
  }

  // Logged in - show role-based dashboard
  const renderDashboard = () => {
    switch (user.role) {
      case 'ADMIN':
        return <AdminDashboard user={user} />;
      case 'KAUNTER':
        return <KaunterDashboard user={user} onSelectApp={handleSelectApp} />;
      case 'PT':
        return <PTDashboard user={user} onSelectApp={handleSelectApp} />;
      case 'PPKP_L':
      case 'PPKP_P':
        return <PPKPDashboard user={user} onSelectApp={handleSelectApp} />;
      case 'PPL_L':
      case 'PPL_P':
        return <PPLDashboard user={user} onSelectApp={handleSelectApp} />;
      case 'PLB':
        return <PLBDashboard user={user} onSelectApp={handleSelectApp} />;
      default:
        return (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Peranan tidak dikenali: {user.role}</p>
          </div>
        );
    }
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

            <div className="flex items-center gap-3">
              {/* Seed button for admin */}
              {user.role === 'ADMIN' && !seeded && (
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
                  <span className="hidden sm:inline">Data Contoh</span>
                </Button>
              )}

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <div className="h-6 w-6 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center">
                      <span className="text-[10px] text-white font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="hidden sm:inline text-sm max-w-[120px] truncate">{user.name}</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{ROLE_ICONS[user.role] || '👤'}</span>
                      <Badge variant="outline" className={`text-[10px] ${ROLE_COLORS[user.role] || ''}`}>
                        {ROLE_LABELS[user.role] || user.role}
                      </Badge>
                    </div>
                    {user.zone && (
                      <p className="text-xs text-muted-foreground mt-1">Zon {user.zone}</p>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                    <LogOut className="h-4 w-4 mr-2" />
                    Log Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Role indicator bar */}
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline" className={`text-[10px] ${ROLE_COLORS[user.role] || ''}`}>
              {ROLE_ICONS[user.role] || '👤'} {ROLE_LABELS[user.role] || user.role}
            </Badge>
            {user.zone && (
              <Badge variant="outline" className="text-[10px]">
                Zon {user.zone}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-5">
        {renderDashboard()}
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
