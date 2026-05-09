import XLSX from 'xlsx';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import type { Product, Sale, Expense, Goal, InsertProduct, InsertSale, InsertExpense, InsertGoal } from '@shared/schema';

const DATA_DIR = path.join(process.cwd(), 'data');
const EXCEL_FILE = path.join(DATA_DIR, 'shop_data.xlsx');

export class ExcelStorage {
  constructor() {
    this.ensureDataDirectory();
    this.initializeExcelFile();
  }

  private ensureDataDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private initializeExcelFile() {
    if (!fs.existsSync(EXCEL_FILE)) {
      const workbook = XLSX.utils.book_new();

      const productsSheet = XLSX.utils.aoa_to_sheet([
        ['id', 'name', 'description', 'price', 'cost_price', 'category', 'stock', 'min_stock', 'supplier', 'sku', 'created_date', 'last_updated']
      ]);
      const salesSheet = XLSX.utils.aoa_to_sheet([
        ['id', 'product_id', 'product_name', 'quantity', 'unit_price', 'total_amount', 'profit', 'customer_name', 'payment_method', 'sale_date', 'cashier', 'notes']
      ]);
      const expensesSheet = XLSX.utils.aoa_to_sheet([
        ['id', 'category', 'description', 'amount', 'payment_method', 'vendor', 'expense_date', 'receipt_number', 'notes']
      ]);
      const goalsSheet = XLSX.utils.aoa_to_sheet([
        ['id', 'period_type', 'target_period', 'revenue_goal', 'profit_goal', 'sales_goal', 'created_date', 'status']
      ]);

      XLSX.utils.book_append_sheet(workbook, productsSheet, 'Products');
      XLSX.utils.book_append_sheet(workbook, salesSheet, 'Sales');
      XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Expenses');
      XLSX.utils.book_append_sheet(workbook, goalsSheet, 'Goals');

      XLSX.writeFile(workbook, EXCEL_FILE);
    }
  }

  private readWorkbook() {
    return XLSX.readFile(EXCEL_FILE);
  }

  private writeWorkbook(workbook: any) {
    XLSX.writeFile(workbook, EXCEL_FILE);
  }

  private getSheetData<T>(sheetName: string): T[] {
    const workbook = this.readWorkbook();
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json(sheet) as T[];
  }

  private updateSheet<T>(sheetName: string, data: T[]) {
    const workbook = this.readWorkbook();
    const newSheet = XLSX.utils.json_to_sheet(data);
    workbook.Sheets[sheetName] = newSheet;
    this.writeWorkbook(workbook);
  }

  // Product methods
  async getAllProducts(): Promise<Product[]> {
    return this.getSheetData<Product>('Products');
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const products = await this.getAllProducts();
    return products.find(p => p.id === id);
  }

  async addProduct(productData: InsertProduct): Promise<Product> {
    const products = await this.getAllProducts();
    const product: Product = {
      ...productData,
      id: randomUUID(),
      price: productData.price.toString(),
      cost_price: productData.cost_price.toString(),
      created_date: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    } as Product;

    products.push(product);
    this.updateSheet('Products', products);
    return product;
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const products = await this.getAllProducts();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return undefined;

    products[index] = {
      ...products[index],
      ...updates,
      last_updated: new Date().toISOString(),
    };

    this.updateSheet('Products', products);
    return products[index];
  }

  async deleteProduct(id: string): Promise<boolean> {
    const products = await this.getAllProducts();
    const filtered = products.filter(p => p.id !== id);
    if (filtered.length === products.length) return false;
    this.updateSheet('Products', filtered);
    return true;
  }

  async getLowStockProducts(): Promise<Product[]> {
    const products = await this.getAllProducts();
    return products.filter(p => Number(p.stock) <= Number(p.min_stock));
  }

  // Sales methods
  async getAllSales(): Promise<Sale[]> {
    return this.getSheetData<Sale>('Sales');
  }

  async getSaleById(id: string): Promise<Sale | undefined> {
    const sales = await this.getAllSales();
    return sales.find(s => s.id === id);
  }

  async addSale(saleData: InsertSale): Promise<Sale | null> {
    const product = await this.getProductById(saleData.product_id);
    if (!product) throw new Error('Product not found');

    if (Number(product.stock) < saleData.quantity) throw new Error('Insufficient stock');

    const sales = await this.getAllSales();
    const totalAmount = saleData.quantity * saleData.unit_price;
    const costPrice = parseFloat(product.cost_price.toString());
    const profit = totalAmount - costPrice * saleData.quantity;

    const sale: Sale = {
      ...saleData,
      id: randomUUID(),
      product_name: product.name,
      total_amount: totalAmount.toString(),
      profit: profit.toString(),
      unit_price: saleData.unit_price.toString(),
      sale_date: new Date().toISOString(),
    } as Sale;

    sales.push(sale);
    this.updateSheet('Sales', sales);

    await this.updateProduct(saleData.product_id, {
      stock: Number(product.stock) - saleData.quantity,
    });

    return sale;
  }

  async getSalesByDateRange(startDate: Date, endDate: Date): Promise<Sale[]> {
    const sales = await this.getAllSales();
    return sales.filter(sale => {
      const d = new Date(sale.sale_date);
      return d >= startDate && d <= endDate;
    });
  }

  // Expense methods
  async getAllExpenses(): Promise<Expense[]> {
    return this.getSheetData<Expense>('Expenses');
  }

  async addExpense(expenseData: InsertExpense): Promise<Expense> {
    const expenses = await this.getAllExpenses();
    const expense: Expense = {
      ...expenseData,
      id: randomUUID(),
      amount: expenseData.amount.toString(),
      expense_date: new Date().toISOString(),
    } as Expense;

    expenses.push(expense);
    this.updateSheet('Expenses', expenses);
    return expense;
  }

  async getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    const expenses = await this.getAllExpenses();
    return expenses.filter(expense => {
      const d = new Date(expense.expense_date);
      return d >= startDate && d <= endDate;
    });
  }

  // Goal methods
  async getAllGoals(): Promise<Goal[]> {
    return this.getSheetData<Goal>('Goals');
  }

  async addGoal(goalData: InsertGoal): Promise<Goal> {
    const goals = await this.getAllGoals();
    const goal: Goal = {
      ...goalData,
      id: randomUUID(),
      revenue_goal: goalData.revenue_goal.toString(),
      profit_goal: goalData.profit_goal.toString(),
      created_date: new Date().toISOString(),
    } as Goal;

    goals.push(goal);
    this.updateSheet('Goals', goals);
    return goal;
  }

  async getActiveGoals(): Promise<Goal[]> {
    const goals = await this.getAllGoals();
    return goals.filter(g => g.status === 'Active');
  }

  // Analytics
  async getRevenueAnalytics(startDate: Date, endDate: Date) {
    const sales = await this.getSalesByDateRange(startDate, endDate);
    const totalRevenue = sales.reduce((sum, s) => sum + parseFloat(s.total_amount.toString()), 0);
    const totalProfit = sales.reduce((sum, s) => sum + parseFloat(s.profit.toString()), 0);
    return {
      revenue: totalRevenue,
      profit: totalProfit,
      salesCount: sales.length,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
    };
  }

  async getDashboardKPIs() {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [thisMonthData, lastMonthData, lowStock, activeGoals] = await Promise.all([
      this.getRevenueAnalytics(thisMonth, now),
      this.getRevenueAnalytics(lastMonth, lastMonthEnd),
      this.getLowStockProducts(),
      this.getActiveGoals(),
    ]);

    const revenueGrowth = lastMonthData.revenue > 0
      ? ((thisMonthData.revenue - lastMonthData.revenue) / lastMonthData.revenue) * 100 : 0;
    const profitGrowth = lastMonthData.profit > 0
      ? ((thisMonthData.profit - lastMonthData.profit) / lastMonthData.profit) * 100 : 0;
    const salesGrowth = lastMonthData.salesCount > 0
      ? ((thisMonthData.salesCount - lastMonthData.salesCount) / lastMonthData.salesCount) * 100 : 0;

    let goalProgress = 0;
    const currentGoal = activeGoals.find(g => g.period_type === 'Monthly');
    if (currentGoal) {
      const target = parseFloat(currentGoal.revenue_goal.toString());
      goalProgress = target > 0 ? (thisMonthData.revenue / target) * 100 : 0;
    }

    return {
      revenue: thisMonthData.revenue,
      profit: thisMonthData.profit,
      salesCount: thisMonthData.salesCount,
      lowStockCount: lowStock.length,
      goalProgress,
      revenueGrowth,
      profitGrowth,
      profitMargin: thisMonthData.revenue > 0
        ? Number(((thisMonthData.profit / thisMonthData.revenue) * 100).toFixed(1)) : 0,
      salesGrowth,
    };
  }

  async getTopProducts(limit = 5) {
    const sales = await this.getAllSales();
    const stats = new Map<string, { name: string; sales: number; revenue: number }>();

    sales.forEach(sale => {
      const existing = stats.get(sale.product_id) || { name: sale.product_name, sales: 0, revenue: 0 };
      existing.sales += Number(sale.quantity);
      existing.revenue += parseFloat(sale.total_amount.toString());
      stats.set(sale.product_id, existing);
    });

    return Array.from(stats.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  async getCategoryPerformance() {
    const [products, sales] = await Promise.all([this.getAllProducts(), this.getAllSales()]);
    const categoryStats = new Map<string, number>();

    sales.forEach(sale => {
      const product = products.find(p => p.id === sale.product_id);
      if (product) {
        categoryStats.set(product.category, (categoryStats.get(product.category) || 0) + parseFloat(sale.total_amount.toString()));
      }
    });

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    return Array.from(categoryStats.entries()).map(([name, value], index) => ({
      name, value, color: colors[index % colors.length],
    }));
  }

  async resetAllData() {
    const workbook = XLSX.utils.book_new();

    const productsSheet = XLSX.utils.aoa_to_sheet([
      ['id', 'name', 'description', 'price', 'cost_price', 'category', 'stock', 'min_stock', 'supplier', 'sku', 'created_date', 'last_updated']
    ]);
    const salesSheet = XLSX.utils.aoa_to_sheet([
      ['id', 'product_id', 'product_name', 'quantity', 'unit_price', 'total_amount', 'profit', 'customer_name', 'payment_method', 'sale_date', 'cashier', 'notes']
    ]);
    const expensesSheet = XLSX.utils.aoa_to_sheet([
      ['id', 'category', 'description', 'amount', 'payment_method', 'vendor', 'expense_date', 'receipt_number', 'notes']
    ]);
    const goalsSheet = XLSX.utils.aoa_to_sheet([
      ['id', 'period_type', 'target_period', 'revenue_goal', 'profit_goal', 'sales_goal', 'created_date', 'status']
    ]);

    XLSX.utils.book_append_sheet(workbook, productsSheet, 'Products');
    XLSX.utils.book_append_sheet(workbook, salesSheet, 'Sales');
    XLSX.utils.book_append_sheet(workbook, expensesSheet, 'Expenses');
    XLSX.utils.book_append_sheet(workbook, goalsSheet, 'Goals');

    XLSX.writeFile(workbook, EXCEL_FILE);
  }

  async getRevenueChartData(days = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sales = await this.getSalesByDateRange(startDate, endDate);
    const dailyRevenue = new Map<string, number>();

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dailyRevenue.set(d.toISOString().split('T')[0], 0);
    }

    sales.forEach(sale => {
      const key = new Date(sale.sale_date).toISOString().split('T')[0];
      dailyRevenue.set(key, (dailyRevenue.get(key) || 0) + parseFloat(sale.total_amount.toString()));
    });

    return Array.from(dailyRevenue.entries()).map(([date, revenue]) => ({ date, revenue }));
  }
}
