import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, drawFn) {
  // Buffer for raw scanlines: each row has 1 filter byte (0) + width * 4 (RGBA)
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawFn(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA (6)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// Icon drawer: High contrast dark background (#0B0F17) with Amber Taxi shield and road icon
function drawIcon(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background rounded rect / circular shield
  const cornerR = w * 0.22;
  const inBox = Math.abs(dx) <= (w / 2 - cornerR) || Math.abs(dy) <= (h / 2 - cornerR) ||
    Math.hypot(Math.abs(dx) - (w / 2 - cornerR), Math.abs(dy) - (h / 2 - cornerR)) <= cornerR;

  if (!inBox) {
    return [0, 0, 0, 0]; // Transparent outside
  }

  // Border ring: vibrant taxi amber #F59E0B
  const borderThickness = w * 0.035;
  const edgeDist = Math.min(w / 2 - Math.abs(dx), h / 2 - Math.abs(dy));
  const isBorder = edgeDist < borderThickness;

  // Background color: deep asphalt #0B0F17
  let bg = [11, 15, 23, 255];
  if (isBorder) {
    return [245, 158, 11, 255]; // Amber border
  }

  // Draw Taxi / Car emblem inside
  // Central road strip (vertical perspective)
  const relY = (y - h * 0.25) / (h * 0.5); // 0 to 1
  if (relY >= 0 && relY <= 1) {
    const roadTopHalfW = w * 0.08;
    const roadBottomHalfW = w * 0.26;
    const currentHalfW = roadTopHalfW + (roadBottomHalfW - roadTopHalfW) * relY;
    
    if (Math.abs(dx) <= currentHalfW) {
      // Road surface #1F2937
      // Center dashed yellow lane
      if (Math.abs(dx) <= w * 0.02) {
        const dash = Math.sin(relY * 20);
        if (dash > 0.1) {
          return [250, 204, 21, 255]; // Taxi yellow lane #FACC15
        }
      }
      return [31, 41, 55, 255];
    }
  }

  // Taxi roof sign / vehicle symbol at top (y between h*0.22 and h*0.35)
  if (Math.abs(dx) <= w * 0.2 && y >= h * 0.2 && y <= h * 0.32) {
    // Taxi roof light in bright yellow/amber
    return [245, 158, 11, 255];
  }

  // Text / Accent indicator "TAXI VE" badge at bottom
  if (Math.abs(dx) <= w * 0.3 && y >= h * 0.78 && y <= h * 0.88) {
    return [245, 158, 11, 255];
  }

  return bg;
}

const iconsDir = path.join(process.cwd(), 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

fs.writeFileSync(path.join(iconsDir, 'icon-192x192.png'), createPNG(192, 192, drawIcon));
fs.writeFileSync(path.join(iconsDir, 'icon-512x512.png'), createPNG(512, 512, drawIcon));
fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.png'), createPNG(180, 180, drawIcon));
fs.writeFileSync(path.join(iconsDir, 'favicon-32x32.png'), createPNG(32, 32, drawIcon));

console.log('Successfully generated PWA PNG icons!');
