import sharp from "sharp";
const teal = "#0f766e";
const svg = (size, pad) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
<rect width="512" height="512" fill="${teal}"/>
<g transform="translate(256 256) scale(${pad}) translate(-256 -256)">
<text x="256" y="350" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="300" text-anchor="middle" fill="#fefdfb">R</text>
<rect x="96" y="388" width="320" height="18" rx="9" fill="#2dd4bf"/>
</g></svg>`;
for (const [name, size, pad] of [["icon-192.png",192,1],["icon-512.png",512,1],["icon-maskable-512.png",512,0.78],["apple-touch-icon.png",180,0.9]]) {
  await sharp(Buffer.from(svg(size, pad))).png().toFile(`public/${name}`);
}
