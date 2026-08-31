import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let c = 0xffffffff;
    for (let n = 0; n < buf.length; n++) {
      c = crcTable[(c ^ buf[n]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff);
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.concat([typeBuf, data]);
    const crc = crc32(crcBuf);
    const crcVal = Buffer.alloc(4);
    crcVal.writeUInt32BE(crc >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crcVal]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8 bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = chunk('IHDR', ihdr);

  // Raw image data with scanlines
  const rowSize = width * 4 + 1;
  const raw = Buffer.alloc(rowSize * height);

  const cx = width / 2;
  const cy = height / 2;
  const outerR = width * 0.40;
  const innerR = width * 0.30;
  const hubR = width * 0.12;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // filter byte: none

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default background gradient (dark emerald)
      const gradRatio = (x + y) / (width + height);
      let pr = Math.round(2 + gradRatio * 4);
      let pg = Math.round(20 + gradRatio * 30);
      let pb = Math.round(18 + gradRatio * 15);

      // Steering wheel ring
      if (dist >= innerR && dist <= outerR) {
        pr = 52; pg = 211; pb = 153;
      }
      // Inner Hub
      else if (dist <= hubR) {
        if (dist <= hubR * 0.4) {
          pr = 52; pg = 211; pb = 153;
        } else {
          pr = 15; pg = 23; pb = 42;
        }
      }
      // Spokes (horizontal and down)
      else if (dist < outerR) {
        if (Math.abs(dy) <= width * 0.035 && dx < outerR && dx > -outerR) {
          pr = 16; pg = 185; pb = 129;
        } else if (Math.abs(dx) <= width * 0.035 && dy > 0 && dy < outerR) {
          pr = 16; pg = 185; pb = 129;
        }
      }

      raw[pxOffset] = pr;
      raw[pxOffset + 1] = pg;
      raw[pxOffset + 2] = pb;
      raw[pxOffset + 3] = 255;
    }
  }

  const compressed = zlib.deflateSync(raw);
  const idatChunk = chunk('IDAT', compressed);
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.resolve('public', 'icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(path.join(outDir, 'icon-192.png'), createPNG(192, 192));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), createPNG(512, 512));
fs.writeFileSync(path.join(outDir, 'icon-maskable-512.png'), createPNG(512, 512));
console.log('PNG Icons created successfully in /public/icons');
