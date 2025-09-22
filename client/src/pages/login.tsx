import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';
import { loginSchema, type LoginData } from '@shared/schema';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Store, Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { useEffect } from 'react';
import { getApiUrl } from '@/config/api';

export default function LoginPage() {
  const { login, user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  useEffect(() => {
    if (user) {
      setLocation('/dashboard');
    }
  }, [user, setLocation]);

  const onSubmit = async (data: LoginData) => {
    setIsLoading(true);
    try {
      await login(data.username, data.password);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      setLocation('/dashboard');
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Invalid username or password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced watermark - Base64 method
  const forgotPasswordHandler = atob('emVleHNoYW4tZm9yZ290LXBhc3N3b3Jk');
  
  const handleForgotPassword = async () => {
    console.log('Forgot password clicked, license key:', licenseKey);
    
    if (!licenseKey.trim()) {
      toast({
        title: "License Key Required",
        description: "Please enter your license key to reset password.",
        variant: "destructive",
      });
      return;
    }
    
    const requestBody = { 
      licenseKey: licenseKey.trim()
    };
    
    console.log('Sending forgot password request:', requestBody);
    
    try {
      const response = await fetch(getApiUrl('/api/auth/forgot-password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        toast({
          title: "Password Reset Successful", 
          description: "Your password has been reset to the default. Please login with your original admin credentials.",
        });
        setIsForgotPasswordOpen(false);
        setLicenseKey('');
      } else {
        const error = await response.json();
        toast({
          title: "Reset Failed",
          description: error.message || "Invalid license key. Please check and try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Reset Failed", 
        description: "Unable to reset password. Please try again later.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-lg" data-testid="login-card">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
              <Store className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">ShopAnalytics</CardTitle>
          <CardDescription>
            Sign in to access your shop dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your username" 
                        autoComplete="username"
                        {...field} 
                        data-testid="input-username"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="Enter your password" 
                          autoComplete="current-password"
                          {...field} 
                          data-testid="input-password"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          data-testid="toggle-password-visibility"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          </Form>
          
          <div className="text-center mt-4">
            <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
              <DialogTrigger asChild>
                <Button variant="link" className="text-sm" data-testid="forgot-password-link">
                  Forgot Password?
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Reset Password</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      License Key
                    </label>
                    <Input
                      type="text"
                      placeholder="Enter your license key"
                      value={licenseKey}
                      onChange={(e) => setLicenseKey(e.target.value)}
                      data-testid="license-key-input"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter the license key provided with your purchase
                    </p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsForgotPasswordOpen(false)}
                      data-testid="cancel-reset"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleForgotPassword}
                      data-testid="reset-password"
                    >
                      Reset Password
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
