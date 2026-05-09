import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateToken, errorHandler, type AuthRequest } from "./middleware";
import { insertProductSchema, insertSaleSchema, insertExpenseSchema, insertGoalSchema, loginSchema } from "@shared/schema";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'shop-analytics-secret-key-fixed-2024';
const LICENSE_KEY = 'SHOP-2024-ANLYT-ZXSH';
const DEFAULT_PASSWORD = 'ShopOwner@2024';

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post('/api/auth/login', async (req, res, next) => {
    try {
      const { username, password } = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const token = jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({ token, user: { id: user.id, username: user.username } });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/auth/verify', authenticateToken, (req: AuthRequest, res) => {
    res.json({ user: req.user });
  });

  app.post('/api/auth/reset-password', async (req, res, next) => {
    try {
      const { licenseKey } = req.body;
      if (!licenseKey) {
        return res.status(400).json({ message: 'License key is required' });
      }
      if (licenseKey.trim().toUpperCase() !== LICENSE_KEY) {
        return res.status(401).json({ message: 'Invalid license key' });
      }
      const user = await storage.getUserByUsername('admin');
      if (!user) {
        return res.status(404).json({ message: 'Admin user not found' });
      }
      const hashed = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      await storage.updateUserPassword(user.id, hashed);
      res.json({ message: 'Password reset to default credentials successfully' });
    } catch (error) {
      next(error);
    }
  });

  // Dashboard analytics
  app.get('/api/dashboard/kpis', authenticateToken, async (req, res, next) => {
    try {
      const kpis = await storage.excel.getDashboardKPIs();
      res.json(kpis);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/dashboard/charts', authenticateToken, async (req, res, next) => {
    try {
      const [revenueData, categoryData, topProducts] = await Promise.all([
        storage.excel.getRevenueChartData(30),
        storage.excel.getCategoryPerformance(),
        storage.excel.getTopProducts(5)
      ]);
      
      res.json({
        revenueData,
        categoryData,
        topProducts
      });
    } catch (error) {
      next(error);
    }
  });

  // Product routes
  app.get('/api/products', authenticateToken, async (req, res, next) => {
    try {
      const products = await storage.excel.getAllProducts();
      res.json(products);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/products/:id', authenticateToken, async (req, res, next) => {
    try {
      const product = await storage.excel.getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.json(product);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/products', authenticateToken, async (req, res, next) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.excel.addProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/products/:id', authenticateToken, async (req, res, next) => {
    try {
      const updates = insertProductSchema.partial().parse(req.body);
      const product = await storage.excel.updateProduct(req.params.id, updates);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.json(product);
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/products/:id', authenticateToken, async (req, res, next) => {
    try {
      const deleted = await storage.excel.deleteProduct(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: 'Product not found' });
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/products/low-stock', authenticateToken, async (req, res, next) => {
    try {
      const products = await storage.excel.getLowStockProducts();
      res.json(products);
    } catch (error) {
      next(error);
    }
  });

  // Sales routes
  app.get('/api/sales', authenticateToken, async (req, res, next) => {
    try {
      const sales = await storage.excel.getAllSales();
      res.json(sales);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/sales', authenticateToken, async (req, res, next) => {
    try {
      const saleData = insertSaleSchema.parse(req.body);
      const sale = await storage.excel.addSale(saleData);
      res.status(201).json(sale);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/sales/recent', authenticateToken, async (req, res, next) => {
    try {
      const sales = await storage.excel.getAllSales();
      const recentSales = sales
        .sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime())
        .slice(0, 10);
      res.json(recentSales);
    } catch (error) {
      next(error);
    }
  });

  // Expense routes
  app.get('/api/expenses', authenticateToken, async (req, res, next) => {
    try {
      const expenses = await storage.excel.getAllExpenses();
      res.json(expenses);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/expenses', authenticateToken, async (req, res, next) => {
    try {
      const expenseData = insertExpenseSchema.parse(req.body);
      const expense = await storage.excel.addExpense(expenseData);
      res.status(201).json(expense);
    } catch (error) {
      next(error);
    }
  });

  // Goal routes
  app.get('/api/goals', authenticateToken, async (req, res, next) => {
    try {
      const goals = await storage.excel.getAllGoals();
      res.json(goals);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/goals', authenticateToken, async (req, res, next) => {
    try {
      const goalData = insertGoalSchema.parse(req.body);
      const goal = await storage.excel.addGoal(goalData);
      res.status(201).json(goal);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/goals/active', authenticateToken, async (req, res, next) => {
    try {
      const goals = await storage.excel.getActiveGoals();
      res.json(goals);
    } catch (error) {
      next(error);
    }
  });

  // Settings routes
  app.get('/api/settings/stats', authenticateToken, async (req, res, next) => {
    try {
      const [products, sales, expenses, goals] = await Promise.all([
        storage.excel.getAllProducts(),
        storage.excel.getAllSales(),
        storage.excel.getAllExpenses(),
        storage.excel.getAllGoals(),
      ]);

      let fileSizeKB = '0';
      try {
        const fs = await import('fs');
        const path = await import('path');
        const excelFile = path.join(process.cwd(), 'data', 'shop_data.xlsx');
        if (fs.existsSync(excelFile)) {
          const stat = fs.statSync(excelFile);
          fileSizeKB = (stat.size / 1024).toFixed(2);
        }
      } catch {}

      res.json({
        products: products.length,
        sales: sales.length,
        expenses: expenses.length,
        goals: goals.length,
        fileSizeKB,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/settings/change-password', authenticateToken, async (req: AuthRequest, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and new password are required' });
      }

      const user = await storage.getUserByUsername(req.user!.username);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) return res.status(401).json({ message: 'Current password is incorrect' });

      const hashed = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(user.id, hashed);

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/settings/reset-data', authenticateToken, async (req, res, next) => {
    try {
      await storage.excel.resetAllData();
      res.json({ message: 'All data has been reset' });
    } catch (error) {
      next(error);
    }
  });

  // Apply error handler
  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;
}
