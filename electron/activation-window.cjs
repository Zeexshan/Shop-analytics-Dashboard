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

// --- FINAL, ROBUST LICENSE VERIFICATION USING ELECTRON.NET ---
function verifyLicense(licenseKey) {
  return new Promise((resolve) => {
    const GUMROAD_PRODUCT_ID = '9jzvbqovj9HtIE1MUCU3sQ==';
    const postData = JSON.stringify({
      product_id: GUMROAD_PRODUCT_ID, // Correct parameter name
      license_key: licenseKey.trim(),
    });

    logToFile(`Attempting to verify license for product "${GUMROAD_PRODUCT_ID}"`);

    const request = net.request({
      method: 'POST',
      url: 'https://api.gumroad.com/v2/licenses/verify',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    });

    request.on('response', (response) => {
      logToFile(`Gumroad API Response Status: ${response.statusCode}`);
      let responseBody = '';
      response.on('data', (chunk) => { responseBody += chunk; });
      response.on('end', () => {
        logToFile('Gumroad API Response Body: ' + responseBody);
        try {
          const data = JSON.parse(responseBody);
          if (data.success === true) {
            logToFile('License verification successful!');
            resolve({ success: true, purchase: data.purchase });
          } else {
            logToFile(`License verification failed: ${data.message}`, true);
            resolve({ success: false, error: data.message || 'Invalid license key' });
          }
        } catch (e) {
          logToFile(`CRITICAL ERROR parsing Gumroad JSON response: ${e.message}`, true);
          resolve({ success: false, error: 'Error reading response from server.' });
        }
      });
    });

    request.on('error', (error) => {
      logToFile(`CRITICAL NETWORK ERROR: ${error.message}`, true);
      resolve({ success: false, error: 'A critical network error occurred. Check logs.' });
    });

    request.write(postData);
    request.end();
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

