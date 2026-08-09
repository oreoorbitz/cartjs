import fs from 'fs';
import path from 'path';
import { transform } from 'esbuild';

// CartJS build — IIFE concat, mepto external (not bundled)
// Theme loads mepto OR jQuery separately via <script> tag
// mepto-adapter.js (first in srcOrder) aliases window.mepto === window.jQuery === window.$
// so dist/cart.js works with either. See src/mepto-adapter.js.
// Dev uses global `mepto` (no import) for drop-in parity; future ESM entry will
// use `import mepto from 'meptos'` with rollup external (see lib stub below).

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const banner = `// Cart.js\n// version: ${pkg.version}\n// author: ${pkg.author}\n// license: ${pkg.licenses[0].type}\n`;

const srcOrder = [
  'src/mepto-adapter.js',
  'src/cart.js',
  'src/item.js',
  'src/cartjs.js',
  'src/utils.js',
  'src/queue.js',
  'src/core.js',
  'src/data.js',
  'src/rivets.js',
  'src/export.js'
];

const tinybindPath = 'node_modules/tinybind/dist/tinybind.js';

function buildCart() {
  const parts = srcOrder.map(f => fs.readFileSync(f, 'utf8'));
  const joined = parts.join(';\n');
  const wrapped = banner + '(function() {\n' + joined + '\n}).call(typeof window !== "undefined" ? window : this);';
  fs.mkdirSync('dist', { recursive: true });
  fs.writeFileSync('dist/cart.js', wrapped);
  console.log('Built dist/cart.js (' + wrapped.length + ' bytes) — mepto external, graceful fallback to jQuery');
}

function buildRivetsCart() {
  const tinybind = fs.readFileSync(tinybindPath, 'utf8');
  const cart = fs.readFileSync('dist/cart.js', 'utf8');
  let cartWithoutBanner = cart;
  if (cart.startsWith(banner)) {
    cartWithoutBanner = cart.slice(banner.length);
  }
  const out = banner + tinybind + '\n' + cartWithoutBanner;
  fs.writeFileSync('dist/rivets-cart.js', out);
  console.log('Built dist/rivets-cart.js (' + out.length + ' bytes)');
}

async function minify(inputPath, outputPath) {
  const code = fs.readFileSync(inputPath, 'utf8');
  const result = await transform(code, {
    minify: true,
    banner: banner.trim(),
    sourcemap: false,
    target: 'es2018'
  });
  fs.writeFileSync(outputPath, result.code);
  console.log(`Minified ${inputPath} → ${outputPath} (${result.code.length} bytes)`);
}

const cartjsPlugin = {
  name: 'cartjs-concat',
  async buildStart() {
    for (const f of srcOrder) {
      this.addWatchFile(path.resolve(f));
    }
    this.addWatchFile(path.resolve(tinybindPath));
    this.addWatchFile(path.resolve('package.json'));
  },
  async closeBundle() {
    buildCart();
    buildRivetsCart();
    await minify('dist/cart.js', 'dist/cart.min.js');
    await minify('dist/rivets-cart.js', 'dist/rivets-cart.min.js');
    try { fs.unlinkSync('dist/dummy.js'); } catch {}
    try { fs.unlinkSync('dist/dummy.js.map'); } catch {}
  }
};

export default {
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: 'src/cart.js',
      external: ['meptos', 'tinybind', 'jquery'], // never bundle — theme provides via <script>
      output: {
        entryFileNames: 'dummy.js',
        chunkFileNames: 'dummy-[name].js',
        assetFileNames: 'dummy-[name].[ext]'
      }
    },
    minify: false,
    write: true
  },
  plugins: [cartjsPlugin]
};

// Future ESM dev entry (not active yet):
// When src/* migrate to `import mepto from 'meptos'`, replace above rollupOptions with:
//   lib: { entry: 'src/export.js', name: 'CartJS', formats: ['iife','es','cjs'], fileName: f => f==='iife'?'cart.js':`cart.${f}.js` }
//   external: ['meptos','tinybind']
//   output: { banner, globals: { meptos: 'mepto', tinybind: 'tinybind' } }
// and keep `dist/cart.js` IIFE name frozen for CDN.
