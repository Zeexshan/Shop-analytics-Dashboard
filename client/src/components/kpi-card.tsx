import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

  const tooltipContent = (
    <div className="space-y-2">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-lg">{value}</p>
      </div>
      {change && (
        <div>
          <p className="text-sm text-muted-foreground">Change</p>
          <p className="text-sm">{change}</p>
        </div>
      )}
      {progress !== undefined && (
        <div>
          <p className="text-sm text-muted-foreground">Progress</p>
          <p className="text-sm">{progress.toFixed(1)}%</p>
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Card className="hover:shadow-md transition-shadow overflow-hidden cursor-pointer" data-testid={`kpi-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            <CardContent className="p-3 sm:p-4 lg:p-6">
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className={`w-8 h-8 lg:w-10 lg:h-10 ${iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`h-4 w-4 lg:h-5 lg:w-5 ${iconColor}`} />
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="text-xs lg:text-sm font-medium text-muted-foreground mb-1">{title}</p>
                  <div className="space-y-1">
                    <p className="text-sm sm:text-lg lg:text-xl xl:text-2xl font-bold text-foreground break-all leading-tight" data-testid={`kpi-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
                      {value}
                    </p>
                    {change && (
                      <span className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded-full ${changeColorClass} whitespace-nowrap`}>
                        {change}
                      </span>
                    )}
                  </div>
                  {progress !== undefined && (
                    <div className="mt-2 w-full bg-muted rounded-full h-1.5 lg:h-2">
                      <div 
                        className="bg-amber-600 dark:bg-amber-400 h-1.5 lg:h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}