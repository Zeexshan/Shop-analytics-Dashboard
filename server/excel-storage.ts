import * as XLSX from 'xlsx';
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
      
      // Initialize empty sheets
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

  private readWorkbook(): XLSX.WorkBook {
    return XLSX.readFile(EXCEL_FILE);
  }

  private writeWorkbook(workbook: XLSX.WorkBook) {
    XLSX.writeFile(workbook, EXCEL_FILE);
  }

  private getSheetData<T>(sheetName: string): T[] {
    const workbook = this.readWorkbook();
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    
    const data = XLSX.utils.sheet_to_json(sheet);
    return data as T[];
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
      created_date: new Date(),
      last_updated: new Date(),
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
      last_updated: new Date(),
    };
    
    this.updateSheet('Products', products);
    return products[index];
  }

  async deleteProduct(id: string): Promise<boolean> {
    const products = await this.getAllProducts();
    const filteredProducts = products.filter(p => p.id !== id);
    
    if (filteredProducts.length === products.length) return false;
    
    this.updateSheet('Products', filteredProducts);
    return true;
  }

  async getLowStockProducts(): Promise<Product[]> {
    const products = await this.getAllProducts();
    return products.filter(p => p.stock <= p.min_stock);
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
    // Get product to calculate total and profit
    const product = await this.getProductById(saleData.product_id);
    if (!product) throw new Error('Product not found');
    
    // Check stock availability
    if (product.stock < saleData.quantity) {
      throw new Error('Insufficient stock');
    }
    
    const sales = await this.getAllSales();
    const totalAmount = saleData.quantity * saleData.unit_price;
    const costPrice = parseFloat(product.cost_price.toString());
    const profit = totalAmount - (costPrice * saleData.quantity);
    
    const sale: Sale = {
      ...saleData,
      id: randomUUID(),
      product_name: product.name,
      total_amount: totalAmount.toString(),
      profit: profit.toString(),
      unit_price: saleData.unit_price.toString(),
      sale_date: new Date(),
    } as Sale;
    
    sales.push(sale);
    this.updateSheet('Sales', sales);
    
    // Update product stock
    await this.updateProduct(saleData.product_id, {
      stock: product.stock - saleData.quantity
    });
    
    return sale;
  }

  async getSalesByDateRange(startDate: Date, endDate: Date): Promise<Sale[]> {
    const sales = await this.getAllSales();
    return sales.filter(sale => {
      const saleDate = new Date(sale.sale_date);
      return saleDate >= startDate && saleDate <= endDate;
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
      expense_date: new Date(),
    } as Expense;
    
    expenses.push(expense);
    this.updateSheet('Expenses', expenses);
    return expense;
  }

  async getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    const expenses = await this.getAllExpenses();
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.expense_date);
      return expenseDate >= startDate && expenseDate <= endDate;
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
      created_date: new Date(),
    } as Goal;
    
    goals.push(goal);
    this.updateSheet('Goals', goals);
    return goal;
  }

  async getActiveGoals(): Promise<Goal[]> {
    const goals = await this.getAllGoals();
    return goals.filter(g => g.status === 'Active');
  }

  // Analytics methods
  async getRevenueAnalytics(startDate: Date, endDate: Date) {
    const sales = await this.getSalesByDateRange(startDate, endDate);
    const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.total_amount.toString()), 0);
    const totalProfit = sales.reduce((sum, sale) => sum + parseFloat(sale.profit.toString()), 0);
    
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
    
    const thisMonthAnalytics = await this.getRevenueAnalytics(thisMonth, now);
    const lastMonthAnalytics = await this.getRevenueAnalytics(lastMonth, lastMonthEnd);
    const lowStockProducts = await this.getLowStockProducts();
    const activeGoals = await this.getActiveGoals();
    
    // Calculate growth rates
    const revenueGrowth = lastMonthAnalytics.revenue > 0 
      ? ((thisMonthAnalytics.revenue - lastMonthAnalytics.revenue) / lastMonthAnalytics.revenue) * 100 
      : 0;
    
    const salesGrowth = lastMonthAnalytics.salesCount > 0 
      ? ((thisMonthAnalytics.salesCount - lastMonthAnalytics.salesCount) / lastMonthAnalytics.salesCount) * 100 
      : 0;
    
    // Calculate goal progress (assuming monthly goals)
    let goalProgress = 0;
    if (activeGoals.length > 0) {
      const currentGoal = activeGoals.find(g => g.period_type === 'Monthly');
      if (currentGoal) {
        const targetRevenue = parseFloat(currentGoal.revenue_goal.toString());
        goalProgress = targetRevenue > 0 ? (thisMonthAnalytics.revenue / targetRevenue) * 100 : 0;
      }
    }
    
    return {
      revenue: thisMonthAnalytics.revenue,
      profit: thisMonthAnalytics.profit,
      salesCount: thisMonthAnalytics.salesCount,
      lowStockCount: lowStockProducts.length,
      goalProgress: Math.min(goalProgress, 100),
      revenueGrowth,
      profitMargin: thisMonthAnalytics.profitMargin,
      salesGrowth,
    };
  }

  async getTopProducts(limit: number = 5) {
    const sales = await this.getAllSales();
    const productStats = new Map();
    
    sales.forEach(sale => {
      const existing = productStats.get(sale.product_id) || {
        name: sale.product_name,
        sales: 0,
        revenue: 0,
      };
      
      existing.sales += sale.quantity;
      existing.revenue += parseFloat(sale.total_amount.toString());
      productStats.set(sale.product_id, existing);
    });
    
    return Array.from(productStats.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }

  async getCategoryPerformance() {
    const products = await this.getAllProducts();
    const sales = await this.getAllSales();
    
    const categoryStats = new Map();
    
    sales.forEach(sale => {
      const product = products.find(p => p.id === sale.product_id);
      if (product) {
        const existing = categoryStats.get(product.category) || 0;
        categoryStats.set(product.category, existing + parseFloat(sale.total_amount.toString()));
      }
    });
    
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    
    return Array.from(categoryStats.entries()).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length],
    }));
  }

  async getRevenueChartData(days: number = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const sales = await this.getSalesByDateRange(startDate, endDate);
    const dailyRevenue = new Map();
    
    // Initialize all days with 0
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dailyRevenue.set(dateStr, 0);
    }
    
    // Add sales data
    sales.forEach(sale => {
      const dateStr = new Date(sale.sale_date).toISOString().split('T')[0];
      const existing = dailyRevenue.get(dateStr) || 0;
      dailyRevenue.set(dateStr, existing + parseFloat(sale.total_amount.toString()));
    });
    
    return Array.from(dailyRevenue.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    }));
  }
}
