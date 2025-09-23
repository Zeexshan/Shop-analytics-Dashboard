import logoUrl from '@/assets/logo.png';

export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <img src={logoUrl} alt="Logo" className="h-4 w-4 rounded" />
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