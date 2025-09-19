// client/src/App.tsx

// Change #1: Import Router and the useHashLocation hook
import { Switch, Route, Redirect, Router } from "wouter"; 
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { Sidebar } from "@/components/layout/sidebar";
import { Footer } from "@/components/layout/footer";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import ProductsPage from "@/pages/products";
import SalesPage from "@/pages/sales";
import ExpensesPage from "@/pages/expenses";
import GoalsPage from "@/pages/goals";
import ReportsPage from "@/pages/reports";
import SettingsPage from "@/pages/settings";
import NotFound from "@/pages/not-found";
import LicenseActivation from "@/pages/license-activation";
import { licenseManager, type LicenseData } from "@/lib/license";
import { useState, useEffect } from "react";

// Enhanced watermark - License-protected application
const appLicense = String.fromCharCode(122, 101, 101, 120, 115, 104, 97, 110);

// License protection wrapper component
function LicenseProtectedApp({ children }: { children: React.ReactNode }) {
  const [isLicenseValid, setIsLicenseValid] = useState<boolean | null>(null);
  const [licenseData, setLicenseData] = useState<LicenseData | null>(null);

  useEffect(() => {
    // Check if license is already activated
    const checkLicense = async () => {
      const isActive = await licenseManager.isLicenseActive();
      setIsLicenseValid(isActive);
      
      if (isActive) {
        console.log('License already activated');
      }
    };
    
    checkLicense();
  }, []);

  const handleLicenseVerified = (data: LicenseData) => {
    setLicenseData(data);
    setIsLicenseValid(true);
  };

  // Show loading state during license check
  if (isLicenseValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show license activation if not valid
  if (!isLicenseValid) {
    return <LicenseActivation onLicenseVerified={handleLicenseVerified} />;
  }

  // Show the main app if license is valid
  return <>{children}</>;
}

// No changes needed for ProtectedRoute
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto">
          {children}
        </div>
        <Footer />
      </div>
    </div>
  );
}

// No changes needed for PublicRoute
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Redirect to="/dashboard" />;
  }

  return <>{children}</>;
}

// Renamed this component slightly for clarity and applied the fix
function AppRouter() {
  return (
    // Change #2: Wrap your Switch in the Router component with the hook
    <Router hook={useHashLocation}>
      <Switch>
        <Route path="/">
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        </Route>
        
        <Route path="/dashboard">
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        </Route>
        
        <Route path="/products">
          <ProtectedRoute>
            <ProductsPage />
          </ProtectedRoute>
        </Route>
        
        <Route path="/sales">
          <ProtectedRoute>
            <SalesPage />
          </ProtectedRoute>
        </Route>
        
        <Route path="/expenses">
          <ProtectedRoute>
            <ExpensesPage />
          </ProtectedRoute>
        </Route>
        
        <Route path="/goals">
          <ProtectedRoute>
            <GoalsPage />
          </ProtectedRoute>
        </Route>
        
        <Route path="/reports">
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        </Route>
        
        <Route path="/settings">
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        </Route>

        {/* Fallback to 404 */}
        <Route component={NotFound} />
      </Switch>
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LicenseProtectedApp>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <AppRouter />
          </TooltipProvider>
        </AuthProvider>
      </LicenseProtectedApp>
    </QueryClientProvider>
  );
}

export default App;