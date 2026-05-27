import fs from 'fs';
import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { startStaticServer } from './static-server.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.ELECTRON_DEV === '1';
const DEV_URL = process.env.ELECTRON_DEV_URL || 'http://127.0.0.1:5173';

let mainWindow = null;
let staticServer = null;

function getDistDir() {
  if (isDev) return path.join(__dirname, '..', 'dist');
  return path.join(app.getAppPath(), 'dist');
}

function readApiProxyOrigin() {
  const candidates = [
    path.join(__dirname, 'api-origin.txt'),
    path.join(process.resourcesPath, 'electron', 'api-origin.txt'),
  ];
  for (const originFile of candidates) {
    try {
      const origin = fs.readFileSync(originFile, 'utf8').trim();
      if (origin && !origin.includes('your-app')) return origin;
    } catch {
      // try next path
    }
  }
  return null;
}

async function resolveAppUrl() {
  if (isDev) return DEV_URL;

  const distDir = getDistDir();
  staticServer = await startStaticServer(distDir, 0, {
    apiProxyOrigin: readApiProxyOrigin(),
  });
  return staticServer.url;
}

async function createWindow() {
  const appUrl = await resolveAppUrl();

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 600,
    title: 'TubeScribe',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  await mainWindow.loadURL(appUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('before-quit', async () => {
  if (staticServer) {
    await staticServer.close();
    staticServer = null;
  }
});
