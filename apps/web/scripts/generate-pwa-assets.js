#!/usr/bin/env node

/**
 * Generate PWA assets (icons and splash screens) from SVG logo
 * 
 * Requirements:
 * - sharp: npm install -D sharp
 * - SVG logo at apps/web/public/logo.svg
 * 
 * Usage: node scripts/generate-pwa-assets.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if sharp is available
let sharp;
try {
  sharp = (await import('sharp')).default;
} catch (e) {
  console.error('❌ Error: sharp is not installed.');
  console.log('📦 Install it with: npm install -D sharp');
  process.exit(1);
}

const publicDir = path.join(__dirname, '..', 'public');
const logoPath = path.join(publicDir, 'logo.svg');
const iconsDir = path.join(publicDir, 'icons');
const splashDir = path.join(publicDir, 'splash');

// Ensure directories exist
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}
if (!fs.existsSync(splashDir)) {
  fs.mkdirSync(splashDir, { recursive: true });
}

// Check if logo exists
if (!fs.existsSync(logoPath)) {
  console.error(`❌ Logo not found at: ${logoPath}`);
  process.exit(1);
}

// Icon sizes to generate
const iconSizes = [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 512, name: 'icon-512-maskable.png', maskable: true },
];

// Splash screen sizes (device-specific)
const splashSizes = [
  // iPhone sizes
  { width: 1290, height: 2796, name: 'apple-splash-1290-2796.png', device: 'iPhone 14 Pro Max / 15 Pro Max' },
  { width: 1179, height: 2556, name: 'apple-splash-1179-2556.png', device: 'iPhone 14 Pro / 15 Pro' },
  { width: 1170, height: 2532, name: 'apple-splash-1170-2532.png', device: 'iPhone 14 / 15 / 13 Pro / 12 Pro' },
  { width: 1284, height: 2778, name: 'apple-splash-1284-2778.png', device: 'iPhone 13 Pro Max / 12 Pro Max' },
  // iPad sizes
  { width: 2048, height: 2732, name: 'apple-splash-2048-2732.png', device: 'iPad Pro 12.9"' },
  { width: 1668, height: 2388, name: 'apple-splash-1668-2388.png', device: 'iPad Pro 11"' },
  { width: 1640, height: 2360, name: 'apple-splash-1640-2360.png', device: 'iPad Air / Mini' },
];

async function generateIcon(size, name, maskable = false) {
  const outputPath = path.join(iconsDir, name);
  
  try {
    let image = sharp(logoPath).resize(size, size, {
      fit: maskable ? 'contain' : 'cover',
      background: { r: 15, g: 23, b: 42, alpha: 1 }, // Dark background (#0f172a)
    });

    if (maskable) {
      // For maskable icons, add padding (icon should be within 80% of canvas)
      const padding = Math.round(size * 0.1); // 10% padding on each side
      const iconSize = size - (padding * 2);
      
      image = sharp({
        create: {
          width: size,
          height: size,
          channels: 4,
          background: { r: 15, g: 23, b: 42, alpha: 1 },
        },
      })
        .composite([
          {
            input: await sharp(logoPath)
              .resize(iconSize, iconSize, { fit: 'contain' })
              .toBuffer(),
            left: padding,
            top: padding,
          },
        ]);
    }

    await image.png().toFile(outputPath);
    console.log(`✅ Generated: ${name} (${size}x${size})`);
  } catch (error) {
    console.error(`❌ Error generating ${name}:`, error.message);
  }
}

async function generateSplashScreen({ width, height, name, device }) {
  const outputPath = path.join(splashDir, name);
  
  try {
    // Create splash screen with logo centered
    const logoSize = Math.min(width, height) * 0.3; // Logo is 30% of smaller dimension
    
    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 15, g: 23, b: 42, alpha: 1 }, // Dark background (#0f172a)
      },
    })
      .composite([
        {
          input: await sharp(logoPath)
            .resize(Math.round(logoSize), Math.round(logoSize), { fit: 'contain' })
            .toBuffer(),
          left: Math.round((width - logoSize) / 2),
          top: Math.round((height - logoSize) / 2),
        },
      ])
      .png()
      .toFile(outputPath);
    
    console.log(`✅ Generated: ${name} (${width}x${height}) - ${device}`);
  } catch (error) {
    console.error(`❌ Error generating ${name}:`, error.message);
  }
}

async function main() {
  console.log('🎨 Generating PWA assets from logo.svg...\n');
  
  // Generate icons
  console.log('📱 Generating icons...');
  for (const icon of iconSizes) {
    await generateIcon(icon.size, icon.name, icon.maskable);
  }
  
  console.log('\n📱 Generating splash screens...');
  for (const splash of splashSizes) {
    await generateSplashScreen(splash);
  }
  
  console.log('\n✨ Done! All PWA assets have been generated.');
  console.log(`📁 Icons: ${iconsDir}`);
  console.log(`📁 Splash screens: ${splashDir}`);
}

main().catch(console.error);
