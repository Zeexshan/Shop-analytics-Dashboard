// electron/activation-window.cjs
const { BrowserWindow, ipcMain, net } = require('electron');
const path = require('path');
const Store = require('electron-store').default;

const store = new Store();

// zeeexshan: Commercial licensing system for Shop Analytics Dashboard
const LICENSE_CONFIG_zeeexshan = {
  // Will be provided separately by user
  product_permalink: 'shop-analytics-dashboard',
  api_url: 'https://api.gumroad.com/v2/licenses/verify'
};

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
  return new Promise((resolve) => {
    try {
      const postData = new URLSearchParams({
        product_permalink: productPermalink || LICENSE_CONFIG_zeeexshan.product_permalink,
        license_key: licenseKey,
      }).toString();

      const request = net.request({
        method: 'POST',
        url: LICENSE_CONFIG_zeeexshan.api_url,
      });

      request.setHeader('Content-Type', 'application/x-www-form-urlencoded');
      request.setHeader('Content-Length', Buffer.byteLength(postData));

      let responseData = '';

      request.on('response', (response) => {
        response.on('data', (chunk) => {
          responseData += chunk.toString();
        });

        response.on('end', () => {
          try {
            const result = JSON.parse(responseData);
            
            if (result.success && result.purchase) {
              resolve({
                success: true,
                purchase: result.purchase
              });
            } else {
              resolve({
                success: false,
                error: 'Invalid license key'
              });
            }
          } catch (parseError) {
            console.error('JSON parse error:', parseError);
            resolve({
              success: false,
              error: 'Invalid response from license server'
            });
          }
        });
      });

      request.on('error', (error) => {
        console.error('License verification network error:', error);
        resolve({
          success: false,
          error: 'Cannot verify license. Check internet connection'
        });
      });

      request.write(postData);
      request.end();
    } catch (error) {
      console.error('License verification error:', error);
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
  if (!licenseKey || licenseKey.trim().length === 0) {
    return { success: false, error: 'Please enter a license key' };
  }

  const result = await verifyLicense(licenseKey.trim());
  
  if (result.success) {
    saveActivation(licenseKey.trim(), result.purchase);
    return { success: true, message: 'License activated successfully!' };
  } else {
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