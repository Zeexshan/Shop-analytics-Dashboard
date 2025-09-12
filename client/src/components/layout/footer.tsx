import { Store } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <Store className="h-4 w-4" />
            <span>Shop Analytics Dashboard</span>
          </div>
          <div className="text-xs">
            Professional Business Analytics © {currentYear}
          </div>
        </div>
      </div>
    </footer>
  );
}