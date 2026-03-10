const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'images');
const BACKGROUND_PATH = path.join(ASSETS_DIR, 'android-icon-background.png');
const FOREGROUND_PATH = path.join(ASSETS_DIR, 'android-icon-foreground.png');
const OUTPUT_DIR = ASSETS_DIR;

async function combineIcons() {
  try {
    console.log('🎨 Combining Android icon layers...\n');

    // Check if source files exist
    if (!fs.existsSync(BACKGROUND_PATH)) {
      throw new Error(`Background image not found: ${BACKGROUND_PATH}`);
    }
    if (!fs.existsSync(FOREGROUND_PATH)) {
      throw new Error(`Foreground image not found: ${FOREGROUND_PATH}`);
    }

    // Get image dimensions
    const backgroundMeta = await sharp(BACKGROUND_PATH).metadata();
    const foregroundMeta = await sharp(FOREGROUND_PATH).metadata();
    
    console.log(`📐 Background: ${backgroundMeta.width}x${backgroundMeta.height}px`);
    console.log(`📐 Foreground: ${foregroundMeta.width}x${foregroundMeta.height}px\n`);

    // Combine: layer foreground on top of background
    const combined = await sharp(BACKGROUND_PATH)
      .composite([
        {
          input: await sharp(FOREGROUND_PATH).toBuffer(),
          blend: 'over'
        }
      ])
      .png()
      .toBuffer();

    // Save full-size combined icon (remove transparency for consistency)
    const combinedPath = path.join(OUTPUT_DIR, 'icon-combined.png');
    await sharp(combined)
      .flatten({ background: { r: 230, g: 244, b: 254 } }) // Remove transparency
      .png()
      .toFile(combinedPath);
    
    console.log(`✅ Created: icon-combined.png (${backgroundMeta.width}x${backgroundMeta.height}px)`);

    // Create 512x512 version for Google Play Store
    // Google Play requires: exactly 512x512px, PNG, NO transparency
    const combined512Path = path.join(OUTPUT_DIR, 'icon-combined-512.png');
    await sharp(combined)
      .resize(512, 512, {
        fit: 'cover', // Fill entire canvas
        position: 'center'
      })
      .flatten({ background: { r: 230, g: 244, b: 254 } }) // Remove transparency, use #E6F4FE
      .png({ compressionLevel: 9, quality: 100 })
      .toFile(combined512Path);
    
    // Verify dimensions
    const verify512 = await sharp(combined512Path).metadata();
    console.log(`✅ Created: icon-combined-512.png (${verify512.width}x${verify512.height}px) - Google Play Store ready`);
    console.log(`   ✓ No transparency, solid background`);

    // Create 1024x1024 hi-res version for Google Play Store
    const combined1024Path = path.join(OUTPUT_DIR, 'icon-combined-1024.png');
    await sharp(combined)
      .resize(1024, 1024, {
        fit: 'cover', // Fill entire canvas
        position: 'center'
      })
      .flatten({ background: { r: 230, g: 244, b: 254 } }) // Remove transparency, use #E6F4FE
      .png({ compressionLevel: 9, quality: 100 })
      .toFile(combined1024Path);
    
    // Verify dimensions
    const verify1024 = await sharp(combined1024Path).metadata();
    console.log(`✅ Created: icon-combined-1024.png (${verify1024.width}x${verify1024.height}px) - Google Play Store hi-res`);
    console.log(`   ✓ No transparency, solid background\n`);

    console.log('✨ Icon combination complete!');
    console.log('\n📋 Files created:');
    console.log(`   - ${path.relative(process.cwd(), combinedPath)}`);
    console.log(`   - ${path.relative(process.cwd(), combined512Path)}`);
    console.log(`   - ${path.relative(process.cwd(), combined1024Path)}`);
    console.log('\n💡 Tip: Use icon-combined-512.png for Google Play Store listing!');

  } catch (error) {
    console.error('❌ Error combining icons:', error.message);
    process.exit(1);
  }
}

combineIcons();

