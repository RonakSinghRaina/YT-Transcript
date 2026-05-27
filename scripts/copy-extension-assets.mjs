import fs from 'fs';
import path from 'path';

const root = process.cwd();
const out = path.join(root, 'dist-extension');

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

if (!fs.existsSync(out)) {
  console.error('dist-extension not found. Run vite build --mode extension first.');
  process.exit(1);
}

copyFile(path.join(root, 'extension/manifest.json'), path.join(out, 'manifest.json'));
copyFile(
  path.join(root, 'extension/injected/fetch-captions.js'),
  path.join(out, 'injected/fetch-captions.js'),
);
copyFile(
  path.join(root, 'extension/content/youtube-bridge.js'),
  path.join(out, 'content/youtube-bridge.js'),
);

console.log('Copied manifest, injected script, and content script to dist-extension/');
