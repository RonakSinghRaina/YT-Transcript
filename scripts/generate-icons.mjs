import fs from 'fs';
import path from 'path';
import pngToIco from 'png-to-ico';

const root = process.cwd();
const srcPng = path.join(root, 'public', 'brand', 'tubescribe-icon.png');
const outDir = path.join(root, 'build');
const outIco = path.join(outDir, 'icon.ico');

if (!fs.existsSync(srcPng)) {
  console.error(`Missing source icon: ${srcPng}`);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const buf = await pngToIco(srcPng);
fs.writeFileSync(outIco, buf);
console.log(`Wrote ${outIco}`);

