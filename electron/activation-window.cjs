// electron/activation-window.cjs
const { BrowserWindow, ipcMain, app } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { URL } = require('url');
const Store = require('electron-store').default;

const store = new Store();

// zeeexshan: Commercial licensing system for Shop Analytics Dashboard
const LICENSE_CONFIG_zeeexshan = {
  // Will be provided separately by user
  product_permalink: 'shop-analytics-dashboard',
  api_url: 'https://api.gumroad.com/v2/licenses/verify'
};

// Detailed logging function for debugging
function logToFile(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${isError ? 'ERROR' : 'INFO'}: ${message}\n`;
  
  try {
    // Always log to console
    if (isError) {
      console.error(logMessage);
    } else {
      console.log(logMessage);
    }
    
    // Log to file in userData directory (always writable in packaged apps)
    const userDataPath = app.getPath('userData');
    const logPath = path.join(userDataPath, 'activation-debug.log');
    
    // Ensure directory exists
    fs.mkdirSync(userDataPath, { recursive: true });
    
    // Write to log file
    fs.appendFileSync(logPath, logMessage);
    
    // Also try to write to desktop as backup
    try {
      const desktopPath = app.getPath('desktop');
      const desktopLogPath = path.join(desktopPath, 'ShopAnalytics-activation-debug.log');
      fs.appendFileSync(desktopLogPath, logMessage);
    } catch (desktopErr) {
      // Ignore desktop write errors
    }
    
  } catch (err) {
    console.error('Failed to write to log file:', err);
    // Try alternative logging to temp directory
    try {
      const tempPath = app.getPath('temp');
      const tempLogPath = path.join(tempPath, 'shop-analytics-debug.log');
      fs.appendFileSync(tempLogPath, logMessage);
    } catch (tempErr) {
      console.error('Failed to write to temp log:', tempErr);
    }
  }
}

let activationWindow = null;

function createActivationWindow() {
  logToFile('=== CREATING ACTIVATION WINDOW ===');
  
  // Prevent multiple instances
  if (activationWindow) {
    logToFile('Activation window already exists, returning existing instance');
    return activationWindow;
  }

  try {
    logToFile('Creating new BrowserWindow for activation...');
    
    activationWindow = new BrowserWindow({
      width: 450,
      height: 350,
      resizable: false,
      alwaysOnTop: true,
      center: true,
      modal: true,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: false, // Allow external API requests for license verification
        preload: path.join(__dirname, 'activation-preload.cjs')
      },
      icon: path.join(__dirname, '../assets/logo.png'),
      title: 'Shop Analytics Dashboard - License Activation'
    });

    logToFile('BrowserWindow created successfully');

    // Load activation HTML
    const htmlPath = path.join(__dirname, 'activation.html');
    logToFile(`Loading activation HTML from: ${htmlPath}`);
    
    activationWindow.loadFile(htmlPath).then(() => {
      logToFile('Activation HTML loaded successfully');
    }).catch((err) => {
      logToFile(`Failed to load activation HTML: ${err.message}`, true);
    });

    activationWindow.once('ready-to-show', () => {
      logToFile('Activation window ready to show');
      activationWindow.show();
      logToFile('Activation window shown to user');
    });

    activationWindow.on('closed', () => {
      logToFile('Activation window closed');
      activationWindow = null;
    });

    activationWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      logToFile(`Activation window failed to load: ${errorCode} - ${errorDescription}`, true);
    });

    logToFile('Activation window setup complete');
    return activationWindow;
    
  } catch (error) {
    logToFile(`CRITICAL ERROR creating activation window: ${error.message}`, true);
    logToFile(`Error stack: ${error.stack}`, true);
    throw error;
  }
}

// zeeexshan: License verification with Gumroad API using Node.js https module
async function verifyLicense(licenseKey, productPermalink) {
  logToFile(`Starting license verification for key: ${licenseKey.substring(0, 8)}...`);
  
  return new Promise((resolve) => {
    try {
      const permalink = productPermalink || LICENSE_CONFIG_zeeexshan.product_permalink;
      const apiUrl = LICENSE_CONFIG_zeeexshan.api_url;
      
      logToFile(`Using product_permalink: ${permalink}`);
      logToFile(`Using API URL: ${apiUrl}`);
      
      const postData = new URLSearchParams({
        product_permalink: permalink,
        license_key: licenseKey,
      }).toString();
      
      logToFile(`POST data length: ${postData.length} characters`);
      logToFile(`POST data content: ${postData}`);

      // Parse URL for https.request
      const urlObj = new URL(apiUrl);
      logToFile(`Parsed URL - host: ${urlObj.hostname}, port: ${urlObj.port}, path: ${urlObj.pathname}`);
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'Shop Analytics Dashboard/1.0.0',
          'Accept': 'application/json'
        }
      };
      
      logToFile(`HTTPS request options: ${JSON.stringify(requestOptions, null, 2)}`);

      let responseData = '';
      
      // Set up timeout
      const timeout = setTimeout(() => {
        logToFile('Request timeout after 30 seconds', true);
        resolve({
          success: false,
          error: 'License verification timeout. Check internet connection'
        });
      }, 30000);

      const request = https.request(requestOptions, (response) => {
        clearTimeout(timeout);
        
        const statusCode = response.statusCode;
        logToFile(`Received response with status code: ${statusCode}`);
        logToFile(`Response headers: ${JSON.stringify(response.headers)}`);

        response.on('data', (chunk) => {
          const chunkStr = chunk.toString();
          responseData += chunkStr;
          logToFile(`Received data chunk (${chunkStr.length} chars): ${chunkStr.substring(0, 100)}...`);
        });

        response.on('end', () => {
          logToFile(`Response complete. Total data length: ${responseData.length}`);
          logToFile(`Response data preview: ${responseData.substring(0, 200)}...`);
          
          try {
            const result = JSON.parse(responseData);
            logToFile(`Parsed JSON response - success: ${result.success}, has purchase: ${!!result.purchase}`);
            
            if (result.success && result.purchase) {
              logToFile('License verification successful!');
              resolve({
                success: true,
                purchase: result.purchase
              });
            } else {
              logToFile(`License verification failed. API response: ${JSON.stringify(result)}`, true);
              resolve({
                success: false,
                error: result.message || 'Invalid license key'
              });
            }
          } catch (parseError) {
            logToFile(`JSON parse error: ${parseError.message}`, true);
            logToFile(`Raw response that failed to parse: ${responseData}`, true);
            resolve({
              success: false,
              error: 'Invalid response from license server'
            });
          }
        });

        response.on('error', (error) => {
          clearTimeout(timeout);
          logToFile(`Response stream error: ${error.message}`, true);
          resolve({
            success: false,
            error: 'Error reading license server response'
          });
        });
      });

      request.on('error', (error) => {
        clearTimeout(timeout);
        logToFile(`HTTPS request error: ${error.message}`, true);
        logToFile(`Error code: ${error.code}`, true);
        logToFile(`Error stack: ${error.stack}`, true);
        
        let userMessage = 'Cannot verify license. Check internet connection';
        if (error.code === 'ENOTFOUND') {
          userMessage = 'Cannot reach license server. Check internet connection';
        } else if (error.code === 'ECONNREFUSED') {
          userMessage = 'License server refused connection';
        } else if (error.code === 'ETIMEDOUT') {
          userMessage = 'License verification timeout';
        } else if (error.code === 'ECONNRESET') {
          userMessage = 'Connection lost during license verification';
        }
        
        resolve({
          success: false,
          error: userMessage
        });
      });

      request.on('timeout', () => {
        clearTimeout(timeout);
        logToFile('HTTPS request timeout', true);
        request.destroy();
        resolve({
          success: false,
          error: 'License verification timeout'
        });
      });

      logToFile(`Writing POST data to HTTPS request: ${postData.length} bytes`);
      request.write(postData);
      
      logToFile('Ending HTTPS request...');
      request.end();
      
    } catch (error) {
      logToFile(`Unexpected error in license verification: ${error.message}`, true);
      logToFile(`Error stack: ${error.stack}`, true);
      resolve({
        success: false,
        error: 'Cannot verify license. Check internet connection'
      });
    }
  });
}

// zeeexshan: Persistent activation storage
function saveActivation(licenseKey, purchaseData) {
  const activationData = {
    isActivated: true,
    licenseKey: Buffer.from(licenseKey).toString('base64'), // Simple encoding
    activationDate: new Date().toISOString(),
    purchaseInfo: purchaseData,
    // Developer signature: zeeexshan
    signature: 'zeeexshan_shop_analytics_activation'
  };

  store.set('activation', activationData);
  return true;
}

function checkActivation() {
  const activation = store.get('activation');
  return activation && activation.isActivated === true;
}

function getActivationData() {
  return store.get('activation', {});
}

// IPC handlers for activation process
ipcMain.handle('activate-license', async (event, licenseKey) => {
  logToFile('=== LICENSE ACTIVATION STARTED ===');
  logToFile(`License key received via IPC: ${licenseKey ? licenseKey.substring(0, 8) + '...' : 'EMPTY'}`);
  
  if (!licenseKey || licenseKey.trim().length === 0) {
    logToFile('License key validation failed: empty key', true);
    return { success: false, error: 'Please enter a license key' };
  }

  logToFile('Starting license verification process...');
  const result = await verifyLicense(licenseKey.trim());
  
  logToFile(`License verification result: ${JSON.stringify(result)}`);
  
  if (result.success) {
    logToFile('License verification successful, saving activation data...');
    const saved = saveActivation(licenseKey.trim(), result.purchase);
    logToFile(`Activation data saved: ${saved}`);
    logToFile('=== LICENSE ACTIVATION COMPLETED SUCCESSFULLY ===');
    return { success: true, message: 'License activated successfully!' };
  } else {
    logToFile(`License verification failed: ${result.error}`, true);
    logToFile('=== LICENSE ACTIVATION FAILED ===');
    return { success: false, error: result.error };
  }
});

ipcMain.handle('check-activation', () => {
  return {
    isActivated: checkActivation(),
    data: getActivationData()
  };
});

module.exports = {
  createActivationWindow,
  checkActivation,
  verifyLicense,
  saveActivation,
  getActivationData
};