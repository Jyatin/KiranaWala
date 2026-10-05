const sharp = require('sharp');
const path = require('path');

const customerOverlaySvg = Buffer.from(`
<svg width="594" height="602" viewBox="0 0 594 602" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="screenBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#F6F2EA" />
      <stop offset="55%" stop-color="#F2EBE0" />
      <stop offset="78%" stop-color="#738996" />
      <stop offset="100%" stop-color="#556C78" />
    </linearGradient>
  </defs>

  <!-- Complete screen cover matching the phone screen shape -->
  <g transform="rotate(-2.4, 290, 270)">
    <!-- Seamless background cover -->
    <rect x="172" y="132" width="224" height="305" rx="6" fill="url(#screenBg)" />

    <!-- Welcome, Kirana Shopper. -->
    <text x="186" y="174" font-family="Georgia, 'Playfair Display', serif" font-size="21" font-weight="bold" fill="#8B3A1C">Welcome,</text>
    <text x="186" y="198" font-family="Georgia, 'Playfair Display', serif" font-size="21" font-weight="bold" fill="#8B3A1C">Kirana Shopper.</text>

    <!-- Card 1: Local Stores -->
    <rect x="186" y="218" width="94" height="74" rx="14" fill="#FFFFFF" fill-opacity="0.9" />
    <rect x="198" y="228" width="26" height="26" rx="8" fill="#1E3A5F" />
    <text x="204" y="246" font-size="14">🏪</text>
    <text x="198" y="268" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="bold" fill="#1F2937">Local Stores</text>
    <text x="198" y="280" font-family="system-ui, -apple-system, sans-serif" font-size="8.5" font-weight="500" fill="#6B7280">18 Nearby</text>

    <!-- Card 2: Smart Basket -->
    <rect x="290" y="218" width="94" height="74" rx="14" fill="#FFFFFF" fill-opacity="0.9" />
    <rect x="302" y="228" width="26" height="26" rx="8" fill="#FCE7F3" />
    <text x="308" y="246" font-size="14">🧺</text>
    <text x="302" y="268" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="bold" fill="#1F2937">Smart Basket</text>
    <text x="302" y="280" font-family="system-ui, -apple-system, sans-serif" font-size="8.5" font-weight="bold" fill="#047857">₹1,240 · 6 items</text>

    <!-- Card 3: Live Delivery Status -->
    <rect x="186" y="304" width="198" height="66" rx="14" fill="#FFFFFF" fill-opacity="0.9" />
    <rect x="198" y="316" width="26" height="26" rx="8" fill="#FEF3C7" />
    <text x="204" y="334" font-size="14">⚡</text>
    <text x="234" y="330" font-family="system-ui, -apple-system, sans-serif" font-size="9.5" font-weight="bold" fill="#1F2937">Gupta Kirana &amp; Gen Store</text>
    <text x="234" y="343" font-family="system-ui, -apple-system, sans-serif" font-size="8.5" font-weight="bold" fill="#047857">Delivering in 12 mins · Live</text>

    <!-- Brand signature on phone -->
    <text x="285" y="405" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600" fill="#FFFFFF" fill-opacity="0.92">KiranaWala</text>
  </g>
</svg>
`);

sharp(path.join(__dirname, '../public/images/phone-visual-crop2.jpg'))
  .composite([{ input: customerOverlaySvg, top: 0, left: 0 }])
  .toFile(path.join(__dirname, '../public/images/auth-customer-scene.jpg'))
  .then(() => console.log('Generated perfect customer scene!'));
