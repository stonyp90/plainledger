# PWA Icons

This directory contains PNG icons for PWA installation.

## Required Icons

- `icon-192.png` - 192x192px icon
- `icon-512.png` - 512x512px icon  
- `icon-512-maskable.png` - 512x512px maskable icon (with safe padding)

## Generating Icons

You can generate these icons from the existing `logo.svg` using:

1. **Online tools**: Use tools like https://realfavicongenerator.net/ or https://www.pwabuilder.com/imageGenerator
2. **ImageMagick**: `convert logo.svg -resize 192x192 icon-192.png`
3. **Design tools**: Export from Figma/Sketch at the required sizes

## Maskable Icon

The maskable icon should have a safe zone (padding) around the edges. The icon content should be within 80% of the canvas size to ensure proper display on Android devices with adaptive icons.
