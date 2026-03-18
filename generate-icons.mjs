import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';

function createSimplePNG(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function uint32BE(n) {
    const b = Buffer.alloc(4);
    b.writeUInt32BE(n, 0);
    return b;
  }

  function crc32(data) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let j = 0; j < 8; j++) {
        if (crc & 1) crc = (crc >>> 1) ^ 0xEDB88320;
        else crc >>>= 1;
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const len = uint32BE(data.length);
    const crcData = Buffer.concat([typeBytes, data]);
    const crcVal = uint32BE(crc32(crcData));
    return Buffer.concat([len, typeBytes, data, crcVal]);
  }

  const ihdrData = Buffer.concat([
    uint32BE(size), uint32BE(size),
    Buffer.from([8, 2, 0, 0, 0])
  ]);
  const ihdr = chunk('IHDR', ihdrData);

  const rowSize = size * 3;
  const rawData = Buffer.alloc((rowSize + 1) * size);

  for (let y = 0; y < size; y++) {
    const offset = y * (rowSize + 1);
    rawData[offset] = 0;
    const yf = y / size;

    for (let x = 0; x < size; x++) {
      const px = offset + 1 + x * 3;
      const xf = x / size;

      // Background: dark green
      let r = 45, g = 90, b = 39;

      // Center keep
      if (xf > 0.3 && xf < 0.7 && yf > 0.25 && yf < 0.85) {
        r = 139; g = 69; b = 19; // brown
      }
      // Towers
      if ((xf > 0.1 && xf < 0.3 || xf > 0.7 && xf < 0.9) && yf > 0.35 && yf < 0.85) {
        r = 120; g = 55; b = 15;
      }
      // Roof/battlements
      if (xf > 0.3 && xf < 0.7 && yf > 0.15 && yf < 0.28) {
        const bx = Math.floor(xf * 8);
        r = bx % 2 === 0 ? 160 : 100;
        g = bx % 2 === 0 ? 80 : 50;
        b = bx % 2 === 0 ? 25 : 15;
      }
      // Door
      if (xf > 0.42 && xf < 0.58 && yf > 0.6 && yf < 0.85) {
        r = 30; g = 20; b = 10;
      }
      // Windows
      if ((xf > 0.33 && xf < 0.42 || xf > 0.58 && xf < 0.67) && yf > 0.35 && yf < 0.5) {
        r = 135; g = 206; b = 235; // sky blue
      }

      rawData[px] = r;
      rawData[px + 1] = g;
      rawData[px + 2] = b;
    }
  }

  const compressed = deflateSync(rawData);
  const idat = chunk('IDAT', compressed);
  const iend = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

const icon192 = createSimplePNG(192);
writeFileSync('./public/icons/icon-192.png', icon192);

const icon512 = createSimplePNG(512);
writeFileSync('./public/icons/icon-512.png', icon512);

console.log('Icons generated successfully!');
