import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { encodePNG, OUTLINE, PixelCanvas, RGBA, saveSheetPNG, upscaleNearest } from './lib/pixel';

const REF_PATH = path.resolve(
  process.cwd(),
  'public/assets/aistudio/39D4E0D2-B473-4BFE-961E-2163505AC8D2_8f347dc8.png'
);
const OUT_DIR = path.resolve(process.cwd(), 'public/assets/packs/boss_exact');

function decodePNG(filepath: string): { width: number; height: number; rgba: Uint8Array } {
  const buf = fs.readFileSync(filepath);
  let pos = 8;
  let w = 0;
  let h = 0;
  let ct = 6;
  const idats: Buffer[] = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      ct = data[9];
    } else if (type === 'IDAT') {
      idats.push(data);
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + len;
  }
  const bpp = ct === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idats));
  const stride = w * bpp + 1;
  const rgba = new Uint8Array(w * h * 4);
  const prev = new Uint8Array(w * bpp);
  const cur = new Uint8Array(w * bpp);
  const paeth = (a: number, b: number, c: number) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < h; y++) {
    const f = raw[y * stride];
    for (let x = 0; x < w * bpp; x++) {
      const xVal = raw[y * stride + 1 + x];
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = xVal;
      if (f === 1) v = (xVal + a) & 255;
      else if (f === 2) v = (xVal + b) & 255;
      else if (f === 3) v = (xVal + ((a + b) >> 1)) & 255;
      else if (f === 4) v = (xVal + paeth(a, b, c)) & 255;
      cur[x] = v;
    }
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      rgba[i] = cur[x * bpp];
      rgba[i + 1] = cur[x * bpp + 1];
      rgba[i + 2] = cur[x * bpp + 2];
      rgba[i + 3] = bpp === 4 ? cur[x * bpp + 3] : 255;
    }
    prev.set(cur);
  }
  return { width: w, height: h, rgba };
}

// Exact Boss Mutant Brute 16-bit crisp palette sampled directly from the reference artwork
const BOSS_EXACT_PALETTE: RGBA[] = [
  OUTLINE,               // #0a090d bold dark 1px outline & eye/mouth cavity
  [30, 22, 30, 255],     // deep shadow crease
  // Light grey-pink / bruised flesh tones
  [218, 198, 192, 255],  // light grey-pink highlight
  [196, 168, 164, 255],  // grey-pink mid-light
  [162, 130, 134, 255],  // grey-pink midtone
  [124, 90, 102, 255],   // bruised mauve shadow
  [88, 60, 74, 255],     // deep mauve shadow
  // Blood / crimson raw muscle & glowing eye
  [248, 146, 98, 255],   // bright blood specular highlight
  [218, 56, 44, 255],    // bright blood / eye red
  [172, 32, 32, 255],    // mid blood crimson
  [116, 20, 28, 255],    // deep dark crimson / mouth
  // White back bone spikes & teeth
  [246, 242, 236, 255],  // white bone & teeth
  [208, 194, 194, 255],  // cool bone shadow
  // Dark blue torn shorts
  [66, 86, 118, 255],    // dark blue shorts highlight
  [44, 58, 86, 255],     // dark blue shorts mid
  [26, 34, 54, 255],     // dark blue shorts shadow
  // Yellow belt buckle & leather belt / knee patch
  [240, 178, 52, 255],   // yellow/gold belt buckle
  [186, 106, 44, 255],   // leather belt / orange-brown knee patch
  [124, 68, 34, 255],    // belt shadow
];

function snapColor([r, g, b]: RGBA): RGBA {
  if (r < 42 && g < 42 && b < 45) return OUTLINE;
  let best = BOSS_EXACT_PALETTE[0];
  let bestD = Infinity;
  for (const p of BOSS_EXACT_PALETTE) {
    const dr = r - p[0];
    const dg = g - p[1];
    const db = b - p[2];
    const d = dr * dr * 2 + dg * dg * 4 + db * db * 3;
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

const { width: refW, height: refH, rgba: refRgba } = decodePNG(REF_PATH);

// Native grid alignment in the bottom-right Boss region of the 1254x1254 reference
const pitch = 5.97;
const ox = 679.0;
const oy = 719.2;
const gw = 90;
const gh = 82;

const grid: RGBA[][] = Array.from({ length: gh }, (_, gy) =>
  Array.from({ length: gw }, (_, gx) => {
    const sx = Math.round(ox + (gx + 0.5) * pitch);
    const sy = Math.round(oy + (gy + 0.5) * pitch);
    if (sx < 0 || sy < 0 || sx >= refW || sy >= refH) return [0, 0, 0, 255];
    const i = (sy * refW + sx) * 4;
    return [refRgba[i], refRgba[i + 1], refRgba[i + 2], 255];
  })
);

const isBgGreen = ([r, g, b]: RGBA) => {
  if (g > r + 4 && g > b + 6) return true;
  if (g >= r && g > b + 4 && r < 95 && g < 110) return true;
  return false;
};

// Flood-fill green exterior grass & grass shadow from the outer border AND any
// unmistakable enclosed grass-green pocket (e.g. between shorts and right forearm).
const outside = Array.from({ length: gh }, () => new Uint8Array(gw));
const bq: [number, number][] = [];
for (let y = 0; y < gh; y++) {
  for (let x = 0; x < gw; x++) {
    const isBorder = x === 0 || y === 0 || x === gw - 1 || y === gh - 1;
    const [r, g, b] = grid[y][x];
    const isUnmistakableGrass = g > r + 25 && g > b + 35;
    if ((isBorder && isBgGreen(grid[y][x])) || isUnmistakableGrass) {
      outside[y][x] = 1;
      bq.push([x, y]);
    }
  }
}
while (bq.length) {
  const [x, y] = bq.shift()!;
  for (const [nx, ny] of [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
  ]) {
    if (nx >= 0 && ny >= 0 && nx < gw && ny < gh && !outside[ny][nx] && isBgGreen(grid[ny][nx])) {
      outside[ny][nx] = 1;
      bq.push([nx, ny]);
    }
  }
}

// Keep the connected Boss component anchored at chest center (45, 35)
const keep = Array.from({ length: gh }, () => new Uint8Array(gw));
const q: [number, number][] = [[45, 35]];
keep[35][45] = 1;
while (q.length) {
  const [x, y] = q.shift()!;
  for (const [nx, ny] of [
    [x - 1, y],
    [x + 1, y],
    [x, y - 1],
    [x, y + 1],
  ]) {
    if (nx >= 0 && ny >= 0 && nx < gw && ny < gh && !keep[ny][nx] && !outside[ny][nx]) {
      keep[ny][nx] = 1;
      q.push([nx, ny]);
    }
  }
}

// Compute tight bounding box of the Boss and center cleanly on 96x96 transparent canvas
let minX = gw;
let maxX = 0;
let minY = gh;
let maxY = 0;
for (let y = 0; y < gh; y++) {
  for (let x = 0; x < gw; x++) {
    if (keep[y][x]) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}

const bw = maxX - minX + 1;
const bh = maxY - minY + 1;
const dx = Math.floor((96 - bw) / 2);
const dy = Math.floor((96 - bh) / 2);

const out96 = new PixelCanvas(96, 96);
for (let y = minY; y <= maxY; y++) {
  for (let x = minX; x <= maxX; x++) {
    if (!keep[y][x]) continue;
    out96.set(dx + x - minX, dy + y - minY, snapColor(grid[y][x]));
  }
}
out96.enforceBinaryAlpha();

saveSheetPNG(OUT_DIR, 'boss_mutant_brute_96x96.png', out96);

const bounds = out96.getBounds();
const uniqueHex = new Set<string>();
for (let y = 0; y < 96; y++) {
  for (let x = 0; x < 96; x++) {
    const [r, g, b, a] = out96.get(x, y);
    if (a > 0) uniqueHex.add('#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join(''));
  }
}

const manifest = {
  pack: 'boss_exact',
  name: 'Boss Mutant Brute (Exact Reference Match)',
  style: '16-bit pixel art matching reference proportions, palette, 1px #0A090D outline, sharp pixels, transparent RGBA, zero soft shadows',
  assets: [
    {
      id: 'boss_mutant_brute',
      title: 'Boss Mutant Brute (96×96 Exact Reference)',
      file: 'boss_mutant_brute_96x96.png',
      frameSize: { w: 96, h: 96 },
      frameCount: 1,
      sheetSize: { w: 96, h: 96 },
      footBaselineY: bounds.maxY,
      paletteCount: uniqueHex.size,
      palette: Array.from(uniqueHex),
      frames: [
        {
          index: 0,
          name: 'idle_ref_0',
          x: 0,
          y: 0,
          w: 96,
          h: 96,
          bounds,
        },
      ],
    },
  ],
};

fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Save 4x inspection preview (checker + grass)
const preview = new PixelCanvas(96 * 4 * 2, 96 * 4);
for (let y = 0; y < 96 * 4; y++) {
  for (let x = 0; x < 96 * 4; x++) {
    const chk = ((Math.floor(x / 16) + Math.floor(y / 16)) % 2) === 0;
    preview.set(x, y, chk ? [30, 36, 46, 255] : [42, 50, 64, 255]);
    preview.set(96 * 4 + x, y, [140, 196, 47, 255]);
  }
}
const up = upscaleNearest(out96, 4);
preview.blitFrom(up, 0, 0);
preview.blitFrom(up, 96 * 4, 0);
fs.writeFileSync(
  path.resolve(process.cwd(), 'scripts/_boss_exact_4x.png'),
  encodePNG(preview.width, preview.height, preview.data)
);

console.log('Saved Boss 96x96:', { bounds, paletteCount: uniqueHex.size });
