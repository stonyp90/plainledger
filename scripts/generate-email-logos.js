#!/usr/bin/env node

/**
 * Generate PNG logos from SVG for email templates
 * 
 * This script converts the SVG logo to PNG formats needed for email templates:
 * - logo.png: Standard logo with green background
 * - logo-white.png: White logo variant for dark backgrounds
 * 
 * Usage: node scripts/generate-email-logos.js
 */

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const svgPath = join(rootDir, 'apps/web/public/logo.svg');
const outputDir = join(rootDir, 'apps/web/public');

async function generateLogos() {
  try {
    const svgBuffer = readFileSync(svgPath);
    
    console.log('Generating logo.png (standard)...');
    await sharp(svgBuffer)
      .resize(96, 96, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(join(outputDir, 'logo.png'));
    
    console.log('Generating logo-white.png (for dark backgrounds)...');
    // Create white version by converting the SVG and making it white
    // For email headers with green backgrounds, we need a white/light logo
    // We'll create a simplified white version
    const whiteSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
        <!-- White version for dark backgrounds -->
        <rect x="32" y="32" width="448" height="448" rx="96" fill="white" opacity="0.95"/>
        <!-- Ledger book spine -->
        <rect x="80" y="96" width="48" height="320" rx="16" fill="rgba(5, 150, 105, 0.3)"/>
        <!-- Ledger pages -->
        <rect x="144" y="96" width="288" height="320" rx="32" fill="white"/>
        <!-- Ledger lines -->
        <line x1="192" y1="160" x2="384" y2="160" stroke="#cbd5e1" stroke-width="24" stroke-linecap="round"/>
        <line x1="192" y1="224" x2="384" y2="224" stroke="#cbd5e1" stroke-width="24" stroke-linecap="round"/>
        <line x1="192" y1="288" x2="320" y2="288" stroke="#cbd5e1" stroke-width="24" stroke-linecap="round"/>
        <!-- Checkmark - White -->
        <path d="M288 320 L336 368 L416 272" stroke="white" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </svg>
    `;
    
    await sharp(Buffer.from(whiteSvg))
      .resize(96, 96, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(join(outputDir, 'logo-white.png'));
    
    console.log('✅ Logo generation complete!');
    console.log(`   - ${join(outputDir, 'logo.png')}`);
    console.log(`   - ${join(outputDir, 'logo-white.png')}`);
  } catch (error) {
    console.error('Error generating logos:', error);
    process.exit(1);
  }
}

generateLogos();
