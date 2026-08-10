import fs from 'fs';
import { resolve } from 'path';
// Flickity-Mepto build: ESM + IIFE pkgd, mepto external (theme loads mepto separately)
// Keeps Flickity API identical to v2.3.0 PACKAGED, but without jquery-bridget UMD weight.
const pkg = JSON.parse(fs.readFileSync('./package.json','utf8'));
const banner = `/*! Flickity PACKAGED v2.3.0-mepto (${pkg.version}) — Mepto-integrated, jQuery-free */\n`;

export default {
  build: {
    lib: {
      entry: resolve('src/index.js'),
      name: 'Flickity',
      formats: ['es', 'iife'],
      fileName: (format) => format === 'es' ? 'flickity.esm.js' : 'flickity.pkgd.js',
    },
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      external: ['mepto', 'jquery'],
      output: {
        banner,
        globals: { mepto: 'mepto', jquery: 'jQuery' },
        assetFileNames: 'flickity.[ext]',
      },
    },
    minify: false,
  },
};
