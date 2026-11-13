import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import {
  buildHorizontalStrip,
  encodePNG,
  OUTLINE,
  Palette,
  PixelCanvas,
  RGBA,
  saveInspectionPreview,
  saveSheetPNG,
} from './lib/pixel';

const V2_ROOT = path.resolve(process.cwd(), 'public/assets/v2');
const BOSS_REF_PATH = path.resolve(
  process.cwd(),
  'public/assets/packs/boss_exact/boss_mutant_brute_96x96.png'
);

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

function countUniqueOpaqueColors(frames: PixelCanvas[]): string[] {
  const set = new Set<string>();
  for (const f of frames) {
    for (let y = 0; y < f.height; y++) {
      for (let x = 0; x < f.width; x++) {
        const [r, g, b, a] = f.get(x, y);
        if (a > 0) {
          set.add('#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join(''));
        }
      }
    }
  }
  return Array.from(set);
}

function downsampleTo48(src: PixelCanvas): PixelCanvas {
  const dst = new PixelCanvas(48, 48);
  for (let y = 0; y < 48; y++) {
    const sy = Math.min(src.height - 1, Math.floor((y * src.height) / 48));
    for (let x = 0; x < 48; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x * src.width) / 48));
      const p = src.get(sx, sy);
      if (p[3] > 0) dst.set(x, y, p);
    }
  }
  return dst;
}

// ============================================================================
// PART A: ANIMATE 96x96 EXACT REFERENCE BOSS MUTANT BRUTE (8 frames: 768x96)
// Frames 0..3: idle_walk (frame 0 is exact unmodified reference sprite)
// Frames 4..7: attack (roar windup -> downward swing -> ground slam -> recover)
// Preserves exact 19 extracted colors, 1px #0A090D outline, sharp pixels, binary alpha.
// ============================================================================
type BossPart = 'head' | 'torso' | 'leftArm' | 'rightArm' | 'leftLeg' | 'rightLeg';

function classifyBossPixel(x: number, y: number): BossPart {
  // Back/screen-left arm (diagonal shoulder cut, ends at x<=28 below y=46)
  if (y >= 35 && y <= 40 && x <= 26) return 'leftArm';
  if (y >= 41 && y <= 45 && x <= 29) return 'leftArm';
  if (y >= 46 && y <= 65 && x <= 28) return 'leftArm';

  // Screen-right muscular foreground arm (includes top shoulder contour y>=39 at x>=61)
  if (y >= 39 && y <= 45 && x >= 60) return 'rightArm';
  if (y === 46 && x >= 61) return 'rightArm';
  if ((y === 47 || y === 48) && x >= 64) return 'rightArm';
  if (y >= 49 && y <= 52 && x >= 66) return 'rightArm';
  if (y >= 53 && y <= 63 && x >= 69) return 'rightArm';
  if (y >= 64 && y <= 75 && x >= 71) return 'rightArm';

  // Left leg & foot (starts at knee y=58, x: 31..48)
  if (x >= 31 && x <= 48 && y >= 58) return 'leftLeg';

  // Right leg & foot (strictly x <= 71 below y=64 so right hand claws at x>=73 stay in rightArm)
  if (x >= 53 && x <= 70 && y >= 64 && y <= 72) return 'rightLeg';
  if (x >= 53 && x <= 71 && y >= 73) return 'rightLeg';

  // Roaring Head (excludes upper bone spikes & back-ear seam)
  if (x >= 28 && x <= 47 && y >= 23 && y <= 46) {
    if (y <= 25 && x >= 40) return 'torso';
    if (y <= 27 && x >= 45) return 'torso';
    return 'head';
  }

  return 'torso';
}

function buildBossExactAnimatedFrames(): PixelCanvas[] {
  const { width, height, rgba } = decodePNG(BOSS_REF_PATH);
  const ref = new PixelCanvas(width, height);
  ref.data.set(rgba);

  const parts: Record<BossPart, Array<{ x: number; y: number; c: RGBA }>> = {
    leftArm: [],
    rightArm: [],
    leftLeg: [],
    rightLeg: [],
    torso: [],
    head: [],
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = ref.get(x, y);
      if (p[3] === 0) continue;
      parts[classifyBossPixel(x, y)].push({ x, y, c: p });
    }
  }

  // Exact palette colors sampled from boss_mutant_brute_96x96.png for seamless joint healing
  const FLESH_LIGHT: RGBA = [196, 168, 164, 255];
  const FLESH_MID: RGBA = [162, 130, 134, 255];
  const FLESH_SHAD: RGBA = [124, 90, 102, 255];
  const SHORTS_DARK: RGBA = [44, 58, 86, 255];
  const SHORTS_DEEP: RGBA = [26, 34, 54, 255];

  interface PoseSpec {
    torso: [number, number];
    head: [number, number];
    leftArm: [number, number];
    rightArm: [number, number];
    leftLeg: [number, number];
    rightLeg: [number, number];
    roarExtra?: boolean;
  }

  const poses: PoseSpec[] = [
    // 0: Exact unmodified reference pose
    { torso: [0, 0], head: [0, 0], leftArm: [0, 0], rightArm: [0, 0], leftLeg: [0, 0], rightLeg: [0, 0] },
    // 1: Heavy walk stride A
    { torso: [0, 1], head: [0, 2], leftArm: [-1, 2], rightArm: [1, -2], leftLeg: [-2, -1], rightLeg: [1, 0] },
    // 2: Heavy breath heave up
    { torso: [0, -1], head: [0, -1], leftArm: [1, -1], rightArm: [-1, 1], leftLeg: [0, 0], rightLeg: [0, 0] },
    // 3: Heavy walk stride B
    { torso: [0, 1], head: [-1, 2], leftArm: [2, -2], rightArm: [-2, 2], leftLeg: [1, 0], rightLeg: [-2, -1] },
    // 4: Attack roar windup (head & massive arms rear up high)
    { torso: [1, -2], head: [1, -4], leftArm: [-2, -8], rightArm: [2, -8], leftLeg: [0, 0], rightLeg: [1, 0], roarExtra: true },
    // 5: Attack downward crush swing
    { torso: [-2, 1], head: [-3, 2], leftArm: [-4, 1], rightArm: [-4, -3], leftLeg: [-1, 0], rightLeg: [1, 0], roarExtra: true },
    // 6: Attack ground slam impact (fists smash to baseline, hunched heavy)
    { torso: [-2, 3], head: [-3, 4], leftArm: [-3, 9], rightArm: [-3, 4], leftLeg: [-1, 1], rightLeg: [1, 0], roarExtra: true },
    // 7: Attack recovery
    { torso: [-1, 1], head: [-1, 2], leftArm: [-1, 3], rightArm: [0, 2], leftLeg: [0, 0], rightLeg: [0, 0] },
  ];

  return poses.map((pose, idx) => {
    if (idx === 0) return ref;

    const c = new PixelCanvas(96, 96);

    const drawPart = (name: BossPart, dx: number, dy: number) => {
      for (const px of parts[name]) {
        const nx = px.x + dx;
        const ny = px.y + dy;
        if (nx >= 1 && nx < 95 && ny >= 1 && ny < 95) {
          c.set(nx, ny, px.c);
        }
      }
    };

    // 1. Back/left arm + joint bridge
    drawPart('leftArm', pose.leftArm[0], pose.leftArm[1]);
    const lBridgeX = 27 + Math.round((pose.leftArm[0] + pose.torso[0]) / 2);
    const lBridgeY = 39 + Math.round((pose.leftArm[1] + pose.torso[1]) / 2);
    c.fillEllipse(lBridgeX + 2, lBridgeY + 2, 5, 4, FLESH_SHAD);
    c.fillEllipse(lBridgeX + 2, lBridgeY + 1, 3, 2, FLESH_MID);

    // 2. Legs + shorts hip overlap bridges (zero 1px gaps!)
    drawPart('leftLeg', pose.leftLeg[0], pose.leftLeg[1]);
    drawPart('rightLeg', pose.rightLeg[0], pose.rightLeg[1]);
    c.fillRect(34 + Math.min(pose.torso[0], pose.leftLeg[0]), 56 + Math.min(pose.torso[1], pose.leftLeg[1]), 13, 8, SHORTS_DARK);
    c.fillRect(54 + Math.min(pose.torso[0], pose.rightLeg[0]), 58 + Math.min(pose.torso[1], pose.rightLeg[1]), 15, 8, SHORTS_DEEP);

    // 3. Torso + heal old neck/jaw/shoulder outline seams left behind when head/arms shift
    drawPart('torso', pose.torso[0], pose.torso[1]);
    c.fillRect(45 + pose.torso[0], 28 + pose.torso[1], 5, 16, FLESH_MID);
    c.fillRect(34 + pose.torso[0], 43 + pose.torso[1], 14, 4, FLESH_MID);
    c.fillRect(36 + pose.torso[0], 44 + pose.torso[1], 10, 3, FLESH_LIGHT);

    // Seamlessly bridge right shoulder along curved deltoid contour
    if (pose.rightArm[1] >= pose.torso[1]) {
      const yMid = Math.round((39 + pose.torso[1] + 40 + pose.rightArm[1]) / 2);
      const xBase = 60 + Math.min(pose.torso[0], pose.rightArm[0]);
      c.fillEllipse(xBase + 5, yMid, 6, 3, FLESH_MID);
      c.fillEllipse(xBase + 9, yMid + 1, 5, 2, FLESH_LIGHT);
    } else {
      const steps = 4;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const bx = Math.round(62 + pose.torso[0] * (1 - t) + (pose.rightArm[0] + 4) * t);
        const by = Math.round(43 + pose.torso[1] * (1 - t) + pose.rightArm[1] * t);
        c.fillEllipse(bx, by, 5, 4, FLESH_MID);
        c.fillEllipse(bx - 1, by - 1, 3, 2, FLESH_LIGHT);
      }
    }

    // 4. Head on top of healed neck
    drawPart('head', pose.head[0], pose.head[1]);

    // 5. Foreground muscular right arm
    drawPart('rightArm', pose.rightArm[0], pose.rightArm[1]);

    // Roaring open mouth highlight on attack frames
    if (pose.roarExtra) {
      const mx = 34 + pose.head[0];
      const my = 40 + pose.head[1];
      c.fillRect(mx, my, 9, 4, [116, 20, 28, 255]);
      c.fillRect(mx + 1, my, 2, 1, [246, 242, 236, 255]);
      c.fillRect(mx + 5, my, 2, 1, [246, 242, 236, 255]);
      c.fillRect(mx + 2, my + 3, 2, 1, [246, 242, 236, 255]);
      c.fillRect(mx + 6, my + 3, 2, 1, [246, 242, 236, 255]);
    }

    c.applyOutline(OUTLINE);
    c.enforceBinaryAlpha();
    return c;
  });
}

// ============================================================================
// GROUP B — 1. CRATE BREAK SPRITESHEET (48x48, 5 frames = 240x48)
// Matches crate_spritesheet.png CRATE_PAL: #0a090d, #e3933c, #d58237, #a25a34, #6a3a33
// ============================================================================
const CRATE_PAL: Palette = {
  K: OUTLINE,
  L: [227, 147, 60, 255],  // #e3933c bright amber wood
  M: [213, 130, 55, 255],  // #d58237 midtone wood
  D: [162, 90, 52, 255],   // #a25a34 shadow wood
  S: [106, 58, 51, 255],   // #6a3a33 deep recess
  Y: [250, 214, 132, 255], // #fad684 bright fresh wood splinter
};

function drawCratePlank(c: PixelCanvas, x: number, y: number, w: number, h: number, lit = true) {
  c.fillRect(x, y, w, h, CRATE_PAL.D);
  c.fillRect(x, y, w, Math.max(1, Math.floor(h * 0.5)), lit ? CRATE_PAL.L : CRATE_PAL.M);
  if (w >= 4 && h >= 4) {
    c.fillRect(x + 1, y + h - 1, w - 2, 1, CRATE_PAL.S);
  }
}

function buildCrateBreakFrames(): PixelCanvas[] {
  return [0, 1, 2, 3, 4].map((step) => {
    const c = new PixelCanvas(48, 48);
    const ox = 8;
    const oy = 8;
    const sz = 32;

    if (step === 0) {
      // Frame 0: Heavy structural cracking + splinters popping from lid
      c.fillRect(ox, oy, sz, sz, CRATE_PAL.D);
      c.fillRect(ox, oy, sz, 6, CRATE_PAL.L);
      c.fillRect(ox, oy + 6, 5, sz - 6, CRATE_PAL.M);
      c.fillRect(ox + sz - 5, oy + 6, 5, sz - 6, CRATE_PAL.D);
      c.fillRect(ox + 5, oy + sz - 5, sz - 10, 5, CRATE_PAL.S);
      c.fillRect(ox + 5, oy + 6, sz - 10, sz - 11, CRATE_PAL.S);
      c.fillRect(ox + 6, oy + 7, sz - 12, sz - 13, CRATE_PAL.D);

      for (let i = 0; i < sz - 12; i++) {
        c.fillRect(ox + 6 + i, oy + 7 + i, 3, 3, CRATE_PAL.M);
        c.fillRect(ox + sz - 9 - i, oy + 7 + i, 3, 3, CRATE_PAL.M);
      }
      // Deep jagged diagonal crack + bright splinter edges
      for (let i = 0; i < 24; i++) {
        const cx = ox + 7 + i;
        const cy = oy + 5 + Math.floor(i * 0.95);
        c.fillRect(cx, cy, 3, 2, OUTLINE);
        c.set(cx - 1, cy, CRATE_PAL.Y);
      }
      c.fillRect(ox + 18, oy + 15, 7, 5, OUTLINE);
      // Popping top splinters
      drawCratePlank(c, 16, 3, 4, 3, true);
      drawCratePlank(c, 29, 4, 3, 3, true);
    } else if (step === 1) {
      // Frame 1: Bursting outward — crate walls splitting open!
      // Left wall kicked left
      drawCratePlank(c, 4, 12, 8, 26, true);
      drawCratePlank(c, 7, 10, 10, 5, true);
      // Right wall kicked right
      drawCratePlank(c, 35, 13, 8, 25, false);
      drawCratePlank(c, 30, 10, 10, 5, true);
      // Bottom base plank split
      drawCratePlank(c, 10, 34, 13, 6, false);
      drawCratePlank(c, 25, 34, 12, 6, false);
      // Center snapping cross-boards & airborne lid shards
      drawCratePlank(c, 14, 18, 9, 5, true);
      drawCratePlank(c, 25, 19, 9, 5, true);
      drawCratePlank(c, 19, 6, 8, 4, true);
      c.fillRect(22, 13, 3, 3, CRATE_PAL.Y);
      c.fillRect(13, 28, 3, 3, CRATE_PAL.Y);
    } else if (step === 2) {
      // Frame 2: Splinters flying outward & tumbling down
      drawCratePlank(c, 3, 18, 8, 5, true);
      drawCratePlank(c, 36, 17, 9, 5, true);
      drawCratePlank(c, 13, 10, 8, 4, true);
      drawCratePlank(c, 27, 11, 7, 4, false);
      drawCratePlank(c, 8, 30, 10, 5, false);
      drawCratePlank(c, 30, 31, 9, 5, false);
      drawCratePlank(c, 19, 25, 10, 5, true);
      c.fillRect(10, 21, 3, 2, CRATE_PAL.Y);
      c.fillRect(33, 25, 3, 2, CRATE_PAL.Y);
      c.fillRect(22, 18, 3, 3, CRATE_PAL.L);
    } else if (step === 3) {
      // Frame 3: Shards hitting the ground around y=32..42
      drawCratePlank(c, 5, 33, 9, 4, true);
      drawCratePlank(c, 34, 34, 9, 4, false);
      drawCratePlank(c, 15, 36, 11, 5, true);
      drawCratePlank(c, 25, 35, 8, 4, false);
      drawCratePlank(c, 12, 26, 6, 3, true);
      drawCratePlank(c, 29, 27, 6, 3, true);
      c.fillRect(21, 30, 3, 2, CRATE_PAL.Y);
    } else {
      // Frame 4: Small grounded debris remnant (clean low-profile scraps)
      drawCratePlank(c, 13, 37, 10, 4, true);
      drawCratePlank(c, 24, 38, 10, 3, false);
      drawCratePlank(c, 18, 34, 7, 3, true);
      c.fillRect(11, 40, 3, 2, CRATE_PAL.S);
      c.fillRect(34, 39, 3, 2, CRATE_PAL.S);
    }

    c.applyOutline(OUTLINE);
    c.enforceBinaryAlpha();
    return c;
  });
}

// ============================================================================
// GROUP B — 2. BARREL EXPLOSION SPRITESHEET (96x96, 7 frames = 672x96)
// Crisp 16-bit pixel art, 1px #0A090D outline, <= 10 colors, zero AA/gradients.
// ============================================================================
const EXPL_W: RGBA = [255, 255, 232, 255]; // white-hot core
const EXPL_Y: RGBA = [255, 224, 64, 255];  // bright yellow fire
const EXPL_O: RGBA = [248, 138, 28, 255];  // vivid orange fire
const EXPL_R: RGBA = [208, 56, 24, 255];   // crimson flame edge
const EXPL_SM1: RGBA = [136, 144, 160, 255]; // smoke highlight
const EXPL_SM2: RGBA = [90, 96, 112, 255];   // smoke mid
const EXPL_SM3: RGBA = [58, 62, 74, 255];    // smoke shadow
const BARREL_RED: RGBA = [222, 62, 54, 255]; // red barrel hull shard
const BARREL_RIM: RGBA = [152, 162, 178, 255];

function drawSmokeCluster(c: PixelCanvas, puffs: Array<[number, number, number]>) {
  for (const [px, py, r] of puffs) {
    c.fillEllipse(px, py, r, Math.max(3, Math.round(r * 0.85)), EXPL_SM3);
  }
  for (const [px, py, r] of puffs) {
    c.fillEllipse(px - 1, py - 1, Math.max(2, r - 2), Math.max(2, Math.round(r * 0.72)), EXPL_SM2);
  }
  for (const [px, py, r] of puffs) {
    c.fillEllipse(px - 2, py - 3, Math.max(2, Math.floor(r * 0.52)), Math.max(2, Math.floor(r * 0.42)), EXPL_SM1);
  }
}

function buildBarrelExplosionFrames(): PixelCanvas[] {
  return [0, 1, 2, 3, 4, 5, 6].map((step) => {
    const c = new PixelCanvas(96, 96);
    const cx = 48;
    const cy = 50;

    if (step === 0) {
      // Frame 0: Swelling red barrel bulging + hazard emblem + glowing cracks
      c.fillRect(cx - 15, cy - 17, 30, 34, BARREL_RED);
      c.fillRect(cx - 12, cy - 17, 8, 34, [242, 86, 68, 255]);
      c.fillEllipse(cx, cy - 17, 15, 5, BARREL_RIM);
      c.fillEllipse(cx, cy + 17, 15, 4, BARREL_RED);
      c.fillRect(cx - 16, cy - 7, 32, 3, BARREL_RIM);
      c.fillRect(cx - 16, cy + 6, 32, 3, BARREL_RIM);
      // Glowing rupture seams + ignition sparks
      c.fillRect(cx - 4, cy - 14, 8, 28, EXPL_O);
      c.fillRect(cx - 2, cy - 12, 4, 24, EXPL_Y);
      c.fillRect(cx - 13, cy - 3, 26, 6, EXPL_O);
      c.fillRect(cx - 11, cy - 2, 22, 4, EXPL_Y);
      c.fillRect(cx - 4, cy - 4, 8, 8, EXPL_W);
      c.fillRect(cx - 2, cy - 24, 4, 5, EXPL_Y);
    } else if (step === 1) {
      // Frame 1: Flash ignition starburst + flying barrel shards
      c.fillEllipse(cx, cy, 27, 25, EXPL_R);
      c.fillEllipse(cx, cy, 21, 19, EXPL_O);
      c.fillEllipse(cx, cy, 14, 13, EXPL_Y);
      c.fillEllipse(cx, cy, 8, 8, EXPL_W);
      c.fillRect(cx - 33, cy - 3, 66, 6, EXPL_Y);
      c.fillRect(cx - 3, cy - 33, 6, 66, EXPL_Y);
      c.fillRect(cx - 25, cy - 2, 50, 4, EXPL_W);
      c.fillRect(cx - 2, cy - 25, 4, 50, EXPL_W);
      c.fillRect(16, 20, 6, 5, BARREL_RED);
      c.fillRect(74, 22, 6, 5, BARREL_RED);
      c.fillRect(18, 74, 5, 5, BARREL_RIM);
      c.fillRect(72, 72, 5, 5, BARREL_RIM);
    } else if (step === 2) {
      // Frame 2: Peak explosion — giant billowing multi-lobed fireball + outer smoke ring
      drawSmokeCluster(c, [
        [23, 33, 12],
        [73, 33, 12],
        [21, 65, 11],
        [75, 65, 11],
        [48, 17, 13],
      ]);
      // Multi-lobed organic fireball
      for (const [fx, fy, fr] of [[cx, cy, 29], [cx - 10, cy - 6, 17], [cx + 11, cy - 4, 16], [cx, cy + 9, 17]]) {
        c.fillEllipse(fx, fy, fr, Math.round(fr * 0.9), EXPL_R);
      }
      for (const [fx, fy, fr] of [[cx - 1, cy - 1, 23], [cx - 8, cy - 5, 13], [cx + 9, cy - 3, 12]]) {
        c.fillEllipse(fx, fy, fr, Math.round(fr * 0.88), EXPL_O);
      }
      c.fillEllipse(cx - 2, cy - 3, 17, 15, EXPL_Y);
      c.fillEllipse(cx - 3, cy - 4, 10, 9, EXPL_W);
      c.fillRect(10, 26, 4, 4, BARREL_RED);
      c.fillRect(82, 28, 4, 4, BARREL_RED);
      c.fillRect(14, 78, 4, 3, EXPL_O);
      c.fillRect(78, 78, 4, 3, EXPL_O);
    } else if (step === 3) {
      // Frame 3: Expanding blast — wider smoke lobes & organic fire tongues
      drawSmokeCluster(c, [
        [20, 30, 14],
        [76, 30, 14],
        [18, 62, 13],
        [78, 62, 13],
        [48, 15, 14],
        [48, 72, 13],
      ]);
      for (const [fx, fy, fr] of [[cx, cy - 2, 22], [cx - 10, cy + 3, 13], [cx + 11, cy + 2, 13], [cx, cy - 11, 13]]) {
        c.fillEllipse(fx, fy, fr, Math.round(fr * 0.88), EXPL_R);
      }
      c.fillEllipse(cx - 1, cy - 3, 18, 15, EXPL_O);
      c.fillEllipse(cx - 2, cy - 4, 11, 9, EXPL_Y);
      c.fillEllipse(cx - 3, cy - 5, 5, 5, EXPL_W);
    } else if (step === 4) {
      // Frame 4: Rising fire & thick billowing smoke plume
      drawSmokeCluster(c, [
        [32, 24, 14],
        [64, 24, 14],
        [48, 16, 15],
        [22, 48, 14],
        [74, 48, 14],
        [36, 62, 13],
        [60, 62, 13],
      ]);
      c.fillEllipse(cx - 4, cy + 3, 13, 11, EXPL_R);
      c.fillEllipse(cx + 6, cy + 1, 12, 10, EXPL_R);
      c.fillEllipse(cx, cy, 13, 11, EXPL_O);
      c.fillEllipse(cx - 2, cy - 1, 7, 6, EXPL_Y);
      c.fillRect(28, 34, 6, 5, EXPL_O);
      c.fillRect(62, 36, 5, 5, EXPL_O);
    } else if (step === 5) {
      // Frame 5: Dispersing smoke clouds + fading embers
      drawSmokeCluster(c, [
        [28, 22, 11],
        [68, 22, 11],
        [48, 14, 10],
        [20, 50, 10],
        [76, 50, 10],
        [48, 56, 11],
      ]);
      c.fillEllipse(cx, cy + 4, 7, 6, EXPL_R);
      c.fillRect(cx - 2, cy + 2, 4, 4, EXPL_O);
      c.fillRect(36, 36, 3, 3, EXPL_Y);
      c.fillRect(58, 38, 3, 3, EXPL_O);
    } else {
      // Frame 6: Fading wisps
      drawSmokeCluster(c, [
        [26, 24, 7],
        [70, 26, 6],
        [48, 16, 7],
        [36, 48, 6],
        [62, 52, 5],
      ]);
      c.fillRect(46, 34, 3, 3, EXPL_O);
      c.fillRect(54, 40, 2, 2, EXPL_R);
    }

    c.applyOutline(OUTLINE);
    c.enforceBinaryAlpha();
    return c;
  });
}

// ============================================================================
// GROUP B — 3. BARREL BURN MARK (96x96, 1 frame)
// Crisp binary-alpha scorched ground crater mark, zero soft gradients.
// ============================================================================
function buildBarrelBurnMark(): PixelCanvas {
  const c = new PixelCanvas(96, 96);
  const cx = 48;
  const cy = 50;
  const CHAR_OUTER: RGBA = [58, 52, 58, 255];
  const CHAR_MID: RGBA = [36, 32, 38, 255];
  const CHAR_CORE: RGBA = [20, 18, 24, 255];
  const EMBER_DARK: RGBA = [116, 22, 30, 255];
  const EMBER_WARM: RGBA = [186, 62, 28, 255];

  // Crisp stepped pixel scorch ellipses (3/4 ground perspective)
  c.fillEllipse(cx, cy, 34, 21, CHAR_OUTER);
  // Radial soot spokes
  const spokes = [
    [cx - 38, cy - 2, 10, 4],
    [cx + 28, cy - 3, 10, 4],
    [cx - 28, cy - 18, 7, 5],
    [cx + 20, cy - 17, 8, 5],
    [cx - 26, cy + 14, 8, 5],
    [cx + 19, cy + 14, 8, 5],
    [cx - 4, cy - 24, 8, 5],
    [cx - 3, cy + 18, 7, 5],
  ];
  for (const [sx, sy, sw, sh] of spokes) {
    c.fillRect(sx, sy, sw, sh, CHAR_OUTER);
  }

  c.fillEllipse(cx, cy, 26, 15, CHAR_MID);
  c.fillEllipse(cx, cy + 1, 16, 9, CHAR_CORE);

  // Subtle charred ground cracks & glowing dying ember flecks
  c.fillRect(cx - 12, cy - 3, 6, 2, OUTLINE);
  c.fillRect(cx + 6, cy + 2, 7, 2, OUTLINE);
  c.fillRect(cx - 3, cy + 5, 5, 2, OUTLINE);
  c.fillRect(cx - 5, cy - 1, 3, 2, EMBER_DARK);
  c.fillRect(cx + 3, cy, 2, 2, EMBER_WARM);
  c.fillRect(cx - 14, cy + 6, 3, 2, EMBER_DARK);

  c.applyOutline(OUTLINE);
  c.enforceBinaryAlpha();
  return c;
}

// ============================================================================
// GROUP B — 4. ACID SPLAT SPRITESHEET (32x32, 4 frames = 128x32)
// Matches ACID_PAL from generate-group2.ts
// ============================================================================
const ACID_PAL: Palette = {
  K: OUTLINE,
  W: [232, 255, 192, 255],
  L: [148, 255, 42, 255],
  G: [72, 198, 34, 255],
  D: [34, 128, 36, 255],
};

function buildAcidSplatFrames(): PixelCanvas[] {
  return [0, 1, 2, 3].map((step) => {
    const c = new PixelCanvas(32, 32);
    const cx = 16;
    const cy = 18;

    if (step === 0) {
      // Frame 0: Fresh impact puddle + upward acid droplets
      c.fillEllipse(cx, cy, 8, 5, ACID_PAL.D);
      c.fillEllipse(cx, cy - 1, 6, 4, ACID_PAL.G);
      c.fillEllipse(cx - 1, cy - 1, 4, 2, ACID_PAL.L);
      c.fillRect(cx - 1, cy - 2, 2, 2, ACID_PAL.W);
      // Upward droplets
      c.fillRect(10, 9, 2, 3, ACID_PAL.L);
      c.fillRect(20, 8, 2, 3, ACID_PAL.L);
      c.fillRect(15, 6, 2, 3, ACID_PAL.W);
    } else if (step === 1) {
      // Frame 1: Expanding splat puddle + popping center bubble
      c.fillEllipse(cx, cy, 12, 7, ACID_PAL.D);
      c.fillEllipse(cx - 1, cy - 1, 10, 5, ACID_PAL.G);
      c.fillEllipse(cx - 1, cy - 1, 7, 3, ACID_PAL.L);
      c.fillRect(13, 14, 4, 4, ACID_PAL.W);
      c.fillRect(5, 16, 2, 2, ACID_PAL.G);
      c.fillRect(25, 15, 2, 2, ACID_PAL.G);
      c.fillRect(11, 24, 3, 2, ACID_PAL.D);
    } else if (step === 2) {
      // Frame 2: Bubbling pool with bright twin toxic bubbles
      c.fillEllipse(cx, cy, 13, 7, ACID_PAL.D);
      c.fillEllipse(cx, cy - 1, 11, 5, ACID_PAL.G);
      c.fillEllipse(cx - 2, cy - 1, 6, 3, ACID_PAL.L);
      // Bubbles
      c.fillRect(11, 13, 4, 4, ACID_PAL.L);
      c.fillRect(12, 14, 2, 2, ACID_PAL.W);
      c.fillRect(19, 15, 3, 3, ACID_PAL.L);
      c.set(20, 15, ACID_PAL.W);
      c.fillRect(5, 20, 2, 2, ACID_PAL.G);
      c.fillRect(26, 17, 2, 2, ACID_PAL.G);
    } else {
      // Frame 3: Settling receding puddle rings
      c.fillEllipse(cx, cy, 11, 6, ACID_PAL.D);
      c.fillEllipse(cx, cy, 8, 4, ACID_PAL.G);
      c.fillRect(11, 16, 3, 2, ACID_PAL.L);
      c.fillRect(18, 17, 3, 2, ACID_PAL.L);
      c.set(12, 16, ACID_PAL.W);
      c.fillRect(6, 18, 2, 1, ACID_PAL.D);
      c.fillRect(25, 19, 2, 1, ACID_PAL.D);
    }

    c.applyOutline(OUTLINE);
    c.enforceBinaryAlpha();
    return c;
  });
}

// ============================================================================
// GROUP C — 1. SURVIVOR SHOOT SPRITESHEET (64x64, 2 frames = 128x64)
// Matches survivor_refined_spritesheet.png (10 flat colors + #0A090D outline),
// facing RIGHT, footBaselineY = 58, NO baked ground shadow, NO backpack!
// ============================================================================
const SURVIVOR_PALETTE: Palette = {
  K: OUTLINE,
  H: [148, 78, 54, 255],
  h: [92, 44, 34, 255],
  S: [252, 212, 164, 255],
  s: [218, 146, 102, 255],
  W: [255, 255, 255, 255],
  R: [238, 52, 54, 255],
  r: [176, 26, 38, 255],
  B: [58, 122, 192, 255],
  b: [32, 68, 120, 255],
  U: [36, 40, 44, 255],
};

const SURV_HEAD = [
  '.....KKK...KKK........',
  '....KHHHK.KHHHK.......',
  '...KHHHHHKHHHHHKK.....',
  '..KHHHHHHHHHHHHHHK....',
  '.KHHHHHHHHHHHhhhhhK...',
  '.KHHhhhKKKKKhhhhhhK...',
  'KHHhhKKSSSSSKKhhhhhK..',
  'KhhhKSSSSSSSSSKKhhhK..',
  'KhhKSSSSKWKSSKWKhhK...',
  'KhhKSSSSKWKSSKWKhhK...',
  '.KhKSSSSKKSSSKKshK....',
  '.KhKsSSSSSSSSsssK.....',
  '..KKKssssssssssK......',
  '....KsssssssssK.......',
  '.....KKKKKKKKK........',
];

const SURV_TORSO = [
  '..KKKKKKKKKKKKK...',
  '.KRRRRRRRRRRRRrK..',
  'KRRRRRRRRRRRRrrrK.',
  'KRRRRRRRRRRRrrrrK.',
  'KRRRRRRRRrrrrrrrK.',
  'KRRRRrrrrrrrrrrrK.',
  '.KRRRRrrrrrrrrrrK.',
  '.KrrrrrrrrrrrrrrK.',
  '..KBBBBBBBBbbbbbK.',
  '..KBBBBBBBBbbbbbK.',
  '...KKKKKKKKKKKKK..',
];

const SURV_LEG_PLANT = [
  '.KKKKK.',
  'KBBBBbK',
  'KBBBbbK',
  'KBBBbbK',
  'KbbbbbK',
  'KbbbbbK',
  'KbbbbbK',
  'KUUUUUK',
  'KUUUUUK',
  'KUUUUUK',
  '.KKKKK.',
]; // 11 rows -> 48..58

const SURV_LEG_FWD = [
  '.KKKKK...',
  'KBBBBbK..',
  'KBBBbbK..',
  '.KBBbbK..',
  '.KbbbbbK.',
  '..KbbbbK.',
  '..KbbbbbK',
  '..KUUUUUUK',
  '..KUUUUUUK',
  '..KUUUUUUK',
  '...KKKKKK.',
];

// Extended aiming arm (facing right)
const SURV_BACK_ARM_AIM = [
  '.KKKKKKKKK.',
  'KRRRRrrSSSK',
  '.KKKKKKssK.',
  '.......KK..',
];

const SURV_FRONT_ARM_AIM = [
  '.KKKKKKKKKKK.',
  'KRRRRRRRRSSSK',
  'KRRRRrrrrssKK',
  '.KKKKKKKKKK..',
];

const SURV_FRONT_ARM_RECOIL = [
  '.KKKKKKKKKK.',
  'KRRRRRRRSSSK',
  'KRRRRrrrssKK',
  '.KKKKKKKKKK.',
];

function buildSurvivorShootFrames(): PixelCanvas[] {
  return [0, 1].map((step) => {
    const c = new PixelCanvas(64, 64);
    const recoilX = step === 1 ? -2 : 0;
    const recoilY = step === 1 ? -1 : 0;
    const cx = 22 + recoilX;

    // Back aiming arm
    c.stampGrid(SURV_BACK_ARM_AIM, cx + 14 + (step === 1 ? -1 : 0), 39 + recoilY, SURVIVOR_PALETTE);

    // Braced legs planted cleanly at y = 58 (no ground shadow!)
    c.stampGrid(SURV_LEG_PLANT, 26, 48, SURVIVOR_PALETTE);
    c.stampGrid(SURV_LEG_FWD, 32, 48, SURVIVOR_PALETTE);

    // Clean Red Top Torso + Head (kick back cleanly on recoil frame)
    c.stampGrid(SURV_TORSO, cx + 2, 38, SURVIVOR_PALETTE);
    c.stampGrid(SURV_HEAD, cx + 1, 24 + (step === 1 ? 1 : 0), SURVIVOR_PALETTE);

    // Foreground extended aiming arm
    if (step === 0) {
      c.stampGrid(SURV_FRONT_ARM_AIM, cx + 10, 40, SURVIVOR_PALETTE);
    } else {
      c.stampGrid(SURV_FRONT_ARM_RECOIL, cx + 8, 38, SURVIVOR_PALETTE);
    }

    c.enforceBinaryAlpha();
    return c;
  });
}

// ============================================================================
// GROUP C — 2. PISTOL SPRITE (24x16, 1 frame, facing RIGHT)
// ============================================================================
const PISTOL_PAL: Palette = {
  K: OUTLINE,
  L: [203, 213, 225, 255], // bright slide highlight
  M: [100, 116, 139, 255], // gunmetal midtone
  D: [51, 65, 85, 255],    // dark steel receiver
  W: [148, 78, 54, 255],   // warm grip highlight
  w: [92, 44, 34, 255],    // dark grip shadow
};

const PISTOL_GRID = [
  '..KKKKKKKKKKKKKKKKKK..',
  '.KLLLLLLLLLLLLLLLLLLK.',
  '.KMMMMMMMMMMMMMMMMDDK.',
  '.KDDDDDDDDDDDDDDDDDDK.',
  '..KKWWWWKKKKKKDDDDKK..',
  '...KWWwwK.K.K.KKKK....',
  '...KWWwwKKKK..........',
  '..KWWwwK..............',
  '..KWWwwK..............',
  '..KKKKKK..............',
];

function buildPistolSprite(): PixelCanvas {
  const c = new PixelCanvas(24, 16);
  c.stampGrid(PISTOL_GRID, 1, 3, PISTOL_PAL);
  c.enforceBinaryAlpha();
  return c;
}

// ============================================================================
// GROUP C — 3. LEVEL-UP RING SPRITESHEET (96x96, 6 frames = 576x96)
// Expanding golden pixel ring, crisp #0A090D outline, ZERO soft gradients.
// ============================================================================
const GOLD_WHITE: RGBA = [255, 255, 232, 255];
const GOLD_LIGHT: RGBA = [254, 240, 138, 255];
const GOLD_MID: RGBA = [250, 204, 21, 255];
const GOLD_DARK: RGBA = [202, 138, 4, 255];

function drawStarSparkle(c: PixelCanvas, x: number, y: number, size: 1 | 2) {
  if (size === 1) {
    c.set(x, y, GOLD_WHITE);
    c.set(x - 1, y, GOLD_LIGHT);
    c.set(x + 1, y, GOLD_LIGHT);
    c.set(x, y - 1, GOLD_LIGHT);
    c.set(x, y + 1, GOLD_LIGHT);
  } else {
    c.fillRect(x - 1, y - 1, 3, 3, GOLD_WHITE);
    c.fillRect(x - 3, y, 7, 1, GOLD_LIGHT);
    c.fillRect(x, y - 3, 1, 7, GOLD_LIGHT);
  }
}

function drawGoldenPixelRing(
  c: PixelCanvas,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  thickness: number,
  brokenMask = false
) {
  const outerRx = rx;
  const outerRy = ry;
  const innerRx = Math.max(1, rx - thickness);
  const innerRy = Math.max(1, ry - thickness);

  for (let y = Math.floor(cy - outerRy - 1); y <= Math.ceil(cy + outerRy + 1); y++) {
    for (let x = Math.floor(cx - outerRx - 1); x <= Math.ceil(cx + outerRx + 1); x++) {
      const ox = (x - cx) / outerRx;
      const oy = (y - cy) / outerRy;
      const ix = (x - cx) / innerRx;
      const iy = (y - cy) / innerRy;
      const dOut = ox * ox + oy * oy;
      const dIn = ix * ix + iy * iy;
      if (dOut <= 1 && dIn >= 1) {
        if (brokenMask) {
          const angle = Math.atan2(y - cy, x - cx);
          const sector = Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 12);
          if (sector % 2 === 1) continue;
        }
        // Top-left gold lighting
        const rel = (x - cx) / outerRx + (y - cy) / outerRy;
        let col = GOLD_MID;
        if (rel < -0.55) col = GOLD_WHITE;
        else if (rel < 0.05) col = GOLD_LIGHT;
        else if (rel > 0.65) col = GOLD_DARK;
        c.set(x, y, col);
      }
    }
  }
}

function buildLevelUpRingFrames(): PixelCanvas[] {
  const specs = [
    { rx: 11, ry: 8, t: 4, broken: false, stars: [[48, 36], [35, 50], [61, 50]] },
    { rx: 18, ry: 13, t: 5, broken: false, stars: [[48, 29], [28, 48], [68, 48], [48, 67]] },
    { rx: 26, ry: 18, t: 5, broken: false, stars: [[24, 34], [72, 34], [22, 60], [74, 60], [48, 24]] },
    { rx: 33, ry: 23, t: 5, broken: false, stars: [[18, 36], [78, 36], [16, 62], [80, 62], [48, 19], [48, 76]] },
    { rx: 39, ry: 27, t: 4, broken: false, stars: [[14, 30], [82, 30], [12, 64], [84, 64], [48, 15]] },
    { rx: 43, ry: 30, t: 3, broken: true, stars: [[16, 26], [80, 26], [14, 68], [82, 68], [48, 13], [48, 82]] },
  ];

  return specs.map((sp, idx) => {
    const c = new PixelCanvas(96, 96);
    drawGoldenPixelRing(c, 48, 48, sp.rx, sp.ry, sp.t, sp.broken);
    if (idx <= 2) {
      // Secondary crisp inner ring echo
      drawGoldenPixelRing(c, 48, 48, Math.max(5, sp.rx - 7), Math.max(4, sp.ry - 5), 2, idx === 2);
    }
    sp.stars.forEach(([sx, sy], si) => {
      drawStarSparkle(c, sx, sy, (idx + si) % 2 === 0 ? 2 : 1);
    });
    c.applyOutline(OUTLINE);
    c.enforceBinaryAlpha();
    return c;
  });
}

// ============================================================================
// GROUP C — 4. PICKUP ICONS SPRITESHEET (32x32, 8 frames = 256x32)
// 4 icons x 2 sparkle/pulse frames:
//   [0,1] Health, [2,3] Magnet, [4,5] Bomb, [6,7] Speed
// ============================================================================
const ICON_PAL: Palette = {
  K: OUTLINE,
  W: [255, 255, 255, 255],
  R: [238, 52, 54, 255],
  r: [176, 26, 38, 255],
  P: [252, 165, 165, 255], // bright pink-red highlight
  S: [203, 213, 225, 255], // silver tip highlight
  s: [100, 116, 139, 255], // silver/slate shadow
  D: [42, 48, 62, 255],    // dark iron bomb
  d: [24, 28, 38, 255],    // deep bomb shadow
  Y: [250, 204, 21, 255],  // gold/spark yellow
  y: [202, 138, 4, 255],   // gold shadow
  O: [248, 138, 28, 255],  // fuse orange
  C: [56, 189, 248, 255],  // speed/magnet cyan glint
};

const ICON_HEALTH = [
  '....KKKKKKKKKKKKKK....',
  '...KWWWWWWWWWWWWWWK...',
  '..KWWPPPPPPPPPPPPWWK..',
  '..KWPRRRRRRRRRRRRrWK..',
  '..KWRRRRRWWWWrrrrrWK..',
  '..KWRRRRRWWWWrrrrrWK..',
  '..KWRRRWWWWWWWWrrrWK..',
  '..KWRRRWWWWWWWWrrrWK..',
  '..KWRRRRRWWWWrrrrrWK..',
  '..KWRRRRRWWWWrrrrrWK..',
  '..KWrrrrrrrrrrrrrrWK..',
  '..KWWssssssssssssWWK..',
  '...KWWWWWWWWWWWWWWK...',
  '....KKKKKKKKKKKKKK....',
];

const ICON_MAGNET = [
  '....KKKK......KKKK....',
  '...KSSSSK....KSSSSK...',
  '...KSSssK....KSSssK...',
  '...KSSssK....KSSssK...',
  '...KKKKKK....KKKKKK...',
  '...KPRRRK....KRRrrK...',
  '...KRRRRK....KRRrrK...',
  '...KRRRRK....KRRrrK...',
  '...KRRRRKKKKKKRRrrK...',
  '....KRRRRRRRRRRrrK....',
  '....KRRRrrrrrRrrrK....',
  '.....KKKrrrrrrKKK.....',
  '.......KKKKKKKK.......',
];

const ICON_BOMB = [
  '...........KKKYY......',
  '..........KYWWWY......',
  '.........KOOOKYY......',
  '........KKDDKK........',
  '.......KSSssK.........',
  '.....KKDDDDDDKK.......',
  '...KKDSSSddddddKK.....',
  '..KDSSSDDDDDdddddK....',
  '.KDSSDDDDDDDDdddddK...',
  '.KDSDDDDDDDDDddddddK..',
  '.KDDDDDDDDDDDddddddK..',
  '.KDDDDDDDDDDdddddddK..',
  '..KDDDDDDDDdddddddK...',
  '...KKDDDDdddddddKK....',
  '.....KKKKKKKKKKK......',
];

const ICON_SPEED = [
  '.........KKKKKKKK.....',
  '........KWWWWWWyK.....',
  '.......KWWWWYYyyK.....',
  '......KWWWYYYYyK......',
  '.....KWWYYYYyyK.......',
  '....KWWYYYYYYYYYYK....',
  '...KWWYYYYYYYYYYyK....',
  '...KKKKKKKKYYYYyK.....',
  '.........KYYYYyK......',
  '........KYYYYyK.......',
  '.......KYYYyyK........',
  '......KYYyyyK.........',
  '.....KYYyyKK..........',
  '.....KKKKK............',
];

function buildPickupIconFrames(): PixelCanvas[] {
  const frames: PixelCanvas[] = [];
  const defs: Array<{ grid: string[]; glintPos: [number, number]; glintCol: RGBA }> = [
    { grid: ICON_HEALTH, glintPos: [25, 6], glintCol: ICON_PAL.W },
    { grid: ICON_MAGNET, glintPos: [16, 5], glintCol: ICON_PAL.C },
    { grid: ICON_BOMB, glintPos: [24, 5], glintCol: ICON_PAL.W },
    { grid: ICON_SPEED, glintPos: [6, 12], glintCol: ICON_PAL.C },
  ];

  for (const def of defs) {
    for (let f = 0; f < 2; f++) {
      const c = new PixelCanvas(32, 32);
      const ox = Math.floor((32 - def.grid[0].length) / 2);
      const oy = Math.floor((32 - def.grid.length) / 2) + (f === 1 ? -1 : 0);
      c.stampGrid(def.grid, ox, oy, ICON_PAL);
      if (f === 1) {
        const [gx, gy] = def.glintPos;
        c.fillRect(gx - 2, gy, 5, 1, def.glintCol);
        c.fillRect(gx, gy - 2, 1, 5, def.glintCol);
        c.set(gx, gy, ICON_PAL.W);
      }
      c.applyOutline(OUTLINE);
      c.enforceBinaryAlpha();
      frames.push(c);
    }
  }
  return frames;
}

// ============================================================================
// GENERATE ALL FILES & EXPLICIT MANIFESTS UNDER public/assets/v2/
// ============================================================================
const bossExactFrames = buildBossExactAnimatedFrames();
const crateBreakFrames = buildCrateBreakFrames();
const barrelExplosionFrames = buildBarrelExplosionFrames();
const barrelBurnMarkFrame = [buildBarrelBurnMark()];
const acidSplatFrames = buildAcidSplatFrames();
const survivorShootFrames = buildSurvivorShootFrames();
const pistolFrames = [buildPistolSprite()];
const levelupRingFrames = buildLevelUpRingFrames();
const pickupIconFrames = buildPickupIconFrames();

// Save PNGs in Valse0/fivemore assets/v2/ folder layout
saveSheetPNG(path.join(V2_ROOT, 'zombies'), 'boss_exact_animated_spritesheet.png', buildHorizontalStrip(bossExactFrames, 96, 96));
saveSheetPNG(path.join(V2_ROOT, 'world'), 'crate_break_spritesheet.png', buildHorizontalStrip(crateBreakFrames, 48, 48));
saveSheetPNG(path.join(V2_ROOT, 'effects'), 'barrel_explosion_spritesheet.png', buildHorizontalStrip(barrelExplosionFrames, 96, 96));
saveSheetPNG(path.join(V2_ROOT, 'effects'), 'barrel_burnmark.png', buildHorizontalStrip(barrelBurnMarkFrame, 96, 96));
saveSheetPNG(path.join(V2_ROOT, 'effects'), 'acid_splat_spritesheet.png', buildHorizontalStrip(acidSplatFrames, 32, 32));
saveSheetPNG(path.join(V2_ROOT, 'characters'), 'survivor_shoot_spritesheet.png', buildHorizontalStrip(survivorShootFrames, 64, 64));
saveSheetPNG(path.join(V2_ROOT, 'characters'), 'pistol_sprite.png', buildHorizontalStrip(pistolFrames, 24, 16));
saveSheetPNG(path.join(V2_ROOT, 'effects'), 'levelup_ring_spritesheet.png', buildHorizontalStrip(levelupRingFrames, 96, 96));
saveSheetPNG(path.join(V2_ROOT, 'ui'), 'pickup_icons.png', buildHorizontalStrip(pickupIconFrames, 32, 32));

// Update zombies/manifest.json cleanly by adding boss_exact_animated WITHOUT touching existing 5 Group A entries
const zombiesManifestPath = path.join(V2_ROOT, 'zombies/manifest.json');
const zombiesManifest = JSON.parse(fs.readFileSync(zombiesManifestPath, 'utf-8'));
const bossExactEntry = {
  id: 'boss_exact_animated',
  title: 'Boss Mutant Brute (96×96 Exact Reference Animated)',
  file: 'boss_exact_animated_spritesheet.png',
  frameSize: { w: 96, h: 96 },
  frameCount: 8,
  sheetSize: { w: 768, h: 96 },
  footBaselineY: 78,
  facing: 'left (matches exact reference artwork; mirror horizontally in-engine for right)',
  paletteCount: countUniqueOpaqueColors(bossExactFrames).length,
  animations: {
    idle_walk: [0, 3],
    attack: [4, 7],
  },
  fps: 7,
  frameOrder: [
    '0: idle_ref_exact',
    '1: heavy_walk_stride_a',
    '2: heavy_breath_peak',
    '3: heavy_walk_stride_b',
    '4: roar_windup',
    '5: downward_crush',
    '6: ground_slam_impact',
    '7: recover',
  ],
  frames: bossExactFrames.map((f, i) => ({
    index: i,
    name: i < 4 ? `idle_walk_${i}` : `attack_${i - 4}`,
    x: i * 96,
    y: 0,
    w: 96,
    h: 96,
    bounds: f.getBounds(),
  })),
};
zombiesManifest.assets = [
  ...zombiesManifest.assets.filter((a: { id: string }) => a.id !== 'boss_exact_animated'),
  bossExactEntry,
];
fs.writeFileSync(zombiesManifestPath, JSON.stringify(zombiesManifest, null, 2));

// Write Group B & C category manifests
const worldManifest = {
  group: 'B',
  category: 'world',
  name: 'World Props Destruction (Group B)',
  style: '16-bit pixel art, 1px #0A090D outline, flat palette, binary alpha, no AA, no gradients',
  assets: [
    {
      id: 'crate_break',
      title: 'Wooden Crate Break',
      file: 'crate_break_spritesheet.png',
      frameSize: { w: 48, h: 48 },
      frameCount: 5,
      sheetSize: { w: 240, h: 48 },
      paletteCount: countUniqueOpaqueColors(crateBreakFrames).length,
      animations: { break: [0, 4] },
      fps: 10,
      frameOrder: [
        '0: cracking',
        '1: breaking_apart',
        '2: splinters_falling',
        '3: impact_shards',
        '4: small_debris_remnant',
      ],
      frames: crateBreakFrames.map((f, i) => ({
        index: i,
        name: `break_${i}`,
        x: i * 48,
        y: 0,
        w: 48,
        h: 48,
        bounds: f.getBounds(),
      })),
    },
  ],
};
fs.writeFileSync(path.join(V2_ROOT, 'world/manifest.json'), JSON.stringify(worldManifest, null, 2));

const effectsManifest = {
  group: 'B+C',
  category: 'effects',
  name: 'Combat & Level-Up Effects (Groups B & C)',
  style: '16-bit pixel art, 1px #0A090D outline, binary alpha, zero soft alpha gradients, no AA',
  assets: [
    {
      id: 'barrel_explosion',
      title: 'Barrel Explosion (Group B)',
      file: 'barrel_explosion_spritesheet.png',
      frameSize: { w: 96, h: 96 },
      frameCount: 7,
      sheetSize: { w: 672, h: 96 },
      paletteCount: countUniqueOpaqueColors(barrelExplosionFrames).length,
      animations: { explode: [0, 6] },
      fps: 12,
      frameOrder: [
        '0: swelling',
        '1: flash_ignition',
        '2: peak_explosion',
        '3: expanding_blast',
        '4: rising_fire_smoke',
        '5: dispersing_smoke',
        '6: fading_wisps',
      ],
      frames: barrelExplosionFrames.map((f, i) => ({
        index: i,
        name: `explode_${i}`,
        x: i * 96,
        y: 0,
        w: 96,
        h: 96,
        bounds: f.getBounds(),
      })),
    },
    {
      id: 'barrel_burnmark',
      title: 'Barrel Burn Mark (Group B)',
      file: 'barrel_burnmark.png',
      frameSize: { w: 96, h: 96 },
      frameCount: 1,
      sheetSize: { w: 96, h: 96 },
      paletteCount: countUniqueOpaqueColors(barrelBurnMarkFrame).length,
      animations: { idle: [0, 0] },
      fps: 1,
      frameOrder: ['0: scorched_crater'],
      frames: [{ index: 0, name: 'burnmark_0', x: 0, y: 0, w: 96, h: 96, bounds: barrelBurnMarkFrame[0].getBounds() }],
    },
    {
      id: 'acid_splat',
      title: 'Acid Spit Ground Splat (Group B)',
      file: 'acid_splat_spritesheet.png',
      frameSize: { w: 32, h: 32 },
      frameCount: 4,
      sheetSize: { w: 128, h: 32 },
      paletteCount: countUniqueOpaqueColors(acidSplatFrames).length,
      animations: { splat: [0, 3] },
      fps: 10,
      frameOrder: ['0: impact_splash', '1: expanding_puddle', '2: bubbling_pool', '3: settling_ring'],
      frames: acidSplatFrames.map((f, i) => ({
        index: i,
        name: `splat_${i}`,
        x: i * 32,
        y: 0,
        w: 32,
        h: 32,
        bounds: f.getBounds(),
      })),
    },
    {
      id: 'levelup_ring',
      title: 'Level-Up Golden Ring (Group C)',
      file: 'levelup_ring_spritesheet.png',
      frameSize: { w: 96, h: 96 },
      frameCount: 6,
      sheetSize: { w: 576, h: 96 },
      paletteCount: countUniqueOpaqueColors(levelupRingFrames).length,
      animations: { expand: [0, 5] },
      fps: 12,
      frameOrder: [
        '0: core_burst',
        '1: inner_ring',
        '2: mid_ring',
        '3: wide_ring',
        '4: outer_pulse',
        '5: sparkle_fade',
      ],
      frames: levelupRingFrames.map((f, i) => ({
        index: i,
        name: `expand_${i}`,
        x: i * 96,
        y: 0,
        w: 96,
        h: 96,
        bounds: f.getBounds(),
      })),
    },
  ],
};
fs.writeFileSync(path.join(V2_ROOT, 'effects/manifest.json'), JSON.stringify(effectsManifest, null, 2));

const charactersManifest = {
  group: 'C',
  category: 'characters',
  name: 'Survivor Shoot & Pistol Sprite (Group C)',
  style: '16-bit pixel art matching survivor_refined, 1px #0A090D outline, facing right, binary alpha, no embedded shadow',
  assets: [
    {
      id: 'survivor_shoot',
      title: 'Survivor Shoot (Aim + Recoil)',
      file: 'survivor_shoot_spritesheet.png',
      frameSize: { w: 64, h: 64 },
      frameCount: 2,
      sheetSize: { w: 128, h: 64 },
      footBaselineY: 58,
      paletteCount: countUniqueOpaqueColors(survivorShootFrames).length,
      animations: { shoot: [0, 1] },
      fps: 10,
      frameOrder: ['0: firing_pose', '1: recoil_pose'],
      frames: survivorShootFrames.map((f, i) => ({
        index: i,
        name: `shoot_${i}`,
        x: i * 64,
        y: 0,
        w: 64,
        h: 64,
        bounds: f.getBounds(),
      })),
    },
    {
      id: 'pistol',
      title: 'Pistol Sprite (Aim-Rotatable)',
      file: 'pistol_sprite.png',
      frameSize: { w: 24, h: 16 },
      frameCount: 1,
      sheetSize: { w: 24, h: 16 },
      paletteCount: countUniqueOpaqueColors(pistolFrames).length,
      animations: { idle: [0, 0] },
      fps: 1,
      frameOrder: ['0: pistol_right'],
      frames: [{ index: 0, name: 'pistol_0', x: 0, y: 0, w: 24, h: 16, bounds: pistolFrames[0].getBounds() }],
    },
  ],
};
fs.writeFileSync(path.join(V2_ROOT, 'characters/manifest.json'), JSON.stringify(charactersManifest, null, 2));

const uiManifest = {
  group: 'C',
  category: 'ui',
  name: 'Pickup Icons (Group C)',
  style: '16-bit pixel art, 1px #0A090D outline, binary alpha, no AA',
  assets: [
    {
      id: 'pickup_icons',
      title: 'Pickup Icons (Health, Magnet, Bomb, Speed)',
      file: 'pickup_icons.png',
      frameSize: { w: 32, h: 32 },
      frameCount: 8,
      sheetSize: { w: 256, h: 32 },
      paletteCount: countUniqueOpaqueColors(pickupIconFrames).length,
      animations: {
        health: [0, 1],
        magnet: [2, 3],
        bomb: [4, 5],
        speed: [6, 7],
      },
      fps: 4,
      frameOrder: [
        '0: health_idle',
        '1: health_sparkle',
        '2: magnet_idle',
        '3: magnet_sparkle',
        '4: bomb_idle',
        '5: bomb_sparkle',
        '6: speed_idle',
        '7: speed_sparkle',
      ],
      frames: pickupIconFrames.map((f, i) => ({
        index: i,
        name: `pickup_${i}`,
        x: i * 32,
        y: 0,
        w: 32,
        h: 32,
        bounds: f.getBounds(),
      })),
    },
  ],
};
fs.writeFileSync(path.join(V2_ROOT, 'ui/manifest.json'), JSON.stringify(uiManifest, null, 2));

// Save temporary visual inspection sheets for audit
saveInspectionPreview(
  path.resolve(process.cwd(), 'scripts/_inspect_boss_exact_anim.png'),
  [{ frames: bossExactFrames, frameW: 96, frameH: 96, baselineY: 78 }],
  2
);

saveInspectionPreview(
  path.resolve(process.cwd(), 'scripts/_inspect_v2_BC.png'),
  [
    { frames: crateBreakFrames, frameW: 48, frameH: 48 },
    { frames: barrelExplosionFrames, frameW: 96, frameH: 96 },
    { frames: barrelBurnMarkFrame, frameW: 96, frameH: 96 },
    { frames: acidSplatFrames, frameW: 32, frameH: 32 },
    { frames: survivorShootFrames, frameW: 64, frameH: 64, baselineY: 58 },
    { frames: pistolFrames, frameW: 24, frameH: 16 },
    { frames: levelupRingFrames, frameW: 96, frameH: 96 },
    { frames: pickupIconFrames, frameW: 32, frameH: 32 },
  ],
  2
);

// 48px downscaled grass-background preview of animated sprites
const grassRows = [
  bossExactFrames,
  crateBreakFrames,
  barrelExplosionFrames,
  survivorShootFrames,
  levelupRingFrames,
  pickupIconFrames,
];
const maxCols = Math.max(...grassRows.map((r) => r.length));
const prev48 = new PixelCanvas(maxCols * 48 * 2, grassRows.length * 48 * 2);
prev48.fillRect(0, 0, prev48.width, prev48.height, [140, 196, 47, 255]);
for (let r = 0; r < grassRows.length; r++) {
  const row48 = grassRows[r].map(downsampleTo48);
  const strip = buildHorizontalStrip(row48, 48, 48);
  for (let y = 0; y < 48; y++) {
    for (let x = 0; x < strip.width; x++) {
      const p = strip.get(x, y);
      if (p[3] > 0) prev48.fillRect(x * 2, r * 96 + y * 2, 2, 2, p);
    }
  }
}
fs.writeFileSync(
  path.resolve(process.cwd(), 'scripts/_inspect_v2_BC_48.png'),
  encodePNG(prev48.width, prev48.height, prev48.data)
);

console.log('Generated Boss Exact Animated + Group B + Group C!');
console.log('Boss Exact Animated colors:', bossExactEntry.paletteCount, 'bounds:', bossExactFrames.map((f) => f.getBounds().maxY));
console.log('Crate break colors:', worldManifest.assets[0].paletteCount);
console.log('Effects colors:', effectsManifest.assets.map((a) => `${a.id}:${a.paletteCount}`));
console.log('Characters colors:', charactersManifest.assets.map((a) => `${a.id}:${a.paletteCount}`));
console.log('UI pickup colors:', uiManifest.assets[0].paletteCount);
