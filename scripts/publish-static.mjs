import { copyFileSync, cpSync, existsSync, rmSync } from 'fs';

const distDir = 'dist';

if (!existsSync(`${distDir}/index.html`)) {
  console.error('dist/ not found. Run npm run build:pages first.');
  process.exit(1);
}

rmSync('docs', { recursive: true, force: true });
cpSync(distDir, 'docs', { recursive: true });

copyFileSync(`${distDir}/index.html`, 'index.html');
copyFileSync(`${distDir}/404.html`, '404.html');

if (existsSync(`${distDir}/.nojekyll`)) {
  copyFileSync(`${distDir}/.nojekyll`, '.nojekyll');
}

rmSync('assets', { recursive: true, force: true });
cpSync(`${distDir}/assets`, 'assets', { recursive: true });

console.log('Published dist → docs/, index.html, assets/, 404.html');
