const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '../../shared');
const dest = path.resolve(__dirname, '../shared');

if (fs.existsSync(src) && !fs.existsSync(dest)) {
  fs.cpSync(src, dest, { recursive: true });
  console.log('Copied shared/ to backend/shared/');
}
