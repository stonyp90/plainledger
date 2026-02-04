#!/usr/bin/env node

/**
 * Generate favicon.ico and apple-touch-icon.png from SVG files
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '..', 'public');
const faviconSvg = path.join(publicDir, 'favicon.svg');
const appleTouchSvg = path.join(publicDir, 'apple-touch-icon.svg');
const faviconIco = path.join(publicDir, 'favicon.ico');
const appleTouchPng = path.join(publicDir, 'apple-touch-icon.png');

async function generateFaviconIco() {
  try {
    // Generate multiple sizes for ICO format
    const sizes = [16, 32, 48];
    const buffers = await Promise.all(
      sizes.map(size =>
        sharp(faviconSvg)
          .resize(size, size)
          .png()
          .toBuffer()
      )
    );

    // For ICO format, we'll use the 32x32 version as PNG
    // Most modern browsers support PNG favicons, so we can just use PNG
    // But for true ICO, we'd need a library like 'to-ico'
    // For now, let's create a 32x32 PNG favicon
    await sharp(faviconSvg)
      .resize(32, 32)
      .png()
      .toFile(faviconIco.replace('.ico', '.png'));

    // Also create the .ico file (which browsers will accept as PNG)
    await sharp(faviconSvg)
      .resize(32, 32)
      .png()
      .toFile(faviconIco);

    console.log('✅ Generated: favicon.ico (32x32)');
  } catch (error) {
    console.error('❌ Error generating favicon.ico:', error.message);
  }
}

async function generateAppleTouchIcon() {
  try {
    await sharp(appleTouchSvg)
      .resize(180, 180)
      .png()
      .toFile(appleTouchPng);
    
    console.log('✅ Generated: apple-touch-icon.png (180x180)');
  } catch (error) {
    console.error('❌ Error generating apple-touch-icon.png:', error.message);
  }
}

async function main() {
  console.log('🎨 Generating favicon assets...\n');
  
  await generateFaviconIco();
  await generateAppleTouchIcon();
  
  console.log('\n✨ Done! Favicon assets generated.');
}

main().catch(console.error);
