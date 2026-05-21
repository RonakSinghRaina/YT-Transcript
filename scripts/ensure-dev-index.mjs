import { copyFileSync, existsSync, readFileSync } from 'fs';

const indexPath = 'index.html';
const devPath = 'index.dev.html';

if (!existsSync(devPath)) {
  console.error('index.dev.html is missing.');
  process.exit(1);
}

const indexHtml = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : '';

if (!indexHtml.includes('/src/main.jsx')) {
  copyFileSync(devPath, indexPath);
  console.log('Restored dev index.html from index.dev.html');
}
