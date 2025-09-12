import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { licenseManager, type LicenseData } from '@/lib/license';

// Enhanced watermark - License activation component
const activationOwner = '\u007a\u0065\u0065\u0078\u0073\u0068\u0061\u006e';

const licenseSchema = z.object({
  licenseKey: z.string().min(1, 'License key is required'),
});

type LicenseFormData = z.infer<typeof licenseSchema>;

interface LicenseActivationProps {
  onLicenseVerified: (licenseData: LicenseData) => void;
}

export default function LicenseActivation({ onLicenseVerified }: LicenseActivationProps) {
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const form = useForm<LicenseFormData>({
    resolver: zodResolver(licenseSchema),
    defaultValues: {
      licenseKey: '',
    },
  });

  const onSubmit = async (data: LicenseFormData) => {
    setIsVerifying(true);
    setVerificationError(null);

    try {
      const licenseData = await licenseManager.verifyLicense(data.licenseKey);
      
      if (licenseData.isValid) {
        toast({
          title: "License Activated!",
          description: `Welcome ${licenseData.licensee}! Your license has been verified.`,
        });
        onLicenseVerified(licenseData);
      } else {
        setVerificationError('Invalid license key. Please check your key and try again.');
        toast({
          title: "License Verification Failed",
          description: "The license key you entered is not valid.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('License verification error:', error);
      setVerificationError('Unable to verify license. Please check your internet connection and try again.');
      toast({
        title: "Verification Error",
        description: "Unable to connect to license server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">License Activation</CardTitle>
          <CardDescription>
            Activate your Shop Analytics Dashboard license to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="licenseKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License Key</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your license key" 
                        {...field} 
                        disabled={isVerifying}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {verificationError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {verificationError}
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isVerifying}
              >
                {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isVerifying ? 'Verifying License...' : 'Activate License'}
              </Button>
            </form>
          </Form>
          
          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>Don't have a license key?</p>
            <a 
              href="https://zeeexshan.gumroad.com/l/ihpuq" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Purchase Shop Analytics Dashboard
            </a>
          </div>
          
          <Alert className="mt-4">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your license will be stored locally for offline access after verification.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}