import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
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
import type { Product, Sale, Expense, Goal, KPIData } from '@shared/schema';

export default function ReportsPage() {
  const [reportType, setReportType] = useState('overview');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const { toast } = useToast();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products', startDate, endDate],
    queryFn: () => api.get('/api/products', { params: { startDate, endDate } }),
  });

  const { data: sales = [] } = useQuery<Sale[]>({
    queryKey: ['/api/sales', startDate, endDate],
    queryFn: () => api.get('/api/sales', { params: { startDate, endDate } }),
  });

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ['/api/expenses', startDate, endDate],
    queryFn: () => api.get('/api/expenses', { params: { startDate, endDate } }),
  });

  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ['/api/goals'],
    queryFn: () => api.get('/api/goals'),
  });

  const { data: kpis } = useQuery<KPIData>({
    queryKey: ['/api/dashboard/kpis', startDate, endDate],
    queryFn: () => api.get('/api/dashboard/kpis', { params: { startDate, endDate } }),
  });

  const { data: chartData } = useQuery({
    queryKey: ['/api/dashboard/charts', startDate, endDate],
    queryFn: () => api.get('/api/dashboard/charts', { params: { startDate, endDate } }),
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

    try {
      let content = '';
      let filename = '';
      let mimeType = '';

      if (type.includes('PDF') || type.includes('Overview')) {
        content = generatePDFReport();
        filename = `business-overview-${new Date().toISOString().split('T')[0]}.html`;
        mimeType = 'text/html';
      } else if (type.includes('Excel') || type.includes('Data')) {
        content = generateCSVReport();
        filename = `business-data-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else if (type.includes('Sales')) {
        content = generateSalesReport();
        filename = `sales-analysis-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else if (type.includes('Inventory')) {
        content = generateInventoryReport();
        filename = `inventory-report-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else if (type.includes('Financial')) {
        content = generateFinancialReport();
        filename = `financial-summary-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else if (type.includes('Performance')) {
        content = generatePerformanceReport();
        filename = `performance-metrics-${new Date().toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      } else {
        content = generateCompleteReport();
        filename = `complete-business-report-${new Date().toISOString().split('T')[0]}.html`;
        mimeType = 'text/html';
      }

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
        description: `${type} report has been downloaded as ${filename}`,
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

  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.sale_date);
    return saleDate >= new Date(startDate) && saleDate <= new Date(endDate);
  });

  const filteredExpenses = expenses.filter(expense => {
    const expenseDate = new Date(expense.expense_date);
    return expenseDate >= new Date(startDate) && expenseDate <= new Date(endDate);
  });

  const generatePDFReport = () => {
    const lowStockProducts = products.filter(p => p.stock <= p.min_stock);
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + parseFloat(sale.total_amount.toString()), 0);
    const totalProfit = filteredSales.reduce((sum, sale) => sum + parseFloat(sale.profit.toString()), 0);
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0);
    const netProfit = totalProfit - totalExpenses;

    const categoryStats = new Map();
    filteredSales.forEach(sale => {
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

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Business Overview Report</title>
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
        <h1>Business Overview Report</h1>
        <p>Generated on ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <p>Date Range: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</p>
    </div>

    <div class="section">
        <h2>Key Performance Metrics</h2>
        <div class="metric-card">
            <div>Total Revenue</div>
            <div class="metric-value">${formatCurrency(totalRevenue)}</div>
        </div>
        <div class="metric-card">
            <div>Net Profit</div>
            <div class="metric-value">${formatCurrency(netProfit)}</div>
        </div>
        <div class="metric-card">
            <div>Total Sales</div>
            <div class="metric-value">${filteredSales.length}</div>
        </div>
        <div class="metric-card">
            <div>Products</div>
            <div class="metric-value">${products.length}</div>
        </div>
    </div>

    <div class="section">
        <h2>Top Performing Categories</h2>
        <table>
            <thead>
                <tr><th>Category</th><th>Units Sold</th><th>Revenue</th></tr>
            </thead>
            <tbody>
                ${topCategories.map(([category, stats]) =>
                    `<tr><td>${category}</td><td>${stats.sales}</td><td>${formatCurrency(stats.revenue)}</td></tr>`
                ).join('')}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>Recent Sales Summary</h2>
        <table>
            <thead>
                <tr><th>Product</th><th>Customer</th><th>Amount</th><th>Date</th></tr>
            </thead>
            <tbody>
                ${filteredSales.slice(0, 10).map(sale =>
                    `<tr>
                        <td>${sale.product_name}</td>
                        <td>${sale.customer_name || 'Walk-in Customer'}</td>
                        <td>${formatCurrency(sale.total_amount)}</td>
                        <td>${new Date(sale.sale_date).toLocaleDateString()}</td>
                    </tr>`
                ).join('')}
            </tbody>
        </table>
    </div>

    ${lowStockProducts.length > 0 ? `
    <div class="section">
        <h2>Low Stock Alert (${lowStockProducts.length} items)</h2>
        <table>
            <thead>
                <tr><th>Product</th><th>Category</th><th>Current Stock</th><th>Minimum Stock</th></tr>
            </thead>
            <tbody>
                ${lowStockProducts.map(product =>
                    `<tr>
                        <td>${product.name}</td>
                        <td>${product.category}</td>
                        <td style="color: red; font-weight: bold;">${product.stock}</td>
                        <td>${product.min_stock}</td>
                    </tr>`
                ).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    <div class="section">
        <h2>Receipt</h2>
        <p>
            Get yours at: https://zeeexshan.gumroad.com/l/ihpuq?_gl=1*1ep5otu*_ga*MTk2MjM1ODYxNi4xNzU3NDE1MTc5*_ga_6LJN6D94N6*czE3NTg2MzIwMzkkbzI2JGcxJHQxNzU4NjMyMDQyJGo1NyRsMCRoMA.. - by zeeexshan
        </p>
    </div>
</body>
</html>`;
  };

  const generateCSVReport = () => {
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + parseFloat(sale.total_amount.toString()), 0);
    const totalProfit = filteredSales.reduce((sum, sale) => sum + parseFloat(sale.profit.toString()), 0);
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0);
    const netProfit = totalProfit - totalExpenses;

    const csvData = [
      ['Business Data Export'],
      ['Generated Date', new Date().toLocaleDateString()],
      ['Date Range', `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`],
      [''],
      ['Summary Metrics', ''],
      ['Total Revenue', formatCurrency(totalRevenue)],
      ['Net Profit', formatCurrency(netProfit)],
      ['Total Sales Count', filteredSales.length],
      ['Total Products', products.length],
      ['Total Expenses', formatCurrency(totalExpenses)],
      [''],
      ['Sales Data'],
      ['Sale ID', 'Product Name', 'Customer', 'Quantity', 'Unit Price', 'Total Amount', 'Profit', 'Payment Method', 'Date'],
      ...filteredSales.map(sale => [
        sale.id,
        sale.product_name,
        sale.customer_name || 'Walk-in Customer',
        sale.quantity,
        sale.unit_price,
        sale.total_amount,
        sale.profit,
        sale.payment_method,
        new Date(sale.sale_date).toLocaleDateString()
      ]),
      [''],
      ['Expenses Data'],
      ['Expense ID', 'Category', 'Description', 'Amount', 'Payment Method', 'Vendor', 'Date', 'Receipt Number'],
      ...filteredExpenses.map(expense => [
        expense.id,
        expense.category,
        expense.description,
        expense.amount,
        expense.payment_method,
        expense.vendor || '',
        new Date(expense.expense_date).toLocaleDateString(),
        expense.receipt_number || ''
      ])
    ];

    return csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  };

  const generateSalesReport = () => {
    const csvData = [
      ['Sales Report'],
      ['Generated Date', new Date().toLocaleDateString()],
      ['Date Range', `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`],
      [''],
      ['Sale ID', 'Product', 'Customer', 'Quantity', 'Unit Price', 'Total Amount', 'Profit', 'Payment Method', 'Date'],
      ...filteredSales.map(sale => [
        sale.id,
        sale.product_name,
        sale.customer_name || 'Walk-in',
        sale.quantity,
        sale.unit_price,
        sale.total_amount,
        sale.profit,
        sale.payment_method,
        new Date(sale.sale_date).toLocaleDateString()
      ])
    ];

    return csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  };

  const generateInventoryReport = () => {
    const totalStockValue = products.reduce((sum, p) => sum + (p.stock * parseFloat(p.cost_price.toString())), 0);
    const lowStockProducts = products.filter(p => p.stock <= p.min_stock);

    const csvData = [
      ['Inventory Report'],
      ['Generated Date', new Date().toLocaleDateString()],
      ['Date Range', `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`],
      [''],
      ['Inventory Summary'],
      ['Total Products', products.length],
      ['Low Stock Items', lowStockProducts.length],
      ['Total Stock Value', formatCurrency(totalStockValue)],
      [''],
      ['Product Details'],
      ['Product ID', 'Name', 'Category', 'Current Stock', 'Minimum Stock', 'Cost Price', 'Selling Price', 'Stock Value'],
      ...products.map(product => [
        product.id,
        product.name,
        product.category,
        product.stock,
        product.min_stock,
        product.cost_price,
        product.price,
        formatCurrency(product.stock * parseFloat(product.cost_price.toString()))
      ])
    ];

    return csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  };

  const generateFinancialReport = () => {
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + parseFloat(sale.total_amount.toString()), 0);
    const totalProfit = filteredSales.reduce((sum, sale) => sum + parseFloat(sale.profit.toString()), 0);
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0);
    const netProfit = totalProfit - totalExpenses;

    const csvData = [
      ['Financial Summary Report'],
      ['Generated Date', new Date().toLocaleDateString()],
      ['Date Range', `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`],
      [''],
      ['Income Statement'],
      ['Total Sales Revenue', formatCurrency(totalRevenue)],
      ['Gross Profit', formatCurrency(totalProfit)],
      ['Total Expenses', formatCurrency(totalExpenses)],
      ['Net Profit', formatCurrency(netProfit)],
      ['Profit Margin %', totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(2) : 0],
      [''],
      ['Expense Breakdown'],
      ['Expense ID', 'Category', 'Description', 'Amount', 'Payment Method', 'Vendor', 'Date', 'Receipt Number'],
      ...filteredExpenses.map(expense => [
        expense.id,
        expense.category,
        expense.description,
        expense.amount,
        expense.payment_method,
        expense.vendor || '',
        new Date(expense.expense_date).toLocaleDateString(),
        expense.receipt_number || ''
      ])
    ];

    return csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  };

  const generatePerformanceReport = () => {
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + parseFloat(sale.total_amount.toString()), 0);
    const totalProfit = filteredSales.reduce((sum, sale) => sum + parseFloat(sale.profit.toString()), 0);

    const csvData = [
      ['Performance Metrics Report'],
      ['Generated Date', new Date().toLocaleDateString()],
      ['Date Range', `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`],
      [''],
      ['Key Performance Indicators'],
      ['Average Sale Value', formatCurrency(filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0)],
      ['Products per Sale', filteredSales.length > 0 ? (filteredSales.reduce((sum, s) => sum + s.quantity, 0) / filteredSales.length).toFixed(1) : 0],
      ['Revenue Growth %', kpis?.revenueGrowth ? kpis.revenueGrowth.toFixed(1) : 0],
      [''],
      ['Active Goals'],
      ['Period', 'Revenue Goal', 'Current Revenue', 'Profit Goal', 'Current Profit', 'Status'],
      ...goals.filter(g => g.status === 'Active').map(goal => [
        goal.period_type,
        formatCurrency(goal.revenue_goal),
        formatCurrency(kpis?.revenue || 0),
        formatCurrency(goal.profit_goal),
        formatCurrency(kpis?.profit || 0),
        goal.status
      ])
    ];

    return csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  };

  const generateCompleteReport = () => {
    const lowStockProducts = products.filter(p => p.stock <= p.min_stock);
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + parseFloat(sale.total_amount.toString()), 0);
    const totalProfit = filteredSales.reduce((sum, sale) => sum + parseFloat(sale.profit.toString()), 0);
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0);
    const netProfit = totalProfit - totalExpenses;

    const pdfContent = generatePDFReport();
    const bodyContent = pdfContent.split('<body>')[1]?.split('</body>')[0] || '';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Complete Business Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin: 30px 0; page-break-inside: avoid; }
        .section h2 { color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { padding: 15px; border: 1px solid #ddd; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #2563eb; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f8f9fa; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Complete Business Analytics Report</h1>
        <p>Generated on ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <p>Date Range: ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</p>
    </div>

    ${bodyContent}

    <div class="section">
        <h2>Financial Summary</h2>
        <div class="metric-grid">
            <div class="metric-card">
                <div>Total Revenue</div>
                <div class="metric-value">${formatCurrency(totalRevenue)}</div>
            </div>
            <div class="metric-card">
                <div>Total Expenses</div>
                <div class="metric-value">${formatCurrency(totalExpenses)}</div>
            </div>
            <div class="metric-card">
                <div>Net Profit</div>
                <div class="metric-value">${formatCurrency(netProfit)}</div>
            </div>
            <div class="metric-card">
                <div>Profit Margin</div>
                <div class="metric-value">${totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Goal Progress</h2>
        <table>
            <thead>
                <tr><th>Period</th><th>Revenue Goal</th><th>Current</th><th>Profit Goal</th><th>Current</th><th>Status</th></tr>
            </thead>
            <tbody>
                ${goals.filter(g => g.status === 'Active').map(goal =>
                    `<tr>
                        <td>${goal.period_type}</td>
                        <td>${formatCurrency(goal.revenue_goal)}</td>
                        <td>${formatCurrency(kpis?.revenue || 0)}</td>
                        <td>${formatCurrency(goal.profit_goal)}</td>
                        <td>${formatCurrency(kpis?.profit || 0)}</td>
                        <td>${goal.status}</td>
                    </tr>`
                ).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>`;
  };

  const lowStockProducts = products.filter(p => p.stock <= p.min_stock);
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + parseFloat(sale.total_amount.toString()), 0);
  const totalProfit = filteredSales.reduce((sum, sale) => sum + parseFloat(sale.profit.toString()), 0);
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0);
  const netProfit = totalProfit - totalExpenses;

  const categoryStats = new Map();
  filteredSales.forEach(sale => {
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
        showDatePicker={false}
        showExportButton
        onExport={() => handleExportReport('Complete Business Report')}
      />

      <div className="p-6 space-y-6">
        {/* Date Range Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Date Range Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Reports will include data from {new Date(startDate).toLocaleDateString()} to {new Date(endDate).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

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
                      <p className="text-2xl font-bold text-foreground">{filteredSales.length}</p>
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
                    {Array.from(new Set(filteredSales.map(s => s.payment_method))).map(method => {
                      const methodSales = filteredSales.filter(s => s.payment_method === method);
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
                      <span className="font-bold">{filteredExpenses.length}</span>
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
                        {formatCurrency(filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0)}
                      </p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">Products per Sale</p>
                      <p className="text-xl font-bold">
                        {filteredSales.length > 0 ? (filteredSales.reduce((sum, s) => sum + s.quantity, 0) / filteredSales.length).toFixed(1) : 0}
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