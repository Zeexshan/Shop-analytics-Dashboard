// electron/main.cjs
// zeeexshan: Shop Analytics Dashboard - Commercial Desktop Application
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const { createActivationWindow, checkActivation } = require('./activation-window.cjs');
const isDev = process.env.NODE_ENV === 'development';

// === COMPREHENSIVE DEBUGGING SYSTEM ===
function createDebugLogger() {
  const logFilePath = path.join(app.getPath('userData'), 'server-debug.log');
  
  function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level}] ${message}\n`;
    
    // Console output
    if (level === 'ERROR') {
      console.error(logLine.trim());
    } else {
      console.log(logLine.trim());
    }
    
    // File output
    try {
      fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
      fs.appendFileSync(logFilePath, logLine);
    } catch (err) {
      console.error('Failed to write debug log:', err.message);
    }
  }
  
  return {
    info: (msg) => log(msg, 'INFO'),
    warn: (msg) => log(msg, 'WARN'),
    error: (msg) => log(msg, 'ERROR'),
    debug: (msg) => log(msg, 'DEBUG'),
    getLogPath: () => logFilePath
  };
}

const debugLog = createDebugLogger();

// === ELECTRON NODE.JS SERVER EXECUTION ===
// In Electron, we use process.execPath (Electron executable) with ELECTRON_RUN_AS_NODE=1
// This makes Electron behave like Node.js and execute our server script

// zeeexshan: Application signature
const APP_SIGNATURE_zeeexshan = 'shop_analytics_dashboard_by_zeeexshan';

// Load environment variables for production desktop builds
function loadEnvironmentVariables() {
  // Set production defaults if not already set
  const defaults = {
    NODE_ENV: 'production',
    ADMIN_USERNAME: 'admin',
    ADMIN_PASSWORD_HASH: '$2b$10$mpcR0UEa9o5taMvrBDXUj.IB5R44buNw7KLxlImhUiSf5gOvIK0Aq',
    JWT_SECRET: 'zeeexshan_shop_analytics_jwt_secret_2024_secure_token_key',
    ADMIN_RESET_CODE: 'SHOP2024RESET',
    LICENSE_HASH_SALT: 'l1c3ns3_h4sh_s4lt_2024_zeeexshan_analytics',
    DEVICE_HASH_SALT: 'dev1c3_h4sh_s4lt_2024_zeeexshan_secure',
    GUMROAD_PRODUCT_ID: 'ihpuq',
    GUMROAD_PRODUCT_PERMALINK: 'ihpuq'
  };

  Object.keys(defaults).forEach(key => {
    if (!process.env[key]) {
      process.env[key] = defaults[key];
    }
  });

  console.log('Environment loaded:', {
    NODE_ENV: process.env.NODE_ENV,
    hasAdminHash: !!process.env.ADMIN_PASSWORD_HASH,
    hasJwtSecret: !!process.env.JWT_SECRET
  });
}

let expressApp = null;
let serverStartupAttempts = [];
let selectedServerPort = 5000; // Track the port the server is actually running on
let serverDiagnostics = {
  nodeVersion: process.version,
  platform: process.platform,
  arch: process.arch,
  electronVersion: process.versions.electron,
  isDev,
  appPath: null,
  serverPath: null,
  portInUse: false,
  processSpawned: false,
  healthCheckPassed: false,
  selectedPort: null
};

async function startExpressServer() {
  debugLog.info('=== STARTING EXPRESS SERVER DIAGNOSTIC ===');
  
  if (isDev) {
    debugLog.info('Development mode - assuming external server is running');
    return Promise.resolve();
  }
  
  // Update diagnostics with basic system info
  serverDiagnostics.appPath = app.isPackaged ? app.getAppPath() : path.join(__dirname, '..');
  
  // Fix server path for packaged apps - handle app.asar properly
  if (app.isPackaged) {
    // Try multiple possible locations for the server file
    const possiblePaths = [
      path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'index.cjs'),
      path.join(app.getAppPath(), 'dist', 'index.cjs'),
      path.join(process.resourcesPath, 'app.asar', 'dist', 'index.cjs'),
    ];
    
    for (const serverPath of possiblePaths) {
      if (fs.existsSync(serverPath)) {
        serverDiagnostics.serverPath = serverPath;
        break;
      }
    }
    
    if (!serverDiagnostics.serverPath) {
      serverDiagnostics.serverPath = possiblePaths[0]; // fallback
    }
  } else {
    serverDiagnostics.serverPath = path.join(serverDiagnostics.appPath, 'dist', 'index.cjs');
  }
  
  debugLog.info(`System Info: Node ${serverDiagnostics.nodeVersion}, Platform ${serverDiagnostics.platform}, Arch ${serverDiagnostics.arch}`);
  debugLog.info(`Electron Version: ${serverDiagnostics.electronVersion}`);
  debugLog.info(`App Packaged: ${app.isPackaged}`);
  debugLog.info(`App Path: ${serverDiagnostics.appPath}`);
  debugLog.info(`Server Path: ${serverDiagnostics.serverPath}`);
  
  // Step 1: Check if port 5000 is already in use
  debugLog.info('Step 1: Checking if port 5000 is available...');
  const portCheck = await checkPortAvailability(5000);
  serverDiagnostics.portInUse = !portCheck.available;
  
  if (!portCheck.available) {
    debugLog.warn(`Port 5000 is already in use: ${portCheck.error}`);
    // Try to find what's using the port
    debugLog.info('Attempting to identify process using port 5000...');
  } else {
    debugLog.info('Port 5000 is available for server binding');
  }
  
  // Step 2: Attempt multiple server startup methods
  const startupMethods = [
    { name: 'fork_method', handler: () => startServerWithFork(5000) },
    { name: 'spawn_method', handler: () => startServerWithSpawn(5000) },
    { name: 'require_method', handler: () => startServerWithRequire(5000) },
    { name: 'alternative_port', handler: startServerOnAlternativePort }
  ];
  
  for (let i = 0; i < startupMethods.length; i++) {
    const method = startupMethods[i];
    debugLog.info(`Step ${i + 3}: Attempting startup method: ${method.name}`);
    
    const attempt = {
      method: method.name,
      timestamp: new Date().toISOString(),
      success: false,
      error: null,
      diagnostics: {}
    };
    
    try {
      const result = await method.handler();
      if (result.success) {
        attempt.success = true;
        attempt.diagnostics = result.diagnostics;
        serverStartupAttempts.push(attempt);
        debugLog.info(`✅ Server startup successful with method: ${method.name}`);
        return Promise.resolve();
      } else {
        attempt.error = result.error;
        attempt.diagnostics = result.diagnostics;
        debugLog.warn(`❌ Method ${method.name} failed: ${result.error}`);
      }
    } catch (error) {
      attempt.error = error.message;
      debugLog.error(`❌ Method ${method.name} threw exception: ${error.message}`);
      debugLog.error(`Stack trace: ${error.stack}`);
    }
    
    serverStartupAttempts.push(attempt);
  }
  
  // All methods failed
  debugLog.error('🚨 ALL SERVER STARTUP METHODS FAILED');
  debugLog.error('Generating comprehensive diagnostic report...');
  await generateDiagnosticReport();
  
  debugLog.warn('Continuing without embedded server - app will use external content or fail gracefully');
  return Promise.resolve();
}

// === PORT AVAILABILITY CHECKER ===
async function checkPortAvailability(port) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    
    server.listen(port, '127.0.0.1', () => {
      server.once('close', () => {
        resolve({ available: true, port });
      });
      server.close();
    });
    
    server.on('error', (err) => {
      resolve({ available: false, port, error: err.message });
    });
  });
}

// === SERVER STARTUP METHODS ===
async function startServerWithFork(port = 5000) {
  debugLog.info(`Attempting fork method for server startup on port ${port}...`);
  const { fork } = require('child_process');
  
  const diagnostics = {
    method: 'fork',
    port,
    serverFileExists: fs.existsSync(serverDiagnostics.serverPath),
    processSpawned: false,
    pid: null,
    error: null
  };
  
  if (!diagnostics.serverFileExists) {
    return { success: false, error: 'Server file not found', diagnostics };
  }
  
  try {
    // Get user data directory from Electron - cross-platform
    const userDataDir = app.getPath('userData');
    const dataDir = path.join(userDataDir, 'data');
    
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      ELECTRON_RUN_AS_NODE: '1', // Critical: Make Electron behave as Node
      PORT: port.toString(),
      DATA_DIR: dataDir, // Pass data directory directly to server
      FORCE_COLOR: '0' // Disable colors in child process
    };
    
    debugLog.debug('Environment variables for fork:');
    Object.keys(env).forEach(key => {
      if (key.includes('SECRET') || key.includes('HASH') || key.includes('RESET') || key.includes('TOKEN') || key.includes('KEY')) {
        debugLog.debug(`  ${key}: [HIDDEN]`);
      } else {
        debugLog.debug(`  ${key}: ${env[key]}`);
      }
    });
    
    const serverProcess = fork(serverDiagnostics.serverPath, [], {
      env,
      silent: false,
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      cwd: process.resourcesPath || path.dirname(serverDiagnostics.serverPath),
      execPath: process.execPath // Use Electron executable with ELECTRON_RUN_AS_NODE
    });
    
    diagnostics.processSpawned = true;
    diagnostics.pid = serverProcess.pid;
    serverDiagnostics.processSpawned = true;
    
    debugLog.info(`Fork process spawned with PID: ${serverProcess.pid}`);
    
    // Enhanced process event handling
    serverProcess.on('error', (error) => {
      debugLog.error(`Fork process error: ${error.message}`);
      diagnostics.error = error.message;
    });
    
    serverProcess.on('exit', (code, signal) => {
      debugLog.warn(`Fork process exited with code ${code}, signal ${signal}`);
    });
    
    serverProcess.stdout?.on('data', (data) => {
      debugLog.debug(`Fork stdout: ${data.toString().trim()}`);
    });
    
    serverProcess.stderr?.on('data', (data) => {
      debugLog.error(`Fork stderr: ${data.toString().trim()}`);
    });
    
    expressApp = serverProcess;
    
    // Wait for server to be ready
    const healthResult = await waitForServer(port, 50, 1000); // port, maxAttempts, delayMs
    if (healthResult.success) {
      serverDiagnostics.healthCheckPassed = true;
      serverDiagnostics.selectedPort = port;
      selectedServerPort = port;
      return { success: true, diagnostics, port };
    } else {
      return { success: false, error: 'Health check failed after fork', diagnostics };
    }
    
  } catch (error) {
    debugLog.error(`Fork method exception: ${error.message}`);
    return { success: false, error: error.message, diagnostics };
  }
}

async function startServerWithSpawn(port = 5000) {
  debugLog.info(`Attempting spawn method for server startup on port ${port}...`);
  const { spawn } = require('child_process');
  
  const diagnostics = {
    method: 'spawn',
    port,
    nodeExecutable: process.execPath, // Always use Electron executable
    serverFileExists: fs.existsSync(serverDiagnostics.serverPath),
    processSpawned: false,
    pid: null
  };
  
  if (!diagnostics.serverFileExists) {
    return { success: false, error: 'Server file not found', diagnostics };
  }
  
  try {
    debugLog.debug(`Using Electron executable as Node: ${diagnostics.nodeExecutable}`);
    debugLog.debug(`Server path: ${serverDiagnostics.serverPath}`);
    
    // Get user data directory from Electron - cross-platform  
    const userDataDir = app.getPath('userData');
    const dataDir = path.join(userDataDir, 'data');
    
    const serverProcess = spawn(process.execPath, [serverDiagnostics.serverPath], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        ELECTRON_RUN_AS_NODE: '1', // Critical: Make Electron behave as Node
        PORT: port.toString(),
        DATA_DIR: dataDir // Pass data directory directly to server
      },
      cwd: process.resourcesPath || path.dirname(serverDiagnostics.serverPath),
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    diagnostics.processSpawned = true;
    diagnostics.pid = serverProcess.pid;
    
    debugLog.info(`Spawn process started with PID: ${serverProcess.pid}`);
    
    serverProcess.on('error', (error) => {
      debugLog.error(`Spawn process error: ${error.message}`);
    });
    
    serverProcess.stdout.on('data', (data) => {
      debugLog.debug(`Spawn stdout: ${data.toString().trim()}`);
    });
    
    serverProcess.stderr.on('data', (data) => {
      debugLog.error(`Spawn stderr: ${data.toString().trim()}`);
    });
    
    expressApp = serverProcess;
    
    const healthResult = await waitForServer(port, 30, 1000);
    if (healthResult.success) {
      serverDiagnostics.selectedPort = port;
      selectedServerPort = port;
      return { success: true, diagnostics, port };
    } else {
      return { success: false, error: 'Health check failed after spawn', diagnostics };
    }
    
  } catch (error) {
    return { success: false, error: error.message, diagnostics };
  }
}

async function startServerWithRequire(port = 5000) {
  debugLog.info(`Attempting direct require method for server startup on port ${port}...`);
  
  const diagnostics = {
    method: 'require',
    port,
    serverFileExists: fs.existsSync(serverDiagnostics.serverPath),
    requireSuccessful: false
  };
  
  if (!diagnostics.serverFileExists) {
    return { success: false, error: 'Server file not found', diagnostics };
  }
  
  try {
    // Set environment before requiring
    process.env.NODE_ENV = 'production';
    process.env.ELECTRON = '1';
    process.env.PORT = port.toString();
    
    debugLog.info('Attempting to require server directly...');
    require(serverDiagnostics.serverPath);
    diagnostics.requireSuccessful = true;
    
    debugLog.info('Server required successfully, testing health...');
    const healthResult = await waitForServer(port, 20, 1500);
    
    if (healthResult.success) {
      serverDiagnostics.selectedPort = port;
      selectedServerPort = port;
      return { success: true, diagnostics, port };
    } else {
      return { success: false, error: 'Health check failed after require', diagnostics };
    }
    
  } catch (error) {
    debugLog.error(`Direct require failed: ${error.message}`);
    return { success: false, error: error.message, diagnostics };
  }
}

async function startServerOnAlternativePort() {
  debugLog.info('Attempting server startup on alternative port...');
  
  const alternativePorts = [5001, 5002, 3000, 8000];
  
  for (const port of alternativePorts) {
    debugLog.info(`Testing alternative port: ${port}`);
    
    const portCheck = await checkPortAvailability(port);
    if (portCheck.available) {
      debugLog.info(`Port ${port} is available, attempting server startup...`);
      
      // Try fork with alternative port
      const result = await startServerWithFork(port);
      if (result.success) {
        debugLog.info(`✅ Server started successfully on alternative port ${port}`);
        return { success: true, port, diagnostics: result.diagnostics };
      }
    } else {
      debugLog.debug(`Port ${port} not available: ${portCheck.error}`);
    }
  }
  
  return { success: false, error: 'No alternative ports available', diagnostics: { testedPorts: alternativePorts } };
}

// === ENHANCED HEALTH CHECK SYSTEM ===
async function waitForServer(port = 5000, maxAttempts = 50, delayMs = 1000) {
  const http = require('http');
  
  debugLog.info(`Starting health check for port ${port} (${maxAttempts} attempts, ${delayMs}ms delay)`);
  
  const healthResults = {
    success: false,
    attempts: [],
    totalTime: 0
  };
  
  const startTime = Date.now();
  
  for (let i = 0; i < maxAttempts; i++) {
    const attemptStart = Date.now();
    const attempt = {
      number: i + 1,
      timestamp: new Date().toISOString(),
      success: false,
      error: null,
      responseTime: 0,
      statusCode: null
    };
    
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}/health`, (res) => {
          attempt.statusCode = res.statusCode;
          
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            attempt.responseTime = Date.now() - attemptStart;
            
            if (res.statusCode === 200) {
              debugLog.debug(`Health check ${i + 1} passed (${attempt.responseTime}ms): ${body.substring(0, 100)}`);
              attempt.success = true;
              resolve();
            } else {
              reject(new Error(`Status ${res.statusCode}: ${body}`));
            }
          });
        });
        
        req.on('error', reject);
        req.setTimeout(3000, () => reject(new Error('Request timeout')));
      });
      
      // Success!
      healthResults.success = true;
      healthResults.attempts.push(attempt);
      healthResults.totalTime = Date.now() - startTime;
      
      debugLog.info(`✅ Server health check passed on attempt ${i + 1} after ${healthResults.totalTime}ms`);
      serverDiagnostics.healthCheckPassed = true;
      
      return healthResults;
      
    } catch (error) {
      attempt.error = error.message;
      attempt.responseTime = Date.now() - attemptStart;
      healthResults.attempts.push(attempt);
      
      if (i === 0 || i % 10 === 9) { // Log every 10th attempt
        debugLog.debug(`Health check ${i + 1}/${maxAttempts} failed (${attempt.responseTime}ms): ${error.message}`);
      }
      
      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  healthResults.totalTime = Date.now() - startTime;
  debugLog.error(`❌ All ${maxAttempts} health check attempts failed over ${healthResults.totalTime}ms`);
  
  return healthResults;
}

// === DIAGNOSTIC REPORT GENERATOR ===
async function generateDiagnosticReport() {
  debugLog.info('=== GENERATING COMPREHENSIVE DIAGNOSTIC REPORT ===');
  
  const report = {
    timestamp: new Date().toISOString(),
    system: serverDiagnostics,
    startupAttempts: serverStartupAttempts,
    fileSystemCheck: {},
    networkCheck: {},
    processCheck: {}
  };
  
  // File system diagnostics
  debugLog.info('Checking file system...');
  try {
    const distDir = path.join(serverDiagnostics.appPath, 'dist');
    const publicDir = path.join(distDir, 'public');
    
    report.fileSystemCheck = {
      appPathExists: fs.existsSync(serverDiagnostics.appPath),
      distDirExists: fs.existsSync(distDir),
      publicDirExists: fs.existsSync(publicDir),
      serverFileExists: fs.existsSync(serverDiagnostics.serverPath),
      serverFileSize: fs.existsSync(serverDiagnostics.serverPath) ? fs.statSync(serverDiagnostics.serverPath).size : 0,
      distContents: fs.existsSync(distDir) ? fs.readdirSync(distDir) : [],
      appPathContents: fs.existsSync(serverDiagnostics.appPath) ? fs.readdirSync(serverDiagnostics.appPath) : []
    };
    
    debugLog.info(`Server file exists: ${report.fileSystemCheck.serverFileExists}`);
    debugLog.info(`Server file size: ${report.fileSystemCheck.serverFileSize} bytes`);
    
  } catch (error) {
    report.fileSystemCheck.error = error.message;
    debugLog.error(`File system check failed: ${error.message}`);
  }
  
  // Network diagnostics
  debugLog.info('Checking network ports...');
  const portsToCheck = [5000, 5001, 5002, 3000, 8000];
  for (const port of portsToCheck) {
    const check = await checkPortAvailability(port);
    report.networkCheck[`port_${port}`] = check;
  }
  
  // Process diagnostics
  report.processCheck = {
    hasExpressApp: !!expressApp,
    expressAppPid: expressApp?.pid || null,
    expressAppKilled: expressApp?.killed || null,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    cwd: process.cwd(),
    memoryUsage: process.memoryUsage()
  };
  
  // Write report to file
  const reportPath = path.join(app.getPath('userData'), 'server-diagnostic-report.json');
  try {
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    debugLog.info(`Diagnostic report saved to: ${reportPath}`);
  } catch (error) {
    debugLog.error(`Failed to save diagnostic report: ${error.message}`);
  }
  
  debugLog.info('=== DIAGNOSTIC REPORT COMPLETE ===');
  return report;
}

async function createWindow() {
  // zeeexshan: Main application window
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    icon: path.join(__dirname, '../assets/logo.png'), // Custom icon
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.cjs')
    },
    show: false, // Don't show until ready
    titleBarStyle: 'default',
    title: 'Shop Analytics Dashboard - by zeeexshan'
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  try {
    if (isDev) {
      // Development mode - load from dev server
      debugLog.info('Development mode: Loading from http://localhost:5000');
      mainWindow.loadURL('http://localhost:5000');
      mainWindow.webContents.openDevTools();
    } else {
      // Production mode - load from localhost server using the actual server port
      const serverUrl = `http://localhost:${selectedServerPort}`;
      debugLog.info(`Production mode: Loading main window from ${serverUrl}`);
      await mainWindow.loadURL(serverUrl);
    }
  } catch (error) {
    debugLog.error(`Failed to load main window content: ${error.message}`);
    console.error('Failed to load main window content:', error);
    
    // Fallback: try loading static files directly
    if (!isDev) {
      try {
        const appPath = app.isPackaged ? app.getAppPath() : path.join(__dirname, '..');
        const indexPath = path.join(appPath, 'dist', 'public', 'index.html');
        debugLog.info(`Fallback: loading static files from ${indexPath}`);
        console.log('Fallback: loading static files from', indexPath);
        await mainWindow.loadFile(indexPath);
      } catch (fallbackError) {
        debugLog.error(`Fallback also failed: ${fallbackError.message}`);
        console.error('Fallback also failed:', fallbackError);
      }
    }
  }

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  return mainWindow;
}

// Call this BEFORE app.whenReady()
loadEnvironmentVariables();

app.whenReady().then(async () => {
  try {
    // zeeexshan: Check license activation before starting
    console.log('=== APP STARTING ===');
    console.log(`Development mode: ${isDev}`);
    
    const isActivated = checkActivation();
    console.log(`License activation status: ${isActivated}`);
    
    if (!isActivated && !isDev) {
      // Show activation window for production builds
      console.log('License not activated - showing activation window');
      
      try {
        const activationWin = createActivationWindow();
        console.log('Activation window created successfully');
        
        // Listen for successful activation
        ipcMain.once('activation-completed', async () => {
          console.log('Activation completed - starting main app');
          try {
            // Close activation window first
            if (activationWin && !activationWin.isDestroyed()) {
              activationWin.close();
            }
            
            // Start Express server
            await startExpressServer();
            
            // Create main window
            await createWindow();
            
            console.log('Main application launched successfully');
          } catch (error) {
            console.error('Error starting main app after activation:', error);
            // Still create window even if server startup fails
            await createWindow();
          }
        });
        
        // Handle activation window close without activation
        activationWin.on('closed', () => {
          console.log('Activation window closed');
          if (!checkActivation()) {
            console.log('No activation found - quitting app');
            app.quit();
          }
        });
      } catch (activationError) {
        console.error('CRITICAL: Failed to create activation window:', activationError);
        console.error('Error stack:', activationError.stack);
        app.quit();
      }
    } else {
      console.log('Starting app normally (development or activated)');
      // Start Express server first (development or activated)
      await startExpressServer();
      
      // Then create the main window
      await createWindow();
    }
  } catch (error) {
    console.error('CRITICAL: Failed to start application:', error);
    console.error('Error stack:', error.stack);
    app.quit();
  }
  
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const isActivated = checkActivation();
      if (isActivated || isDev) {
        await createWindow();
      } else {
        createActivationWindow();
      }
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up server process when app is quitting
app.on('before-quit', () => {
  console.log('App is quitting - cleaning up server process');
  if (expressApp && !expressApp.killed) {
    console.log('Terminating server process with PID:', expressApp.pid);
    expressApp.kill('SIGTERM');
    expressApp = null;
  }
});

// zeeexshan: IPC handlers for licensed features
ipcMain.handle('print-page', async () => {
  // Check activation before allowing print
  if (!checkActivation() && !isDev) {
    return { success: false, error: 'Print feature requires license activation' };
  }
  
  const mainWindow = BrowserWindow.getFocusedWindow();
  if (mainWindow) {
    try {
      await mainWindow.webContents.print({
        silent: false,
        printBackground: true,
        deviceName: '',
        color: true,
        margins: {
          marginType: 'printableArea'
        },
        landscape: false,
        scaleFactor: 100
      });
      return { success: true };
    } catch (error) {
      console.error('Print failed:', error);
      return { success: false, error: error.message };
    }
  }
  return { success: false, error: 'No window found' };
});

// zeeexshan: Handle successful activation from activation window
ipcMain.on('activation-success', async () => {
  console.log('License activated successfully');
  // Emit the activation-completed event to trigger main app startup
  ipcMain.emit('activation-completed');
});