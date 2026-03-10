#!/usr/bin/env node
/**
 * Resize screenshots to App Store size 1242 × 2688 (iPhone 6.5" display).
 * Reads from screenshots/, writes to screenshots/app-store-1242x2688/
 * Usage: node scripts/resize-screenshots.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const WIDTH = 1242;
const HEIGHT = 2688;
const INPUT_DIR = path.join(__dirname, '..', 'screenshots');
const OUTPUT_DIR = path.join(__dirname, '..', 'screenshots', 'app-store-1242x2688');

if (!fs.existsSync(INPUT_DIR)) {
  console.error('No screenshots/ folder found.');
  process.exit(1);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const files = fs.readdirSync(INPUT_DIR).filter((f) => /\.(png|jpg|jpeg)$/i.test(f));
if (files.length === 0) {
  console.error('No image files in screenshots/');
  process.exit(1);
}

(async () => {
  for (const file of files) {
    const inputPath = path.join(INPUT_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, path.basename(file, path.extname(file)) + '.png');
    try {
      await sharp(inputPath)
        .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'center' })
        .png()
        .toFile(outputPath);
      console.log('✓', file, '→', path.relative(path.join(__dirname, '..'), outputPath));
    } catch (err) {
      console.error('✗', file, err.message);
    }
  }
  console.log('\nDone. Use the images in screenshots/app-store-1242x2688/ for App Store.');
})();
