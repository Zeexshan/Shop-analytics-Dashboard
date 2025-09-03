import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { Product, Sale, Expense, Goal, KPIData } from '@shared/schema';
import { 
  FileText, 
  Download, 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  CreditCard,
  Target,
  Calendar,
  BarChart3,
  PieChart
} from 'lucide-react';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('overview');
  const [dateRange, setDateRange] = useState('thisMonth');
  const { toast } = useToast();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    queryFn: () => api.get('/api/products'),
  });

  const { data: sales = [] } = useQuery<Sale[]>({
    queryKey: ['/api/sales'],
    queryFn: () => api.get('/api/sales'),
  });

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ['/api/expenses'],
    queryFn: () => api.get('/api/expenses'),
  });

  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ['/api/goals'],
    queryFn: () => api.get('/api/goals'),
  });

  const { data: kpis } = useQuery<KPIData>({
    queryKey: ['/api/dashboard/kpis'],
    queryFn: () => api.get('/api/dashboard/kpis'),
  });

  const { data: chartData } = useQuery({
    queryKey: ['/api/dashboard/charts'],
    queryFn: () => api.get('/api/dashboard/charts'),
  });

  const formatCurrency = (amount: number | string) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₹${value.toLocaleString()}`;
  };

  const handleExportReport = (type: string) => {
    toast({
      title: "Export Started",
      description: `Preparing ${type} report for download...`,
    });
    
    // In a real implementation, this would trigger the backend to generate and download the report
    setTimeout(() => {
      toast({
        title: "Export Complete",
        description: `${type} report has been downloaded.`,
      });
    }, 2000);
  };

  const lowStockProducts = products.filter(p => p.stock <= p.min_stock);
  const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.total_amount.toString()), 0);
  const totalProfit = sales.reduce((sum, sale) => sum + parseFloat(sale.profit.toString()), 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0);
  const netProfit = totalProfit - totalExpenses;

  // Category breakdown
  const categoryStats = new Map();
  sales.forEach(sale => {
    const product = products.find(p => p.id === sale.product_id);
    if (product) {
      const existing = categoryStats.get(product.category) || { sales: 0, revenue: 0 };
      existing.sales += sale.quantity;
      existing.revenue += parseFloat(sale.total_amount.toString());
      categoryStats.set(product.category, existing);
    }
  });

  const topCategories = Array.from(categoryStats.entries())
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <div className="flex-1 overflow-auto">
      <Header 
        title="Reports" 
        description="Generate comprehensive business reports and analytics"
        showDatePicker
        showExportButton
        onDateRangeChange={setDateRange}
        onExport={() => handleExportReport('Complete Business Report')}
      />
      
      <div className="p-6 space-y-6">
        {/* Report Type Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Report Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-64" data-testid="select-report-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Business Overview</SelectItem>
                <SelectItem value="sales">Sales Analysis</SelectItem>
                <SelectItem value="inventory">Inventory Report</SelectItem>
                <SelectItem value="financial">Financial Summary</SelectItem>
                <SelectItem value="performance">Performance Metrics</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Business Overview Report */}
        {reportType === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
                      <p className="text-2xl font-bold text-foreground">{formatCurrency(netProfit)}</p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                      <p className="text-2xl font-bold text-foreground">{sales.length}</p>
                    </div>
                    <ShoppingCart className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Products</p>
                      <p className="text-2xl font-bold text-foreground">{products.length}</p>
                    </div>
                    <Package className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Export Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={() => handleExportReport('Business Overview PDF')}
                className="justify-start h-auto p-4"
                variant="outline"
                data-testid="button-export-overview-pdf"
              >
                <FileText className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <p className="font-medium">PDF Report</p>
                  <p className="text-sm text-muted-foreground">Complete business overview</p>
                </div>
              </Button>

              <Button 
                onClick={() => handleExportReport('Business Data Excel')}
                className="justify-start h-auto p-4"
                variant="outline"
                data-testid="button-export-overview-excel"
              >
                <Download className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <p className="font-medium">Excel Export</p>
                  <p className="text-sm text-muted-foreground">Raw data for analysis</p>
                </div>
              </Button>

              <Button 
                onClick={() => handleExportReport('Charts and Graphs')}
                className="justify-start h-auto p-4"
                variant="outline"
                data-testid="button-export-charts"
              >
                <PieChart className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <p className="font-medium">Charts Package</p>
                  <p className="text-sm text-muted-foreground">Visual analytics bundle</p>
                </div>
              </Button>
            </div>
          </div>
        )}

        {/* Sales Analysis Report */}
        {reportType === 'sales' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Categories */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Performing Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topCategories.map(([category, stats], index) => (
                      <div key={category} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{category}</p>
                          <p className="text-sm text-muted-foreground">{stats.sales} units sold</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(stats.revenue)}</p>
                          <Badge variant="secondary">#{index + 1}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Payment Methods */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.from(new Set(sales.map(s => s.payment_method))).map(method => {
                      const methodSales = sales.filter(s => s.payment_method === method);
                      const methodRevenue = methodSales.reduce((sum, s) => sum + parseFloat(s.total_amount.toString()), 0);
                      return (
                        <div key={method} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                            <p className="font-medium">{method}</p>
                            <p className="text-sm text-muted-foreground">{methodSales.length} transactions</p>
                          </div>
                          <p className="font-bold">{formatCurrency(methodRevenue)}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button 
              onClick={() => handleExportReport('Sales Analysis Report')}
              data-testid="button-export-sales"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Sales Report
            </Button>
          </div>
        )}

        {/* Inventory Report */}
        {reportType === 'inventory' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Low Stock Alert */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <Package className="h-5 w-5" />
                    Low Stock Alert ({lowStockProducts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {lowStockProducts.slice(0, 10).map(product => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-600">{product.stock} left</p>
                          <p className="text-sm text-muted-foreground">Min: {product.min_stock}</p>
                        </div>
                      </div>
                    ))}
                    {lowStockProducts.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        All products are well stocked!
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Stock Valuation */}
              <Card>
                <CardHeader>
                  <CardTitle>Inventory Valuation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Products</p>
                      <p className="text-2xl font-bold">{products.length}</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Total Stock Value</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(
                          products.reduce((sum, p) => sum + (p.stock * parseFloat(p.cost_price.toString())), 0)
                        )}
                      </p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Average Stock per Product</p>
                      <p className="text-2xl font-bold">
                        {products.length > 0 ? Math.round(products.reduce((sum, p) => sum + p.stock, 0) / products.length) : 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button 
              onClick={() => handleExportReport('Inventory Report')}
              data-testid="button-export-inventory"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Inventory Report
            </Button>
          </div>
        )}

        {/* Financial Summary */}
        {reportType === 'financial' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <TrendingUp className="h-5 w-5" />
                    Income
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Sales Revenue</span>
                      <span className="font-bold">{formatCurrency(totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gross Profit</span>
                      <span className="font-bold">{formatCurrency(totalProfit)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <CreditCard className="h-5 w-5" />
                    Expenses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Total Expenses</span>
                      <span className="font-bold">{formatCurrency(totalExpenses)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expense Count</span>
                      <span className="font-bold">{expenses.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-600">
                    <BarChart3 className="h-5 w-5" />
                    Net Position
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Net Profit</span>
                      <span className={`font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(netProfit)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Profit Margin</span>
                      <span className="font-bold">
                        {totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button 
              onClick={() => handleExportReport('Financial Summary')}
              data-testid="button-export-financial"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Financial Report
            </Button>
          </div>
        )}

        {/* Performance Metrics */}
        {reportType === 'performance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Goal Progress */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Goal Achievement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {goals.filter(g => g.status === 'Active').map(goal => (
                      <div key={goal.id} className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{goal.period_type} Goal</span>
                          <Badge>{goal.status}</Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Revenue: {formatCurrency(goal.revenue_goal)}</span>
                            <span className="text-muted-foreground">
                              {formatCurrency(kpis?.revenue || 0)} achieved
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Profit: {formatCurrency(goal.profit_goal)}</span>
                            <span className="text-muted-foreground">
                              {formatCurrency(kpis?.profit || 0)} achieved
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {goals.filter(g => g.status === 'Active').length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No active goals set
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Key Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Key Performance Indicators</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Average Sale Value</p>
                      <p className="text-xl font-bold">
                        {formatCurrency(sales.length > 0 ? totalRevenue / sales.length : 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Products per Sale</p>
                      <p className="text-xl font-bold">
                        {sales.length > 0 ? (sales.reduce((sum, s) => sum + s.quantity, 0) / sales.length).toFixed(1) : 0}
                      </p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Revenue Growth</p>
                      <p className="text-xl font-bold text-green-600">
                        {kpis?.revenueGrowth ? `+${kpis.revenueGrowth.toFixed(1)}%` : '0%'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Button 
              onClick={() => handleExportReport('Performance Report')}
              data-testid="button-export-performance"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Performance Report
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
