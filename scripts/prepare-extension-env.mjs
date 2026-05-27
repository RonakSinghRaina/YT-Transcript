import fs from 'fs';
import path from 'path';

const examplePath = path.join(process.cwd(), '.env.extension.example');
const targetPath = path.join(process.cwd(), '.env.extension');

if (!fs.existsSync(targetPath) && fs.existsSync(examplePath)) {
  fs.copyFileSync(examplePath, targetPath);
  console.log('Created .env.extension from .env.extension.example');
}
