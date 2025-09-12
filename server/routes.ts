// Enhanced watermark - Reverse string method
const reversed = 'nahsxeez';
const routesAuthor = reversed.split('').reverse().join('');

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateToken, errorHandler, type AuthRequest } from "./middleware";
import { insertProductSchema, insertSaleSchema, insertExpenseSchema, insertGoalSchema, loginSchema } from "@shared/schema";
import { licenseStorage } from "./license-storage-simple";
import { DeviceManager } from "./device-utils";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

// Method 4: Hex encoding
const creator = String.fromCharCode(0x7a, 0x65, 0x65, 0x78, 0x73, 0x68, 0x61, 0x6e);

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('CRITICAL: JWT_SECRET environment variable is required');
  process.exit(1);
}
// Type assertion since we've verified it exists
const JWT_SECRET_VERIFIED = JWT_SECRET as string;

export async function registerRoutes(app: Express): Promise<Server> {
  // --- THIS IS THE ONLY SECTION THAT HAS BEEN CHANGED ---
  // It no longer depends on storage.ts, removing the timing issue.
  app.post('/api/auth/login', async (req, res, next) => {
    try {
      // Secure login with required environment configuration
      const ADMIN_USERNAME = 'admin';
      const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;
      
      if (!ADMIN_PASSWORD_HASH) {
        console.error('CRITICAL: ADMIN_PASSWORD_HASH environment variable is required');
        return res.status(500).json({ message: 'Authentication system not configured' });
      }
      
      let HASHED_PASSWORD = ADMIN_PASSWORD_HASH;
      
      // Try to load custom password if exists (from reset operations)
      const passwordFile = path.join(process.cwd(), 'data', 'admin_password.json');
      try {
        if (fs.existsSync(passwordFile)) {
          const passwordData = JSON.parse(fs.readFileSync(passwordFile, 'utf8'));
          HASHED_PASSWORD = passwordData.hashedPassword;
          console.log('Using temporary password hash from file');
        }
      } catch (error) {
        console.log('Error reading password file, using env hash:', (error as any)?.message || 'Unknown error');
      }

      const { username, password } = loginSchema.parse(req.body);

      // Check if the username matches
      if (username !== ADMIN_USERNAME) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // Check if the password is correct using bcrypt
      const isValid = await bcrypt.compare(password, HASHED_PASSWORD);
      if (!isValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      // If everything is correct, create the token
      const user = { id: 'admin-user-id', username: ADMIN_USERNAME };
      const token = jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET_VERIFIED,
        { expiresIn: '24h' }
      );
      
      res.json({ token, user });

    } catch (error) {
      next(error);
    }
  });
  // --- END OF THE CHANGED SECTION ---


  app.get('/api/auth/verify', authenticateToken, (req: AuthRequest, res) => {
    res.json({ user: req.user });
  });

  // Secure password reset with admin reset code
  app.post('/api/auth/forgot-password', async (req, res, next) => {
    try {
      console.log('Password reset request received');
      
      const { licenseKey, adminResetCode } = req.body;
      
      if (!licenseKey) {
        console.log('No license key provided');
        return res.status(400).json({ message: 'License key and admin reset code are required' });
      }
      
      if (!adminResetCode) {
        console.log('No admin reset code provided');
        return res.status(400).json({ message: 'Admin reset code is required' });
      }
      
      // Verify admin reset code
      const ADMIN_RESET_CODE = process.env.ADMIN_RESET_CODE;
      if (!ADMIN_RESET_CODE) {
        console.error('CRITICAL: ADMIN_RESET_CODE not configured');
        return res.status(500).json({ message: 'Password reset not available' });
      }
      
      if (adminResetCode !== ADMIN_RESET_CODE) {
        console.log('Invalid admin reset code');
        return res.status(401).json({ message: 'Invalid reset code' });
      }
      
      console.log('License key validation initiated');
      
      // Verify license key using Gumroad API - NO FALLBACKS for security
      const GUMROAD_PRODUCT_PERMALINK = process.env.GUMROAD_PRODUCT_PERMALINK;
      const GUMROAD_PRODUCT_ID = process.env.GUMROAD_PRODUCT_ID;
      
      if (!GUMROAD_PRODUCT_PERMALINK || !GUMROAD_PRODUCT_ID) {
        console.error('CRITICAL: Gumroad credentials not configured');
        return res.status(500).json({ message: 'Service temporarily unavailable' });
      }
      
      const gumroadResponse = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          product_permalink: GUMROAD_PRODUCT_PERMALINK,
          product_id: GUMROAD_PRODUCT_ID,
          license_key: licenseKey,
          increment_uses_count: 'false'
        }).toString()
      });

      const gumroadData = await gumroadResponse.json();
      console.log('Password reset - License verification result:', gumroadData.success ? 'Valid' : 'Invalid');

      if (!gumroadData.success || gumroadData.uses < 0) {
        console.log('Invalid license key for password reset');
        return res.status(401).json({ message: 'Invalid license key' });
      }
      
      console.log('Admin credentials verified, password reset will revert to environment default');
      
      // Remove any temporary password file to revert to ADMIN_PASSWORD_HASH
      const passwordFile = path.join(process.cwd(), 'data', 'admin_password.json');
      if (fs.existsSync(passwordFile)) {
        fs.unlinkSync(passwordFile);
        console.log('Temporary password file removed, reverted to environment default');
      }
      
      res.json({ 
        message: 'Password has been reset to the configured admin password. Use your original admin credentials to login.',
        resetAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error in forgot password:', error);
      next(error);
    }
  });

  // Enhanced device-bound license activation endpoint
  app.post('/api/license/activate', async (req, res, next) => {
    try {
      const { license_key, device_id, device_name } = req.body;
      
      if (!license_key || !device_id) {
        return res.status(400).json({ 
          success: false, 
          message: 'License key and device ID are required' 
        });
      }

      console.log('Activating license for device:', device_name || 'Unknown Device');
      
      // First verify with Gumroad
      const gumroadResponse = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          product_permalink: process.env.GUMROAD_PRODUCT_PERMALINK!,
          product_id: process.env.GUMROAD_PRODUCT_ID!,
          license_key,
          increment_uses_count: 'true' // Track usage for first activation
        }).toString()
      });

      const gumroadData = await gumroadResponse.json();
      console.log('Gumroad activation response status:', gumroadData.success ? 'Valid' : 'Invalid');

      if (!gumroadData.success || gumroadData.uses < 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid license key'
        });
      }

      // Store license in our database  
      await licenseStorage.storeLicense(license_key, device_id, `gumroad:${gumroadData.purchase?.id || 'unknown'}`);
      
      // Activate device
      const activationResult = await licenseStorage.activateDevice(
        license_key, 
        device_id, 
        device_name || 'Unknown Device'
      );

      if (!activationResult.success) {
        return res.status(409).json({
          success: false,
          message: activationResult.message
        });
      }

      // Generate JWT token for this device
      const token = jwt.sign(
        { 
          license_key: license_key,
          device_id: device_id,
          activation_id: activationResult.activation?.id
        },
        JWT_SECRET_VERIFIED,
        { expiresIn: '7d' } // Shorter expiry for better security
      );

      res.json({
        success: true,
        token,
        device_name: device_name || 'Unknown Device',
        purchase: {
          email: gumroadData.purchase?.email || 'Licensed User',
          created_at: gumroadData.purchase?.created_at || new Date().toISOString(),
          product_name: gumroadData.purchase?.product_name || 'Shop Analytics Dashboard'
        },
        message: 'License activated successfully'
      });

    } catch (error) {
      console.error('License activation error:', error);
      next(error);
    }
  });

  // Device heartbeat endpoint for license validation
  app.post('/api/license/heartbeat', async (req, res, next) => {
    try {
      const { license_key, device_id } = req.body;
      
      if (!license_key || !device_id) {
        return res.status(400).json({ 
          success: false, 
          message: 'License key and device ID are required' 
        });
      }

      // Verify device activation
      const verification = await licenseStorage.verifyDeviceActivation(license_key, device_id);
      
      if (!verification.isValid) {
        return res.status(401).json({
          success: false,
          message: 'Device not activated for this license'
        });
      }

      // Generate new token
      const token = jwt.sign(
        { 
          license_key: license_key,
          device_id: device_id,
          activation_id: verification.activation?.id
        },
        JWT_SECRET_VERIFIED,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        token,
        last_seen: verification.activation?.last_seen_at,
        message: 'License heartbeat successful'
      });

    } catch (error) {
      console.error('License heartbeat error:', error);
      next(error);
    }
  });

  // Device deactivation endpoint
  app.post('/api/license/deactivate', async (req, res, next) => {
    try {
      const { license_key, device_id } = req.body;
      
      if (!license_key || !device_id) {
        return res.status(400).json({ 
          success: false, 
          message: 'License key and device ID are required' 
        });
      }

      const result = await licenseStorage.deactivateDevice(license_key, device_id);
      
      res.json(result);

    } catch (error) {
      console.error('License deactivation error:', error);
      next(error);
    }
  });

  // Get active devices for a license
  app.post('/api/license/devices', async (req, res, next) => {
    try {
      const { license_key } = req.body;
      
      if (!license_key) {
        return res.status(400).json({ 
          success: false, 
          message: 'License key is required' 
        });
      }

      const devices = await licenseStorage.getActiveDevices(license_key);
      
      res.json({
        success: true,
        devices: devices.map(device => ({
          device_name: device.device_name,
          activated_at: device.activated_at,
          last_seen_at: device.last_seen_at
        }))
      });

    } catch (error) {
      console.error('Get devices error:', error);
      next(error);
    }
  });

  // Legacy endpoint for backward compatibility (now redirects to activation)
  app.post('/api/license/verify', async (req, res, next) => {
    try {
      const { product_permalink, license_key } = req.body;
      
      if (!product_permalink || !license_key) {
        return res.status(400).json({ 
          success: false, 
          message: 'Product permalink and license key are required. Please use the new activation system.' 
        });
      }

      // For backward compatibility, we'll do a simple verification
      const gumroadResponse = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          product_permalink,
          product_id: '9jzvbqovj9HtIE1MUCU3sQ==',
          license_key,
          increment_uses_count: 'false'
        }).toString()
      });

      const gumroadData = await gumroadResponse.json();

      if (gumroadData.success && gumroadData.uses >= 0) {
        res.json({
          success: true,
          purchase: {
            email: gumroadData.purchase?.email || 'Licensed User',
            created_at: gumroadData.purchase?.created_at || new Date().toISOString(),
            product_name: gumroadData.purchase?.product_name || 'Shop Analytics Dashboard'
          },
          message: 'License verified. Please upgrade to device activation for enhanced security.',
          upgrade_required: true
        });
      } else {
        res.json({
          success: false,
          message: 'Invalid license key'
        });
      }
    } catch (error) {
      console.error('License verification error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'License verification service unavailable' 
      });
    }
  });

  // Enhanced watermark security - Password change endpoint for licensed users
  app.post('/api/auth/change-password', authenticateToken, async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Current and new passwords are required' });
      }
      
      if (newPassword.length < 8) {
        return res.status(400).json({ message: 'New password must be at least 8 characters' });
      }
      
      // Get current stored password hash
      const passwordFile = path.join(process.cwd(), 'data', 'admin_password.json');
      let currentHashedPassword = '$2b$10$cM2I7lu2zO9W4RFDmchb/e5gr5gYZPH5H/FEWTdH5EKqpRL3zH57a'; // Default
      
      try {
        if (fs.existsSync(passwordFile)) {
          const passwordData = JSON.parse(fs.readFileSync(passwordFile, 'utf8'));
          currentHashedPassword = passwordData.hashedPassword;
        }
      } catch (error) {
        console.log('Using default password for verification');
      }
      
      // Verify current password
      const isCurrentValid = await bcrypt.compare(currentPassword, currentHashedPassword);
      if (!isCurrentValid) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      
      // Hash new password
      const saltRounds = 12;
      const newHashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // Save new password hash
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const passwordData = {
        hashedPassword: newHashedPassword,
        updatedAt: new Date().toISOString(),
        // zeeexshan: Password change signature
        signature: 'zeeexshan_password_update'
      };
      
      fs.writeFileSync(passwordFile, JSON.stringify(passwordData, null, 2));
      
      res.json({ message: 'Password changed successfully' });
      
    } catch (error) {
      next(error);
    }
  });

  // Dashboard analytics
  app.get('/api/dashboard/kpis', authenticateToken, async (req, res, next) => {
    try {
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (req.query.startDate && req.query.endDate) {
        startDate = new Date(req.query.startDate as string);
        endDate = new Date(req.query.endDate as string);
      }

      const kpis = await storage.excel.getDashboardKPIs(startDate, endDate);
      res.json(kpis);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/dashboard/charts', authenticateToken, async (req, res, next) => {
    try {
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (req.query.startDate && req.query.endDate) {
        startDate = new Date(req.query.startDate as string);
        endDate = new Date(req.query.endDate as string);
        console.log('Charts API - Using custom date range:', { startDate, endDate });
      } else {
        // Default to last 30 days if no dates provided
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        console.log('Charts API - Using default 30 days:', { startDate, endDate });
      }

      const [revenueData, categoryData, topProducts] = await Promise.all([
        storage.excel.getRevenueChartDataByRange(startDate, endDate),
        storage.excel.getCategoryPerformanceByRange(startDate, endDate),
        storage.excel.getTopProductsByRange(5, startDate, endDate)
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
        .sort((a, b) => new Date(b.sale_date || 0).getTime() - new Date(a.sale_date || 0).getTime())
        .slice(0, 10);
      res.json(recentSales);
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/sales/:id', authenticateToken, async (req, res, next) => {
    try {
      const updateData = req.body; // Should validate with partial schema
      const sale = await storage.excel.updateSale(req.params.id, updateData);
      if (!sale) {
        return res.status(404).json({ message: 'Sale not found' });
      }
      res.json(sale);
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

  // Data management routes - Enhanced for production readiness
  app.post('/api/data/reset', authenticateToken, async (req, res, next) => {
    try {
      const { password } = req.body;
      
      if (!password) {
        return res.status(400).json({ message: 'Password is required to reset data' });
      }
      
      // Verify admin password
      const passwordFile = path.join(process.cwd(), 'data', 'admin_password.json');
      let currentHashedPassword = '$2b$12$QMFzDzTzRPkmOkNpc6OzeugStFxx4PPV0cJorOJcxuW0TfoK8uahq'; // Default
      
      try {
        if (fs.existsSync(passwordFile)) {
          const passwordData = JSON.parse(fs.readFileSync(passwordFile, 'utf8'));
          currentHashedPassword = passwordData.hashedPassword;
        }
      } catch (error) {
        console.log('Using default password for verification');
      }
      
      const isValid = await bcrypt.compare(password, currentHashedPassword);
      if (!isValid) {
        return res.status(401).json({ message: 'Invalid password' });
      }
      
      // Perform data reset
      const success = await storage.excel.resetAllData();
      
      if (success) {
        res.json({ 
          message: 'All data has been reset successfully. A backup has been created.',
          success: true 
        });
      } else {
        res.status(500).json({ 
          message: 'Failed to reset data',
          success: false 
        });
      }
    } catch (error) {
      next(error);
    }
  });

  // Storage optimization endpoint
  app.get('/api/data/stats', authenticateToken, async (req, res, next) => {
    try {
      const result = await storage.excel.optimizeStorage();
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // Apply error handler
  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;
}