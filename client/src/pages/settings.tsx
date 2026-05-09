import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { api } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { KeyRound, Database, User, AlertTriangle, BarChart2, Eye, EyeOff } from 'lucide-react';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

interface StorageStats {
  products: number;
  sales: number;
  expenses: number;
  goals: number;
  fileSizeKB: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<StorageStats>({
    queryKey: ['/api/settings/stats'],
    queryFn: () => api.get('/api/settings/stats'),
  });

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.post('/api/settings/change-password', data),
    onSuccess: () => {
      form.reset();
      toast({ title: 'Success', description: 'Password changed successfully.' });
    },
    onError: (err: any) => {
      toast({
        title: 'Error',
        description: err?.message?.includes('401') ? 'Current password is incorrect.' : 'Failed to change password.',
        variant: 'destructive',
      });
    },
  });

  const resetDataMutation = useMutation({
    mutationFn: () => api.post('/api/settings/reset-data', {}),
    onSuccess: () => {
      queryClient.invalidateQueries();
      setConfirmReset(false);
      toast({ title: 'Data Reset', description: 'All application data has been cleared.' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to reset data.', variant: 'destructive' });
    },
  });

  const form = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = (data: ChangePasswordForm) => {
    changePasswordMutation.mutate({ currentPassword: data.currentPassword, newPassword: data.newPassword });
  };

  return (
    <div className="flex-1 overflow-auto">
      <Header title="Settings" description="Manage your account and application settings" />

      <div className="p-6 space-y-6 max-w-3xl">

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Change Password
            </CardTitle>
            <p className="text-sm text-muted-foreground">Update your account password for security</p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showCurrent ? 'text' : 'password'}
                            placeholder="Enter your current password"
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            onClick={() => setShowCurrent(v => !v)}
                          >
                            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showNew ? 'text' : 'password'}
                            placeholder="Enter your new password (min 8 characters)"
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            onClick={() => setShowNew(v => !v)}
                          >
                            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirm ? 'text' : 'password'}
                            placeholder="Confirm your new password"
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            onClick={() => setShowConfirm(v => !v)}
                          >
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  className="w-full"
                  disabled={changePasswordMutation.isPending}
                >
                  {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Management
            </CardTitle>
            <p className="text-sm text-muted-foreground">Manage your application data and storage</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Storage Statistics */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Storage Statistics</span>
              </div>
              {statsLoading ? (
                <div className="grid grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="animate-pulse h-16 bg-muted rounded" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{stats?.products ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">Products</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{stats?.sales ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">Sales</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{stats?.expenses ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">Expenses</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold">{stats?.fileSizeKB ?? '0'} KB</p>
                    <p className="text-xs text-muted-foreground mt-1">File Size</p>
                  </div>
                </div>
              )}
            </div>

            {/* Danger Zone */}
            <div className="border border-red-200 dark:border-red-900/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-semibold">Danger Zone</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Reset all application data including products, sales, expenses, and goals. This action cannot be undone, but a backup will be created automatically.
              </p>
              {!confirmReset ? (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setConfirmReset(true)}
                >
                  Reset All Data
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    Are you sure? This will permanently delete all your data.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      className="flex-1"
                      disabled={resetDataMutation.isPending}
                      onClick={() => resetDataMutation.mutate()}
                    >
                      {resetDataMutation.isPending ? 'Resetting...' : 'Yes, Reset Everything'}
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setConfirmReset(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
            <p className="text-sm text-muted-foreground">Your account details and application info</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-0 divide-y divide-border">
              {[
                { label: 'Username', value: user?.username || 'admin' },
                { label: 'Application', value: 'Shop Analytics Dashboard' },
                { label: 'Developer', value: 'zeexshan' },
                { label: 'Version', value: '1.0.0' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-3">
                  <span className="text-sm text-muted-foreground">{label}:</span>
                  <span className="text-sm font-medium">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Footer */}
      <div className="px-6 pb-6 max-w-3xl">
        <p className="text-center text-xs text-muted-foreground border-t border-border pt-4">
          Shop Analytics Dashboard &copy; {new Date().getFullYear()} &bull; Professional Business Analytics
        </p>
      </div>
    </div>
  );
}
