#!/usr/bin/env node
// scripts/sync-theme-assets.js — Copy dist/*.js to theme-test/assets/
// Reference: plans/006-shopify-cli-theme-test-plan.md

const fs = require('fs');
const path = require('path');

const distFiles = [
  'dist/cart.js',
  'dist/cart.min.js',
  'dist/rivets-cart.js',
  'dist/rivets-cart.min.js'
];

const destDir = 'theme-test/assets';

if (!fs.existsSync('dist/cart.js')) {
  console.error('ERROR: dist/cart.js not found. Run `npm run build` first.');
  process.exit(1);
}

fs.mkdirSync(destDir, { recursive: true });

for (const src of distFiles) {
  if (!fs.existsSync(src)) {
    console.warn(`WARN: ${src} not found — skip`);
    continue;
  }
  const dest = path.join(destDir, path.basename(src));
  const data = fs.readFileSync(src);
  fs.writeFileSync(dest, data);
  console.log(`Copied ${src} (${data.length} bytes) → ${dest}`);
}

console.log(`Done. Assets synced to ${destDir}/`);
