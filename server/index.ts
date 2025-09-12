// zeeexshan: Shop Analytics Dashboard - Express Server
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Developer: zeeexshan - Professional Business Analytics Server
const SERVER_SIGNATURE_zeeexshan = 'shop_analytics_express_server';

// Critical security configuration check
function validateEnvironment() {
  const required = [
    'JWT_SECRET',
    'ADMIN_PASSWORD_HASH',
    'ADMIN_RESET_CODE',
    'GUMROAD_PRODUCT_PERMALINK',
    'GUMROAD_PRODUCT_ID',
    'LICENSE_HASH_SALT',
    'DEVICE_HASH_SALT'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('CRITICAL: Missing required environment variables:');
    missing.forEach(key => console.error(`  - ${key}`));
    console.error('Set these in your environment before starting the server.');
    process.exit(1);
  }
  
  console.log('✓ All required environment variables are configured');
}

const app = express();
const HOST = '0.0.0.0'; // Critical: Must bind to 0.0.0.0 for Replit

// CORS configuration for both development and Replit
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'Server is running', 
    port: process.env.PORT || 5000,
    timestamp: new Date().toISOString() 
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
      log(logLine);
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

    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Start server with proper host binding for Replit
  server.listen(port, HOST, () => {
    log(`🚀 Express server running on http://${HOST}:${port}`);
    log(`📊 Shop Analytics API ready - by zeeexshan`);
    log(`🔐 Professional Business Analytics Solution`);
  });
  
})();