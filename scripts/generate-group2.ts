import fs from 'fs';
import path from 'path';
import {
  buildHorizontalStrip,
  OUTLINE,
  Palette,
  PixelCanvas,
  saveInspectionPreview,
  saveSheetPNG,
} from './lib/pixel';

const OUT_DIR = path.resolve(process.cwd(), 'public/assets/packs/group2');

// ============================================================================
// 1. MUZZLE FLASH (32x32, 3 frames, facing right)
// ============================================================================
const FLASH_PAL: Palette = {
  K: OUTLINE,
  W: [255, 255, 232, 255], // white-hot core
  Y: [255, 224, 64, 255],  // bright yellow
  O: [248, 138, 28, 255],  // vivid orange
  R: [208, 56, 24, 255],   // ember red
};

const FLASH_0 = [
  '............OO..........',
  '...........OYYO.........',
  '......OO...OYWO.........',
  '.....OYYO.OYYWWO..OO....',
  '....OYYWWOYYWWWWOYYYO...',
  '..OOYYWWWWWWWWWWWWWYYO..',
  '.OYYWWWWWWWWWWWWWWWWYYO.',
  'OYYWWWWWWWWWWWWWWWWWWYO.',
  '.OYYWWWWWWWWWWWWWWWWYYO.',
  '..OOYYWWWWWWWWWWWWWYYO..',
  '....OYYWWOYYWWWWOYYYO...',
  '.....OYYO.OYYWWO..OO....',
  '......OO...OYWO.........',
  '...........OYYO.........',
  '............OO..........',
];

const FLASH_1 = [
  '.............OO.............',
  '............OYYO............',
  '.....OO.....OYYO............',
  '....OYYO...OYYWYO.....OO....',
  '...OYYWYO..OYYWYYO...OYYO...',
  '...OYYWWYO.OYWWYYYO.OYYWO...',
  '.OO.OYWWYYOOYWWWWWYOYYWYO...',
  'OYYOOYWWWWWWWWWWWWWWWWWWYYO.',
  'OYWWWWWWWWWWWWWWWWWWWWWWWYYO',
  'OYYWWWWWWWWWWWWWWWWWWWWWWYYO',
  'OYYOOYWWWWWWWWWWWWWWWWWWYYO.',
  '.OO.OYWWYYOOYWWWWWYOYYWYO...',
  '...OYYWWYO.OYWWYYYO.OYYWO...',
  '...OYYWYO..OYYWYYO...OYYO...',
  '....OYYO...OYYWYO.....OO....',
  '.....OO.....OYYO............',
  '............OYYO............',
  '.............OO.............',
];

const FLASH_2 = [
  '........OO..........OO......',
  '.......ORRO........ORRO.....',
  '..............OO............',
  '...OO........OYYO.......OO..',
  '..ORRO......OYWWYO.....ORRO.',
  '..........OOYWWWWYO.........',
  '.....ORRO.OYYWWWWYYO........',
  '..........OYWWYYWWYO..OO....',
  '....OO....OYYWWWWYYO.ORRO...',
  '..........OOYWWWWYO.........',
  '..ORRO.......OYYO...........',
  '...OO.........OO.......OO...',
  '......................ORRO..',
  '.......ORRO.................',
  '........OO..................',
];

function buildMuzzleFlash(): PixelCanvas[] {
  const grids = [FLASH_0, FLASH_1, FLASH_2];
  return grids.map((g, i) => {
    const c = new PixelCanvas(32, 32);
    const ox = i === 0 ? 3 : 2;
    const oy = Math.floor((32 - g.length) / 2);
    c.stampGrid(g, ox, oy, FLASH_PAL);
    c.enforceBinaryAlpha();
    return c;
  });
}

// ============================================================================
// 2. BULLET TRACER (32x16, 3 frames, facing right)
// ============================================================================
const BULLET_0 = [
  '......OOOOOOOOO......',
  '..OOOOYYYYWWWWWO.....',
  '.OYYYYWWWWWWWWWWWO...',
  '.OYYYYWWWWWWWWWWWO...',
  '..OOOOYYYYWWWWWO.....',
  '......OOOOOOOOO......',
];

const BULLET_1 = [
  '....RR...OOOOOOOOO......',
  '..OOOOOOOYYYYWWWWWO.....',
  '.OYYYYYYWWWWWWWWWWWWO...',
  '.OYYYYYYWWWWWWWWWWWWO...',
  '..OOOOOOOYYYYWWWWWO.....',
  '....RR...OOOOOOOOO......',
];

const BULLET_2 = [
  '..RR....OOOOOOOOO.......',
  '....OOOOYYYYYWWWWWO.....',
  '..OOYYYYWWWWWWWWWWWWWO..',
  '..OOYYYYWWWWWWWWWWWWWO..',
  '....OOOOYYYYYWWWWWO.....',
  '..RR....OOOOOOOOO.......',
];

function buildBullets(): PixelCanvas[] {
  return [BULLET_0, BULLET_1, BULLET_2].map((g) => {
    const c = new PixelCanvas(32, 16);
    c.stampGrid(g, 5, 5, FLASH_PAL);
    c.applyOutline(OUTLINE);
    c.enforceBinaryAlpha();
    return c;
  });
}

// ============================================================================
// 3. ACID SPIT & SPLASH (32x32, 4 frames: 2 projectile + 2 impact splash)
// ============================================================================
const ACID_PAL: Palette = {
  K: OUTLINE,
  W: [232, 255, 192, 255], // bright toxic core
  L: [148, 255, 42, 255],  // neon lime
  G: [72, 198, 34, 255],   // green midtone
  D: [34, 128, 36, 255],   // dark acid edge
};

const ACID_0 = [
  '..........GGGGGG......',
  '...GG...GGLLLLLLGG....',
  '..GLLG.GLLLWWWWLLLG...',
  'GGLLLG.GLLWWWWWWLLG...',
  '..GLLG.GLLLWWWWLLLG...',
  '...GG...GGLLLLLLGG....',
  '..........GGGGGG......',
];

const ACID_1 = [
  '.....GG....GGGGGG.....',
  '....GLLG.GGLLLLLLGG...',
  '.GG.....GLLLWWWWLLLG..',
  'GLLG.GGGGLLWWWWWWLLG..',
  '.GG.....GLLLWWWWLLLG..',
  '....GLLG.GGLLLLLLGG...',
  '.....GG....GGGGGG.....',
];

const ACID_2 = [
  '.......GG......GG.......',
  '......GLLG....GLLG......',
  '..GG...GLLGGGGLLG...GG..',
  '.GLLG.GGLLLLLLLLGG.GLLG.',
  '..GG.GLLLWWWWWWLLLG.GG..',
  '....GLLLWWWWWWWWLLLG....',
  '.GG.GLLLWWWWWWWWLLLG.GG.',
  'GLLG.GLLLWWWWWWLLLG.GLLG',
  '.GG...GGLLLLLLLLGG...GG.',
  '.....GLLGGGGGGGGLLG.....',
  '....GLLG........GLLG....',
  '.....GG..........GG.....',
];

const ACID_3 = [
  '....GG............GG....',
  '...GDDG..........GDDG...',
  '.........GG..GG.........',
  '.GG.....GLLGGLLG.....GG.',
  'GDDG...GLLGGGGLLG...GDDG',
  '.GG....GDDGGGGDDG....GG.',
  '........GG....GG........',
  '...GG..............GG...',
  '..GDDG............GDDG..',
  '...GG..............GG...',
];

function buildAcidSpit(): PixelCanvas[] {
  const grids = [ACID_0, ACID_1, ACID_2, ACID_3];
  return grids.map((g) => {
    const c = new PixelCanvas(32, 32);
    const ox = Math.floor((32 - g[0].length) / 2);
    const oy = Math.floor((32 - g.length) / 2);
    c.stampGrid(g, ox, oy, ACID_PAL);
    c.applyOutline(OUTLINE);
    c.enforceBinaryAlpha();
    return c;
  });
}

// ============================================================================
// 4. HIT SPARK (32x32, 4 frames)
// ============================================================================
const SPARK_0 = [
  '........YY........',
  '........WW........',
  '....YY.WWWW.YY....',
  '.....YWWWWWWY.....',
  '..YY.WWWWWWWW.YY..',
  'YYYYWWWWWWWWWWYYYY',
  '..YY.WWWWWWWW.YY..',
  '.....YWWWWWWY.....',
  '....YY.WWWW.YY....',
  '........WW........',
  '........YY........',
];

const SPARK_1 = [
  '.........OO.........',
  '.........YY.........',
  '...OO...YWWY...OO...',
  '..OYYO..YWWY..OYYO..',
  '...OYYO.YWWY.OYYO...',
  'OO..OYYWWWWWWYYO..OO',
  'OYYOOYWWWWWWWWYOOYYO',
  'OO..OYYWWWWWWYYO..OO',
  '...OYYO.YWWY.OYYO...',
  '..OYYO..YWWY..OYYO..',
  '...OO...YWWY...OO...',
  '.........YY.........',
  '.........OO.........',
];

const SPARK_2 = [
  '......RR....RR......',
  '.....OYYO..OYYO.....',
  '..RR..OO....OO..RR..',
  '.OYYO..........OYYO.',
  '..OO....OYYO....OO..',
  '.......OYYYYO.......',
  '..OO....OYYO....OO..',
  '.OYYO..........OYYO.',
  '..RR..OO....OO..RR..',
  '.....OYYO..OYYO.....',
  '......RR....RR......',
];

const SPARK_3 = [
  '...RR..........RR...',
  '..ORR..........RRO..',
  '....................',
  '....................',
  'R..................R',
  '....................',
  '....................',
  '..ORR..........RRO..',
  '...RR..........RR...',
];

function buildHitSpark(): PixelCanvas[] {
  const grids = [SPARK_0, SPARK_1, SPARK_2, SPARK_3];
  return grids.map((g) => {
    const c = new PixelCanvas(32, 32);
    const ox = Math.floor((32 - g[0].length) / 2);
    const oy = Math.floor((32 - g.length) / 2);
    c.stampGrid(g, ox, oy, FLASH_PAL);
    c.applyOutline(OUTLINE);
    c.enforceBinaryAlpha();
    return c;
  });
}

// ============================================================================
// 5. XP GEMS (24x24, 6 frames: Blue 2f, Green 2f, Gold-Purple 2f)
// ============================================================================
function buildGem(light: [number, number, number, number], mid: [number, number, number, number], dark: [number, number, number, number], glintFrame: boolean): PixelCanvas {
  const pal: Palette = {
    K: OUTLINE,
    W: [255, 255, 255, 255],
    L: light,
    M: mid,
    D: dark,
  };
  const gridA = [
    '......KK......',
    '.....KLLK.....',
    '....KLWWLK....',
    '...KLLWWLLK...',
    '..KLLLMMLLMK..',
    '.KLLLMMMMMMDK.',
    'KLLMMMMMMMMDDK',
    'KLLMMMMMMMDDDK',
    '.KMMDDDDDDDDK.',
    '..KMDDDDDDDK..',
    '...KDDDDDDK...',
    '....KDDDDK....',
    '.....KDDK.....',
    '......KK......',
  ];
  const gridB = [
    '..W...KK......',
    '.WWW.KLLK.....',
    '..W.KLLLLK....',
    '...KLLLLLLK...',
    '..KLLLMMLLMK..',
    '.KLLLMMWWMMDK.',
    'KLLMMMMWWMMMDK',
    'KLLMMMMMMMDDDK',
    '.KMMDDDDDDDDK.',
    '..KMDDDDDDDK..',
    '...KDDDDDDK...',
    '....KDDDDK....',
    '.....KDDK.....',
    '......KK......',
  ];
  const g = glintFrame ? gridB : gridA;
  const c = new PixelCanvas(24, 24);
  c.stampGrid(g, 5, 5, pal);
  c.enforceBinaryAlpha();
  return c;
}

const flashFrames = buildMuzzleFlash();
const bulletFrames = buildBullets();
const acidFrames = buildAcidSpit();
const sparkFrames = buildHitSpark();
const gemFrames = [
  buildGem([125, 211, 252, 255], [56, 189, 248, 255], [2, 132, 199, 255], false),
  buildGem([125, 211, 252, 255], [56, 189, 248, 255], [2, 132, 199, 255], true),
  buildGem([134, 239, 172, 255], [74, 222, 128, 255], [22, 163, 74, 255], false),
  buildGem([134, 239, 172, 255], [74, 222, 128, 255], [22, 163, 74, 255], true),
  buildGem([254, 240, 138, 255], [250, 204, 21, 255], [202, 138, 4, 255], false),
  buildGem([254, 240, 138, 255], [250, 204, 21, 255], [202, 138, 4, 255], true),
];

saveSheetPNG(OUT_DIR, 'muzzle_flash_spritesheet.png', buildHorizontalStrip(flashFrames, 32, 32));
saveSheetPNG(OUT_DIR, 'bullet_spritesheet.png', buildHorizontalStrip(bulletFrames, 32, 16));
saveSheetPNG(OUT_DIR, 'acid_spit_spritesheet.png', buildHorizontalStrip(acidFrames, 32, 32));
saveSheetPNG(OUT_DIR, 'hit_spark_spritesheet.png', buildHorizontalStrip(sparkFrames, 32, 32));
saveSheetPNG(OUT_DIR, 'xp_gems_spritesheet.png', buildHorizontalStrip(gemFrames, 24, 24));

const manifest = {
  group: 2,
  name: 'Combat Effects & XP Gems',
  style: '16-bit bold dark outline, transparent RGBA, no AA, no gradients',
  assets: [
    {
      id: 'muzzle_flash',
      title: 'Muzzle Flash',
      file: 'muzzle_flash_spritesheet.png',
      frameSize: { w: 32, h: 32 },
      frameCount: flashFrames.length,
      sheetSize: { w: flashFrames.length * 32, h: 32 },
      animations: { burst: { startFrame: 0, count: 3, fps: 18, loop: false } },
      frames: flashFrames.map((f, i) => ({ index: i, name: `flash_${i}`, x: i * 32, y: 0, w: 32, h: 32, bounds: f.getBounds() })),
    },
    {
      id: 'bullet',
      title: 'Bullet Tracer',
      file: 'bullet_spritesheet.png',
      frameSize: { w: 32, h: 16 },
      frameCount: bulletFrames.length,
      sheetSize: { w: bulletFrames.length * 32, h: 16 },
      animations: { fly: { startFrame: 0, count: 3, fps: 16, loop: true } },
      frames: bulletFrames.map((f, i) => ({ index: i, name: `bullet_${i}`, x: i * 32, y: 0, w: 32, h: 16, bounds: f.getBounds() })),
    },
    {
      id: 'acid_spit',
      title: 'Acid Spit & Splash',
      file: 'acid_spit_spritesheet.png',
      frameSize: { w: 32, h: 32 },
      frameCount: acidFrames.length,
      sheetSize: { w: acidFrames.length * 32, h: 32 },
      animations: {
        fly: { startFrame: 0, count: 2, fps: 12, loop: true },
        splash: { startFrame: 2, count: 2, fps: 12, loop: false },
      },
      frames: acidFrames.map((f, i) => ({
        index: i,
        name: i < 2 ? `spit_fly_${i}` : `spit_splash_${i - 2}`,
        x: i * 32,
        y: 0,
        w: 32,
        h: 32,
        bounds: f.getBounds(),
      })),
    },
    {
      id: 'hit_spark',
      title: 'Hit Impact Spark',
      file: 'hit_spark_spritesheet.png',
      frameSize: { w: 32, h: 32 },
      frameCount: sparkFrames.length,
      sheetSize: { w: sparkFrames.length * 32, h: 32 },
      animations: { impact: { startFrame: 0, count: 4, fps: 18, loop: false } },
      frames: sparkFrames.map((f, i) => ({ index: i, name: `spark_${i}`, x: i * 32, y: 0, w: 32, h: 32, bounds: f.getBounds() })),
    },
    {
      id: 'xp_gems',
      title: 'XP Gems (Blue, Green, Gold)',
      file: 'xp_gems_spritesheet.png',
      frameSize: { w: 24, h: 24 },
      frameCount: gemFrames.length,
      sheetSize: { w: gemFrames.length * 24, h: 24 },
      animations: {
        tier1_blue: { startFrame: 0, count: 2, fps: 4, loop: true },
        tier2_green: { startFrame: 2, count: 2, fps: 4, loop: true },
        tier3_gold: { startFrame: 4, count: 2, fps: 4, loop: true },
      },
      frames: gemFrames.map((f, i) => ({
        index: i,
        name: i < 2 ? `gem_blue_${i}` : i < 4 ? `gem_green_${i - 2}` : `gem_gold_${i - 4}`,
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
  path.resolve(process.cwd(), 'scripts/_inspect_group2.png'),
  [
    { frames: flashFrames, frameW: 32, frameH: 32 },
    { frames: bulletFrames, frameW: 32, frameH: 16 },
    { frames: acidFrames, frameW: 32, frameH: 32 },
    { frames: sparkFrames, frameW: 32, frameH: 32 },
    { frames: gemFrames, frameW: 24, frameH: 24 },
  ],
  3
);

console.log('Group 2 generated!');
