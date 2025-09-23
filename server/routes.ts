// Enhanced watermark - Reverse string method
const reversed = 'nahsxeez';
const routesAuthor = reversed.split('').reverse().join('');

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticateToken, authenticateAdminToken, authenticateDeviceToken, errorHandler, type AuthRequest } from "./middleware";
import { insertProductSchema, insertSaleSchema, insertExpenseSchema, insertGoalSchema, loginSchema } from "@shared/schema";
import { licenseStorage } from "./license-storage-simple";
import { DeviceManager } from "./device-utils";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import rateLimit from 'express-rate-limit';

// Method 4: Hex encoding
const creator = String.fromCharCode(0x7a, 0x65, 0x65, 0x78, 0x73, 0x68, 0x61, 0x6e);

// Import centralized configuration
import { getSecureConfig } from "./config";

// Helper function to get JWT secret at runtime (after environment validation)
function getJwtSecret(): string {
  const config = getSecureConfig();
  return config.JWT_SECRET;
}

// Rate limiting for authentication endpoints - configured for proxy environments
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { message: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development to prevent proxy header issues
    return process.env.NODE_ENV === 'development';
  }
});

const licenseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 license requests per hour
  message: { message: 'Too many license requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting in development to prevent proxy header issues
    return process.env.NODE_ENV === 'development';
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // --- THIS IS THE ONLY SECTION THAT HAS BEEN CHANGED ---
  // It no longer depends on storage.ts, removing the timing issue.
  app.post('/api/auth/login', authLimiter, async (req, res, next) => {
    try {
      console.log('Login attempt:', { 
        username: req.body.username, 
        hasPassword: !!req.body.password,
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      });

      const { username, password } = req.body;
      const config = getSecureConfig();

      if (!username || !password) {
        console.log('Login failed: Missing credentials');
        return res.status(400).json({ message: 'Username and password required', success: false });
      }

      if (username !== config.ADMIN_USERNAME) {
        console.log('Login failed: Invalid username');
        return res.status(401).json({ message: 'Invalid credentials', success: false });
      }

      // Check password against stored file first (from previous password changes), then environment
      const passwordFile = path.join(process.cwd(), 'data', 'admin_password.json');
      let currentHashedPassword: string;
      
      try {
        if (fs.existsSync(passwordFile)) {
          const passwordData = JSON.parse(fs.readFileSync(passwordFile, 'utf8'));
          currentHashedPassword = passwordData.hashedPassword;
        } else {
          currentHashedPassword = config.ADMIN_PASSWORD_HASH;
        }
      } catch (error) {
        currentHashedPassword = config.ADMIN_PASSWORD_HASH;
      }

      const isValidPassword = await bcrypt.compare(password, currentHashedPassword);
      console.log('Password validation:', { isValid: isValidPassword });

      if (!isValidPassword) {
        console.log('Login failed: Invalid password');
        return res.status(401).json({ message: 'Invalid credentials', success: false });
      }

      const token = jwt.sign(
        { username: config.ADMIN_USERNAME, role: 'admin', author: 'zeeexshan' },
        config.JWT_SECRET,
        { expiresIn: '24h' }
      );

      console.log('Login successful');
      res.json({ success: true, message: 'Login successful', token, user: { username: config.ADMIN_USERNAME, role: 'admin' } });

    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Authentication system error', success: false });
    }
  });
  // --- END OF THE CHANGED SECTION ---

  // Debug endpoints for testing authentication system
  app.get('/api/health', (req, res) => {
    const config = getSecureConfig();
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production',
      hasAdminHash: !!config.ADMIN_PASSWORD_HASH,
      hasJwtSecret: !!config.JWT_SECRET,
      author: 'zeeexshan'
    });
  });

  // Remove test-credentials endpoint for security (was exposing admin password)

  app.get('/api/auth/verify', authenticateAdminToken, (req: AuthRequest, res) => {
    res.json({ user: req.user });
  });

  // Secure password reset with license key verification
  app.post('/api/auth/forgot-password', authLimiter, async (req, res, next) => {
    try {
      console.log('Password reset request received');
      console.log('Request body:', JSON.stringify(req.body));
      console.log('Request headers:', JSON.stringify(req.headers));

      const { licenseKey } = req.body;

      if (!licenseKey) {
        console.log('Missing required fields - licenseKey not found in request body');
        return res.status(400).json({ message: 'License key is required' });
      }

      console.log('Verifying license key against local storage');

      try {
        // Verify license key against locally stored activated license (offline verification)
        const activeLicenses = await licenseStorage.getActiveLicenses();
        const localLicense = activeLicenses.find(license => license.licenseKey === licenseKey);
        
        if (!localLicense) {
          console.log('License key not found in local storage - not activated on this device');
          return res.status(401).json({ message: 'Invalid license key. Please use the license key that was used to activate this application.' });
        }

        console.log('License key verified - password reset authorized');

        // Remove any temporary password file to revert to default password
        const passwordFile = path.join(process.cwd(), 'data', 'admin_password.json');
        if (fs.existsSync(passwordFile)) {
          fs.unlinkSync(passwordFile);
          console.log('Temporary password file removed, reverted to default password');
        }

        res.json({ 
          message: 'Password has been reset successfully. Please log in with the default admin credentials.',
          resetAt: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error verifying license:', error);
        return res.status(500).json({ message: 'Error verifying license key' });
      }

    } catch (error) {
      console.error('Error in forgot password:', error);
      next(error);
    }
  });

  // Enhanced device-bound license activation endpoint
  app.post('/api/license/activate', licenseLimiter, async (req, res, next) => {
    try {
      const { license_key, device_id, device_name } = req.body;

      if (!license_key || !device_id) {
        return res.status(400).json({ 
          success: false, 
          message: 'License key and device ID are required' 
        });
      }

      console.log('Activating license for device:', device_name || 'Unknown Device');

      // First verify with Gumroad - use correct product permalink
      const config = getSecureConfig();
      const gumroadResponse = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          product_permalink: config.GUMROAD_PRODUCT_PERMALINK, // Use 'ihpuq' as default
          product_id: '9jzvbqovj9HtIE1MUCU3sQ==',
          license_key,
          increment_uses_count: 'true' // Track usage for first activation
        }).toString()
      });

      const gumroadData = await gumroadResponse.json();
      console.log('Gumroad activation response status:', gumroadData.success ? 'Valid' : 'Invalid');
      console.log('Gumroad response details:', { 
        success: gumroadData.success, 
        message: gumroadData.message,
        uses: gumroadData.uses 
      });
      console.log('License verification request details:', {
        product_permalink: config.GUMROAD_PRODUCT_PERMALINK,
        license_key_preview: license_key.substring(0, 8) + '...',
        api_url: 'https://api.gumroad.com/v2/licenses/verify'
      });

      if (!gumroadData.success) {
        return res.status(401).json({
          success: false,
          message: 'Invalid license key'
        });
      }

      // Activate device (this will handle storing the license with correct device ID)
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
        getJwtSecret(),
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
        getJwtSecret(),
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

      if (!license_key) {
        return res.status(400).json({ 
          success: false, 
          message: 'License key is required' 
        });
      }

      // For backward compatibility, we'll do a simple verification
      const config = getSecureConfig();
      const gumroadResponse = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          product_permalink: product_permalink || config.GUMROAD_PRODUCT_PERMALINK,
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

  // Enhanced watermark security - Password change endpoint for admin users only
  app.post('/api/auth/change-password', authenticateAdminToken, async (req, res, next) => {
    console.log('🔐 PASSWORD CHANGE DEBUG: Request received');
    console.log('📋 Request body keys:', Object.keys(req.body));
    console.log('🔍 Environment:', process.env.NODE_ENV);
    console.log('🌍 Working directory:', process.cwd());
    
    try {
      const { currentPassword, newPassword } = req.body;
      console.log('🔐 DEBUG: Passwords extracted from body', {
        hasCurrentPassword: !!currentPassword,
        currentPasswordLength: currentPassword?.length || 0,
        hasNewPassword: !!newPassword,
        newPasswordLength: newPassword?.length || 0
      });

      if (!currentPassword || !newPassword) {
        console.log('❌ DEBUG: Missing passwords in request');
        return res.status(400).json({ message: 'Current and new passwords are required' });
      }

      if (newPassword.length < 8) {
        console.log('❌ DEBUG: New password too short');
        return res.status(400).json({ message: 'New password must be at least 8 characters' });
      }

      // Get current stored password hash - NO HARDCODED FALLBACKS in production
      const passwordFile = path.join(process.cwd(), 'data', 'admin_password.json');
      console.log('📁 DEBUG: Password file path:', passwordFile);
      console.log('📁 DEBUG: Password file exists:', fs.existsSync(passwordFile));
      
      let currentHashedPassword: string;

      // First try to load from password file (from previous password changes)
      try {
        if (fs.existsSync(passwordFile)) {
          console.log('📖 DEBUG: Reading password from file');
          const passwordData = JSON.parse(fs.readFileSync(passwordFile, 'utf8'));
          currentHashedPassword = passwordData.hashedPassword;
          console.log('✅ DEBUG: Password loaded from file');
        } else {
          console.log('🔧 DEBUG: No password file, checking environment');
          // Use environment ADMIN_PASSWORD_HASH - REQUIRED in production
          const envPasswordHash = process.env.ADMIN_PASSWORD_HASH;
          console.log('🔧 DEBUG: Environment password hash exists:', !!envPasswordHash);
          
          if (!envPasswordHash) {
            if (process.env.NODE_ENV === 'development') {
              console.log('🔧 DEBUG: Development mode - creating default password hash');
              // Only in development, create from default password
              currentHashedPassword = await bcrypt.hash('ShopOwner@2024', 10);
              console.log('✅ DEBUG: Default password hash created');
            } else {
              console.log('❌ DEBUG: Production mode but no ADMIN_PASSWORD_HASH');
              return res.status(500).json({ 
                message: 'Admin password not configured. ADMIN_PASSWORD_HASH environment variable required.' 
              });
            }
          } else {
            currentHashedPassword = envPasswordHash;
            console.log('✅ DEBUG: Using environment password hash');
          }
        }
      } catch (passwordConfigError: any) {
        console.error('❌ DEBUG: Password configuration error:', passwordConfigError);
        return res.status(500).json({ 
          message: 'Error accessing password configuration',
          debug: passwordConfigError?.message || 'Unknown error' 
        });
      }

      // Verify current password
      console.log('🔍 DEBUG: Verifying current password');
      const isCurrentValid = await bcrypt.compare(currentPassword, currentHashedPassword);
      console.log('🔍 DEBUG: Current password valid:', isCurrentValid);
      
      if (!isCurrentValid) {
        console.log('❌ DEBUG: Current password incorrect');
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      console.log('🔐 DEBUG: Hashing new password');
      const saltRounds = 12;
      const newHashedPassword = await bcrypt.hash(newPassword, saltRounds);
      console.log('✅ DEBUG: New password hashed');

      // Save new password hash - use DATA_DIR environment variable if set (from Electron)
      const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
      console.log('📁 DEBUG: Data directory:', dataDir);
      console.log('📁 DEBUG: Data directory exists:', fs.existsSync(dataDir));
      
      if (!fs.existsSync(dataDir)) {
        console.log('📁 DEBUG: Creating data directory');
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('✅ DEBUG: Data directory created');
      }

      const passwordData = {
        hashedPassword: newHashedPassword,
        updatedAt: new Date().toISOString(),
        // zeeexshan: Password change signature
        signature: 'zeeexshan_password_update'
      };

      console.log('💾 DEBUG: Saving password data to file');
      const finalPasswordFile = path.join(dataDir, 'admin_password.json');
      console.log('💾 DEBUG: Final password file path:', finalPasswordFile);
      
      fs.writeFileSync(finalPasswordFile, JSON.stringify(passwordData, null, 2));
      console.log('✅ DEBUG: Password data saved successfully');

      console.log('🎉 DEBUG: Password change completed successfully');
      res.json({ message: 'Password changed successfully' });

    } catch (error: any) {
      console.error('❌ DEBUG: Unexpected error in password change:', error);
      console.error('❌ DEBUG: Error stack:', error?.stack);
      next(error);
    }
  });

  // Dashboard analytics
  app.get('/api/dashboard/kpis', authenticateAdminToken, async (req, res, next) => {
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

  app.get('/api/dashboard/charts', authenticateAdminToken, async (req, res, next) => {
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
  app.get('/api/products', authenticateAdminToken, async (req, res, next) => {
    try {
      const products = await storage.excel.getAllProducts();
      res.json(products);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/products/:id', authenticateAdminToken, async (req, res, next) => {
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

  app.post('/api/products', authenticateAdminToken, async (req, res, next) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.excel.addProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/products/:id', authenticateAdminToken, async (req, res, next) => {
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

  app.delete('/api/products/:id', authenticateAdminToken, async (req, res, next) => {
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

  app.get('/api/products/low-stock', authenticateAdminToken, async (req, res, next) => {
    try {
      const products = await storage.excel.getLowStockProducts();
      res.json(products);
    } catch (error) {
      next(error);
    }
  });

  // Sales routes
  app.get('/api/sales', authenticateAdminToken, async (req, res, next) => {
    try {
      const sales = await storage.excel.getAllSales();
      res.json(sales);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/sales', authenticateAdminToken, async (req, res, next) => {
    try {
      const saleData = insertSaleSchema.parse(req.body);
      const sale = await storage.excel.addSale(saleData);
      res.status(201).json(sale);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/sales/recent', authenticateAdminToken, async (req, res, next) => {
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

  app.put('/api/sales/:id', authenticateAdminToken, async (req, res, next) => {
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
  app.get('/api/expenses', authenticateAdminToken, async (req, res, next) => {
    try {
      const expenses = await storage.excel.getAllExpenses();
      res.json(expenses);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/expenses', authenticateAdminToken, async (req, res, next) => {
    try {
      const expenseData = insertExpenseSchema.parse(req.body);
      const expense = await storage.excel.addExpense(expenseData);
      res.status(201).json(expense);
    } catch (error) {
      next(error);
    }
  });

  // Goal routes
  app.get('/api/goals', authenticateAdminToken, async (req, res, next) => {
    try {
      const goals = await storage.excel.getAllGoals();
      res.json(goals);
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/goals', authenticateAdminToken, async (req, res, next) => {
    try {
      const goalData = insertGoalSchema.parse(req.body);
      const goal = await storage.excel.addGoal(goalData);
      res.status(201).json(goal);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/goals/active', authenticateAdminToken, async (req, res, next) => {
    try {
      const goals = await storage.excel.getActiveGoals();
      res.json(goals);
    } catch (error) {
      next(error);
    }
  });

  // Data management routes - Enhanced for production readiness
  app.post('/api/data/reset', authenticateAdminToken, async (req, res, next) => {
    try {
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ message: 'Password is required to reset data' });
      }

      // Verify admin password using the same logic as login
      const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

      let currentHashedPassword: string;

      // If no password hash is set, create one from the default password (development only)
      if (!ADMIN_PASSWORD_HASH || ADMIN_PASSWORD_HASH === '') {
        if (process.env.NODE_ENV !== 'development') {
          console.error('CRITICAL: ADMIN_PASSWORD_HASH required in production');
          return res.status(500).json({ message: 'Authentication system not configured' });
        }
        console.log('No admin password hash found, creating from default password (development)');
        currentHashedPassword = await bcrypt.hash('ShopOwner@2024', 10);
      } else {
        currentHashedPassword = ADMIN_PASSWORD_HASH;
      }

      // Try to load custom password if exists (from reset operations)
      const passwordFile = path.join(process.cwd(), 'data', 'admin_password.json');
      try {
        if (fs.existsSync(passwordFile)) {
          const passwordData = JSON.parse(fs.readFileSync(passwordFile, 'utf8'));
          currentHashedPassword = passwordData.hashedPassword;
          console.log('Using temporary password hash from file');
        }
      } catch (error) {
        console.log('Error reading password file, using env hash:', (error as any)?.message || 'Unknown error');
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
  app.get('/api/data/stats', authenticateAdminToken, async (req, res, next) => {
    try {
      const result = await storage.excel.optimizeStorage();
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // Get current license info endpoint
  app.get('/api/license/current', authenticateAdminToken, async (req, res, next) => {
    try {
      const licenses = await licenseStorage.getActiveLicenses();

      if (licenses.length > 0) {
        // Get the most recent active license
        const currentLicense = licenses[0];

        res.json({
          success: true,
          license: {
            deviceId: currentLicense.deviceId,
            activatedAt: currentLicense.activatedAt,
            lastHeartbeat: currentLicense.lastHeartbeat,
            isActive: currentLicense.isActive,
            // Don't expose the actual license key for security
            licenseKeyMasked: '****-****-****-' + currentLicense.licenseKey.slice(-4)
          }
        });
      } else {
        res.json({
          success: false,
          message: 'No active license found'
        });
      }
    } catch (error) {
      console.error('Error getting current license:', error);
      next(error);
    }
  });

  // Apply error handler
  app.use(errorHandler);

  const httpServer = createServer(app);
  return httpServer;
}