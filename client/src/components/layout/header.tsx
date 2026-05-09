import { useState } from 'react';
import { Calendar, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface HeaderProps {
  title: string;
  description?: string;
  showDatePicker?: boolean;
  showExportButton?: boolean;
  onExport?: () => void;
  onDateRangeChange?: (range: string) => void;
  onCustomDateRange?: (startDate: string, endDate: string) => void;
}

export function Header({
  title,
  description,
  showDatePicker = false,
  showExportButton = false,
  onExport,
  onDateRangeChange,
  onCustomDateRange,
}: HeaderProps) {
  const [selectedRange, setSelectedRange] = useState('thisMonth');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [customOpen, setCustomOpen] = useState(false);

  const getDefaultDates = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      start: start.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0],
    };
  };

  const handleRangeChange = (value: string) => {
    setSelectedRange(value);
    if (value === 'custom') {
      const defaults = getDefaultDates();
      if (!customStart) setCustomStart(defaults.start);
      if (!customEnd) setCustomEnd(defaults.end);
      setCustomOpen(true);
    } else {
      setCustomOpen(false);
      onDateRangeChange?.(value);
    }
  };

  const handleApplyCustom = () => {
    if (customStart && customEnd) {
      setCustomOpen(false);
      onDateRangeChange?.('custom');
      onCustomDateRange?.(customStart, customEnd);
    }
  };

  const handleClearCustom = () => {
    setSelectedRange('thisMonth');
    setCustomOpen(false);
    onDateRangeChange?.('thisMonth');
  };

  const customLabel =
    selectedRange === 'custom' && customStart && customEnd
      ? `${new Date(customStart + 'T00:00').toLocaleDateString()} – ${new Date(customEnd + 'T00:00').toLocaleDateString()}`
      : undefined;

  return (
    <header className="bg-card border-b border-border px-6 py-4" data-testid="page-header">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground" data-testid="page-title">{title}</h2>
          {description && (
            <p className="text-muted-foreground" data-testid="page-description">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {showDatePicker && (
            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-2 bg-muted p-2 rounded-lg">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select value={selectedRange} onValueChange={handleRangeChange}>
                  <SelectTrigger
                    className="bg-transparent border-none text-sm font-medium text-foreground focus:ring-0 w-auto min-w-[130px]"
                    data-testid="select-date-range"
                  >
                    <SelectValue>
                      {customLabel ?? undefined}
                    </SelectValue>
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

              {/* Custom date range inline panel */}
              {selectedRange === 'custom' && customOpen && (
                <div className="flex items-end gap-2 bg-card border border-border rounded-lg p-3 shadow-sm">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">From</Label>
                    <Input
                      type="date"
                      value={customStart}
                      max={customEnd || undefined}
                      onChange={e => setCustomStart(e.target.value)}
                      className="h-8 text-sm w-36"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">To</Label>
                    <Input
                      type="date"
                      value={customEnd}
                      min={customStart || undefined}
                      onChange={e => setCustomEnd(e.target.value)}
                      className="h-8 text-sm w-36"
                    />
                  </div>
                  <Button
                    size="sm"
                    className="h-8 px-3"
                    disabled={!customStart || !customEnd}
                    onClick={handleApplyCustom}
                  >
                    Apply
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={handleClearCustom}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
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
