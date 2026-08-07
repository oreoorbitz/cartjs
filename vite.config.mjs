import fs from 'fs';
import path from 'path';
import { transform } from 'esbuild';

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
  console.log('Built dist/cart.js (' + wrapped.length + ' bytes)');
}

function buildRivetsCart() {
  const tinybind = fs.readFileSync(tinybindPath, 'utf8');
  const cart = fs.readFileSync('dist/cart.js', 'utf8');
  // Rivets-cart keeps banner once, then tinybind + cart without duplicate banner
  // Remove banner from cart if present to avoid duplicate, then re-add once
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
    // Tell Vite to watch these files for --watch
    for (const f of srcOrder) {
      this.addWatchFile(path.resolve(f));
    }
    this.addWatchFile(path.resolve(tinybindPath));
    this.addWatchFile(path.resolve('package.json'));
  },
  async closeBundle() {
    // This runs after Vite's own bundle (which we keep empty)
    // Do our concat builds here so they run on every vite build
    buildCart();
    buildRivetsCart();
    await minify('dist/cart.js', 'dist/cart.min.js');
    await minify('dist/rivets-cart.js', 'dist/rivets-cart.min.js');
    // Clean up Vite dummy chunk
    try { fs.unlinkSync('dist/dummy.js'); } catch {}
    try { fs.unlinkSync('dist/dummy.js.map'); } catch {}
  }
};

export default {
  // We keep Vite's own build minimal — our plugin does the real work via closeBundle
  // No dummy lib entry needed — we use a virtual input to avoid empty chunk
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    // Use a tiny virtual entry to satisfy Vite without emitting a dummy file
    rollupOptions: {
      input: 'src/cart.js',
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
