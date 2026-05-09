'use strict';

const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const PORT = 5000;
let mainWindow = null;
let serverProcess = null;

function getServerPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'app.asar.unpacked', 'dist', 'index.cjs');
  }
  return path.join(__dirname, '..', 'dist', 'index.cjs');
}

function waitForServer(retries, callback) {
  http.get('http://localhost:' + PORT, function () {
    callback();
  }).on('error', function () {
    if (retries > 0) {
      setTimeout(function () { waitForServer(retries - 1, callback); }, 600);
    } else {
      console.error('[electron] Server did not start in time.');
    }
  });
}

function startServer() {
  var serverPath = getServerPath();
  serverProcess = spawn(process.execPath, [serverPath], {
    env: Object.assign({}, process.env, {
      NODE_ENV: 'production',
      PORT: String(PORT),
    }),
    stdio: 'pipe',
  });
  serverProcess.stdout.on('data', function (d) { process.stdout.write(d); });
  serverProcess.stderr.on('data', function (d) { process.stderr.write(d); });
  serverProcess.on('error', function (err) {
    console.error('[electron] Server process error:', err);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'ShopAnalytics',
    show: false,
    backgroundColor: '#f0f4ff',
  });

  mainWindow.loadURL('http://localhost:' + PORT);

  mainWindow.once('ready-to-show', function () {
    mainWindow.show();
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(function (details) {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });
}

app.whenReady().then(function () {
  startServer();
  waitForServer(30, createWindow);
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
  if (mainWindow === null) createWindow();
});

app.on('before-quit', function () {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
