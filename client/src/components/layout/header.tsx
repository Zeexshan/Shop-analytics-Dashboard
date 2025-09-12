// zeeexshan: Header component for Shop Analytics Dashboard
import { Calendar, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Developer: zeeexshan - Professional dashboard header

interface HeaderProps {
  title: string;
  description?: string;
  showDatePicker?: boolean;
  showExportButton?: boolean;
  onExport?: () => void;
  onDateRangeChange?: (range: string) => void;
}

export function Header({ 
  title, 
  description, 
  showDatePicker = false, 
  showExportButton = false,
  onExport,
  onDateRangeChange
}: HeaderProps) {
  // zeeexshan: Header component rendering
  return (
    <header className="bg-card border-b border-border px-6 py-4" data-testid="page-header">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground" data-testid="page-title">{title}</h2>
          {description && (
            <p className="text-muted-foreground" data-testid="page-description">{description}</p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {showDatePicker && (
            <div className="flex items-center space-x-2 bg-muted p-2 rounded-lg">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select onValueChange={onDateRangeChange} defaultValue="thisMonth">
                <SelectTrigger className="bg-transparent border-none text-sm font-medium text-foreground focus:ring-0" data-testid="select-date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="thisWeek">This Week</SelectItem>
                  <SelectItem value="lastWeek">Last Week</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                  <SelectItem value="thisQuarter">This Quarter</SelectItem>
                  <SelectItem value="thisYear">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {showExportButton && (
            <Button onClick={onExport} data-testid="button-export">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
