# Email Logo Generation

Email templates require PNG versions of the logo (SVG is not reliably supported in email clients).

## Required Files

- `apps/web/public/logo.png` - Standard logo (96x96px recommended)
- `apps/web/public/logo-white.png` - White logo for dark backgrounds (96x96px recommended)

## Generation Methods

### Option 1: Using Sharp (Recommended)

1. Install sharp: `npm install --save-dev sharp`
2. Run: `node scripts/generate-email-logos.js`

### Option 2: Manual Conversion

1. Open `apps/web/public/logo.svg` in a vector graphics editor (Inkscape, Illustrator, etc.)
2. Export as PNG at 96x96px:
   - `logo.png` - Use original colors
   - `logo-white.png` - Convert to white/light version for dark backgrounds

### Option 3: Online Tool

Use an online SVG to PNG converter:
- https://convertio.co/svg-png/
- https://cloudconvert.com/svg-to-png

Set size to 96x96px for both files.

## Logo Specifications

- **Size**: 96x96px (or 48x48px for smaller headers)
- **Format**: PNG with transparency
- **logo-white.png**: Should be visible on dark green backgrounds (#059669)
