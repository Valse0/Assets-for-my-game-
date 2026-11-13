import fs from 'fs';
import path from 'path';
import {
  buildHorizontalStrip,
  OUTLINE,
  Palette,
  PixelCanvas,
  RGBA,
  saveInspectionPreview,
  saveSheetPNG,
} from './lib/pixel';

const OUT_DIR = path.resolve(process.cwd(), 'public/assets/packs/group3');

// ============================================================================
// 1. GRASS TILES (32x32 opaque seamless variations, 4 frames)
// ============================================================================
const GRASS_BASE: RGBA = [140, 196, 47, 255];   // #8cc42f
const GRASS_LIGHT: RGBA = [156, 208, 60, 255];  // #9cd03c
const GRASS_TUFT: RGBA = [96, 178, 46, 255];    // #60b22e
const GRASS_DARK: RGBA = [62, 138, 42, 255];    // #3e8a2a

function drawTuft(c: PixelCanvas, x: number, y: number) {
  c.fillRect(x, y, 6, 2, GRASS_DARK);
  c.fillRect(x + 1, y - 3, 2, 3, GRASS_TUFT);
  c.fillRect(x + 4, y - 4, 2, 4, GRASS_TUFT);
  c.set(x + 2, y - 4, GRASS_LIGHT);
}

function buildGrassTiles(): PixelCanvas[] {
  return [0, 1, 2, 3].map((variant) => {
    const c = new PixelCanvas(32, 32);
    c.fillRect(0, 0, 32, 32, GRASS_BASE);

    // Subtle pixel patches
    const patches = [
      [4, 6, 4, 2],
      [18, 22, 5, 2],
      [24, 8, 3, 2],
      [9, 26, 4, 2],
    ];
    for (const [px, py, pw, ph] of patches) {
      c.fillRect((px + variant * 5) % 28, (py + variant * 3) % 28, pw, ph, GRASS_LIGHT);
    }

    if (variant === 0) {
      drawTuft(c, 8, 14);
      drawTuft(c, 21, 24);
    } else if (variant === 1) {
      drawTuft(c, 5, 9);
      drawTuft(c, 16, 19);
      drawTuft(c, 23, 11);
    } else if (variant === 2) {
      c.fillRect(10, 10, 3, 2, GRASS_TUFT);
      c.fillRect(20, 16, 4, 2, GRASS_TUFT);
      drawTuft(c, 13, 26);
    } else {
      drawTuft(c, 7, 22);
      c.fillRect(20, 8, 2, 2, GRASS_DARK);
      c.fillRect(21, 7, 2, 2, GRASS_LIGHT);
      c.fillRect(24, 18, 3, 2, GRASS_TUFT);
    }
    return c;
  });
}

// ============================================================================
// 2. WOODEN CRATE (48x48, 2 frames: intact & cracked)
// ============================================================================
const CRATE_PAL: Palette = {
  K: OUTLINE,
  L: [227, 147, 60, 255],  // #e3933c bright amber wood
  M: [213, 130, 55, 255],  // #d58237 midtone wood
  D: [162, 90, 52, 255],   // #a25a34 shadow wood
  S: [106, 58, 51, 255],   // #6a3a33 deep recess
};

function buildCrate(damaged: boolean): PixelCanvas {
  const c = new PixelCanvas(48, 48);
  const ox = 8;
  const oy = 8;
  const sz = 32;

  // Outer wooden frame
  c.fillRect(ox, oy, sz, sz, CRATE_PAL.D);
  c.fillRect(ox, oy, sz, 6, CRATE_PAL.L); // top bevel
  c.fillRect(ox, oy + 6, 5, sz - 6, CRATE_PAL.M); // left rim
  c.fillRect(ox + sz - 5, oy + 6, 5, sz - 6, CRATE_PAL.D); // right rim
  c.fillRect(ox + 5, oy + sz - 5, sz - 10, 5, CRATE_PAL.S); // bottom rim

  // Recessed interior panel
  c.fillRect(ox + 5, oy + 6, sz - 10, sz - 11, CRATE_PAL.S);
  c.fillRect(ox + 6, oy + 7, sz - 12, sz - 13, CRATE_PAL.D);

  // Horizontal plank seams
  c.fillRect(ox + 6, oy + 12, sz - 12, 1, CRATE_PAL.S);
  c.fillRect(ox + 6, oy + 18, sz - 12, 1, CRATE_PAL.S);
  c.fillRect(ox + 6, oy + 24, sz - 12, 1, CRATE_PAL.S);

  // Diagonal X-brace planks
  for (let i = 0; i < sz - 12; i++) {
    c.fillRect(ox + 6 + i, oy + 7 + i, 3, 3, CRATE_PAL.M);
    c.fillRect(ox + 6 + i, oy + 7 + i, 2, 1, CRATE_PAL.L);
    c.fillRect(ox + sz - 9 - i, oy + 7 + i, 3, 3, CRATE_PAL.M);
    c.fillRect(ox + sz - 9 - i, oy + 7 + i, 2, 1, CRATE_PAL.L);
  }

  // Nail rivets on corners
  for (const [nx, ny] of [
    [ox + 2, oy + 2],
    [ox + sz - 4, oy + 2],
    [ox + 2, oy + sz - 4],
    [ox + sz - 4, oy + sz - 4],
  ]) {
    c.fillRect(nx, ny, 2, 2, CRATE_PAL.S);
  }

  if (damaged) {
    // Crisp dark crack across crate
    for (let i = 0; i < 14; i++) {
      c.fillRect(ox + 10 + i, oy + 8 + Math.floor(i * 1.1), 2, 2, OUTLINE);
    }
    c.fillRect(ox + 16, oy + 14, 5, 3, OUTLINE);
  }

  c.applyOutline(OUTLINE);
  c.enforceBinaryAlpha();
  return c;
}

// ============================================================================
// 3. RED BARREL (48x48, 2 frames: intact & warning/dented)
// ============================================================================
const BARREL_PAL: Palette = {
  K: OUTLINE,
  R: [222, 62, 54, 255],   // bright red highlight
  r: [176, 36, 40, 255],   // red midtone
  q: [116, 22, 30, 255],   // deep red shadow
  G: [152, 162, 178, 255], // metal rim highlight
  g: [96, 104, 120, 255],  // metal rim shadow
  Y: [250, 204, 21, 255],  // hazard band accent
};

function buildBarrel(warning: boolean): PixelCanvas {
  const c = new PixelCanvas(48, 48);
  const cx = 24;

  // Barrel body (height ~28px, width ~22px)
  c.fillRect(cx - 10, 12, 20, 26, BARREL_PAL.r);
  c.fillRect(cx - 8, 12, 7, 26, BARREL_PAL.R); // left-center specular stripe
  c.fillRect(cx + 5, 12, 5, 26, BARREL_PAL.q); // right shadow

  // Top oval lid
  c.fillEllipse(cx, 12, 10, 4, BARREL_PAL.g);
  c.fillEllipse(cx, 12, 8, 3, BARREL_PAL.G);
  c.fillRect(cx + 3, 11, 2, 2, OUTLINE); // bung cap

  // Bottom curved rim
  c.fillEllipse(cx, 38, 10, 3, BARREL_PAL.q);

  // Metal hoops
  c.fillRect(cx - 10, 20, 20, 3, BARREL_PAL.g);
  c.fillRect(cx - 8, 20, 8, 2, BARREL_PAL.G);
  c.fillRect(cx - 10, 29, 20, 3, BARREL_PAL.g);
  c.fillRect(cx - 8, 29, 8, 2, BARREL_PAL.G);

  if (warning) {
    // Hazard diamond emblem on front
    c.fillRect(cx - 2, 23, 5, 5, BARREL_PAL.Y);
    c.fillRect(cx - 1, 24, 3, 3, OUTLINE);
  }

  c.applyOutline(OUTLINE);
  c.enforceBinaryAlpha();
  return c;
}

// ============================================================================
// 4. ROCKS (48x48, 3 boulder variations)
// ============================================================================
const ROCK_PAL: Palette = {
  K: OUTLINE,
  L: [176, 184, 198, 255], // stone highlight
  M: [128, 136, 152, 255], // stone midtone
  D: [82, 88, 104, 255],   // stone shadow
  S: [52, 56, 70, 255],    // dark base
};

function buildRocks(): PixelCanvas[] {
  return [0, 1, 2].map((variant) => {
    const c = new PixelCanvas(48, 48);
    if (variant === 0) {
      // Chunky boulder
      c.fillEllipse(24, 28, 14, 10, ROCK_PAL.D);
      c.fillEllipse(23, 25, 12, 8, ROCK_PAL.M);
      c.fillEllipse(20, 22, 7, 4, ROCK_PAL.L);
      c.fillRect(14, 32, 20, 5, ROCK_PAL.S);
      c.fillRect(28, 26, 4, 4, ROCK_PAL.S);
    } else if (variant === 1) {
      // Wide jagged rock + small stone
      c.fillEllipse(22, 29, 15, 9, ROCK_PAL.D);
      c.fillEllipse(20, 26, 11, 6, ROCK_PAL.M);
      c.fillEllipse(18, 23, 6, 3, ROCK_PAL.L);
      c.fillRect(10, 32, 22, 5, ROCK_PAL.S);
      c.fillEllipse(35, 34, 5, 4, ROCK_PAL.D);
      c.fillEllipse(34, 33, 3, 2, ROCK_PAL.L);
    } else {
      // Tall angular crag
      c.fillEllipse(24, 27, 11, 12, ROCK_PAL.D);
      c.fillEllipse(22, 23, 9, 9, ROCK_PAL.M);
      c.fillEllipse(20, 19, 5, 4, ROCK_PAL.L);
      c.fillRect(15, 33, 18, 5, ROCK_PAL.S);
    }
    c.applyOutline(OUTLINE);
    c.enforceBinaryAlpha();
    return c;
  });
}

// ============================================================================
// 5. TREE (96x96, 2 frames: calm & slight wind sway)
// ============================================================================
const TREE_PAL: Palette = {
  K: OUTLINE,
  L: [112, 206, 62, 255],  // bright leaf highlight
  M: [60, 156, 48, 255],   // leaf midtone
  D: [34, 104, 42, 255],   // deep canopy shadow
  T: [128, 72, 48, 255],   // trunk highlight
  t: [86, 46, 34, 255],    // trunk shadow
};

function buildTree(sway: number): PixelCanvas {
  const c = new PixelCanvas(96, 96);

  // Root flare & sturdy bark trunk (bottom anchored around y=86)
  c.fillRect(41, 58, 14, 26, TREE_PAL.t);
  c.fillRect(43, 58, 6, 25, TREE_PAL.T);
  c.fillRect(37, 80, 22, 6, TREE_PAL.t);
  c.fillRect(40, 81, 10, 4, TREE_PAL.T);

  // Leafy canopy clusters (drawn back-to-front with dark cluster shading)
  const ox = sway;
  c.fillEllipse(48 + ox, 44, 28, 22, TREE_PAL.D);
  c.fillEllipse(34 + ox, 48, 16, 14, TREE_PAL.D);
  c.fillEllipse(62 + ox, 48, 16, 14, TREE_PAL.D);

  // Midtone leaf puffs
  c.fillEllipse(48 + ox, 38, 24, 18, TREE_PAL.M);
  c.fillEllipse(34 + ox, 42, 13, 11, TREE_PAL.M);
  c.fillEllipse(62 + ox, 42, 13, 11, TREE_PAL.M);
  c.fillEllipse(48 + ox, 24, 16, 12, TREE_PAL.M);

  // Top sunlit leaf clusters
  c.fillEllipse(44 + ox, 22, 11, 8, TREE_PAL.L);
  c.fillEllipse(33 + ox, 36, 9, 7, TREE_PAL.L);
  c.fillEllipse(57 + ox, 33, 9, 7, TREE_PAL.L);
  c.fillEllipse(47 + ox, 40, 10, 6, TREE_PAL.L);

  c.applyOutline(OUTLINE);
  c.enforceBinaryAlpha();
  return c;
}

// ============================================================================
// 6. FLOWERS (24x24, 4 variations)
// ============================================================================
const FLOWER_PAL: Palette = {
  K: OUTLINE,
  W: [250, 250, 252, 255], // white petals
  Y: [250, 204, 24, 255],  // bright yellow
  O: [244, 132, 34, 255],  // orange petal
  G: [62, 152, 46, 255],   // stem / leaves
};

const FLOWER_0 = [
  '..WW....',
  '.WYYW...',
  'WWYYWW..',
  '.WYYW...',
  '..WW....',
  '..GG....',
  '.GGGG...',
];
const FLOWER_1 = [
  '..OO....',
  '.OYYO...',
  'OOYYOO..',
  '.OYYO...',
  '..OO....',
  '..GG....',
  '.GGGG...',
];
const FLOWER_2 = [
  '.WW.....',
  'WYYW.WW.',
  '.WW.WYYW',
  '.GG..WW.',
  '.GG..GG.',
  'GGGGGGGG',
];
const FLOWER_3 = [
  '..YY....',
  '.YOOY...',
  '..YY....',
  '..GG....',
  '.GGGG...',
];

function buildFlowers(): PixelCanvas[] {
  return [FLOWER_0, FLOWER_1, FLOWER_2, FLOWER_3].map((g) => {
    const c = new PixelCanvas(24, 24);
    const ox = Math.floor((24 - g[0].length) / 2);
    const oy = Math.floor((24 - g.length) / 2);
    c.stampGrid(g, ox, oy, FLOWER_PAL);
    c.applyOutline(OUTLINE);
    c.enforceBinaryAlpha();
    return c;
  });
}

const grassFrames = buildGrassTiles();
const crateFrames = [buildCrate(false), buildCrate(true)];
const barrelFrames = [buildBarrel(false), buildBarrel(true)];
const rockFrames = buildRocks();
const treeFrames = [buildTree(0), buildTree(1)];
const flowerFrames = buildFlowers();

saveSheetPNG(OUT_DIR, 'grass_tiles_spritesheet.png', buildHorizontalStrip(grassFrames, 32, 32));
saveSheetPNG(OUT_DIR, 'crate_spritesheet.png', buildHorizontalStrip(crateFrames, 48, 48));
saveSheetPNG(OUT_DIR, 'barrel_spritesheet.png', buildHorizontalStrip(barrelFrames, 48, 48));
saveSheetPNG(OUT_DIR, 'rock_spritesheet.png', buildHorizontalStrip(rockFrames, 48, 48));
saveSheetPNG(OUT_DIR, 'tree_spritesheet.png', buildHorizontalStrip(treeFrames, 96, 96));
saveSheetPNG(OUT_DIR, 'flowers_spritesheet.png', buildHorizontalStrip(flowerFrames, 24, 24));

const manifest = {
  group: 3,
  name: 'Environment Tiles & World Props',
  style: '16-bit bold dark outline, 3/4 view, no AA, no gradients',
  assets: [
    {
      id: 'grass_tiles',
      title: 'Grass Tile Variations',
      file: 'grass_tiles_spritesheet.png',
      frameSize: { w: 32, h: 32 },
      frameCount: grassFrames.length,
      sheetSize: { w: grassFrames.length * 32, h: 32 },
      frames: grassFrames.map((_, i) => ({ index: i, name: `grass_${i}`, x: i * 32, y: 0, w: 32, h: 32 })),
    },
    {
      id: 'crate',
      title: 'Wooden Supply Crate',
      file: 'crate_spritesheet.png',
      frameSize: { w: 48, h: 48 },
      frameCount: crateFrames.length,
      sheetSize: { w: crateFrames.length * 48, h: 48 },
      frames: crateFrames.map((f, i) => ({
        index: i,
        name: i === 0 ? 'crate_intact' : 'crate_damaged',
        x: i * 48,
        y: 0,
        w: 48,
        h: 48,
        bounds: f.getBounds(),
      })),
    },
    {
      id: 'barrel',
      title: 'Explosive Red Barrel',
      file: 'barrel_spritesheet.png',
      frameSize: { w: 48, h: 48 },
      frameCount: barrelFrames.length,
      sheetSize: { w: barrelFrames.length * 48, h: 48 },
      frames: barrelFrames.map((f, i) => ({
        index: i,
        name: i === 0 ? 'barrel_intact' : 'barrel_warning',
        x: i * 48,
        y: 0,
        w: 48,
        h: 48,
        bounds: f.getBounds(),
      })),
    },
    {
      id: 'rock',
      title: 'Stone Boulders',
      file: 'rock_spritesheet.png',
      frameSize: { w: 48, h: 48 },
      frameCount: rockFrames.length,
      sheetSize: { w: rockFrames.length * 48, h: 48 },
      frames: rockFrames.map((f, i) => ({
        index: i,
        name: `rock_${i}`,
        x: i * 48,
        y: 0,
        w: 48,
        h: 48,
        bounds: f.getBounds(),
      })),
    },
    {
      id: 'tree',
      title: 'Forest Tree Canopy',
      file: 'tree_spritesheet.png',
      frameSize: { w: 96, h: 96 },
      frameCount: treeFrames.length,
      sheetSize: { w: treeFrames.length * 96, h: 96 },
      animations: { sway: { startFrame: 0, count: 2, fps: 2, loop: true } },
      frames: treeFrames.map((f, i) => ({
        index: i,
        name: `tree_${i}`,
        x: i * 96,
        y: 0,
        w: 96,
        h: 96,
        bounds: f.getBounds(),
      })),
    },
    {
      id: 'flowers',
      title: 'Wildflowers',
      file: 'flowers_spritesheet.png',
      frameSize: { w: 24, h: 24 },
      frameCount: flowerFrames.length,
      sheetSize: { w: flowerFrames.length * 24, h: 24 },
      frames: flowerFrames.map((f, i) => ({
        index: i,
        name: `flower_${i}`,
        x: i * 24,
        y: 0,
        w: 24,
        h: 24,
        bounds: f.getBounds(),
      })),
    },
  ],
};

fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

saveInspectionPreview(
  path.resolve(process.cwd(), 'scripts/_inspect_group3.png'),
  [
    { frames: grassFrames, frameW: 32, frameH: 32 },
    { frames: crateFrames, frameW: 48, frameH: 48 },
    { frames: barrelFrames, frameW: 48, frameH: 48 },
    { frames: rockFrames, frameW: 48, frameH: 48 },
    { frames: treeFrames, frameW: 96, frameH: 96 },
    { frames: flowerFrames, frameW: 24, frameH: 24 },
  ],
  2
);

console.log('Group 3 generated!');
