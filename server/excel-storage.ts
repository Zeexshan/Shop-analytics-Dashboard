// Enhanced watermark - Split and reconstruct method
const parts = ['zee', 'x', 'shan'];
const storageOwner = parts[0] + parts[1] + parts[2];

import XLSX from 'xlsx';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs';
import type { Product, Sale, Expense, Goal, InsertProduct, InsertSale, InsertExpense, InsertGoal } from '@shared/schema';

// Method 5: ASCII code array
const devCodes = [122, 101, 101, 120, 115, 104, 97, 110];
const businessOwner = String.fromCharCode(...devCodes);

// Use DATA_DIR environment variable if set (from Electron), otherwise use project directory
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const EXCEL_FILE = path.join(DATA_DIR, 'shop_data.xlsx');

// zeeexshan: Main storage class for business data
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
    const product = {
      ...productData,
      id: randomUUID(),
      price: productData.price.toString(),
      cost_price: productData.cost_price.toString(),
      created_date: new Date().toISOString(),
      last_updated: new Date().toISOString(),
    } as unknown as Product;

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
    } as unknown as Product;

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

    const sale = {
      ...saleData,
      id: randomUUID(),
      product_name: product.name,
      total_amount: totalAmount.toString(),
      profit: profit.toString(),
      unit_price: saleData.unit_price.toString(),
      sale_date: new Date().toISOString(),
    } as unknown as Sale;

    sales.push(sale);
    this.updateSheet('Sales', sales);

    // Update product stock
    await this.updateProduct(saleData.product_id, {
      stock: product.stock - saleData.quantity
    });

    return sale;
  }

  async updateSale(id: string, updateData: Partial<InsertSale>): Promise<Sale | null> {
    const sales = await this.getAllSales();
    const saleIndex = sales.findIndex(sale => sale.id === id);
    
    if (saleIndex === -1) {
      throw new Error('Sale not found');
    }

    const currentSale = sales[saleIndex];
    
    // If product or quantity changed, update product stock and recalculate totals
    let updatedSale = { ...currentSale };
    
    if (updateData.product_id && updateData.product_id !== currentSale.product_id) {
      // Restore stock for old product
      const oldProduct = await this.getProductById(currentSale.product_id);
      if (oldProduct) {
        await this.updateProduct(currentSale.product_id, {
          stock: oldProduct.stock + currentSale.quantity
        });
      }
      
      // Get new product
      const newProduct = await this.getProductById(updateData.product_id);
      if (!newProduct) {
        throw new Error('New product not found');
      }
      
      const newQuantity = updateData.quantity || currentSale.quantity;
      if (newProduct.stock < newQuantity) {
        throw new Error('Insufficient stock for new product');
      }
      
      // Update product stock
      await this.updateProduct(updateData.product_id, {
        stock: newProduct.stock - newQuantity
      });
      
      // Recalculate totals
      const unitPrice = updateData.unit_price || parseFloat(newProduct.price.toString());
      const totalAmount = newQuantity * unitPrice;
      const costPrice = parseFloat(newProduct.cost_price.toString());
      const profit = totalAmount - (costPrice * newQuantity);
      
      updatedSale = {
        ...updatedSale,
        ...updateData,
        product_name: newProduct.name,
        total_amount: totalAmount.toString(),
        profit: profit.toString(),
        unit_price: unitPrice.toString(),
        quantity: newQuantity,
      };
    } else if (updateData.quantity && updateData.quantity !== currentSale.quantity) {
      // Only quantity changed
      const product = await this.getProductById(currentSale.product_id);
      if (!product) {
        throw new Error('Product not found');
      }
      
      const stockDifference = updateData.quantity - currentSale.quantity;
      if (product.stock < stockDifference) {
        throw new Error('Insufficient stock');
      }
      
      // Update product stock
      await this.updateProduct(currentSale.product_id, {
        stock: product.stock - stockDifference
      });
      
      // Recalculate totals
      const unitPrice = updateData.unit_price || currentSale.unit_price;
      const totalAmount = updateData.quantity * parseFloat(unitPrice.toString());
      const costPrice = parseFloat(product.cost_price.toString());
      const profit = totalAmount - (costPrice * updateData.quantity);
      
      updatedSale = {
        ...updatedSale,
        ...updateData,
        total_amount: totalAmount.toString(),
        profit: profit.toString(),
        unit_price: unitPrice.toString(),
      };
    } else {
      // Only other fields changed
      updatedSale = { ...updatedSale, ...updateData } as Sale;
    }

    sales[saleIndex] = updatedSale;
    this.updateSheet('Sales', sales);
    return updatedSale;
  }

  async getSalesByDateRange(startDate: Date, endDate: Date): Promise<Sale[]> {
    const sales = await this.getAllSales();
    return sales.filter(sale => {
      if (!sale.sale_date) return false;
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
    const expense = {
      ...expenseData,
      id: randomUUID(),
      amount: expenseData.amount.toString(),
      expense_date: new Date().toISOString(),
    } as unknown as Expense;

    expenses.push(expense);
    this.updateSheet('Expenses', expenses);
    return expense;
  }

  async getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    const expenses = await this.getAllExpenses();
    return expenses.filter(expense => {
      if (!expense.expense_date) return false;
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
    const goal = {
      ...goalData,
      id: randomUUID(),
      revenue_goal: goalData.revenue_goal.toString(),
      profit_goal: goalData.profit_goal.toString(),
      created_date: new Date().toISOString(),
    } as unknown as Goal;

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
    const expenses = await this.getExpensesByDateRange(startDate, endDate);
    
    const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.total_amount.toString()), 0);
    const grossProfit = sales.reduce((sum, sale) => sum + parseFloat(sale.profit.toString()), 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0);
    const netProfit = grossProfit - totalExpenses;

    return {
      revenue: totalRevenue,
      profit: grossProfit, // Gross profit (for backward compatibility)
      netProfit: netProfit, // Net profit after expenses
      totalExpenses: totalExpenses,
      salesCount: sales.length,
      profitMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
      netMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
    };
  }

  async getDashboardKPIs(startDate?: Date, endDate?: Date) {
    const now = new Date();
    
    // Use provided dates or default to current month
    const currentStartDate = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const currentEndDate = endDate || now;
    
    // Calculate comparison period (same duration as current period, but in the past)
    const periodDuration = currentEndDate.getTime() - currentStartDate.getTime();
    const comparisonEndDate = new Date(currentStartDate.getTime() - 1);
    const comparisonStartDate = new Date(comparisonEndDate.getTime() - periodDuration);

    const currentAnalytics = await this.getRevenueAnalytics(currentStartDate, currentEndDate);
    const comparisonAnalytics = await this.getRevenueAnalytics(comparisonStartDate, comparisonEndDate);
    const lowStockProducts = await this.getLowStockProducts();
    const activeGoals = await this.getActiveGoals();

    // Calculate growth rates
    const revenueGrowth = comparisonAnalytics.revenue > 0
      ? ((currentAnalytics.revenue - comparisonAnalytics.revenue) / comparisonAnalytics.revenue) * 100
      : currentAnalytics.revenue > 0 ? 100 : 0;

    const profitGrowth = comparisonAnalytics.profit > 0
      ? ((currentAnalytics.profit - comparisonAnalytics.profit) / comparisonAnalytics.profit) * 100
      : currentAnalytics.profit > 0 ? 100 : 0;

    const salesGrowth = comparisonAnalytics.salesCount > 0
      ? ((currentAnalytics.salesCount - comparisonAnalytics.salesCount) / comparisonAnalytics.salesCount) * 100
      : currentAnalytics.salesCount > 0 ? 100 : 0;

    // Calculate goal progress
    let goalProgress = 0;
    if (activeGoals.length > 0) {
      const currentGoal = activeGoals.find(g => g.period_type === 'Monthly') || activeGoals[0];
      if (currentGoal) {
        const targetRevenue = parseFloat(currentGoal.revenue_goal.toString());
        goalProgress = targetRevenue > 0 ? Math.min((currentAnalytics.revenue / targetRevenue) * 100, 100) : 0;
      }
    }

    return {
      revenue: currentAnalytics.revenue,
      profit: currentAnalytics.profit, // Gross profit
      netProfit: currentAnalytics.netProfit, // Net profit after expenses
      totalExpenses: currentAnalytics.totalExpenses,
      salesCount: currentAnalytics.salesCount,
      lowStockCount: lowStockProducts.length,
      goalProgress,
      revenueGrowth,
      profitGrowth,
      profitMargin: currentAnalytics.revenue > 0 ? Number(((currentAnalytics.profit / currentAnalytics.revenue) * 100).toFixed(1)) : 0,
      netMargin: currentAnalytics.revenue > 0 ? Number(((currentAnalytics.netProfit / currentAnalytics.revenue) * 100).toFixed(1)) : 0,
      salesGrowth,
    };
  }

  async getTopProducts(limit: number = 5) {
    const sales = await this.getAllSales();
    return this.calculateTopProducts(sales, limit);
  }

  // New method: Top products with custom date range  
  async getTopProductsByRange(limit: number = 5, startDate: Date, endDate: Date) {
    const sales = await this.getSalesByDateRange(startDate, endDate);
    return this.calculateTopProducts(sales, limit);
  }

  // Helper method for top products calculations
  private calculateTopProducts(sales: any[], limit: number) {
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
    return this.calculateCategoryStats(products, sales);
  }

  // New method: Category performance with custom date range
  async getCategoryPerformanceByRange(startDate: Date, endDate: Date) {
    const products = await this.getAllProducts();
    const sales = await this.getSalesByDateRange(startDate, endDate);
    return this.calculateCategoryStats(products, sales);
  }

  // Helper method for category calculations
  private calculateCategoryStats(products: any[], sales: any[]) {
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
    return this.getRevenueChartDataByRange(startDate, endDate);
  }

  // New method: Revenue chart data with custom date range
  async getRevenueChartDataByRange(startDate: Date, endDate: Date) {
    const sales = await this.getSalesByDateRange(startDate, endDate);
    const dailyRevenue = new Map();

    // Initialize all days with 0
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dailyRevenue.set(dateStr, 0);
    }

    // Add sales data
    sales.forEach(sale => {
      if (!sale.sale_date) return;
      const dateStr = new Date(sale.sale_date).toISOString().split('T')[0];
      const existing = dailyRevenue.get(dateStr) || 0;
      dailyRevenue.set(dateStr, existing + parseFloat(sale.total_amount.toString()));
    });

    return Array.from(dailyRevenue.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    }));
  }

  // Enhanced data reset functionality for production readiness
  async resetAllData(): Promise<boolean> {
    try {
      // Create backup before reset
      const backupDir = path.join(DATA_DIR, 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupDir, `shop_data_backup_${timestamp}.xlsx`);
      
      // Create backup copy if original exists
      if (fs.existsSync(EXCEL_FILE)) {
        fs.copyFileSync(EXCEL_FILE, backupFile);
        console.log(`Backup created: ${backupFile}`);
      }
      
      // Reset to fresh state by reinitializing
      if (fs.existsSync(EXCEL_FILE)) {
        fs.unlinkSync(EXCEL_FILE);
      }
      
      this.initializeExcelFile();
      
      console.log('All data has been reset to fresh state');
      return true;
    } catch (error) {
      console.error('Error resetting data:', error);
      return false;
    }
  }

  // Enhanced method for data optimization and capacity management
  async optimizeStorage(): Promise<{ success: boolean; stats: any }> {
    try {
      const workbook = this.readWorkbook();
      const stats = {
        products: 0,
        sales: 0,
        expenses: 0,
        goals: 0,
        fileSize: 0
      };

      // Count records in each sheet
      if (workbook.Sheets['Products']) {
        const products = XLSX.utils.sheet_to_json(workbook.Sheets['Products']);
        stats.products = products.length;
      }
      
      if (workbook.Sheets['Sales']) {
        const sales = XLSX.utils.sheet_to_json(workbook.Sheets['Sales']);
        stats.sales = sales.length;
      }
      
      if (workbook.Sheets['Expenses']) {
        const expenses = XLSX.utils.sheet_to_json(workbook.Sheets['Expenses']);
        stats.expenses = expenses.length;
      }
      
      if (workbook.Sheets['Goals']) {
        const goals = XLSX.utils.sheet_to_json(workbook.Sheets['Goals']);
        stats.goals = goals.length;
      }

      // Get file size
      if (fs.existsSync(EXCEL_FILE)) {
        const fileStats = fs.statSync(EXCEL_FILE);
        stats.fileSize = fileStats.size;
      }

      // Optimize workbook by rewriting it (removes any fragmentation)
      this.writeWorkbook(workbook);

      return { success: true, stats };
    } catch (error) {
      console.error('Error optimizing storage:', error);
      return { success: false, stats: {} };
    }
  }
}