// zeeexshan: Shop Analytics Dashboard - Express Server
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
// Import Vite utilities conditionally - only needed in development
// Vite functions will be loaded dynamically when needed

// Developer: zeeexshan - Professional Business Analytics Server
const SERVER_SIGNATURE_zeeexshan = 'shop_analytics_express_server';

// Critical security configuration check
function validateEnvironment() {
  const isElectron = process.env.ELECTRON === '1' || typeof process !== 'undefined' && process.versions && process.versions.electron;
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Core required secrets (always required)
  const coreSecrets = [
    'JWT_SECRET',
    'ADMIN_PASSWORD_HASH', 
    'LICENSE_HASH_SALT',
    'DEVICE_HASH_SALT'
  ];
  
  // Optional in desktop mode
  const webOptional = [
    'ADMIN_RESET_CODE',
    'GUMROAD_PRODUCT_PERMALINK', 
    'GUMROAD_PRODUCT_ID',
    'FRONTEND_URL'
  ];
  
  // Set defaults ONLY for development and desktop apps, NEVER for production web
  if (isDevelopment || isElectron) {
    const defaults = {
      'JWT_SECRET': '8e5f79925d1ee68a96667620ff2f9930260562b36687725db980a7adde696d2b',
      'ADMIN_PASSWORD_HASH': '$2b$10$mpcR0UEa9o5taMvrBDXUj.IB5R44buNw7KLxlImhUiSf5gOvIK0Aq',
      'ADMIN_RESET_CODE': 'SHOP2024RESET',
      'GUMROAD_PRODUCT_PERMALINK': 'ihpuq',
      'GUMROAD_PRODUCT_ID': 'ihpuq',
      'LICENSE_HASH_SALT': 'fde44662d9be69b2ed51fb82867162831c5c7eea266d3d04e148ca596a032e8c',
      'DEVICE_HASH_SALT': 'db65c403bede2554e2750c63527b8d8926008a095f1546f14a24d928cc9ced4e',
      'FRONTEND_URL': process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'
    };
    
    // Set defaults for missing environment variables in dev/desktop only
    Object.entries(defaults).forEach(([key, value]) => {
      if (!process.env[key]) {
        process.env[key] = value;
        if (isDevelopment) {
          console.log(`Setting ${key} to default value for development`);
        }
      }
    });
  }
  
  // Production web security: fail fast if core secrets missing or using known defaults
  if (!isDevelopment && !isElectron) {
    const knownDefaults = {
      'JWT_SECRET': '8e5f79925d1ee68a96667620ff2f9930260562b36687725db980a7adde696d2b',
      'ADMIN_PASSWORD_HASH': '$2b$10$mpcR0UEa9o5taMvrBDXUj.IB5R44buNw7KLxlImhUiSf5gOvIK0Aq',
      'LICENSE_HASH_SALT': 'fde44662d9be69b2ed51fb82867162831c5c7eea266d3d04e148ca596a032e8c',
      'DEVICE_HASH_SALT': 'db65c403bede2554e2750c63527b8d8926008a095f1546f14a24d928cc9ced4e'
    };
    
    const missing = coreSecrets.filter(key => !process.env[key] || process.env[key] === '');
    const usingDefaults = coreSecrets.filter(key => process.env[key] === (knownDefaults as any)[key]);
    
    if (missing.length > 0 || usingDefaults.length > 0) {
      console.error('CRITICAL SECURITY: Production deployment failed security validation:');
      if (missing.length > 0) {
        console.error('Missing required secrets:', missing);
      }
      if (usingDefaults.length > 0) {
        console.error('Using known default secrets (SECURITY RISK):', usingDefaults);
      }
      console.error('Set unique, secure values for all core secrets before starting production server.');
      process.exit(1);
    }
  }
  
  console.log('✓ Environment variables configured for', isElectron ? 'desktop app' : isDevelopment ? 'development' : 'production web');
}

const app = express();
const HOST = '0.0.0.0'; // Critical: Must bind to 0.0.0.0 for Replit

// CORS configuration - secure for production, permissive for development and desktop
const isDevelopment = process.env.NODE_ENV === 'development';
const isElectron = !!(process.env.ELECTRON === '1' || typeof process !== 'undefined' && process.versions && process.versions.electron);

// Configure trust proxy for Replit environment (fixes rate limiting issues)
if (isDevelopment || process.env.REPLIT_DEPLOYMENT) {
  app.set('trust proxy', 1);
}

app.use(cors({
  origin: isDevelopment || isElectron ? true : process.env.FRONTEND_URL || false,
  credentials: isDevelopment || isElectron,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check endpoint (for Electron readiness check)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'Server is running', 
    port: process.env.PORT || 5000,
    timestamp: new Date().toISOString(),
    author: 'zeeexshan'
  });
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      // Never log response bodies for security (tokens, passwords, PII)
      console.log(logLine);
    }
  });

  next();
});

(async () => {
  // Validate environment before starting
  validateEnvironment();
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error('Server error:', err);
    
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
    
    // Don't rethrow in production to prevent server crashes
    if (process.env.NODE_ENV === 'development') {
      throw err;
    }
  });

  if (process.env.NODE_ENV === "development") {
    // Dynamically import Vite utilities only in development
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    // Production mode - serve static files without Vite dependencies
    const express = (await import("express")).default;
    const path = (await import("path")).default;
    const fs = (await import("fs")).default;
    const { fileURLToPath } = await import("url");
    
    // Determine the correct static assets path for different environments
    let distPath;
    const isElectron = process.env.ELECTRON === '1' || typeof process !== 'undefined' && process.versions && process.versions.electron;
    
    if (isElectron) {
      // For Electron apps, use path relative to current file location  
      const __dirname = path.dirname(__filename || '.');
      distPath = path.resolve(__dirname, "../dist");
    } else {
      // For regular Node.js deployments, use relative to working directory
      distPath = path.resolve(process.cwd(), "dist");
    }
    
    console.log(`Looking for static assets at: ${distPath}`);
    
    if (!fs.existsSync(distPath)) {
      console.warn(`Build directory not found: ${distPath}, serving minimal fallback`);
      app.get("*", (_req, res) => {
        res.send(`<!DOCTYPE html>
        <html><head><title>Shop Analytics Dashboard</title></head>
        <body>
          <h1>Shop Analytics Dashboard</h1>
          <p>Loading...</p>
          <script>
            // Try to redirect to proper frontend if running in development
            if (window.location.port === '5000') {
              console.log('Frontend build not found, you may need to run npm run build');
            }
          </script>
        </body></html>`);
      });
    } else {
      app.use(express.static(distPath));
      
      // Fall through to index.html for SPA routing
      app.use("*", (_req, res) => {
        const indexPath = path.resolve(distPath, "index.html");
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send('Frontend build not found');
        }
      });
    }
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Start server with proper host binding for Replit
  server.listen(port, HOST, () => {
    console.log(`🚀 Express server running on http://${HOST}:${port}`);
    console.log(`📊 Shop Analytics API ready - by zeeexshan`);
    console.log(`🔐 Professional Business Analytics Solution`);
  });
  
})();