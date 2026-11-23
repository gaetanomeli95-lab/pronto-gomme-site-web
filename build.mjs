// Crea index.html (un solo file, tutto incluso) partendo da src/ e assets/.
// Uso: npm install && npm run build
import { build } from 'esbuild';
import fs from 'fs';

const b64 = (file, mime) => `data:${mime};base64,` + fs.readFileSync(file).toString('base64');

const r = await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', target: 'es2022', write: false, legalComments: 'none' });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

let html = fs.readFileSync('src/index.src.html', 'utf8')
  .replace('%%PHOTO%%', b64('assets/vetrina-sera.jpg', 'image/jpeg'))
  .replace('%%FONT%%', b64('assets/fonts/archivo-wdth.woff2', 'font/woff2'))
  .replaceAll('%%LOGONAV%%', b64('assets/logo-nav.webp', 'image/webp'))
  .replace(/%%RIM(\d)%%/g, (m, i) => b64(`assets/rims/r${i}.webp`, 'image/webp'))
  .replace('%%LOGOFULL%%', b64('assets/logo-full.webp', 'image/webp'));
html = html.split('%%SCRIPT%%').join(js);

fs.writeFileSync('index.html', html);
console.log('index.html pronto:', (html.length / 1024).toFixed(0) + ' KB');
