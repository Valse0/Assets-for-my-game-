import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

type RGBA = [number, number, number, number];
type Palette = Record<string, RGBA>;

const TRANSPARENT: RGBA = [0, 0, 0, 0];

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

function encodePNG(width: number, height: number, pixels: Uint8Array): Buffer {
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

class PixelCanvas {
  width: number;
  height: number;
  data: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 4);
  }

  set(x: number, y: number, rgba: RGBA) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    if (rgba[3] === 0) return;
    const idx = (y * this.width + x) * 4;
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
    return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
  }
}

const OUTLINE: RGBA = [10, 9, 13, 255]; // #0a090d bold dark outline

// ============================================================================
// 1) SURVIVOR (Unarmed body, facing right, 3/4 view, 40px tall: y=19..58)
// ============================================================================
const SURVIVOR_PALETTE: Palette = {
  K: OUTLINE,
  H: [145, 76, 54, 255],   // hair highlight
  h: [104, 52, 42, 255],   // hair mid
  d: [66, 32, 38, 255],    // hair shadow
  S: [252, 210, 162, 255], // skin highlight
  s: [246, 184, 130, 255], // skin mid
  p: [212, 138, 94, 255],  // skin shadow
  W: [255, 255, 255, 255], // eye white
  E: [18, 14, 22, 255],    // pupil / brow
  R: [238, 52, 54, 255],   // jacket bright red
  r: [196, 28, 40, 255],   // jacket mid red
  q: [138, 20, 34, 255],   // backpack / deep red
  w: [244, 244, 248, 255], // crisp white collar/hem
  g: [192, 196, 212, 255], // trim shadow
  B: [58, 120, 184, 255],  // jeans highlight
  b: [36, 76, 132, 255],   // jeans mid
  n: [22, 46, 86, 255],    // jeans shadow
  U: [62, 58, 66, 255],    // boot upper
  u: [32, 28, 36, 255],    // boot dark
  L: [154, 158, 172, 255], // boot sole
};

// Head: 22x17 (placed at y=19..35)
const SURVIVOR_HEAD = [
  '......KK....KK........',
  '.....KHHK..KHHK.......',
  '....KHHHHKKHHHHKK.....',
  '...KHHHHHHHHHHHHHK....',
  '..KhhhHHHHHHHHHHhhK...',
  '.KhhhdhhKKKKKhhdhhhK..',
  'KdhddhhKSSSSSKddhhhhK.',
  'KddddKKSSSSSSSKKdhhhK.',
  'KdddKSSSSEWSSSEWSKdhK.',
  'KdddKSSSSEWSSSEWSKhhK.',
  '.KddKpSSSSSSSSSSSKKK..',
  '.KddKpSSsssssssSsK....',
  '..KKdKpppsssssssK.....',
  '...KKKpppSSSSppK......',
  '.....KppppppppK.......',
  '......KKKKKKKK........',
];

const SURVIVOR_HEAD_HURT = [
  '......KK....KK........',
  '.....KHHK..KHHK.......',
  '....KHHHHKKHHHHKK.....',
  '...KHHHHHHHHHHHHHK....',
  '..KhhhHHHHHHHHHHhhK...',
  '.KhhhdhhKKKKKhhdhhhK..',
  'KdhddhhKSSSSSKddhhhhK.',
  'KddddKKSSSSSSSKKdhhhK.',
  'KdddKSSKEKSSSSKEKSdhK.',
  'KdddKSSSESSSSSESSKhhK.',
  '.KddKpSSSSKKKSSSSKKK..',
  '.KddKpSSsKEEKssSsK....',
  '..KKdKpppsKKssspK.....',
  '...KKKpppssssspK......',
  '.....KppppppppK.......',
  '......KKKKKKKK........',
];

// Torso + backpack: 18x13 (placed at y=33..45 so it meets head & hips seamlessly)
const SURVIVOR_TORSO = [
  '..KKKK.KKKKKKKK...',
  '.KqqqKKRRwwRRRKK..',
  'KqrrrKRRwRwwRRrrK.',
  'KqrrrKRRRRRRRRrrK.',
  'KqrrqKRRRRRRRRrrK.',
  'KqqqqKRRrrrrrrqqK.',
  'KqqqKRRRRrrrrrqqK.',
  '.KKKKRRRRrrrrrqqK.',
  '....KrrrrrqqqqrrK.',
  '....KwwwwwwggwwwK.',
  '....KbbbbbbnnbbbK.',
  '.....KKKKKKKKKKKK.',
];

// Unarmed arms (clear dark outline + white cuff + peach hand)
const SURVIVOR_BACK_ARM_FWD = [
  '..KKK..',
  '.KRRRK.',
  '.KRrrKK',
  '..KwwgK',
  '..KSSsK',
  '...KKK.',
];
const SURVIVOR_BACK_ARM_MID = [
  '.KKK..',
  'KRRRK.',
  'KRrrK.',
  'KwwgK.',
  'KSSsK.',
  '.KKK..',
];
const SURVIVOR_BACK_ARM_BACK = [
  '..KKK.',
  '.KrrK.',
  'KqqrK.',
  'KwgK..',
  'KspK..',
  '.KK...',
];

const SURVIVOR_FRONT_ARM_BACK = [
  '.KKKK.',
  'KRRRRK',
  'KRRrrK',
  'KrrqqK',
  'KwwwK.',
  'KSSsK.',
  '.KKK..',
];
const SURVIVOR_FRONT_ARM_MID = [
  '.KKKK.',
  'KRRRRK',
  'KRRrrK',
  'KrrqqK',
  'KwwwK.',
  'KSSsK.',
  '.KKK..',
];
const SURVIVOR_FRONT_ARM_FWD = [
  '.KKKK...',
  'KRRRRK..',
  '.KRRrrKK',
  '..KrwwwK',
  '..KSSSsK',
  '...KKKK.',
];

// Legs: ALL standing/stride legs overlap into pelvis (y=43..44) and land cleanly at y=58!
const SURVIVOR_LEG_PLANT = [
  '.KKKKK.',
  'KBBBbbK',
  'KBBBbbK',
  'KBBbbnK',
  'KbbnnnK',
  'KbbnnnK',
  'KbbnnnK',
  'KbbnnnK',
  'KbbnnnK',
  'KUUUUUK',
  'KUUUUUK',
  'KuuuuuK',
  'KLLLLLK',
  'KLLLLLK',
  '.KKKKK.',
]; // 15 rows -> oy = 44..58

const SURVIVOR_LEG_FWD = [
  '.KKKKK...',
  'KBBBbbK..',
  'KBBBbbK..',
  'KBBbbnK..',
  '.KbbnnnK.',
  '.KbbnnnK.',
  '..KbbnnnK',
  '..KbbnnnK',
  '..KbbnnnK',
  '..KUUUUUUK',
  '..KuuuuuuK',
  '..KLLLLLLK',
  '..KLLLLLLK',
  '...KKKKKK.',
]; // 14 rows -> oy = 45..58

const SURVIVOR_LEG_BACK = [
  '....KKKKK.',
  '...KbbnnnK',
  '...KbbnnnK',
  '..KbbnnnK.',
  '..KbbnnnK.',
  '.KbbnnnK..',
  '.KbbnnnK..',
  'KbbnnnK...',
  'KUUUUUK...',
  'KuuuuuK...',
  'KLLLLLK...',
  'KLLLLLK...',
  '.KKKKK....',
]; // 13 rows -> oy = 46..58

const SURVIVOR_LEG_LIFT = [
  '.KKKKK.',
  'KBBBbbK',
  'KBBBbbK',
  'KBBbbnK',
  'KbbnnnK',
  'KbbnnnK',
  'KUUUUUK',
  'KuuuuuK',
  'KLLLLLK',
  '.KKKKK.',
]; // 10 rows -> oy = 44..53 (lifted cleanly!)

function buildSurvivorWalkFrame(step: 0 | 1 | 2 | 3): PixelCanvas {
  const c = new PixelCanvas(64, 64);
  const bob = step === 1 ? 1 : step === 3 ? -1 : 0;
  const cx = 21;

  // Back arm
  if (step === 0) c.stampGrid(SURVIVOR_BACK_ARM_FWD, cx + 15, 34 + bob, SURVIVOR_PALETTE);
  else if (step === 1 || step === 3) c.stampGrid(SURVIVOR_BACK_ARM_MID, cx + 14, 35 + bob, SURVIVOR_PALETTE);
  else c.stampGrid(SURVIVOR_BACK_ARM_BACK, cx + 12, 35 + bob, SURVIVOR_PALETTE);

  // Back leg (overlaps torso hips seamlessly at y=43..45)
  if (step === 0) c.stampGrid(SURVIVOR_LEG_BACK, cx + 3, 59 - SURVIVOR_LEG_BACK.length, SURVIVOR_PALETTE);
  else if (step === 1) c.stampGrid(SURVIVOR_LEG_LIFT, cx + 10, 44, SURVIVOR_PALETTE);
  else if (step === 2) c.stampGrid(SURVIVOR_LEG_FWD, cx + 10, 59 - SURVIVOR_LEG_FWD.length, SURVIVOR_PALETTE);
  else c.stampGrid(SURVIVOR_LEG_PLANT, cx + 10, 59 - SURVIVOR_LEG_PLANT.length, SURVIVOR_PALETTE);

  // Front leg
  if (step === 0) c.stampGrid(SURVIVOR_LEG_FWD, cx + 10, 59 - SURVIVOR_LEG_FWD.length, SURVIVOR_PALETTE);
  else if (step === 1) c.stampGrid(SURVIVOR_LEG_PLANT, cx + 8, 59 - SURVIVOR_LEG_PLANT.length, SURVIVOR_PALETTE);
  else if (step === 2) c.stampGrid(SURVIVOR_LEG_BACK, cx + 3, 59 - SURVIVOR_LEG_BACK.length, SURVIVOR_PALETTE);
  else c.stampGrid(SURVIVOR_LEG_LIFT, cx + 9, 44, SURVIVOR_PALETTE);

  // Torso + backpack
  c.stampGrid(SURVIVOR_TORSO, cx + 3, 34 + bob, SURVIVOR_PALETTE);

  // Head
  c.stampGrid(SURVIVOR_HEAD, cx + 1, 19 + bob, SURVIVOR_PALETTE);

  // Front arm (unarmed)
  if (step === 0) c.stampGrid(SURVIVOR_FRONT_ARM_BACK, cx + 4, 36 + bob, SURVIVOR_PALETTE);
  else if (step === 1 || step === 3) c.stampGrid(SURVIVOR_FRONT_ARM_MID, cx + 6, 36 + bob, SURVIVOR_PALETTE);
  else c.stampGrid(SURVIVOR_FRONT_ARM_FWD, cx + 9, 36 + bob, SURVIVOR_PALETTE);

  c.enforceBinaryAlpha();
  return c;
}

function buildSurvivorHurtFrame(): PixelCanvas {
  const c = new PixelCanvas(64, 64);
  const cx = 19;
  c.stampGrid(SURVIVOR_LEG_BACK, cx + 3, 59 - SURVIVOR_LEG_BACK.length, SURVIVOR_PALETTE);
  c.stampGrid(SURVIVOR_LEG_FWD, cx + 11, 59 - SURVIVOR_LEG_FWD.length, SURVIVOR_PALETTE);
  c.stampGrid(SURVIVOR_TORSO, cx + 2, 34, SURVIVOR_PALETTE);
  c.stampGrid(SURVIVOR_BACK_ARM_FWD, cx + 15, 33, SURVIVOR_PALETTE);
  c.stampGrid(SURVIVOR_HEAD_HURT, cx - 1, 19, SURVIVOR_PALETTE);
  c.stampGrid(SURVIVOR_FRONT_ARM_BACK, cx + 2, 35, SURVIVOR_PALETTE);
  c.enforceBinaryAlpha();
  return c;
}

// Death 1 (38 rows tall: staggering back from hit, y=21..58)
const SURVIVOR_DEATH_1 = [
  '......KK....KK................',
  '.....KHHK..KHHK...............',
  '....KHHHHKKHHHHKK.............',
  '...KHHHHHHHHHHHHHK............',
  '..KhhhHHHHHHHHHHhhK...........',
  '.KhhhdhhKKKKKhhdhhhK..........',
  'KdhddhhKSSSSSKddhhhhK.........',
  'KddddKKSSSSSSSKKdhhhK.........',
  'KdddKSSKEKSSSSKEKSdhK.........',
  'KdddKSSSESSSSSESSKhhK.........',
  '.KddKpSSSSKKKSSSSKKK..........',
  '.KddKpSSsKEEKssSsK............',
  '..KKdKpppsKKssspK.............',
  '...KKKpppssssspK..............',
  '...KqqKKppppppKK.KKKK.........',
  '..KqrrrKRRwwRRRKKRRRRK........',
  '..KqrrrKRRwRwwRRrKrrwgK.......',
  '..KqrrqKRRRRRRRRrKKSSsK.......',
  '...KqqqKRRRRrrrqqK.KKK........',
  '....KKKKRRRRrrrqqK............',
  '......KrrrrrqqqqrK............',
  '......KwwwwggwwwwK............',
  '.....KbbbbbbnnbbbbK...........',
  '.....KBBBbbK.KBBBbbK..........',
  '.....KBBbbnK..KBBbbnK.........',
  '.....KbbnnnK..KbbnnnK.........',
  '.....KbbnnnK...KbbnnnK........',
  '.....KbbnnnK...KbbnnnK........',
  '.....KbbnnnK...KbbnnnK........',
  '.....KbbnnnK...KbbnnnK........',
  '.....KUUUUUK....KUUUUUK.......',
  '.....KuuuuuK....KuuuuuK.......',
  '.....KLLLLLK....KLLLLLK.......',
  '.....KLLLLLK....KLLLLLK.......',
  '......KKKKK......KKKKK........',
];

// Death 2 (dropping onto knees, 28 rows: y=31..58)
const SURVIVOR_DEATH_2 = [
  '......KK....KK................',
  '.....KHHK..KHHK...............',
  '....KHHHHKKHHHHKK.............',
  '...KHHHHHHHHHHHHHK............',
  '..KhhhHHHHHHHHHHhhK...........',
  '.KhhhdhhKKKKKhhdhhhK..........',
  'KdhddhhKSSSSSKddhhhhK.........',
  'KddddKKSSSSSSSKKdhhhK.........',
  'KdddKSSKEKSSSSKEKSdhK.........',
  'KdddKSSSESSSSSESSKhhK.........',
  '.KddKpSSSSKKKSSSSKKK..........',
  '.KddKpSSsKEEKssSsK............',
  '..KKdKpppsKKssspK.............',
  '..KqqKKRwwRRRKK.KKKK..........',
  '.KqrrrKRwRwwRRrKRRRRK.........',
  '.KqrrrKRRRRRRRrrKrrwgK........',
  '.KqqqqKRRRRrrrqqKKSSsK........',
  '..KKKKKrrrrqqqqrK.KKK.........',
  '....KwwwwwwggwwwK.............',
  '....KbbbbbbnnbbbK.............',
  '...KUUUKBBBbbKBBBbbK..........',
  '...KuuuKBBbbnKKBBbbnK.........',
  '...KLLLKUUUUUKKUUUUUK.........',
  '...KLLLKuuuuuKKuuuuuK.........',
  '....KKKKLLLLLKKLLLLLK.........',
  '........KKKKK..KKKKK..........',
];

// Death 3 (falling onto ground, 19 rows: y=40..58, seamless neck-to-torso)
const SURVIVOR_DEATH_3 = [
  '......KK....KK.......................',
  '.....KHHK..KHHK......................',
  '....KHHHHKKHHHHKK....................',
  '...KHHHHHHHHHHHHHK...................',
  '..KhhhHHHHHHHHHHhhK..................',
  '.KhhhdhhKKKKKhhdhhhK..KKKK...........',
  'KdhddhhKSSSSSKddhhhhKKqqrrK..........',
  'KddddKKSSSSSSSKKdhhhKqrrqqK.KKKK.....',
  'KdddKSSKEKSSSSKEKSdhKRRRRrrKRRRRK....',
  '.KddKpSSSSSSSSSSSKKKKRRRrrqKKrrwgK...',
  '.KddKpSSsssssssSsKKKKrrqqqqKKKSSsK...',
  '..KKdKpppsssssssKKwwwwwwggwwK.KKK....',
  '....KKKKKKKKKKKKKbbbbbbnnbbbbK.......',
  '......KUUUUUK....KBBBbbnKBBBbbK......',
  '......KuuuuuK....KUUUUUUKKUUUUUK.....',
  '......KLLLLLK....KLLLLLLKKLLLLLK.....',
  '.......KKKKK......KKKKKK..KKKKK......',
];

// Death 4 (lying flat on ground at y=58, 13 rows: y=46..58)
const SURVIVOR_DEATH_4 = [
  '......KK....................................',
  '....KHHHHK........KKKK......................',
  '...KHHHHHHKK....KKqqrrKK....................',
  '..KhhhHHHHHHK..KqqrrqqrrKKKK................',
  '.KhhhdhhKKKKK.KqrrRRRRRRRwwwK...............',
  'KdhddhKSSSSSKKKRRRRRRRRRRwwgKKbbbbbKK.......',
  'KddddKSSSSSSSKKRRRRRrrrrrwgKKBBBbbnnK..KKKK.',
  'KdddKSKEKSSSEKKKrrrrqqqqqqK.KBBBbbnKKKUUUUUK',
  'KdddKpSSSSSSSssKKwwwwggwwwK.KbbnnnKKKuuuuuuK',
  '.KddKpppSssssssKKbbbnnbbbbKKKKUUUUUKKLLLLLLK',
  '..KKKppppppppKKKKKKKKKKKKKKKKKuuuuuKKLLLLLLK',
  '....KKKKKKKKKK................KLLLLLK.KKKKK.',
  '...............................KKKKK........',
];

function buildSurvivorDeathFrame(step: 0 | 1 | 2 | 3): PixelCanvas {
  const c = new PixelCanvas(64, 64);
  if (step === 0) c.stampGrid(SURVIVOR_DEATH_1, 17, 59 - SURVIVOR_DEATH_1.length, SURVIVOR_PALETTE);
  else if (step === 1) c.stampGrid(SURVIVOR_DEATH_2, 16, 59 - SURVIVOR_DEATH_2.length, SURVIVOR_PALETTE);
  else if (step === 2) c.stampGrid(SURVIVOR_DEATH_3, 13, 59 - SURVIVOR_DEATH_3.length, SURVIVOR_PALETTE);
  else c.stampGrid(SURVIVOR_DEATH_4, 10, 59 - SURVIVOR_DEATH_4.length, SURVIVOR_PALETTE);
  c.enforceBinaryAlpha();
  return c;
}

// ============================================================================
// 2) WALKER ZOMBIE (Hulking big green zombie, 50px tall: y=9..58)
// ============================================================================
const ZOMBIE_PALETTE: Palette = {
  K: OUTLINE,
  G: [162, 212, 162, 255], // mint green highlight
  g: [132, 186, 138, 255], // mint green midtone
  m: [90, 142, 110, 255],  // green shadow
  z: [54, 88, 86, 255],    // deep teal shadow
  E: [12, 10, 14, 255],    // black socket
  W: [244, 240, 234, 255], // white teeth / eye glint
  M: [38, 8, 14, 255],     // dark mouth cavity
  T: [142, 24, 34, 255],   // tongue / mouth red
  C: [238, 224, 208, 255], // torn shirt highlight
  c: [200, 190, 188, 255], // shirt midtone
  v: [132, 128, 156, 255], // shirt cool shadow
  R: [200, 44, 42, 255],   // blood bright
  r: [132, 24, 28, 255],   // blood dark
  P: [94, 92, 92, 255],    // pants highlight
  p: [64, 64, 68, 255],    // pants midtone
  n: [36, 34, 48, 255],    // pants deep shadow
  u: [26, 24, 32, 255],    // dark boot
};

// Hulking Zombie Head: 22x16 (placed at y=10..25)
const ZOMBIE_HEAD = [
  '.....KKKKKKKKKKK......',
  '...KKGGGGGGGGGGGKK....',
  '..KGGGGGGGGGGGGGGgK...',
  '.KGGGggggggggggggmmK..',
  '.KggmmmGGGGGGggggmmzK.',
  'KggmKKKKKmmmmKKKKKmzK.',
  'KgmKEEEWWKKKKKEEEWWK..',
  'KgmKEEEEEKKKKKEEEEEKK.',
  'KgmKKKKKKmmmmKKKKKKmK.',
  'KgmgggmWWWWWWWWmggmmK.',
  'KgmgggKMMMMMMMMKggmmK.',
  '.KzmggKWWTTTTWWKzzmK..',
  '.KzzmmKMMMMMMMMKzzK...',
  '..KzzzKKKKKKKKKKzK....',
  '...KzzzzmmmmmmzzK.....',
  '....KKKKKKKKKKKK......',
];

// Broad Torn Bloodied Shirt + Pelvis: 30x17 (placed at y=24..40 -> overlaps head & legs!)
const ZOMBIE_TORSO = [
  '....KKKKKKKKKKKKKKKKKKKKK.....',
  '..KKCRCCcCCCCCCCCCCCCCcccKK...',
  '.KCCRRRCcCCCCCCCcCCCCcCccccK..',
  'KCCrrCCccCCCCrrCCcCCCCCCCvvK..',
  'KCCCCCCCCccCCRrCCccCCCCCCvvvK.',
  'KCCCcCCCCcCCCCCCCcCCCCCCCvvvK.',
  'KcccvvCCCCCCCcCCCCcCCCCCCvvvK.',
  'KccvvvvCCCCcCCCCrCCCccvvvvvvK.',
  '.KvvvvvvCCCCCCcCRrCCcvvvvvvK..',
  '.KvvvvvvvCCcCCCCCCCCvvvvvvK...',
  '..KvvvvvvvCCcCCCCCCvvvvvvK....',
  '..KnnnnnKKvvvvvvvvvvvvKKKK....',
  '...KPPPPPPPppppppnnnnnnK......',
  '...KPPPPPPPppppppnnnnnnK......',
  '...KPPPPppppppppnnnnnnnK......',
  '...KPPPPppppppppnnnnnnnK......',
  '....KKKKKKKKKKKKKKKKKKK.......',
];

// Heavy Muscular Green Front Arm (12x15, hanging low and chunky!)
const ZOMBIE_FRONT_ARM_DOWN = [
  '..KKKKKK....',
  '.KGGGGggK...',
  'KGGggggmmK..',
  'KggmmmmzzK..',
  'KggmmmmzzK..',
  '.KggmmmzzKK.',
  '.KgmKKKKmzK.',
  '..KGGgggmmK.',
  '..KGGgggmmK.',
  '..KgmmzzzzK.',
  '..KGGGGmmK..',
  '..KggmmzmK..',
  '..KggmKmmK..',
  '...KKKKKK...',
];

const ZOMBIE_FRONT_ARM_FWD = [
  '..KKKKKK.....',
  '.KGGGGggK....',
  'KGGggggmmKK..',
  'KggmmmmzzggK.',
  'KggmmmmzzggK.',
  '.KggmmmzzmmK.',
  '..KKKKKKKKKK.',
  '....KGGGGgmK.',
  '....KggmmzzK.',
  '.....KKKKKK..',
];

const ZOMBIE_FRONT_ARM_BACK = [
  '..KKKKKK....',
  '.KGGGGggK...',
  'KGGggggmmK..',
  'KggmmmmzzK..',
  'KggmmmzzK...',
  'KggmmmzzK...',
  'KgmKKKKmK...',
  'KGGgggmmK...',
  'KgmmzzzzK...',
  '.KGGGGmmK...',
  '..KKKKKK....',
];

const ZOMBIE_BACK_ARM_FWD = [
  '.KKKKKK.....',
  'KGGGGggKK...',
  'KggmmmmggK..',
  '.KmmmzzzzK..',
  '..KKKGGmmK..',
  '....KggzzK..',
  '.....KKKK...',
];

const ZOMBIE_BACK_ARM_MID = [
  '.KKKKK....',
  'KGGGggK...',
  'KggmmmK...',
  'KmmzzzK...',
  'KGGmmK....',
  'KgzzK.....',
  '.KKK......',
];

// Heavy Charcoal Legs + Boots: ALL overlap into pelvis (y=38..40) and land cleanly at y=58!
const ZOMBIE_LEG_PLANT = [
  '.KKKKKKK.',
  'KPPPPpppK',
  'KPPPPpppK',
  'KPPPppnnK',
  'KPPppnnnK',
  'KpppnnnnK',
  'KpppnnnnK',
  'KpppnnnnK',
  'KppnnnnnK',
  'KppnnnnnK',
  'KppnnnnnK',
  'KppnnnnnK',
  'KppnnnnnK',
  'KppnnnnnK',
  'KuuuuuuuK',
  'KuuuuuuuK',
  'KuuuuuuuK',
  'KuuuuuuuK',
  'KuuuuuuuK',
  '.KKKKKKK.',
]; // 20 rows -> oy = 39..58

const ZOMBIE_LEG_FWD = [
  '.KKKKKKK...',
  'KPPPPpppK..',
  'KPPPPpppK..',
  'KPPPppnnK..',
  'KPPPppnnK..',
  '.KPPppnnnK.',
  '.KpppnnnnK.',
  '.KpppnnnnK.',
  '..KppnnnnK.',
  '..KppnnnnnK',
  '..KppnnnnnK',
  '..KppnnnnnK',
  '..KppnnnnnK',
  '..KppnnnnnK',
  '..KuuuuuuuuK',
  '..KuuuuuuuuK',
  '..KuuuuuuuuK',
  '..KuuuuuuuuK',
  '...KKKKKKKK.',
]; // 19 rows -> oy = 40..58

const ZOMBIE_LEG_BACK = [
  '.....KKKKKKK.',
  '....KpppnnnnK',
  '....KpppnnnnK',
  '...KpppnnnnK.',
  '...KppnnnnnK.',
  '..KppnnnnnK..',
  '..KppnnnnnK..',
  '.KppnnnnnK...',
  '.KppnnnnnK...',
  'KppnnnnnK....',
  'KppnnnnnK....',
  'KppnnnnnK....',
  'KuuuuuuuK....',
  'KuuuuuuuK....',
  'KuuuuuuuK....',
  'KuuuuuuuK....',
  'KuuuuuuuK....',
  '.KKKKKKK.....',
]; // 18 rows -> oy = 41..58

const ZOMBIE_LEG_LIFT = [
  '.KKKKKKK.',
  'KPPPPpppK',
  'KPPPPpppK',
  'KPPPppnnK',
  'KpppnnnnK',
  'KpppnnnnK',
  'KppnnnnnK',
  'KppnnnnnK',
  'KuuuuuuuK',
  'KuuuuuuuK',
  'KuuuuuuuK',
  '.KKKKKKK.',
]; // 12 rows -> oy = 39..50

function buildZombieWalkFrame(step: 0 | 1 | 2 | 3): PixelCanvas {
  const c = new PixelCanvas(64, 64);
  const bob = step === 1 ? 1 : step === 3 ? -1 : 0;
  const cx = 13;

  // Back arm reaching out
  if (step === 0 || step === 3) c.stampGrid(ZOMBIE_BACK_ARM_FWD, cx + 26, 26 + bob, ZOMBIE_PALETTE);
  else c.stampGrid(ZOMBIE_BACK_ARM_MID, cx + 25, 27 + bob, ZOMBIE_PALETTE);

  // Back leg (seamless connection into pelvis at y=38..40)
  if (step === 0) c.stampGrid(ZOMBIE_LEG_BACK, cx + 4, 59 - ZOMBIE_LEG_BACK.length, ZOMBIE_PALETTE);
  else if (step === 1) c.stampGrid(ZOMBIE_LEG_LIFT, cx + 11, 39, ZOMBIE_PALETTE);
  else if (step === 2) c.stampGrid(ZOMBIE_LEG_FWD, cx + 16, 59 - ZOMBIE_LEG_FWD.length, ZOMBIE_PALETTE);
  else c.stampGrid(ZOMBIE_LEG_PLANT, cx + 14, 59 - ZOMBIE_LEG_PLANT.length, ZOMBIE_PALETTE);

  // Front leg
  if (step === 0) c.stampGrid(ZOMBIE_LEG_FWD, cx + 16, 59 - ZOMBIE_LEG_FWD.length, ZOMBIE_PALETTE);
  else if (step === 1) c.stampGrid(ZOMBIE_LEG_PLANT, cx + 12, 59 - ZOMBIE_LEG_PLANT.length, ZOMBIE_PALETTE);
  else if (step === 2) c.stampGrid(ZOMBIE_LEG_BACK, cx + 4, 59 - ZOMBIE_LEG_BACK.length, ZOMBIE_PALETTE);
  else c.stampGrid(ZOMBIE_LEG_LIFT, cx + 10, 39, ZOMBIE_PALETTE);

  // Broad torn shirt + pelvis (y=24..40)
  c.stampGrid(ZOMBIE_TORSO, cx + 3, 24 + bob, ZOMBIE_PALETTE);

  // Hulking Head (y=10..25)
  c.stampGrid(ZOMBIE_HEAD, cx + 11, 10 + bob, ZOMBIE_PALETTE);

  // Heavy Front Arm
  if (step === 0) c.stampGrid(ZOMBIE_FRONT_ARM_BACK, cx + 0, 26 + bob, ZOMBIE_PALETTE);
  else if (step === 1 || step === 3) c.stampGrid(ZOMBIE_FRONT_ARM_DOWN, cx + 2, 26 + bob, ZOMBIE_PALETTE);
  else c.stampGrid(ZOMBIE_FRONT_ARM_FWD, cx + 4, 26 + bob, ZOMBIE_PALETTE);

  c.enforceBinaryAlpha();
  return c;
}

// Zombie Death 1: Same ~45px hulking zombie staggering backward, feet on y=58
const ZOMBIE_DEATH_1 = [
  '....KKKKKKKKKKK......................',
  '..KKGGGGGGGGGGGKK....................',
  '.KGGGGGGGGGGGGGGgK...................',
  'KGGGggggggggggggmmK..................',
  'KggmmmGGGGGGggggmmzK.................',
  'KggmKKKKKmmmmKKKKKmzK................',
  'KgmKEEEWWKKKKKEEEWWK.................',
  'KgmKEEEEEKKKKKEEEEEKK................',
  'KgmKKKKKKmmmmKKKKKKmK................',
  'KgmgggmWWWWWWWWmggmmK................',
  'KgmgggKMMMMMMMMKggmmK................',
  '.KzmggKWWTTTTWWKzzmK.................',
  '..KzzmmKMMMMMMMMKzzK.................',
  '...KKKKKKKKKKKKKKKKKKKKK.............',
  '..KKCRCCcCCCCCCCCCCCCCcccKK..KKKKKK..',
  '.KCCRRRCcCCCCCCCcCCCCcCccccKKGGGGggK.',
  'KCCrrCCccCCCCrrCCcCCCCCCCvvKGGggggmmK',
  'KCCCCCCCCccCCRrCCccCCCCCCvvKggmmmmzzK',
  'KCCCcCCCCcCCCCCCCcCCCCCCCvvKgmKKKKmzK',
  'KcccvvCCCCCCCcCCCCcCCCCCCvvKGGgggmmK.',
  '.KvvvvvvCCCCCCcCRrCCcvvvvvK.KggmzzK..',
  '..KvvvvvvvCCcCCCCCCCCvvvvK...KKKKK...',
  '..KnnnnnKKvvvvvvvvvvvvKKKK...........',
  '...KPPPPPPPppppppnnnnnnK.............',
  '...KPPPPPPPppppppnnnnnnK.............',
  '...KPPPppppK...KPPPppppK.............',
  '...KPPppnnnK....KPPppnnnK............',
  '...KpppnnnnK....KpppnnnnK............',
  '...KpppnnnnK.....KpppnnnnK...........',
  '...KpppnnnnK.....KpppnnnnK...........',
  '...KppnnnnnK.....KppnnnnnK...........',
  '...KppnnnnnK.....KppnnnnnK...........',
  '...KppnnnnnK.....KppnnnnnK...........',
  '...KppnnnnnK.....KppnnnnnK...........',
  '...KppnnnnnK.....KppnnnnnK...........',
  '...KuuuuuuuK.....KuuuuuuuK...........',
  '...KuuuuuuuK.....KuuuuuuuK...........',
  '...KuuuuuuuK.....KuuuuuuuK...........',
  '...KuuuuuuuK.....KuuuuuuuK...........',
  '...KuuuuuuuK.....KuuuuuuuK...........',
  '....KKKKKKK.......KKKKKKK............',
];

// Zombie Death 2: Dropping hard onto knees (33 rows, y=26..58)
const ZOMBIE_DEATH_2 = [
  '.....KKKKKKKKKKK.....................',
  '...KKGGGGGGGGGGGKK...................',
  '..KGGGGGGGGGGGGGGgK..................',
  '.KGGGggggggggggggmmK.................',
  '.KggmmmGGGGGGggggmmzK................',
  'KggmKKKKKmmmmKKKKKmzK................',
  'KgmKEEEWWKKKKKEEEWWK.................',
  'KgmKEEEEEKKKKKEEEEEKK................',
  'KgmKKKKKKmmmmKKKKKKmK................',
  'KgmgggmWWWWWWWWmggmmK................',
  'KgmgggKMMMMMMMMKggmmK................',
  '.KzmggKWWTTTTWWKzzmK.................',
  '..KKKKKKKKKKKKKKKKKKKKKK.............',
  '.KCRCCcCCCCCCCCCCCCCcccKK.KKKKKK.....',
  'KCCRRRCcCCCCCCCcCCCCcCcccKGGGGggK....',
  'KCCrrCCccCCCCrrCCcCCCCCCvKGGggggmmK..',
  'KCCCCCCCCccCCRrCCccCCCCCCvKggmmmzzK..',
  'KcccvvCCCCCCCcCCCCcCCCCCCvKGGgggmmK..',
  '.KvvvvvvCCCCCCcCRrCCcvvvvK.KggmzzK...',
  '..KvvvvvvvCCcCCCCCCCCvvvK...KKKKK....',
  '..KPPPPPPPppppppnnnnnnnnK............',
  '..KPPPPPPPppppppnnnnnnnnK............',
  '..KPPPPpppKPPPppppKPPppnnK...........',
  '..KuuuuKPPPppppKKPPPppppK............',
  '..KuuuuKPPppnnnKKPPppnnnK............',
  '..KuuuuKpppnnnnKKpppnnnnK............',
  '..KuuuuKppnnnnnKKppnnnnnK............',
  '..KuuuuKuuuuuuuKKuuuuuuuK............',
  '..KuuuuKuuuuuuuKKuuuuuuuK............',
  '...KKKKKuuuuuuuKKuuuuuuuK............',
  '........KKKKKKK..KKKKKKK.............',
];

// Zombie Death 3: Crashing forward onto ground (19 rows, y=40..58)
const ZOMBIE_DEATH_3 = [
  '.......KKKKKKKKKKK.........................',
  '.....KKGGGGGGGGGGGKK.......................',
  '....KGGGGGGGGGGGGGGgK......................',
  '...KGGGggggggggggggmmK..KKKKKKKKKKKKKK.....',
  '...KggmKKKKKmmmmKKKKmzKKCRCCcCCCCCCCCccK...',
  '..KgmKEEEWWKKKKKEEEWWKKCRRRCcCCCrrCCcCccK..',
  '..KgmKEEEEEKKKKKEEEEEKKCrrCCccCCCRrCCCCvvK.',
  '..KgmKKKKKKmmmmKKKKKKmKCCCCCCccCCCCCCCCvvK.',
  '...KgmgggmWWWWWWWWmggmKvvvvvvCCCCCCcvvvvvK.',
  '...KzmggKMMMMMMMMKzzmKKPPPPPPPppppppnnnnnK.',
  '....KKKKKKKKKKKKKKKKKKKPPPppppKPPPppppnnnK.',
  '.....KGGGGggKKGGGGggKKKPPppnnnKuuuuuuuKK...',
  '....KGGggggmmKggmmmzzK.KuuuuuuKuuuuuuuK....',
  '....KggmmmmzzKGGGGmmK..KuuuuuuKuuuuuuuK....',
  '.....KKKKKKKK.KKKKKK....KKKKKK.KKKKKKK.....',
];

// Zombie Death 4: Sprawled defeated horizontally along y=58 (13 rows, y=46..58)
const ZOMBIE_DEATH_4 = [
  '.......KKKKKKKKKKK................................',
  '.....KKGGGGGGGGGGGKK.....KKKKKKKKKKKKKKK..........',
  '....KGGGGGGGGGGGGGGgK...KCRCCcCCCCCCCCcccK........',
  '...KGGGggggggggggggmmK.KCRRRCcCCCCrrCCCcccK.......',
  '..KggmKKKKKmmmmKKKKmzKKCrrCCccCCCCRrCCCCvvK.......',
  '..KgmKEEEEKmmmmKEEEEKKKCCCCCCCccCCCCCCCCvvvK......',
  '..KgmKEEEEKmmmmKEEEEKmKvvvvvvCCCCCCcvvvvPPPPpK....',
  '...KgmgggmWWWWWWmggmmK.KvvvvvCCCCCCvvvvKPPPppnnK..',
  '...KzmggKMMMMMMMMKzzmK..KKKKKGGGGggKKKKKPPppnnnKK.',
  '....KKKKKKKKKKKKKKKKK.......KGGggggmmKKKuuuuuuuuK.',
  '......KGGGGggK..............KggmmmmzzKKKuuuuuuuuK.',
  '......KggmmmzzK..............KKKKKKKK...KKKKKKKK..',
  '.......KKKKKK.....................................',
];

function buildZombieDeathFrame(step: 0 | 1 | 2 | 3): PixelCanvas {
  const c = new PixelCanvas(64, 64);
  if (step === 0) c.stampGrid(ZOMBIE_DEATH_1, 13, 59 - ZOMBIE_DEATH_1.length, ZOMBIE_PALETTE);
  else if (step === 1) c.stampGrid(ZOMBIE_DEATH_2, 13, 59 - ZOMBIE_DEATH_2.length, ZOMBIE_PALETTE);
  else if (step === 2) c.stampGrid(ZOMBIE_DEATH_3, 10, 59 - ZOMBIE_DEATH_3.length, ZOMBIE_PALETTE);
  else c.stampGrid(ZOMBIE_DEATH_4, 7, 59 - ZOMBIE_DEATH_4.length, ZOMBIE_PALETTE);
  c.enforceBinaryAlpha();
  return c;
}

function buildHorizontalSheet(frames: PixelCanvas[]): PixelCanvas {
  const sheet = new PixelCanvas(frames.length * 64, 64);
  frames.forEach((frame, i) => sheet.blitFrom(frame, i * 64, 0));
  return sheet;
}

function buildCombinedSheet(row1: PixelCanvas, row2: PixelCanvas): PixelCanvas {
  const w = Math.max(row1.width, row2.width);
  const combined = new PixelCanvas(w, 128);
  combined.blitFrom(row1, 0, 0);
  combined.blitFrom(row2, 0, 64);
  return combined;
}

function upscaleNearest(src: PixelCanvas, scale: number): PixelCanvas {
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

const outDir = path.resolve(process.cwd(), 'public/sprites');
fs.mkdirSync(outDir, { recursive: true });

const survivorFrames: PixelCanvas[] = [
  buildSurvivorWalkFrame(0),
  buildSurvivorWalkFrame(1),
  buildSurvivorWalkFrame(2),
  buildSurvivorWalkFrame(3),
  buildSurvivorHurtFrame(),
  buildSurvivorDeathFrame(0),
  buildSurvivorDeathFrame(1),
  buildSurvivorDeathFrame(2),
  buildSurvivorDeathFrame(3),
];

const zombieFrames: PixelCanvas[] = [
  buildZombieWalkFrame(0),
  buildZombieWalkFrame(1),
  buildZombieWalkFrame(2),
  buildZombieWalkFrame(3),
  buildZombieDeathFrame(0),
  buildZombieDeathFrame(1),
  buildZombieDeathFrame(2),
  buildZombieDeathFrame(3),
];

const survivorSheet = buildHorizontalSheet(survivorFrames);
const zombieSheet = buildHorizontalSheet(zombieFrames);
const combinedSheet = buildCombinedSheet(survivorSheet, zombieSheet);

fs.writeFileSync(
  path.join(outDir, 'survivor_spritesheet.png'),
  encodePNG(survivorSheet.width, survivorSheet.height, survivorSheet.data)
);
fs.writeFileSync(
  path.join(outDir, 'walker_zombie_spritesheet.png'),
  encodePNG(zombieSheet.width, zombieSheet.height, zombieSheet.data)
);
fs.writeFileSync(
  path.join(outDir, 'combined_spritesheet.png'),
  encodePNG(combinedSheet.width, combinedSheet.height, combinedSheet.data)
);

const preview = new PixelCanvas(combinedSheet.width * 4, combinedSheet.height * 4);
for (let y = 0; y < preview.height; y++) {
  for (let x = 0; x < preview.width; x++) {
    const cellX = Math.floor(x / (64 * 4));
    const cellY = Math.floor(y / (64 * 4));
    const localX = x % (64 * 4);
    const localY = y % (64 * 4);
    const isChecker = ((Math.floor(x / 16) + Math.floor(y / 16)) % 2) === 0;
    let bg: RGBA = isChecker ? [34, 40, 50, 255] : [44, 52, 64, 255];
    if (localX === 0 || localY === 0) bg = [90, 110, 140, 255];
    if (localY >= 58 * 4 && localY < 59 * 4) bg = [235, 160, 40, 255];
    if (cellY === 1 && cellX >= 8) bg = [20, 24, 30, 255];
    preview.set(x, y, bg);
  }
}
preview.blitFrom(upscaleNearest(combinedSheet, 4), 0, 0);
fs.writeFileSync(
  path.join(outDir, 'inspection_4x.png'),
  encodePNG(preview.width, preview.height, preview.data)
);

const atlas = {
  meta: {
    frameSize: { w: 64, h: 64 },
    footBaselineY: 58,
    antiAliasing: false,
    gradients: false,
    transparentBackground: true,
    perspective: '3/4 top-down',
    style: '16-bit bold dark outline',
  },
  sheets: {
    survivor: {
      file: 'survivor_spritesheet.png',
      size: { w: survivorSheet.width, h: survivorSheet.height },
      columns: 9,
      rows: 1,
      animations: {
        walk: { startFrame: 0, count: 4, fps: 10, loop: true },
        hurt: { startFrame: 4, count: 1, fps: 8, loop: false },
        death: { startFrame: 5, count: 4, fps: 8, loop: false },
      },
      frames: survivorFrames.map((f, i) => ({
        index: i,
        name: i < 4 ? `walk_${i}` : i === 4 ? 'hurt_0' : `death_${i - 5}`,
        x: i * 64,
        y: 0,
        w: 64,
        h: 64,
        bounds: f.getBounds(),
      })),
    },
    walkerZombie: {
      file: 'walker_zombie_spritesheet.png',
      size: { w: zombieSheet.width, h: zombieSheet.height },
      columns: 8,
      rows: 1,
      animations: {
        walk: { startFrame: 0, count: 4, fps: 7, loop: true },
        death: { startFrame: 4, count: 4, fps: 8, loop: false },
      },
      frames: zombieFrames.map((f, i) => ({
        index: i,
        name: i < 4 ? `walk_${i}` : `death_${i - 4}`,
        x: i * 64,
        y: 0,
        w: 64,
        h: 64,
        bounds: f.getBounds(),
      })),
    },
  },
};

fs.writeFileSync(path.join(outDir, 'atlas.json'), JSON.stringify(atlas, null, 2));
console.log('Survivor bounds:', survivorFrames.map((f) => `${f.getBounds().height}h`).join(', '));
console.log('Zombie bounds:', zombieFrames.map((f) => `${f.getBounds().height}h`).join(', '));
