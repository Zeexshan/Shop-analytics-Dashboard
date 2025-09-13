// electron/activation-window.cjs
const { BrowserWindow, ipcMain, net } = require('electron');
const path = require('path');
const fs = require('fs');
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
    // Log to console for development
    if (isError) {
      console.error(logMessage);
    } else {
      console.log(logMessage);
    }
    
    // Log to file for production debugging
    const logPath = path.join(__dirname, '../activation-debug.log');
    fs.appendFileSync(logPath, logMessage);
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

let activationWindow = null;

function createActivationWindow() {
  // zeeexshan: Activation window for license verification
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

  // Load activation HTML
  activationWindow.loadFile(path.join(__dirname, 'activation.html'));

  activationWindow.once('ready-to-show', () => {
    activationWindow.show();
  });

  activationWindow.on('closed', () => {
    activationWindow = null;
  });

  return activationWindow;
}

// zeeexshan: License verification with Gumroad API using Electron's net module
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
      logToFile(`Creating network request to: ${apiUrl}`);

      const request = net.request({
        method: 'POST',
        url: apiUrl,
      });

      // Set headers
      request.setHeader('Content-Type', 'application/x-www-form-urlencoded');
      request.setHeader('Content-Length', Buffer.byteLength(postData));
      request.setHeader('User-Agent', 'Shop Analytics Dashboard/1.0.0');
      
      logToFile('Headers set successfully');

      let responseData = '';
      let responseStatusCode = 0;

      // Set up timeout
      const timeout = setTimeout(() => {
        logToFile('Request timeout after 30 seconds', true);
        request.abort();
        resolve({
          success: false,
          error: 'License verification timeout. Check internet connection'
        });
      }, 30000);

      request.on('response', (response) => {
        responseStatusCode = response.statusCode;
        logToFile(`Received response with status code: ${responseStatusCode}`);
        logToFile(`Response headers: ${JSON.stringify(response.headers)}`);
        
        clearTimeout(timeout);

        response.on('data', (chunk) => {
          const chunkStr = chunk.toString();
          responseData += chunkStr;
          logToFile(`Received data chunk (${chunkStr.length} chars): ${chunkStr.substring(0, 100)}...`);
        });

        response.on('end', () => {
          logToFile(`Response complete. Total data length: ${responseData.length}`);
          logToFile(`Full response data: ${responseData}`);
          
          try {
            const result = JSON.parse(responseData);
            logToFile(`Parsed JSON response: ${JSON.stringify(result, null, 2)}`);
            
            if (result.success && result.purchase) {
              logToFile('License verification successful!');
              resolve({
                success: true,
                purchase: result.purchase
              });
            } else {
              logToFile(`License verification failed. Result: ${JSON.stringify(result)}`, true);
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
        logToFile(`Network request error: ${error.message}`, true);
        logToFile(`Error code: ${error.code}`, true);
        logToFile(`Error stack: ${error.stack}`, true);
        
        let userMessage = 'Cannot verify license. Check internet connection';
        if (error.code === 'ENOTFOUND') {
          userMessage = 'Cannot reach license server. Check internet connection';
        } else if (error.code === 'ECONNREFUSED') {
          userMessage = 'License server refused connection';
        } else if (error.code === 'ETIMEDOUT') {
          userMessage = 'License verification timeout';
        }
        
        resolve({
          success: false,
          error: userMessage
        });
      });

      request.on('finish', () => {
        logToFile('Request data sent successfully');
      });

      request.on('abort', () => {
        clearTimeout(timeout);
        logToFile('Request was aborted', true);
        resolve({
          success: false,
          error: 'License verification was cancelled'
        });
      });

      logToFile(`Writing POST data: ${postData}`);
      request.write(postData);
      
      logToFile('Ending request...');
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