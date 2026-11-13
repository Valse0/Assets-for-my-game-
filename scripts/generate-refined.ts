import fs from 'fs';
import path from 'path';
import {
  buildHorizontalStrip,
  encodePNG,
  OUTLINE,
  Palette,
  PixelCanvas,
  RGBA,
  saveInspectionPreview,
  saveSheetPNG,
  upscaleNearest,
} from './lib/pixel';

const OUT_DIR = path.resolve(process.cwd(), 'public/assets/packs/refined');

// ============================================================================
// 1. REFINED SURVIVOR (64x64, 9 frames: Walk 4, Hurt 1, Death 4)
// Strictly <= 10 colors + 1px #0A090D outline. Top-left lighting.
// Simplified: NO backpack, NO collar/cuff clutter. Bold readable face & hair.
// ============================================================================
const SURV_SHADOW: RGBA = [36, 40, 44, 255]; // #24282c crisp opaque ground ellipse & boot base

const SURVIVOR_PALETTE: Palette = {
  K: OUTLINE,                // #0a090d (outline + pupils/mouth)
  H: [148, 78, 54, 255],     // #944e36 hair top-left highlight
  h: [92, 44, 34, 255],      // #5c2c22 hair bottom-right shadow
  S: [252, 212, 164, 255],   // #fcd2a4 skin top-left highlight
  s: [218, 146, 102, 255],   // #da9266 skin bottom-right shadow
  W: [255, 255, 255, 255],   // #ffffff eye sclera
  R: [238, 52, 54, 255],     // #ee3436 red top highlight
  r: [176, 26, 38, 255],     // #b01a26 red top shadow
  B: [58, 122, 192, 255],    // #3a7ac0 blue jeans highlight
  b: [32, 68, 120, 255],     // #204478 blue jeans shadow
  U: SURV_SHADOW,            // #24282c dark boots (reused to keep strict 10 colors + 1 outline)
};

// Transient White-Red Hit Flash palette (same 10-color structure, crisp flat tint)
const SURVIVOR_HURT_PALETTE: Palette = {
  K: OUTLINE,
  H: [255, 210, 210, 255],
  h: [232, 118, 118, 255],
  S: [255, 242, 242, 255],
  s: [255, 168, 168, 255],
  W: [255, 255, 255, 255],
  R: [255, 224, 224, 255],
  r: [236, 68, 68, 255],
  B: [255, 194, 194, 255],
  b: [216, 78, 88, 255],
  U: [148, 42, 48, 255],
};

// Survivor Head: 22x17 (bold 3-spike silhouette, clear 2-tone hair & face, readable at 48px)
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

const SURV_HEAD_HURT = [
  '.....KKK...KKK........',
  '....KHHHK.KHHHK.......',
  '...KHHHHHKHHHHHKK.....',
  '..KHHHHHHHHHHHHHHK....',
  '.KHHHHHHHHHHHhhhhhK...',
  '.KHHhhhKKKKKhhhhhhK...',
  'KHHhhKKSSSSSKKhhhhhK..',
  'KhhhKSSSSSSSSSKKhhhK..',
  'KhhKSSKKSKSSKKSKhhK...',
  'KhhKSSSKSSSSKSSKhhK...',
  '.KhKSSSSSKKKSSSshK....',
  '.KhKsSSSKKKKssssK.....',
  '..KKKssskKKssssK......',
  '....KsssssssssK.......',
  '.....KKKKKKKKK........',
];

// Clean Red Top Torso (no backpack, no collar/cuff noise, bold top-left shading)
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

// Clean Unarmed Arms (red sleeve + peach hand, top-left lit)
const SURV_BACK_ARM_FWD = [
  '.KKKK..',
  'KRRRRK.',
  '.KrrSSK',
  '..KKssK',
  '....KK.',
];
const SURV_BACK_ARM_MID = [
  '.KKKK.',
  'KRRrrK',
  'KrrSSK',
  '.KKssK',
  '...KK.',
];
const SURV_BACK_ARM_BACK = [
  '.KKKK.',
  'KrrK..',
  'KrrsK.',
  '.KKsK.',
  '...KK.',
];

const SURV_FRONT_ARM_BACK = [
  '.KKKK.',
  'KRRRRK',
  'KRRrrK',
  'KrrSSK',
  'KssKK.',
  '.KK...',
];
const SURV_FRONT_ARM_MID = [
  '.KKKK.',
  'KRRRRK',
  'KRRrrK',
  'KrrSSK',
  '.KssK.',
  '..KK..',
];
const SURV_FRONT_ARM_FWD = [
  '.KKKK...',
  'KRRRRK..',
  '.KRRrrK.',
  '..KrrSSK',
  '...KKssK',
  '.....KK.',
];

// Clean Jeans + Dark Boots (all standing strides reach y=58 cleanly)
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
]; // 11 rows -> 48..58

const SURV_LEG_BACK = [
  '...KKKKK.',
  '..KbbbbbK',
  '..KbbbbbK',
  '.KbbbbbK.',
  '.KbbbbbK.',
  'KbbbbbK..',
  'KbbbbbK..',
  'KUUUUUK..',
  'KUUUUUK..',
  'KUUUUUK..',
  '.KKKKK...',
]; // 11 rows -> 48..58

const SURV_LEG_LIFT = [
  '.KKKKK.',
  'KBBBBbK',
  'KBBBbbK',
  'KbbbbbK',
  'KUUUUUK',
  'KUUUUUK',
  '.KKKKK.',
]; // 7 rows -> 47..53

function stampGroundShadow(c: PixelCanvas, cx: number, cy: number, rx: number, ry: number) {
  c.fillEllipse(cx, cy, rx, ry, SURV_SHADOW);
}

function buildRefinedSurvivorWalk(step: 0 | 1 | 2 | 3): PixelCanvas {
  const c = new PixelCanvas(64, 64);
  const bob = step === 1 ? 1 : step === 3 ? -1 : 0;
  const cx = 22;

  // Baked simple ground ellipse shadow underneath feet
  stampGroundShadow(c, 32, 58, 10, 3);

  // Back arm
  if (step === 0 || step === 3) c.stampGrid(SURV_BACK_ARM_FWD, cx + 14, 37 + bob, SURVIVOR_PALETTE);
  else if (step === 1) c.stampGrid(SURV_BACK_ARM_MID, cx + 13, 38 + bob, SURVIVOR_PALETTE);
  else c.stampGrid(SURV_BACK_ARM_BACK, cx + 12, 38 + bob, SURVIVOR_PALETTE);

  // Back leg
  if (step === 0) c.stampGrid(SURV_LEG_BACK, cx + 3, 48, SURVIVOR_PALETTE);
  else if (step === 1) c.stampGrid(SURV_LEG_PLANT, cx + 5, 48, SURVIVOR_PALETTE);
  else if (step === 2) c.stampGrid(SURV_LEG_FWD, cx + 9, 48, SURVIVOR_PALETTE);
  else c.stampGrid(SURV_LEG_LIFT, cx + 4, 47, SURVIVOR_PALETTE);

  // Front leg
  if (step === 0) c.stampGrid(SURV_LEG_FWD, cx + 9, 48, SURVIVOR_PALETTE);
  else if (step === 1) c.stampGrid(SURV_LEG_LIFT, cx + 10, 47, SURVIVOR_PALETTE);
  else if (step === 2) c.stampGrid(SURV_LEG_BACK, cx + 3, 48, SURVIVOR_PALETTE);
  else c.stampGrid(SURV_LEG_PLANT, cx + 9, 48, SURVIVOR_PALETTE);

  // Clean Red Top Torso (y=38..48 -> overlaps pelvis seamlessly)
  c.stampGrid(SURV_TORSO, cx + 2, 38 + bob, SURVIVOR_PALETTE);

  // Head (y=24..38)
  c.stampGrid(SURV_HEAD, cx + 1, 24 + bob, SURVIVOR_PALETTE);

  // Front arm (unarmed swing)
  if (step === 0) c.stampGrid(SURV_FRONT_ARM_BACK, cx + 2, 40 + bob, SURVIVOR_PALETTE);
  else if (step === 1 || step === 3) c.stampGrid(SURV_FRONT_ARM_MID, cx + 4, 40 + bob, SURVIVOR_PALETTE);
  else c.stampGrid(SURV_FRONT_ARM_FWD, cx + 7, 39 + bob, SURVIVOR_PALETTE);

  c.enforceBinaryAlpha();
  return c;
}

function buildRefinedSurvivorHurt(): PixelCanvas {
  const c = new PixelCanvas(64, 64);
  const cx = 20;
  stampGroundShadow(c, 31, 58, 11, 3);

  c.stampGrid(SURV_LEG_BACK, cx + 3, 48, SURVIVOR_HURT_PALETTE);
  c.stampGrid(SURV_LEG_FWD, cx + 10, 48, SURVIVOR_HURT_PALETTE);
  c.stampGrid(SURV_TORSO, cx + 1, 38, SURVIVOR_HURT_PALETTE);
  c.stampGrid(SURV_BACK_ARM_FWD, cx + 14, 36, SURVIVOR_HURT_PALETTE);
  c.stampGrid(SURV_HEAD_HURT, cx - 1, 24, SURVIVOR_HURT_PALETTE);
  c.stampGrid(SURV_FRONT_ARM_BACK, cx + 1, 38, SURVIVOR_HURT_PALETTE);

  c.enforceBinaryAlpha();
  return c;
}

const SURV_DEATH_1 = [
  '.....KKK...KKK...............',
  '....KHHHK.KHHHK..............',
  '...KHHHHHKHHHHHKK............',
  '..KHHHHHHHHHHHHHHK...........',
  '.KHHHHHHHHHHHhhhhhK..........',
  '.KHHhhhKKKKKhhhhhhK..........',
  'KHHhhKKSSSSSKKhhhhhK.........',
  'KhhhKSSSSSSSSSKKhhhK.........',
  'KhhKSSKKSKSSKKSKhhK..........',
  'KhhKSSSKSSSSKSSKhhK..........',
  '.KhKSSSSSKKKSSSshK...........',
  '.KhKsSSSKKKKssssK............',
  '..KKKssskKKssssK.............',
  '...KKKKKKKKKKKKK....KKKK.....',
  '..KRRRRRRRRRRRRrKK.KRRRRK....',
  '.KRRRRRRRRRRRRrrrKKrrSSK.....',
  '.KRRRRRRRRRRRrrrrKKssKK......',
  '..KRRRRRRRRrrrrrrK...........',
  '...KrrrrrrrrrrrrrK...........',
  '....KBBBBBBBBbbbbbK..........',
  '....KBBBBBBBBbbbbbK..........',
  '....KBBBBbK..KBBBBbK.........',
  '....KBBBbbK...KBBBbbK........',
  '....KbbbbbK...KbbbbbK........',
  '....KbbbbbK...KbbbbbK........',
  '....KbbbbbK....KbbbbbK.......',
  '....KUUUUUK....KUUUUUK.......',
  '....KUUUUUK....KUUUUUK.......',
  '....KUUUUUK....KUUUUUK.......',
  '.....KKKKK......KKKKK........',
];

const SURV_DEATH_2 = [
  '.....KKK...KKK...............',
  '....KHHHK.KHHHK..............',
  '...KHHHHHKHHHHHKK............',
  '..KHHHHHHHHHHHHHHK...........',
  '.KHHHHHHHHHHHhhhhhK..........',
  '.KHHhhhKKKKKhhhhhhK..........',
  'KHHhhKKSSSSSKKhhhhhK.........',
  'KhhhKSSSSSSSSSKKhhhK.........',
  'KhhKSSKKSKSSKKSKhhK..........',
  '.KhKSSSSSKKKSSSshK...........',
  '.KhKsSSSSSSSSsssK............',
  '..KKKssssssssssK.............',
  '..KKKKKKKKKKKKKKKK..KKKK.....',
  '.KRRRRRRRRRRRRrKK.KRRRRK.....',
  '.KRRRRRRRRRRRrrrrKKrrSSK.....',
  '..KRRRRRRRRrrrrrrK.KKssK.....',
  '..KBBBBBBBBbbbbbbK...........',
  '.KUUUKBBBBbKKBBBBbK..........',
  '.KUUUKUUUUUKKUUUUUK..........',
  '.KUUUKUUUUUKKUUUUUK..........',
  '..KKKKUUUUUKKUUUUUK..........',
  '......KKKKK..KKKKK...........',
];

const SURV_DEATH_3 = [
  '.....KKK...KKK......................',
  '....KHHHK.KHHHK.....................',
  '...KHHHHHKHHHHHKK...................',
  '..KHHHHHHHHHHHHHHK..................',
  '.KHHHHHHHHHHHhhhhhK.KKKKKKKKKK......',
  '.KHHhhhKKKKKhhhhhhKKRRRRRRRRRRK.....',
  'KHHhhKKSSSSSKKhhhhKRRRRRRRRrrrrK.KK.',
  'KhhhKSSKKSKSSKKhhhKRRRRrrrrrrKKRRRRK',
  '.KhKSSSSSKKKSSSshKKrrrrrrrrrrKKrrSSK',
  '..KKssssssssssssKKBBBBBBBBbbbbK.KKK.',
  '....KKKKKKKKKKKKKBBBBbKKBBBBbK......',
  '......KUUUUUK....KUUUUUKKUUUUUK.....',
  '......KUUUUUK....KUUUUUKKUUUUUK.....',
  '.......KKKKK......KKKKK..KKKKK......',
];

const SURV_DEATH_4 = [
  '....KKK...................................',
  '..KHHHHKK..................................',
  '.KHHHHHHHHKK....KKKKKKKKKKK................',
  'KHHHHHHHhhhhKK.KRRRRRRRRRRrK...............',
  'KHHhhKKSSSSSKKKRRRRRRRRRrrrrK.KKKKKKK......',
  'KhhhKSSKKSKSSKKRRRRRrrrrrrrrKKBBBBbbbK.KKKK',
  'KhhKSSSSSSSSssKKrrrrrrrrrrrrKKbbbbbbKKKUUUUK',
  '.KhKsssssssssKKBBBBBBBBbbbbbKKUUUUUUKKKUUUUK',
  '..KKKKKKKKKKKKKKKKKKKKKKKKKKKKUUUUUUK.KKKKK.',
  '..............................KKKKKK........',
];

function buildRefinedSurvivorDeath(step: 0 | 1 | 2 | 3): PixelCanvas {
  const c = new PixelCanvas(64, 64);
  const grids = [SURV_DEATH_1, SURV_DEATH_2, SURV_DEATH_3, SURV_DEATH_4];
  const oxs = [18, 17, 14, 10];
  const shadowCx = [31, 31, 31, 32][step];
  const shadowRx = [11, 12, 16, 20][step];

  stampGroundShadow(c, shadowCx, 58, shadowRx, 3);
  const g = grids[step];
  c.stampGrid(g, oxs[step], 59 - g.length, SURVIVOR_PALETTE);
  c.enforceBinaryAlpha();
  return c;
}

// ============================================================================
// 2. REFINED WALKER ZOMBIE (64x64, 8 frames: Walk 4, Death 4)
// Strictly <= 10 colors + 1px #0A090D outline. Top-left lighting.
// Simplified: NO blood specks, NO wrinkle clutter. Bold hulking green zombie!
// ============================================================================
const ZOMBIE_PALETTE: Palette = {
  K: OUTLINE,                // #0a090d (outline + eye sockets)
  G: [164, 214, 164, 255],   // #a4d6a4 mint-green top-left highlight
  g: [104, 162, 118, 255],   // #68a276 green bottom-right shadow
  W: [255, 255, 255, 255],   // #ffffff eye pinpricks & teeth
  M: [124, 24, 34, 255],     // #7c1822 screaming mouth interior
  C: [238, 228, 214, 255],   // #eee4d6 torn off-white shirt highlight
  c: [164, 158, 176, 255],   // #a49eb0 shirt cool shadow
  P: [78, 78, 88, 255],      // #4e4e58 charcoal pants highlight
  p: [42, 42, 50, 255],      // #2a2a32 charcoal pants/boots shadow
};

// Hulking Bald Green Head: 22x16 (clean 2-tone green, bold readable eyes & jaw at 48px)
const ZOMB_HEAD = [
  '.....KKKKKKKKKKK......',
  '...KKGGGGGGGGGGGKK....',
  '..KGGGGGGGGGGGGGGgK...',
  '.KGGGGGGGGGGGGGGGGgK..',
  '.KGGGgggggggggggmmgK..',
  'KGGgKKKKKggggKKKKKgK..',
  'KGgKEEEKWKKKKKEEEKWKK.',
  'KGgKEEEEEKKKKKEEEEEKK.',
  'KGgKKKKKKggggKKKKKKgK.',
  'KGgggggWWWWWWWWgggggK.',
  'KGggggKMMMMMMMMKggggK.',
  '.KggggKWWMMMMWWKgggK..',
  '.KggggKMMMMMMMMKggK...',
  '..KgggKKKKKKKKKKgK....',
  '...KggggggggggggK.....',
  '....KKKKKKKKKKKK......',
];

// Clean Broad Torn Shirt Torso (NO speckles, NO noisy wrinkles—pure top-left volume)
const ZOMB_TORSO = [
  '.....KKKKKKKKKKKKKKKKKKK......',
  '...KKCCCCCCCCCCCCCCCCCCCcKK...',
  '..KCCCCCCCCCCCCCCCCCCCCCCccK..',
  '.KCCCCCCCCCCCCCCCCCCCCCCCcccK.',
  'KCCCCCCCCCCCCCCCCCCCCCCCCccccK',
  'KCCCCCCCCCCCCccccccccccccccccK',
  'KCCCCccccccccccccccccccccccccK',
  '.KCCCCCCCCcccccccccccccccccccK',
  '.KccccccccccccccccccccccccccK.',
  '..KcccccccccccccccccCCCCCCCCK.',
  '..KPPPPPPPPPPPPppppppppppppK..',
  '...KPPPPPPPPPPPpppppppppppK...',
  '...KPPPPPPPPpppPPPPpppppppK...',
  '....KKKKKKKKKKKKKKKKKKKKKK....',
];

const ZOMB_ARM_DOWN = [
  '..KKKKKK....',
  '.KGGGGGGK...',
  'KGGGGGGggK..',
  'KGGGgggggK..',
  '.KGGgggggKK.',
  '.KggKKKKggK.',
  '..KGGGGgggK.',
  '..KGGGGgggK.',
  '..KgggggggK.',
  '..KGGGGggK..',
  '..KgggKggK..',
  '...KKKKKK...',
];

const ZOMB_ARM_FWD = [
  '..KKKKKK.....',
  '.KGGGGGGK....',
  'KGGGGGGggKK..',
  'KGGGggggggGK.',
  '.KGGgggggggK.',
  '..KKKKKKKKKK.',
  '....KGGGGggK.',
  '....KggggggK.',
  '.....KKKKKK..',
];

const ZOMB_ARM_BACK = [
  '..KKKKKK....',
  '.KGGGGGGK...',
  'KGGGGGGggK..',
  'KGGGgggggK..',
  'KGGgggggK...',
  'KggKKKKgK...',
  'KGGGGggK....',
  'KggggggK....',
  '.KKKKKK.....',
];

const ZOMB_BACK_ARM_FWD = [
  '.KKKKKK.....',
  'KGGGGggKK...',
  'KggggggggK..',
  '.KgggggggK..',
  '..KKKGGggK..',
  '....KgggK...',
  '.....KKK....',
];

const ZOMB_BACK_ARM_MID = [
  '.KKKKK....',
  'KGGGggK...',
  'KgggggK...',
  'KgggggK...',
  'KGGggK....',
  'KgggK.....',
  '.KKK......',
];

// Charcoal Pants + Boots (seamless pelvis overlap at y=40..58)
const ZOMB_LEG_PLANT = [
  '.KKKKKKK.',
  'KPPPPpppK',
  'KPPPPpppK',
  'KPPPppppK',
  'KPPPppppK',
  'KpppppppK',
  'KpppppppK',
  'KpppppppK',
  'KpppppppK',
  'KpppppppK',
  'KpppppppK',
  'KpppppppK',
  'KpppppppK',
  'KpppppppK',
  'KpppppppK',
  'KpppppppK',
  'KpppppppK',
  '.KKKKKKK.',
]; // 18 rows -> 41..58

const ZOMB_LEG_FWD = [
  '.KKKKKKK...',
  'KPPPPpppK..',
  'KPPPPpppK..',
  'KPPPppppK..',
  '.KPPppppK..',
  '.KpppppppK.',
  '.KpppppppK.',
  '..KppppppK.',
  '..KpppppppK',
  '..KpppppppK',
  '..KpppppppK',
  '..KpppppppK',
  '..KpppppppK',
  '..KpppppppK',
  '..KppppppppK',
  '..KppppppppK',
  '..KppppppppK',
  '...KKKKKKKK.',
]; // 18 rows -> 41..58

const ZOMB_LEG_BACK = [
  '.....KKKKKKK.',
  '....KpppppppK',
  '....KpppppppK',
  '...KpppppppK.',
  '...KpppppppK.',
  '..KpppppppK..',
  '..KpppppppK..',
  '.KpppppppK...',
  '.KpppppppK...',
  'KpppppppK....',
  'KpppppppK....',
  'KpppppppK....',
  'KpppppppK....',
  'KpppppppK....',
  'KpppppppK....',
  'KpppppppK....',
  'KpppppppK....',
  '.KKKKKKK.....',
]; // 18 rows -> 41..58

const ZOMB_LEG_LIFT = [
  '.KKKKKKK.',
  'KPPPPpppK',
  'KPPPPpppK',
  'KPPPppppK',
  'KpppppppK',
  'KpppppppK',
  'KpppppppK',
  'KpppppppK',
  'KpppppppK',
  'KpppppppK',
  '.KKKKKKK.',
]; // 11 rows -> 40..50

// Map 'E' in ZOMB_HEAD to OUTLINE (#0a090d) so eye sockets stay crisp inside the 9+1 budget
const ZOMB_PAL_WITH_E: Palette = { ...ZOMBIE_PALETTE, E: OUTLINE };

function buildRefinedZombieWalk(step: 0 | 1 | 2 | 3): PixelCanvas {
  const c = new PixelCanvas(64, 64);
  const bob = step === 1 ? 1 : step === 3 ? -1 : 0;
  const cx = 13;

  stampGroundShadow(c, 32, 58, 15, 4);

  if (step === 0 || step === 3) c.stampGrid(ZOMB_BACK_ARM_FWD, cx + 26, 28 + bob, ZOMB_PAL_WITH_E);
  else c.stampGrid(ZOMB_BACK_ARM_MID, cx + 25, 29 + bob, ZOMB_PAL_WITH_E);

  if (step === 0) c.stampGrid(ZOMB_LEG_BACK, cx + 4, 41, ZOMB_PAL_WITH_E);
  else if (step === 1) c.stampGrid(ZOMB_LEG_PLANT, cx + 6, 41, ZOMB_PAL_WITH_E);
  else if (step === 2) c.stampGrid(ZOMB_LEG_FWD, cx + 16, 41, ZOMB_PAL_WITH_E);
  else c.stampGrid(ZOMB_LEG_LIFT, cx + 6, 40, ZOMB_PAL_WITH_E);

  if (step === 0) c.stampGrid(ZOMB_LEG_FWD, cx + 16, 41, ZOMB_PAL_WITH_E);
  else if (step === 1) c.stampGrid(ZOMB_LEG_LIFT, cx + 16, 40, ZOMB_PAL_WITH_E);
  else if (step === 2) c.stampGrid(ZOMB_LEG_BACK, cx + 4, 41, ZOMB_PAL_WITH_E);
  else c.stampGrid(ZOMB_LEG_PLANT, cx + 14, 41, ZOMB_PAL_WITH_E);

  c.stampGrid(ZOMB_TORSO, cx + 3, 27 + (step === 1 ? 1 : 0), ZOMB_PAL_WITH_E);
  c.stampGrid(ZOMB_HEAD, cx + 11, 13 + bob, ZOMB_PAL_WITH_E);

  if (step === 0) c.stampGrid(ZOMB_ARM_BACK, cx + 0, 29 + bob, ZOMB_PAL_WITH_E);
  else if (step === 1 || step === 3) c.stampGrid(ZOMB_ARM_DOWN, cx + 2, 29 + bob, ZOMB_PAL_WITH_E);
  else c.stampGrid(ZOMB_ARM_FWD, cx + 4, 29 + bob, ZOMB_PAL_WITH_E);

  c.enforceBinaryAlpha();
  return c;
}

const ZOMB_DEATH_1 = [
  '....KKKKKKKKKKK......................',
  '..KKGGGGGGGGGGGKK....................',
  '.KGGGGGGGGGGGGGGgK...................',
  'KGGGGGGGGGGGGGGGGgK..................',
  'KGGGgggggggggggmmgK..................',
  'KGGgKKKKKggggKKKKKgK.................',
  'KGgKEEEKWKKKKKEEEKWKK................',
  'KGgKEEEEEKKKKKEEEEEKK................',
  'KGgKKKKKKggggKKKKKKgK................',
  'KGgggggWWWWWWWWgggggK................',
  'KGggggKMMMMMMMMKggggK................',
  '.KggggKWWMMMMWWKgggK.................',
  '..KggggKKKKKKKKKKgK..................',
  '...KKKKKKKKKKKKKKKKKKKKK.............',
  '..KKCCCCCCCCCCCCCCCCCCCCcKK..KKKKKK..',
  '.KCCCCCCCCCCCCCCCCCCCCCCcccKKGGGGGGK.',
  'KCCCCCCCCCCCCCCCCCCCCCCCcccKKGGGggggK',
  'KCCCCCCCCCCCCCCCCCCCCCCCCccKKGGgggggK',
  'KCCCCCCCCCCCCccccccccccccccKKggKKKKgK',
  'KCCCCccccccccccccccccccccccK.KGGGGggK',
  '.KcccccccccccccccccccccccccK..KgggggK',
  '..KPPPPPPPPPPPPpppppppppppK....KKKKK.',
  '...KPPPPPPPPPPPppppppppppK...........',
  '...KPPPPPPPPPPPppppppppppK...........',
  '...KPPPppppK...KPPPppppK.............',
  '...KPPpppppK....KPPpppppK............',
  '...KpppppppK....KpppppppK............',
  '...KpppppppK....KpppppppK............',
  '...KpppppppK.....KpppppppK...........',
  '...KpppppppK.....KpppppppK...........',
  '...KpppppppK.....KpppppppK...........',
  '...KpppppppK.....KpppppppK...........',
  '...KpppppppK.....KpppppppK...........',
  '...KpppppppK.....KpppppppK...........',
  '...KpppppppK.....KpppppppK...........',
  '...KpppppppK.....KpppppppK...........',
  '...KpppppppK.....KpppppppK...........',
  '...KpppppppK.....KpppppppK...........',
  '....KKKKKKK.......KKKKKKK............',
];

const ZOMB_DEATH_2 = [
  '.....KKKKKKKKKKK.....................',
  '...KKGGGGGGGGGGGKK...................',
  '..KGGGGGGGGGGGGGGgK..................',
  '.KGGGGGGGGGGGGGGGGgK.................',
  '.KGGGgggggggggggmmgK.................',
  'KGGgKKKKKggggKKKKKgK.................',
  'KGgKEEEKWKKKKKEEEKWKK................',
  'KGgKEEEEEKKKKKEEEEEKK................',
  'KGgKKKKKKggggKKKKKKgK................',
  'KGgggggWWWWWWWWgggggK................',
  'KGggggKMMMMMMMMKggggK................',
  '.KggggKWWMMMMWWKgggK.................',
  '..KKKKKKKKKKKKKKKKKKKKKK.............',
  '.KCCCCCCCCCCCCCCCCCCCCcKK.KKKKKK.....',
  'KCCCCCCCCCCCCCCCCCCCCCCccKGGGGGGK....',
  'KCCCCCCCCCCCCCCCCCCCCCCCcKGGGggggK...',
  'KCCCCccccccccccccccccccccKGGgggggK...',
  '.KccccccccccccccccccccccK.KGGGGggK...',
  '..KPPPPPPPPPPPPppppppppppK..KKKKK....',
  '..KPPPPPPPPPPPpppppppppppK...........',
  '..KPPPPpppKPPPppppKPPppppK...........',
  '..KppppKPPPppppKKPPPppppK............',
  '..KppppKpppppppKKpppppppK............',
  '..KppppKpppppppKKpppppppK............',
  '..KppppKpppppppKKpppppppK............',
  '..KppppKpppppppKKpppppppK............',
  '...KKKKKpppppppKKpppppppK............',
  '........KKKKKKK..KKKKKKK.............',
];

const ZOMB_DEATH_3 = [
  '.......KKKKKKKKKKK.........................',
  '.....KKGGGGGGGGGGGKK.......................',
  '....KGGGGGGGGGGGGGGgK......................',
  '...KGGGGGGGGGGGGGGGGgK..KKKKKKKKKKKKKK.....',
  '...KGGgKKKKKggggKKKKKgKKCCCCCCCCCCCCCccK...',
  '..KGgKEEEKWKKKKKEEEKWKKCCCCCCCCCCCCCCCCCcK.',
  '..KGgKEEEEEKKKKKEEEEEKKCCCCCCCCCCCCCCCCccK.',
  '..KGgKKKKKKggggKKKKKKgKCCCCccccccccccccccK.',
  '...KGgggggWWWWWWWWggggKccccccccccccccccccK.',
  '...KgggggKMMMMMMMMKgggKKPPPPPPPPppppppppK..',
  '....KKKKKKKKKKKKKKKKKKKKPPPppppKPPPppppppK.',
  '.....KGGGGggKKGGGGggKKKpppppppKpppppppKK...',
  '....KGGgggggKKgggggggK.KppppppKpppppppK....',
  '....KgggggggKKGGGGggK..KppppppKpppppppK....',
  '.....KKKKKKKK.KKKKKK....KKKKKK.KKKKKKK.....',
];

const ZOMB_DEATH_4 = [
  '.......KKKKKKKKKKK................................',
  '.....KKGGGGGGGGGGGKK.....KKKKKKKKKKKKKKK..........',
  '....KGGGGGGGGGGGGGGgK...KCCCCCCCCCCCCCCcKK........',
  '...KGGGGGGGGGGGGGGGGgK.KCCCCCCCCCCCCCCCCccK.......',
  '..KGGgKKKKKggggKKKKKgKKCCCCCCCCCCCCCCCCcccK.......',
  '..KGgKEEEEKggggKEEEEKKKCCCCccccccccccccccccK......',
  '..KGgKEEEEKggggKEEEEKgKccccccccccccccPPPPppK......',
  '...KGgggggWWWWWWgggggK.KccccccccccccKPPPppppK.....',
  '...KgggggKMMMMMMMMKggK..KKKKKGGGGggKKPPPpppppKK...',
  '....KKKKKKKKKKKKKKKKK.......KGGgggggKKppppppppK...',
  '......KGGGGggK..............KgggggggKKppppppppK...',
  '......KggggggK...............KKKKKKKK.KKKKKKKK....',
  '.......KKKKKK.....................................',
];

function buildRefinedZombieDeath(step: 0 | 1 | 2 | 3): PixelCanvas {
  const c = new PixelCanvas(64, 64);
  const grids = [ZOMB_DEATH_1, ZOMB_DEATH_2, ZOMB_DEATH_3, ZOMB_DEATH_4];
  const oxs = [13, 13, 10, 7];
  const shadowCx = [31, 30, 31, 31][step];
  const shadowRx = [15, 16, 19, 22][step];

  stampGroundShadow(c, shadowCx, 58, shadowRx, 4);
  const g = grids[step];
  // Map 'm' gracefully to 'g' to stay strictly within 9 colors + 1 outline!
  const pal: Palette = { ...ZOMB_PAL_WITH_E, m: ZOMBIE_PALETTE.g };
  c.stampGrid(g, oxs[step], 59 - g.length, pal);
  c.enforceBinaryAlpha();
  return c;
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

const survivorFrames = [
  buildRefinedSurvivorWalk(0),
  buildRefinedSurvivorWalk(1),
  buildRefinedSurvivorWalk(2),
  buildRefinedSurvivorWalk(3),
  buildRefinedSurvivorHurt(),
  buildRefinedSurvivorDeath(0),
  buildRefinedSurvivorDeath(1),
  buildRefinedSurvivorDeath(2),
  buildRefinedSurvivorDeath(3),
];

const zombieFrames = [
  buildRefinedZombieWalk(0),
  buildRefinedZombieWalk(1),
  buildRefinedZombieWalk(2),
  buildRefinedZombieWalk(3),
  buildRefinedZombieDeath(0),
  buildRefinedZombieDeath(1),
  buildRefinedZombieDeath(2),
  buildRefinedZombieDeath(3),
];

saveSheetPNG(OUT_DIR, 'survivor_refined_spritesheet.png', buildHorizontalStrip(survivorFrames, 64, 64));
saveSheetPNG(OUT_DIR, 'walker_refined_spritesheet.png', buildHorizontalStrip(zombieFrames, 64, 64));

const survivorNormalColors = countUniqueOpaqueColors([
  ...survivorFrames.slice(0, 4),
  ...survivorFrames.slice(5),
]);
const zombieColors = countUniqueOpaqueColors(zombieFrames);

const manifest = {
  pack: 'refined_phase1',
  name: 'Refined Survivor & Walker Zombie (Phase 1)',
  style: 'Simplified 16-bit, 8-10 flat colors + 1px #0A090D outline, top-left lighting, baked ground ellipse shadow, no AA, no gradients',
  assets: [
    {
      id: 'survivor_refined',
      title: 'Survivor (Refined)',
      file: 'survivor_refined_spritesheet.png',
      frameSize: { w: 64, h: 64 },
      frameCount: survivorFrames.length,
      sheetSize: { w: survivorFrames.length * 64, h: 64 },
      footBaselineY: 58,
      colorCountIncludingOutline: survivorNormalColors.length,
      animations: {
        walk: { startFrame: 0, count: 4, fps: 10, loop: true },
        hurt: { startFrame: 4, count: 1, fps: 8, loop: false, transientFlash: true },
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
    {
      id: 'walker_refined',
      title: 'Walker Zombie (Refined)',
      file: 'walker_refined_spritesheet.png',
      frameSize: { w: 64, h: 64 },
      frameCount: zombieFrames.length,
      sheetSize: { w: zombieFrames.length * 64, h: 64 },
      footBaselineY: 58,
      colorCountIncludingOutline: zombieColors.length,
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
  ],
};

fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Save visual inspection sheet (3x zoom + 1x strip on grass) for quality verification
saveInspectionPreview(
  path.resolve(process.cwd(), 'scripts/_inspect_refined.png'),
  [
    { frames: survivorFrames, frameW: 64, frameH: 64, baselineY: 58 },
    { frames: zombieFrames, frameW: 64, frameH: 64, baselineY: 58 },
  ],
  3
);

// Also save a grass-background 1x/48px readability preview for inspection
const grassInspect = new PixelCanvas(576, 128);
grassInspect.fillRect(0, 0, 576, 128, [140, 196, 47, 255]);
grassInspect.blitFrom(buildHorizontalStrip(survivorFrames, 64, 64), 0, 0);
grassInspect.blitFrom(buildHorizontalStrip(zombieFrames, 64, 64), 0, 64);
const upGrass = upscaleNearest(grassInspect, 2);
fs.writeFileSync(
  path.resolve(process.cwd(), 'scripts/_inspect_refined_1x_grass.png'),
  encodePNG(upGrass.width, upGrass.height, upGrass.data)
);

console.log('Survivor unique colors (incl. outline & shadow):', survivorNormalColors.length, survivorNormalColors);
console.log('Zombie unique colors (incl. outline & shadow):', zombieColors.length, zombieColors);
console.log('Survivor frame heights:', survivorFrames.map((f) => f.getBounds().height));
console.log('Zombie frame heights:', zombieFrames.map((f) => f.getBounds().height));
