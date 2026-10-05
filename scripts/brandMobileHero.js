const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const destDir = path.join(__dirname, '../public/images/auth');
fs.mkdirSync(destDir, { recursive: true });

// Measure exact position of FreshMart
// In tile-2.jpg (896x1200):
const headerOverlay = Buffer.from(`
<svg width="896" height="1200" viewBox="0 0 896 1200" xmlns="http://www.w3.org/2000/svg">
  <rect x="445" y="248" width="185" height="38" fill="#FFFFFF" />
  <text x="537" y="275" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="800" fill="#046234" letter-spacing="-0.5">KiranaWala</text>
</svg>
`);

sharp(path.join(__dirname, '../public/images/tiles/tile-2.jpg'))
  .composite([{ input: headerOverlay, top: 0, left: 0 }])
  .toFile(path.join(destDir, 'kiranawala-mobile-hero.jpg'))
  .then(() => {
    console.log('Successfully created kiranawala-mobile-hero.jpg');
  })
  .catch(err => {
    console.error('Error:', err);
  });
