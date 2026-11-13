import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

export type RGBA = [number, number, number, number];
export type Palette = Record<string, RGBA>;

export const TRANSPARENT: RGBA = [0, 0, 0, 0];
export const OUTLINE: RGBA = [10, 9, 13, 255]; // #0a090d bold dark outline

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

export function encodePNG(width: number, height: number, pixels: Uint8Array): Buffer {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6; // RGBA
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1
    );
  }
  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

export class PixelCanvas {
  width: number;
  height: number;
  data: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 4);
  }

  set(x: number, y: number, rgba: RGBA) {
    const ix = Math.round(x);
    const iy = Math.round(y);
    if (ix < 0 || iy < 0 || ix >= this.width || iy >= this.height) return;
    if (rgba[3] === 0) return;
    const idx = (iy * this.width + ix) * 4;
    this.data[idx] = rgba[0];
    this.data[idx + 1] = rgba[1];
    this.data[idx + 2] = rgba[2];
    this.data[idx + 3] = rgba[3];
  }

  get(x: number, y: number): RGBA {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return TRANSPARENT;
    const idx = (y * this.width + x) * 4;
    return [this.data[idx], this.data[idx + 1], this.data[idx + 2], this.data[idx + 3]];
  }

  fillRect(x: number, y: number, w: number, h: number, rgba: RGBA) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.set(x + dx, y + dy, rgba);
      }
    }
  }

  fillEllipse(cx: number, cy: number, rx: number, ry: number, rgba: RGBA) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const nx = (x - cx) / rx;
        const ny = (y - cy) / ry;
        if (nx * nx + ny * ny <= 1) {
          this.set(x, y, rgba);
        }
      }
    }
  }

  stampGrid(lines: string[], ox: number, oy: number, palette: Palette) {
    for (let r = 0; r < lines.length; r++) {
      const row = lines[r];
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch === '.' || ch === ' ') continue;
        const color = palette[ch];
        if (color) this.set(ox + c, oy + r, color);
      }
    }
  }

  blitFrom(src: PixelCanvas, dx: number, dy: number) {
    for (let y = 0; y < src.height; y++) {
      for (let x = 0; x < src.width; x++) {
        const p = src.get(x, y);
        if (p[3] > 0) this.set(dx + x, dy + y, p);
      }
    }
  }

  applyOutline(outlineColor: RGBA = OUTLINE) {
    const copy = new Uint8Array(this.data);
    const isOpaque = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
      return copy[(y * this.width + x) * 4 + 3] > 0;
    };
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (isOpaque(x, y)) continue;
        if (
          isOpaque(x - 1, y) ||
          isOpaque(x + 1, y) ||
          isOpaque(x, y - 1) ||
          isOpaque(x, y + 1)
        ) {
          this.set(x, y, outlineColor);
        }
      }
    }
  }

  enforceBinaryAlpha() {
    for (let i = 0; i < this.data.length; i += 4) {
      if (this.data[i + 3] < 128) {
        this.data[i] = 0;
        this.data[i + 1] = 0;
        this.data[i + 2] = 0;
        this.data[i + 3] = 0;
      } else {
        this.data[i + 3] = 255;
      }
    }
  }

  getBounds() {
    let minX = this.width, minY = this.height, maxX = -1, maxY = -1;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.get(x, y)[3] > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < minX) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
    return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
  }
}

export function buildHorizontalStrip(frames: PixelCanvas[], frameW: number, frameH: number): PixelCanvas {
  const sheet = new PixelCanvas(frames.length * frameW, frameH);
  frames.forEach((f, i) => sheet.blitFrom(f, i * frameW, 0));
  return sheet;
}

export function upscaleNearest(src: PixelCanvas, scale: number): PixelCanvas {
  const dst = new PixelCanvas(src.width * scale, src.height * scale);
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const p = src.get(x, y);
      if (p[3] === 0) continue;
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          dst.set(x * scale + sx, y * scale + sy, p);
        }
      }
    }
  }
  return dst;
}

export function saveSheetPNG(dir: string, filename: string, canvas: PixelCanvas) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), encodePNG(canvas.width, canvas.height, canvas.data));
}

export function saveInspectionPreview(
  filepath: string,
  rows: Array<{ frames: PixelCanvas[]; frameW: number; frameH: number; baselineY?: number }>,
  scale = 3
) {
  const maxW = Math.max(...rows.map((r) => r.frames.length * r.frameW));
  const totalH = rows.reduce((acc, r) => acc + r.frameH, 0);
  const preview = new PixelCanvas(maxW * scale, totalH * scale);

  let yCursor = 0;
  for (const row of rows) {
    const rowH = row.frameH * scale;
    for (let y = 0; y < rowH; y++) {
      for (let x = 0; x < row.frames.length * row.frameW * scale; x++) {
        const localX = x % (row.frameW * scale);
        const localY = y % (row.frameH * scale);
        const isChecker = ((Math.floor(x / 12) + Math.floor((yCursor + y) / 12)) % 2) === 0;
        let bg: RGBA = isChecker ? [30, 36, 46, 255] : [40, 48, 60, 255];
        if (localX === 0 || localY === 0) bg = [85, 105, 135, 255];
        if (row.baselineY !== undefined && localY >= row.baselineY * scale && localY < (row.baselineY + 1) * scale) {
          bg = [235, 160, 40, 255];
        }
        preview.set(x, yCursor + y, bg);
      }
    }
    const strip = buildHorizontalStrip(row.frames, row.frameW, row.frameH);
    preview.blitFrom(upscaleNearest(strip, scale), 0, yCursor);
    yCursor += rowH;
  }

  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, encodePNG(preview.width, preview.height, preview.data));
}
