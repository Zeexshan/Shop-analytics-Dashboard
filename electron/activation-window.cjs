const { BrowserWindow, ipcMain, app, net } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store').default;

const store = new Store();

// --- LOGGING SYSTEM (Your existing robust logger) ---
function logToFile(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${isError ? 'ERROR' : 'INFO'}: ${message}\n`;

  try {
    if (isError) console.error(logMessage); else console.log(logMessage);
    const userDataPath = app.getPath('userData');
    const logPath = path.join(userDataPath, 'activation-debug.log');
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, logMessage);
  } catch (err) {
    console.error('Failed to write to primary log file:', err);
  }
}

let activationWindow = null;

function createActivationWindow() {
  logToFile('=== CREATING ACTIVATION WINDOW ===');
  if (activationWindow) {
    logToFile('Activation window already exists, returning existing instance');
    return activationWindow;
  }
  try {
    logToFile('Creating new BrowserWindow for activation...');
    activationWindow = new BrowserWindow({
      width: 450,
      height: 380,
      resizable: false,
      center: true,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'activation-preload.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
      },
      icon: path.join(__dirname, '../assets/logo.png'),
      title: 'Shop Analytics Dashboard - License Activation'
    });
    logToFile('BrowserWindow created successfully');
    const htmlPath = path.join(__dirname, 'activation.html');
    logToFile(`Loading activation HTML from: ${htmlPath}`);
    activationWindow.loadFile(htmlPath);
    activationWindow.once('ready-to-show', () => {
      logToFile('Activation window ready to show');
      activationWindow.show();
    });
    activationWindow.on('closed', () => {
      logToFile('Activation window closed');
      activationWindow = null;
    });
    return activationWindow;
  } catch (error) {
    logToFile(`CRITICAL ERROR creating activation window: ${error.message}`, true);
    throw error;
  }
}

// --- FINAL, ROBUST LICENSE VERIFICATION USING HTTPS ---
function verifyLicense(licenseKey) {
  return new Promise((resolve) => {
    const https = require('https');
    const { URL } = require('url');
    
    const GUMROAD_PRODUCT_ID = '9jzvbqovj9HtIE1MUCU3sQ==';
    const postData = new URLSearchParams({
      product_id: GUMROAD_PRODUCT_ID,
      license_key: licenseKey.trim(),
      increment_uses_count: 'false'
    }).toString();

    logToFile(`Starting license verification for key: ${licenseKey.substring(0, 8)}...`);
    logToFile(`Using product_id: ${GUMROAD_PRODUCT_ID}`);
    logToFile(`Using API URL: https://api.gumroad.com/v2/licenses/verify`);
    logToFile(`POST data length: ${postData.length} characters`);
    logToFile(`POST data content: ${postData}`);

    const parsedUrl = new URL('https://api.gumroad.com/v2/licenses/verify');
    logToFile(`Parsed URL - host: ${parsedUrl.hostname}, port: ${parsedUrl.port || 443}, path: ${parsedUrl.pathname}`);

    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': postData.length,
        'User-Agent': 'Shop Analytics Dashboard/1.0.0',
        'Accept': 'application/json'
      }
    };

    logToFile(`HTTPS request options: ${JSON.stringify(options, null, 2)}`);

    const req = https.request(options, (res) => {
      logToFile(`Received response with status code: ${res.statusCode}`);
      logToFile(`Response headers: ${JSON.stringify(res.headers)}`);
      
      let responseBody = '';
      
      res.on('data', (chunk) => {
        responseBody += chunk;
        logToFile(`Received data chunk (${chunk.length} chars): ${chunk.toString().substring(0, 100)}...`);
      });
      
      res.on('end', () => {
        logToFile(`Response complete. Total data length: ${responseBody.length}`);
        logToFile(`Response data preview: ${responseBody.substring(0, 200)}...`);
        
        try {
          const data = JSON.parse(responseBody);
          logToFile(`Parsed JSON response - success: ${data.success}, has purchase: ${!!data.purchase}`);
          
          if (data.success === true) {
            logToFile('License verification successful!');
            resolve({ success: true, purchase: data.purchase });
          } else {
            logToFile(`License verification failed. API response: ${responseBody}`, true);
            resolve({ success: false, error: data.message || 'Invalid license key' });
          }
        } catch (e) {
          logToFile(`CRITICAL ERROR parsing JSON response: ${e.message}`, true);
          logToFile(`Raw response that failed to parse: ${responseBody}`, true);
          resolve({ success: false, error: 'Error parsing server response.' });
        }
      });
    });

    req.on('error', (error) => {
      logToFile(`HTTPS request error: ${error.message}`, true);
      logToFile(`Error code: ${error.code}`, true);
      logToFile(`Error stack: ${error.stack}`, true);
      resolve({ success: false, error: 'Network connection failed. Check internet connection.' });
    });

    logToFile(`Writing POST data to HTTPS request: ${postData.length} bytes`);
    req.write(postData);
    logToFile('Ending HTTPS request...');
    req.end();
  });
}

function saveActivation(licenseKey, purchaseData) {
  const activationData = {
    isActivated: true,
    licenseKey: Buffer.from(licenseKey).toString('base64'),
    activationDate: new Date().toISOString(),
    purchaseInfo: purchaseData,
    signature: 'zeeexshan_shop_analytics_activation'
  };
  store.set('activation', activationData);
  return true;
}

function checkActivation() {
  const activation = store.get('activation');
  return activation && activation.isActivated === true;
}

ipcMain.handle('activate-license', async (event, licenseKey) => {
  logToFile('=== LICENSE ACTIVATION STARTED ===');
  if (!licenseKey || licenseKey.trim().length === 0) {
    logToFile('License key validation failed: empty key', true);
    return { success: false, error: 'Please enter a license key' };
  }

  const result = await verifyLicense(licenseKey.trim());

  if (result.success) {
    logToFile('Saving activation data...');
    saveActivation(licenseKey.trim(), result.purchase);
    logToFile('=== LICENSE ACTIVATION COMPLETED SUCCESSFULLY ===');
    
    // Emit activation completed event to trigger main app startup
    logToFile('Emitting activation-completed event to main process...');
    ipcMain.emit('activation-completed');
    
    // Emit activation completed event to trigger main app startup
    setTimeout(() => {
      console.log('Emitting activation-success event...');
      ipcMain.emit('activation-success');
    }, 1000); // Small delay to ensure UI shows success message
    
    return { success: true, message: 'License activated successfully!' };
  } else {
    logToFile(`License verification failed: ${result.error}`, true);
    logToFile('=== LICENSE ACTIVATION FAILED ===');
    return { success: false, error: result.error };
  }
});

ipcMain.handle('check-activation', () => {
  return { isActivated: checkActivation() };
});

module.exports = { createActivationWindow, checkActivation };

