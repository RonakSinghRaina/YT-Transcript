import { copyFileSync, existsSync } from 'fs';
import { join } from 'path';

const indexPath = join(process.cwd(), 'dist', 'index.html');
const fallbackPath = join(process.cwd(), 'dist', '404.html');

if (!existsSync(indexPath)) {
  console.error('dist/index.html not found. Run vite build first.');
  process.exit(1);
}

copyFileSync(indexPath, fallbackPath);
console.log('Copied dist/index.html → dist/404.html for GitHub Pages');
