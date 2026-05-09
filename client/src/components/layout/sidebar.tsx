import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import {
  Store,
  LayoutDashboard,
  Package,
  ShoppingCart,
  CreditCard,
  Target,
  FileText,
  Settings,
  User,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const menuItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { name: 'Products', icon: Package, path: '/products' },
  { name: 'Sales', icon: ShoppingCart, path: '/sales' },
  { name: 'Expenses', icon: CreditCard, path: '/expenses' },
  { name: 'Goals', icon: Target, path: '/goals' },
  { name: 'Reports', icon: FileText, path: '/reports' },
  { name: 'Settings', icon: Settings, path: '/settings' },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 bg-card border-r border-border shadow-sm flex flex-col" data-testid="sidebar">
      <div className="p-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Store className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">ShopAnalytics</h1>
            <p className="text-sm text-muted-foreground">by zeeexshan</p>
          </div>
        </div>
      </div>

      <nav className="px-4 pb-4 flex-1 flex flex-col">
        <ul className="space-y-1 flex-1">
          {menuItems.map((item) => {
            const isActive = location === item.path;
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={cn(
                    "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  data-testid={`nav-link-${item.name.toLowerCase()}`}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="pt-4 border-t border-border mt-4">
          <div className="px-4 py-3 bg-muted rounded-lg mb-2">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground" data-testid="user-name">
                  {user?.username || 'Admin'}
                </p>
                <p className="text-xs text-muted-foreground">Shop Owner</p>
              </div>
            </div>
          </div>
          <Button
            onClick={logout}
            variant="ghost"
            className="flex items-center px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors w-full justify-start"
            data-testid="button-logout"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </Button>
        </div>
      </nav>
    </aside>
  );
}
