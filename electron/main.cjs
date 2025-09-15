// electron/main.cjs
// zeeexshan: Shop Analytics Dashboard - Commercial Desktop Application
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const { createActivationWindow, checkActivation } = require('./activation-window.cjs');
const isDev = process.env.NODE_ENV === 'development';

// zeeexshan: Application signature
const APP_SIGNATURE_zeeexshan = 'shop_analytics_dashboard_by_zeeexshan';

let expressApp = null;

async function startExpressServer() {
  if (isDev) {
    // In development, assume server is already running
    return Promise.resolve();
  }
  
  try {
    // Correct path resolution for packaged applications
    const appPath = app.isPackaged ? app.getAppPath() : path.join(__dirname, '..');
    const serverPath = path.join(appPath, 'dist', 'index.js');
    
    console.log('Attempting to start Express server from:', serverPath);
    
    // Check if server file exists
    const fs = require('fs');
    if (!fs.existsSync(serverPath)) {
      console.log('Server file not found at:', serverPath);
      console.log('Skipping server startup - app will use external server or file-based content');
      return Promise.resolve();
    }
    
    // Set production environment for Electron
    process.env.NODE_ENV = 'production';
    process.env.ELECTRON = '1'; // Flag for electron-specific behavior
    
    // Import the server module and start it
    const serverModule = await import(url.pathToFileURL(serverPath).href);
    
    console.log('Express server started in Electron process');
    
    // Wait for server to be ready
    await waitForServer();
    
    return Promise.resolve();
  } catch (error) {
    console.error('Failed to start server:', error);
    console.log('Continuing without embedded server - app will use external content');
    return Promise.resolve(); // Don't reject - continue without embedded server
  }
}

async function waitForServer(maxAttempts = 25, delayMs = 200) {
  const http = require('http');
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get('http://localhost:5000/health', (res) => {
          if (res.statusCode === 200) {
            console.log('Server health check passed');
            resolve();
          } else {
            reject(new Error(`Health check failed with status ${res.statusCode}`));
          }
        });
        
        req.on('error', reject);
        req.setTimeout(1000, () => reject(new Error('Health check timeout')));
      });
      
      return; // Success
    } catch (error) {
      console.log(`Health check attempt ${i + 1}/${maxAttempts} failed:`, error.message);
      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw new Error('Server failed to start within expected time');
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
      mainWindow.loadURL('http://localhost:5000');
      mainWindow.webContents.openDevTools();
    } else {
      // Production mode - load from localhost server after ensuring it's ready
      console.log('Loading main window from http://localhost:5000');
      await mainWindow.loadURL('http://localhost:5000');
    }
  } catch (error) {
    console.error('Failed to load main window content:', error);
    
    // Fallback: try loading static files directly
    if (!isDev) {
      try {
        const appPath = app.isPackaged ? app.getAppPath() : path.join(__dirname, '..');
        const indexPath = path.join(appPath, 'dist', 'public', 'index.html');
        console.log('Fallback: loading static files from', indexPath);
        await mainWindow.loadFile(indexPath);
      } catch (fallbackError) {
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
            activationWin.close();
            await startExpressServer();
            await createWindow();
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

// zeeexshan: Handle successful activation
ipcMain.on('activation-success', async () => {
  console.log('License activated successfully');
  ipcMain.emit('activation-completed');
});