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
    // Import and start the Express server directly in the Electron process
    const serverPath = path.join(__dirname, '../dist/index.js');
    
    // Set production environment
    process.env.NODE_ENV = 'production';
    
    // Import the server module and start it
    const serverModule = await import(url.pathToFileURL(serverPath).href);
    
    console.log('Express server started in Electron process');
    return Promise.resolve();
  } catch (error) {
    console.error('Failed to start server:', error);
    return Promise.reject(error);
  }
}

function createWindow() {
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

  if (isDev) {
    // Development mode - load from dev server
    mainWindow.loadURL('http://localhost:5000');
    mainWindow.webContents.openDevTools();
  } else {
    // Production mode - load from localhost server
    mainWindow.loadURL('http://localhost:5000');
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
    const isActivated = checkActivation();
    
    if (!isActivated && !isDev) {
      // Show activation window for production builds
      console.log('License not activated - showing activation window');
      const activationWin = createActivationWindow();
      
      // Listen for successful activation
      ipcMain.once('activation-completed', async () => {
        activationWin.close();
        await startExpressServer();
        createWindow();
      });
      
      // Handle activation window close without activation
      activationWin.on('closed', () => {
        if (!checkActivation()) {
          app.quit();
        }
      });
    } else {
      // Start Express server first (development or activated)
      await startExpressServer();
      
      // Then create the main window
      createWindow();
    }
  } catch (error) {
    console.error('Failed to start application:', error);
    app.quit();
  }
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const isActivated = checkActivation();
      if (isActivated || isDev) {
        createWindow();
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