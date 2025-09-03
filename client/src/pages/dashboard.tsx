import { useQuery } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { KPICard } from '@/components/kpi-card';
import { RevenueChart } from '@/components/charts/revenue-chart';
import { CategoryChart } from '@/components/charts/category-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import type { KPIData, ChartData } from '@shared/schema';

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState('thisMonth');

  const { data: kpis, isLoading: kpisLoading } = useQuery<KPIData>({
    queryKey: ['/api/dashboard/kpis'],
    queryFn: () => api.get('/api/dashboard/kpis'),
  });

  const { data: chartData, isLoading: chartsLoading } = useQuery<ChartData>({
    queryKey: ['/api/dashboard/charts'],
    queryFn: () => api.get('/api/dashboard/charts'),
  });

  const { data: recentSales } = useQuery({
    queryKey: ['/api/sales/recent'],
    queryFn: () => api.get('/api/sales/recent'),
  });

  const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;
  const formatPercentage = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

  const getProductIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'electronics': return Smartphone;
      case 'computers': return Laptop;
      case 'audio': return Headphones;
      default: return ShoppingBag;
    }
  };

  if (kpisLoading || chartsLoading) {
    return (
      <div className="flex-1 overflow-auto">
        <Header 
          title="Dashboard" 
          description="Welcome back! Here's your shop performance overview."
          showDatePicker
          showExportButton
          onDateRangeChange={setDateRange}
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
        onDateRangeChange={setDateRange}
        onExport={() => console.log('Export data')}
      />

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6">
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
            title="Profit"
            value={formatCurrency(kpis?.profit || 0)}
            change={formatPercentage(kpis?.profitGrowth || 0)}
            changeType={kpis?.profitGrowth && kpis.profitGrowth >= 0 ? 'positive' : 'negative'}
            icon={TrendingUp}
            iconColor="text-blue-600 dark:text-blue-400"
            iconBg="bg-blue-100 dark:bg-blue-900/20"
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RevenueChart 
            data={chartData?.revenueData || []}
            onExport={() => console.log('Export revenue chart')}
            onPeriodChange={(period) => console.log('Change period:', period)}
          />
          <CategoryChart 
            data={chartData?.categoryData || []}
            onExport={() => console.log('Export category chart')}
          />
        </div>

        {/* Data Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="flex flex-col items-center p-6 h-auto space-y-2"
                data-testid="button-add-sale"
              >
                <PlusCircle className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium">Add Sale</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex flex-col items-center p-6 h-auto space-y-2"
                data-testid="button-add-product"
              >
                <PackagePlus className="h-8 w-8 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium">Add Product</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex flex-col items-center p-6 h-auto space-y-2"
                data-testid="button-add-expense"
              >
                <CreditCard className="h-8 w-8 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium">Add Expense</span>
              </Button>
              <Button 
                variant="outline" 
                className="flex flex-col items-center p-6 h-auto space-y-2"
                data-testid="button-generate-report"
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