// zeeexshan: Settings page for Shop Analytics Dashboard
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { getApiUrl } from '@/config/api';
import { Label } from '@/components/ui/label';
import { Lock, Shield, User, Key, Database, BarChart3, AlertTriangle, Trash2 } from 'lucide-react';

// Developer: zeeexshan - Professional Settings Management
const SETTINGS_SIGNATURE_zeeexshan = 'shop_analytics_settings_page';

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordChangeData = z.infer<typeof passwordChangeSchema>;

// Enhanced data reset schema for production readiness
const dataResetSchema = z.object({
  password: z.string().min(1, 'Password is required to reset data'),
});

type DataResetData = z.infer<typeof dataResetSchema>;

// Storage statistics component for real-time data monitoring
function DataStats() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/data/stats');
      setStats(response.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading statistics...</div>;
  }

  if (!stats) {
    return <div className="text-sm text-muted-foreground">Unable to load statistics</div>;
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="space-y-1">
        <p className="text-2xl font-bold">{stats.products}</p>
        <p className="text-xs text-muted-foreground">Products</p>
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold">{stats.sales}</p>
        <p className="text-xs text-muted-foreground">Sales</p>
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold">{stats.expenses}</p>
        <p className="text-xs text-muted-foreground">Expenses</p>
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold">{formatFileSize(stats.fileSize)}</p>
        <p className="text-xs text-muted-foreground">File Size</p>
      </div>
    </div>
  );
}

// Enhanced data reset dialog with security and backup features
function DataResetDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const resetForm = useForm<DataResetData>({
    resolver: zodResolver(dataResetSchema),
    defaultValues: {
      password: '',
    },
  });

  const [enteredPassword, setEnteredPassword] = useState('');

  const handleResetSubmit = async (data: DataResetData) => {
    setEnteredPassword(data.password); // Store password before clearing form
    setOpen(false);
    setConfirmOpen(true);
    resetForm.reset();
  };

  const executeReset = async () => {
    setIsResetting(true);
    try {
      await api.post('/api/data/reset', { password: enteredPassword });

      toast({
        title: "Data Reset Successful",
        description: "All data has been reset successfully. A backup has been created.",
      });

      setConfirmOpen(false);
      setEnteredPassword(''); // Clear stored password
      // Refresh the page to show fresh state
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset data",
        variant: "destructive",
      });
      setEnteredPassword(''); // Clear stored password on error too
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="destructive" className="w-full">
            <Trash2 className="h-4 w-4 mr-2" />
            Reset All Data
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset All Application Data</DialogTitle>
            <DialogDescription>
              This will permanently delete all products, sales, expenses, and goals. 
              A backup will be created automatically. Enter your password to confirm.
            </DialogDescription>
          </DialogHeader>
          <Form {...resetForm}>
            <form onSubmit={resetForm.handleSubmit(handleResetSubmit)} className="space-y-4">
              <FormField
                control={resetForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Password</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Enter your admin password" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="destructive">
                  Continue Reset
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all your:
              <br />• Products and inventory data
              <br />• Sales records and history
              <br />• Expense tracking data
              <br />• Goals and progress
              <br /><br />
              A backup file will be created before deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeReset}
              disabled={isResetting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isResetting ? "Resetting..." : "Yes, reset all data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [isActivated, setIsActivated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activationData, setActivationData] = useState<any>(null);
  const [licenseInfo, setLicenseInfo] = useState<any>(null);
  const [isLoadingLicense, setIsLoadingLicense] = useState(false);


  const form = useForm<PasswordChangeData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // zeeexshan: Check license activation status
  useEffect(() => {
    checkActivationStatus();
  }, []);

  const checkActivationStatus = async () => {
    try {
      // Check if running in Electron with activation API
      if ((window as any).electronAPI?.checkActivation) {
        const result = await (window as any).electronAPI.checkActivation();
        setIsActivated(result.isActivated);
        setActivationData(result.data);
      } else {
        // For web version, always allow password change
        setIsActivated(true);
      }
    } catch (error) {
      console.error('Error checking activation status:', error);
      setIsActivated(false);
    }
  };

  const fetchLicenseInfo = async () => {
    setIsLoadingLicense(true);
    try {
      const response = await fetch(getApiUrl('/api/license/current'), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLicenseInfo(data.license);
      } else {
        console.error('Failed to fetch license info');
      }
    } catch (error) {
      console.error('Error fetching license info:', error);
    } finally {
      setIsLoadingLicense(false);
    }
  };

  useEffect(() => {
    fetchLicenseInfo();
  }, []);


  const onSubmit = async (data: PasswordChangeData) => {
    if (!isActivated) {
      toast({
        title: "Feature Locked",
        description: "Password change requires license activation",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await api.post('/api/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully",
      });

      form.reset();
    } catch (error: any) {
      toast({
        title: "Password Change Failed",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="Settings" 
        description="Manage your account and application settings" 
      />

      <div className="p-6 space-y-6">
        {/* License Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              License Information
            </CardTitle>
            <CardDescription>
              Current license status and details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLicense ? (
              <div>Loading license information...</div>
            ) : licenseInfo ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="font-medium">License Key</Label>
                    <p className="text-muted-foreground">{licenseInfo.licenseKeyMasked}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Status</Label>
                    <p className="text-green-600 font-medium">Active</p>
                  </div>
                  <div>
                    <Label className="font-medium">Device ID</Label>
                    <p className="text-muted-foreground font-mono text-xs">{licenseInfo.deviceId.substring(0, 16)}...</p>
                  </div>
                  <div>
                    <Label className="font-medium">Activated</Label>
                    <p className="text-muted-foreground">{new Date(licenseInfo.activatedAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label className="font-medium">Last Heartbeat</Label>
                    <p className="text-muted-foreground">{new Date(licenseInfo.lastHeartbeat).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground">No active license found</div>
            )}
          </CardContent>
        </Card>

        {/* Password Change Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>
              Update your account password for security
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isActivated ? (
              <div className="p-6 text-center bg-muted rounded-lg">
                <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-semibold mb-2">Password Change Locked</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Password change is available after license activation
                </p>
                <Badge variant="outline">
                  Requires Licensed Version
                </Badge>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Enter your current password" 
                            {...field} 
                          />
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
                          <Input 
                            type="password" 
                            placeholder="Enter your new password (min 8 characters)" 
                            {...field} 
                          />
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
                          <Input 
                            type="password" 
                            placeholder="Confirm your new password" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={isLoading || !isActivated}
                    className="w-full"
                  >
                    {isLoading ? "Changing Password..." : "Change Password"}
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        {/* Data Management Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Management
            </CardTitle>
            <CardDescription>
              Manage your application data and storage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Storage Statistics */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Storage Statistics
              </h4>
              <DataStats />
            </div>

            {/* Data Reset Section */}
            <div className="border-t pt-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <h4 className="font-medium">Danger Zone</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Reset all application data including products, sales, expenses, and goals. 
                  This action cannot be undone, but a backup will be created automatically.
                </p>
                <DataResetDialog />
              </div>
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
            <CardDescription>
              Your account details and application info
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Username:</span>
              <span className="text-sm">admin</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Application:</span>
              <span className="text-sm">Shop Analytics Dashboard</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Developer:</span>
              <span className="text-sm">zeeexshan</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Version:</span>
              <span className="text-sm">1.0.0</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// zeeexshan: Settings page component signature