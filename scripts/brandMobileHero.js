const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sourceImage = path.join(
  __dirname,
  '../public/images/tiles/tile-2.jpg'
);

const destDir = path.join(
  __dirname,
  '../public/images/auth'
);

const outputImage = path.join(
  destDir,
  'kiranawala-mobile-hero.jpg'
);

const IMAGE_WIDTH = 896;
const IMAGE_HEIGHT = 1200;

const headerOverlay = Buffer.from(`
<svg
  width="${IMAGE_WIDTH}"
  height="${IMAGE_HEIGHT}"
  viewBox="0 0 ${IMAGE_WIDTH} ${IMAGE_HEIGHT}"
  xmlns="http://www.w3.org/2000/svg"
>
  <rect
    x="445"
    y="248"
    width="185"
    height="38"
    fill="#FFFFFF"
  />

  <text
    x="537"
    y="275"
    text-anchor="middle"
    font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    font-size="22"
    font-weight="800"
    fill="#046234"
    letter-spacing="-0.5"
  >
    KiranaWala
  </text>
</svg>
`);

async function createMobileHero() {
  try {
    if (!fs.existsSync(sourceImage)) {
      throw new Error(`Source image not found: ${sourceImage}`);
    }

    fs.mkdirSync(destDir, { recursive: true });

    await sharp(sourceImage)
      .composite([
        {
          input: headerOverlay,
          top: 0,
          left: 0
        }
      ])
      .jpeg({
        quality: 90
      })
      .toFile(outputImage);

    console.log(
      `Successfully created ${path.basename(outputImage)}`
    );
  } catch (error) {
    console.error(
      'Failed to create mobile hero image:',
      error.message
    );

    process.exitCode = 1;
  }
}

createMobileHero();
