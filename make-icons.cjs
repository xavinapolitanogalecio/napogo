// Creates minimal valid PNG icons without external dependencies
const fs = require('fs');
const zlib = require('zlib');

function createPNG(size, bgColor, fgColor) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const t = Buffer.from(type);
    const crcBuf = Buffer.concat([t, data]);
    const crc = crc32(crcBuf);
    const crcOut = Buffer.alloc(4); crcOut.writeUInt32BE(crc >>> 0);
    return Buffer.concat([len, t, data, crcOut]);
  }

  function crc32(buf) {
    const table = crc32.table || (crc32.table = (() => {
      const t = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = (c & 1) ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        t[i] = c;
      }
      return t;
    })());
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB

  // Build raw pixel data
  const [br, bg, bb] = bgColor;
  const [fr, fg, fb] = fgColor;
  const pad = Math.floor(size * 0.2);
  const cx = Math.floor(size / 2);
  const cy = Math.floor(size / 2);
  const boxW = size - pad * 2;
  const boxH = Math.floor(size * 0.45);
  const boxY = Math.floor(size * 0.27);

  const rawRows = [];
  for (let y = 0; y < size; y++) {
    const row = [0]; // filter byte
    for (let x = 0; x < size; x++) {
      // Circle shape for icon
      const dx = x - cx, dy = y - cy;
      const r = Math.sqrt(dx*dx + dy*dy);
      const inCircle = r <= size * 0.45;

      if (!inCircle) {
        row.push(br, bg, bb);
        continue;
      }

      // Draw box inside circle
      const inBox = x >= pad && x < pad + boxW && y >= boxY && y < boxY + boxH;
      const onLid = inBox && y < boxY + Math.floor(size * 0.1);
      const onStripe = Math.abs(x - cx) < size * 0.03 && y >= boxY && y < boxY + boxH;

      if (inBox) {
        if (onStripe) row.push(Math.floor(br * 0.7), Math.floor(bg * 0.7), Math.floor(bb * 0.7));
        else if (onLid) row.push(Math.min(255, fr + 60), Math.min(255, fg + 60), Math.min(255, fb + 60));
        else row.push(fr, fg, fb);
      } else {
        row.push(Math.floor(br * 0.85 + 0.15 * 0x3b), Math.floor(bg * 0.85 + 0.15 * 0x82), Math.floor(bb * 0.85 + 0.15 * 0xf6));
      }
    }
    rawRows.push(Buffer.from(row));
  }

  const raw = Buffer.concat(rawRows);
  const compressed = zlib.deflateSync(raw, { level: 6 });

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

const bg = [0x3b, 0x82, 0xf6]; // blue-500
const fg = [0xff, 0xff, 0xff]; // white

fs.writeFileSync('./public/icons/icon-192.png', createPNG(192, bg, fg));
fs.writeFileSync('./public/icons/icon-512.png', createPNG(512, bg, fg));
console.log('Icons created!');
