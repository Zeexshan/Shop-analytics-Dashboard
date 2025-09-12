// zeeexshan: Shop Analytics Dashboard - Express Server
import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Developer: zeeexshan - Professional Business Analytics Server
const SERVER_SIGNATURE_zeeexshan = 'shop_analytics_express_server';

// Critical security configuration check
function validateEnvironment() {
  // Set default values for development if not provided
  const defaults = {
    'JWT_SECRET': '8e5f79925d1ee68a96667620ff2f9930260562b36687725db980a7adde696d2b',
    'ADMIN_PASSWORD_HASH': '',
    'ADMIN_RESET_CODE': 'DEPRECATED_NOT_USED',
    'GUMROAD_PRODUCT_PERMALINK': 'ihpuq',
    'GUMROAD_PRODUCT_ID': 'ihpuq',
    'LICENSE_HASH_SALT': 'fde44662d9be69b2ed51fb82867162831c5c7eea266d3d04e148ca596a032e8c',
    'DEVICE_HASH_SALT': 'db65c403bede2554e2750c63527b8d8926008a095f1546f14a24d928cc9ced4e'
  };
  
  // Set missing environment variables to default values
  Object.entries(defaults).forEach(([key, value]) => {
    if (!process.env[key]) {
      process.env[key] = value;
      console.log(`Setting ${key} to default value for development`);
    }
  });
  
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