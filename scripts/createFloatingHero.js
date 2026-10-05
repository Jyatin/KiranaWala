const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const destDir = path.join(__dirname, '../public/images/auth');
fs.mkdirSync(destDir, { recursive: true });

// Radial alpha mask for tile-2.jpg (1792 x 2400)
// Dissolves the outer linen drape seamlessly into transparent/white
const maskSvg = Buffer.from(`
<svg width="1792" height="2400" viewBox="0 0 1792 2400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="feather" cx="50%" cy="48%" r="48%" fx="50%" fy="48%">
      <stop offset="48%" stop-color="#FFFFFF" stop-opacity="1" />
      <stop offset="72%" stop-color="#FFFFFF" stop-opacity="0.85" />
      <stop offset="88%" stop-color="#FFFFFF" stop-opacity="0.3" />
      <stop offset="98%" stop-color="#FFFFFF" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="1792" height="2400" fill="url(#feather)" />
</svg>
`);

sharp(path.join(__dirname, '../public/images/tiles/tile-2.jpg'))
  .ensureAlpha()
  .composite([{ input: maskSvg, blend: 'dest-in' }])
  .toFile(path.join(destDir, 'hero-floating-transparent.png'))
  .then(() => {
    return sharp({
      create: {
        width: 1792,
        height: 2400,
        channels: 3,
        background: '#FFFFFF'
      }
    })
    .composite([{ input: path.join(destDir, 'hero-floating-transparent.png') }])
    .toFile(path.join(destDir, 'hero-floating-on-white.jpg'));
  })
  .then(() => {
    console.log('Successfully recreated Ultra-HD hero-floating-transparent.png (1792x2400)!');
  })
  .catch(err => console.error('Error:', err));
