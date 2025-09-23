import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Header } from '@/components/layout/header';
import { KPICard } from '@/components/kpi-card';
import { RevenueChart } from '@/components/charts/revenue-chart';
import { CategoryChart } from '@/components/charts/category-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  AlertTriangle, 
  Target,
  PlusCircle,
  PackagePlus,
  CreditCard,
  FileText,
  Smartphone,
  Laptop,
  Headphones
} from 'lucide-react';
import { useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Input } from '@/components/ui/input';
import type { KPIData, ChartData } from '@shared/schema';

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState('thisMonth');
  const [revenueChartPeriod, setRevenueChartPeriod] = useState('30');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Helper function to convert date range to actual dates
  const getDateRangeParams = (range: string) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    // Handle custom date range - Fixed parsing logic
    if (range.startsWith('custom-')) {
      // Remove 'custom-' prefix and split correctly
      const datesPart = range.substring(7); // Remove 'custom-'
      const dates = datesPart.split('-');
      
      // Reconstruct the dates properly (YYYY-MM-DD format)
      if (dates.length >= 6) {
        const startDateStr = `${dates[0]}-${dates[1]}-${dates[2]}`;
        const endDateStr = `${dates[3]}-${dates[4]}-${dates[5]}`;
        return {
          startDate: startDateStr,
          endDate: endDateStr + 'T23:59:59.999Z'
        };
      }
      
      // Fallback to current month if parsing fails
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0] + 'T23:59:59.999Z'
      };
    }

    switch (range) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'yesterday':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
        break;
      case 'thisWeek':
        const startOfWeek = now.getDate() - now.getDay();
        startDate = new Date(now.getFullYear(), now.getMonth(), startOfWeek);
        break;
      case 'lastWeek':
        const startOfLastWeek = now.getDate() - now.getDay() - 7;
        startDate = new Date(now.getFullYear(), now.getMonth(), startOfLastWeek);
        endDate = new Date(now.getFullYear(), now.getMonth(), startOfLastWeek + 6, 23, 59, 59);
        break;
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        break;
      case 'thisQuarter':
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        break;
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0] + 'T23:59:59.999Z'
    };
  };

  const dateParams = getDateRangeParams(dateRange);

  const { data: kpis, isLoading: kpisLoading } = useQuery<KPIData>({
    queryKey: ['/api/dashboard/kpis', dateRange],
    queryFn: () => api.get('/api/dashboard/kpis', { params: dateParams }),
  });

  const { data: chartData, isLoading: chartsLoading } = useQuery<ChartData>({
    queryKey: ['/api/dashboard/charts', dateRange],
    queryFn: () => api.get('/api/dashboard/charts', { params: dateParams }),
  });

  // Revenue chart data with period filtering
  const { data: revenueChartData, isLoading: revenueChartLoading } = useQuery({
    queryKey: ['/api/dashboard/revenue-chart', revenueChartPeriod],
    queryFn: async () => {
      const periodParams = {
        days: parseInt(revenueChartPeriod)
      };
      const result = await api.get('/api/dashboard/charts', { params: periodParams });
      return result.revenueData;
    },
  });

  const { data: recentSales } = useQuery({
    queryKey: ['/api/sales/recent'],
    queryFn: () => api.get('/api/sales/recent'),
  });

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;
  const formatPercentage = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

  // Chart export functions
  const exportChartAsImage = async (chartId: string, filename: string) => {
    try {
      const chartElement = document.querySelector(`[data-testid="${chartId}"]`) as HTMLElement;
      if (!chartElement) {
        throw new Error('Chart element not found');
      }

      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true
      });

      // Create download link
      const link = document.createElement('a');
      link.download = `${filename}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Complete",
        description: `Chart exported as ${link.download}`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export chart. Please try again.",
        variant: "destructive",
      });
    }
  };

  const exportChartAsPDF = async (chartId: string, filename: string) => {
    try {
      const chartElement = document.querySelector(`[data-testid="${chartId}"]`) as HTMLElement;
      if (!chartElement) {
        throw new Error('Chart element not found');
      }

      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 280;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`${filename}-${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: "Export Complete",
        description: `Chart exported as PDF`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export chart as PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Chart-specific export handlers
  const handleRevenueChartExport = () => {
    exportChartAsImage('revenue-chart', 'revenue-chart');
  };

  const handleCategoryChartExport = () => {
    exportChartAsImage('category-chart', 'category-chart');
  };

  // Export functionality
  const handleExport = () => {
    toast({
      title: "Export Started",
      description: "Preparing dashboard report for download...",
    });

    try {
      const content = generateDashboardReport();
      const filename = `dashboard-overview-${new Date().toISOString().split('T')[0]}.html`;
      const mimeType = 'text/html';

      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Dashboard report has been downloaded as ${filename}`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const generateDashboardReport = () => {
    const currentDate = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Dashboard Overview Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .metric-card { display: inline-block; width: 200px; margin: 10px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
        .metric-value { font-size: 24px; font-weight: bold; color: #2563eb; }
        .section { margin: 30px 0; }
        .section h2 { color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f8f9fa; }
        @media print { body { margin: 0; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>Dashboard Overview Report</h1>
        <p>Generated on ${currentDate}</p>
        <p>Period: ${dateRange}</p>
    </div>

    <div class="section">
        <h2>Key Performance Indicators</h2>
        <div class="metric-card">
            <div>Total Revenue</div>
            <div class="metric-value">${formatCurrency(kpis?.revenue || 0)}</div>
        </div>
        <div class="metric-card">
            <div>Net Profit</div>
            <div class="metric-value">${formatCurrency(kpis?.profit || 0)}</div>
        </div>
        <div class="metric-card">
            <div>Total Sales</div>
            <div class="metric-value">${kpis?.salesCount || 0}</div>
        </div>
        <div class="metric-card">
            <div>Low Stock Items</div>
            <div class="metric-value">${kpis?.lowStockCount || 0}</div>
        </div>
        <div class="metric-card">
            <div>Goal Progress</div>
            <div class="metric-value">${kpis?.goalProgress?.toFixed(1) || 0}%</div>
        </div>
    </div>

    <div class="section">
        <h2>Growth Metrics</h2>
        <table>
            <thead>
                <tr><th>Metric</th><th>Current Value</th><th>Growth</th></tr>
            </thead>
            <tbody>
                <tr>
                    <td>Revenue Growth</td>
                    <td>${formatCurrency(kpis?.revenue || 0)}</td>
                    <td>${formatPercentage(kpis?.revenueGrowth || 0)}</td>
                </tr>
                <tr>
                    <td>Profit Growth</td>
                    <td>${formatCurrency(kpis?.profit || 0)}</td>
                    <td>${formatPercentage(kpis?.profitGrowth || 0)}</td>
                </tr>
                <tr>
                    <td>Sales Growth</td>
                    <td>${kpis?.salesCount || 0}</td>
                    <td>${formatPercentage(kpis?.salesGrowth || 0)}</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>Recent Sales</h2>
        <table>
            <thead>
                <tr><th>Product</th><th>Customer</th><th>Amount</th><th>Date</th></tr>
            </thead>
            <tbody>
                ${recentSales?.slice(0, 10).map((sale: any) =>
                    `<tr>
                        <td>${sale.product_name}</td>
                        <td>${sale.customer_name || 'Walk-in Customer'}</td>
                        <td>${formatCurrency(parseFloat(sale.total_amount))}</td>
                        <td>${new Date(sale.sale_date).toLocaleDateString()}</td>
                    </tr>`
                ).join('') || ''}
            </tbody>
        </table>
    </div>
</body>
</html>`;
  };

  // Enhanced print functionality for Electron compatibility
  const handlePrint = async () => {
    try {
      // Check if running in Electron and electronAPI is available
      if ((window as any).electronAPI?.print) {
        const result = await (window as any).electronAPI.print();
        if (result.success) {
          toast({
            title: "Print Initiated",
            description: "Print dialog opened successfully",
          });
        } else {
          throw new Error(result.error || 'Print failed');
        }
      } else {
        // Browser print
        window.print();
      }
    } catch (error) {
      console.error('Print failed:', error);
      // Fallback to browser print
      window.print();
      toast({
        title: "Print Fallback",
        description: "Using browser print function",
        variant: "destructive",
      });
    }
  };

  // Handle custom date range with better UI
  const handleCustomDateChange = (range: string) => {
    if (range === 'custom') {
      // Set flag to show custom date inputs
      setShowCustomDatePicker(true);
    } else {
      setShowCustomDatePicker(false);
      setDateRange(range);
    }
  };
  
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  const applyCustomDateRange = () => {
    const start = new Date(customStartDate);
    const end = new Date(customEndDate);
    
    if (start > end) {
      toast({
        title: "Invalid Date Range", 
        description: "Start date cannot be after end date",
        variant: "destructive",
      });
      return;
    }
    
    setCustomDateRange({ start: customStartDate, end: customEndDate });
    setDateRange(`custom-${customStartDate}-${customEndDate}`);
    setShowCustomDatePicker(false);
    
    toast({
      title: "Custom Date Range Applied",
      description: `Showing data from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
    });
  };

  // Handle revenue chart period change
  const handleRevenueChartPeriodChange = (period: string) => {
    setRevenueChartPeriod(period);
  };

  const getProductIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'electronics': return Smartphone;
      case 'computers': return Laptop;
      case 'audio': return Headphones;
      default: return ShoppingBag;
    }
  };

  if (kpisLoading || chartsLoading || revenueChartLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <Header 
          title="Dashboard" 
          description="Welcome back! Here's your shop performance overview."
          showDatePicker
          showExportButton
          onDateRangeChange={handleCustomDateChange}
        />
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-card rounded-lg border border-border p-6 animate-pulse">
                <div className="h-20 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="Dashboard" 
        description="Welcome back! Here's your shop performance overview."
        showDatePicker
        showExportButton
        onDateRangeChange={handleCustomDateChange}
        onExport={handleExport}
      />

      <div className="p-6 space-y-6">
        {/* Custom Date Range Picker */}
        {showCustomDatePicker && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="flex gap-2 mt-6">
                  <Button onClick={applyCustomDateRange} size="sm">
                    Apply
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowCustomDatePicker(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
          <KPICard
            title="Revenue"
            value={formatCurrency(kpis?.revenue || 0)}
            change={formatPercentage(kpis?.revenueGrowth || 0)}
            changeType={kpis?.revenueGrowth && kpis.revenueGrowth >= 0 ? 'positive' : 'negative'}
            icon={DollarSign}
            iconColor="text-green-600 dark:text-green-400"
            iconBg="bg-green-100 dark:bg-green-900/20"
          />

          <KPICard
            title="Gross Profit"
            value={formatCurrency(kpis?.profit || 0)}
            change={formatPercentage(kpis?.profitGrowth || 0)}
            changeType={kpis?.profitGrowth && kpis.profitGrowth >= 0 ? 'positive' : 'negative'}
            icon={TrendingUp}
            iconColor="text-blue-600 dark:text-blue-400"
            iconBg="bg-blue-100 dark:bg-blue-900/20"
          />

          <KPICard
            title="Net Profit"
            value={formatCurrency(kpis?.profit || 0)}
            change={`${kpis?.profitMargin?.toFixed(1) || 0}% margin`}
            changeType={kpis?.profit && kpis.profit >= 0 ? 'positive' : 'negative'}
            icon={Target}
            iconColor="text-green-600 dark:text-green-400"
            iconBg="bg-green-100 dark:bg-green-900/20"
          />

          <KPICard
            title="Sales"
            value={kpis?.salesCount || 0}
            change={formatPercentage(kpis?.salesGrowth || 0)}
            changeType={kpis?.salesGrowth && kpis.salesGrowth >= 0 ? 'positive' : 'negative'}
            icon={ShoppingBag}
            iconColor="text-purple-600 dark:text-purple-400"
            iconBg="bg-purple-100 dark:bg-purple-900/20"
          />

          <KPICard
            title="Low Stock"
            value={kpis?.lowStockCount || 0}
            change="Items"
            changeType="negative"
            icon={AlertTriangle}
            iconColor="text-red-600 dark:text-red-400"
            iconBg="bg-red-100 dark:bg-red-900/20"
          />

          <KPICard
            title="Goal Progress"
            value={`${(kpis?.goalProgress || 0).toFixed(0)}%`}
            change={kpis?.goalProgress && kpis.goalProgress >= 70 ? "On Track" : "Behind"}
            changeType={kpis?.goalProgress && kpis.goalProgress >= 70 ? 'positive' : 'negative'}
            icon={Target}
            iconColor="text-amber-600 dark:text-amber-400"
            iconBg="bg-amber-100 dark:bg-amber-900/20"
            progress={kpis?.goalProgress}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
          <RevenueChart 
            data={revenueChartData || chartData?.revenueData || []}
            onExport={handleRevenueChartExport}
            onPeriodChange={handleRevenueChartPeriodChange}
          />
          <CategoryChart 
            data={chartData?.categoryData || []}
            onExport={handleCategoryChartExport}
          />
        </div>

        {/* Data Tables */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 lg:gap-6">
          {/* Recent Sales */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Sales</CardTitle>
                <Button variant="link" size="sm" data-testid="link-view-all-sales">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentSales?.slice(0, 5)?.map((sale: any) => (
                      <tr key={sale.id} className="hover:bg-muted/50 transition-colors" data-testid={`row-sale-${sale.id}`}>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-foreground">{sale.product_name}</div>
                          <div className="text-sm text-muted-foreground">{sale.customer_name || 'Walk-in Customer'}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                          {formatCurrency(parseFloat(sale.total_amount))}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {new Date(sale.sale_date).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                    {(!recentSales || recentSales.length === 0) && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                          No recent sales found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Top Products</CardTitle>
                <Button variant="link" size="sm" data-testid="link-view-all-products">
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Sales
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {chartData?.topProducts?.map((product, index) => {
                      const Icon = getProductIcon(product.name);
                      return (
                        <tr key={index} className="hover:bg-muted/50 transition-colors" data-testid={`row-product-${index}`}>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                                <Icon className="h-4 w-4 text-primary" />
                              </div>
                              <div className="text-sm font-medium text-foreground">{product.name}</div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                            {product.sales}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-foreground">
                            {formatCurrency(product.revenue)}
                          </td>
                        </tr>
                      );
                    })}
                    {(!chartData?.topProducts || chartData.topProducts.length === 0) && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                          No product data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              <Button 
                variant="outline" 
                className="flex flex-col items-center p-6 h-auto space-y-2"
                data-testid="button-add-sale"
                onClick={() => setLocation('/sales')}
              >
                <PlusCircle className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium">Add Sale</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex flex-col items-center p-6 h-auto space-y-2"
                data-testid="button-add-product"
                onClick={() => setLocation('/products')}
              >
                <PackagePlus className="h-8 w-8 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium">Add Product</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex flex-col items-center p-6 h-auto space-y-2"
                data-testid="button-add-expense"
                onClick={() => setLocation('/expenses')}
              >
                <CreditCard className="h-8 w-8 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium">Add Expense</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex flex-col items-center p-6 h-auto space-y-2"
                data-testid="button-generate-report"
                onClick={() => setLocation('/reports')}
              >
                <FileText className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium">Generate Report</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}