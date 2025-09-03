import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  subtitle?: string;
  progress?: number;
}

export function KPICard({
  title,
  value,
  change,
  changeType = 'positive',
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBg = 'bg-blue-100',
  progress
}: KPICardProps) {
  const changeColorClass = {
    positive: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20',
    negative: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20',
    neutral: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20'
  }[changeType];

  return (
    <Card className="hover:shadow-md transition-shadow" data-testid={`kpi-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center`}>
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <div className="flex items-center space-x-2">
                <p className="text-2xl font-bold text-foreground animate-counter" data-testid={`kpi-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
                  {value}
                </p>
                {change && (
                  <span className={`text-sm font-medium px-2 py-1 rounded ${changeColorClass}`}>
                    {change}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
              )}
              {progress !== undefined && (
                <div className="mt-3 w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-amber-600 dark:bg-amber-400 h-2 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}