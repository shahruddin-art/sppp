'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2, LogIn, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/theme-toggle';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Sila masukkan username dan kata laluan');
      return;
    }

    try {
      await login(username, password);
      toast.success('Log masuk berjaya!');
    } catch (err: any) {
      setError(err.message || 'Log masuk gagal');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-background to-sky-50 dark:from-background dark:via-background dark:to-background p-4 relative">
      {/* Theme toggle - top right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Sistem Pengurusan Prestasi</h1>
          <p className="text-sm text-muted-foreground mt-1">Proses Permohonan Lesen Berpandukan Hari & Masa</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <LogIn className="h-5 w-5 text-sky-600" />
              Log Masuk
            </CardTitle>
            <CardDescription>Masukkan kredensial anda untuk mengakses sistem</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 p-3">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  autoComplete="username"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Kata Laluan</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata laluan"
                  autoComplete="current-password"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Log Masuk
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Sistem Pengurusan Prestasi Proses Permohonan © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
