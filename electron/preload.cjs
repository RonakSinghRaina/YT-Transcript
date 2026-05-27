const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('tubescribeDesktop', {
  platform: 'desktop',
  version: process.env.npm_package_version || '0.0.0',
});
