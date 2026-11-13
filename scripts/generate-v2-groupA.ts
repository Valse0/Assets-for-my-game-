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
} from './lib/pixel';

const OUT_DIR = path.resolve(process.cwd(), 'public/assets/v2/zombies');

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

// Downsample any sprite frame to 48px high (nearest-neighbor crisp) for 48px readability preview
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
// 1. WALKER ATTACK SPRITESHEET (64x64, 4 frames, footBaselineY = 58, NO SHADOW)
// Matches walker_refined_spritesheet.png (9 colors + #0A090D outline = 10 total)
// ============================================================================
const WALKER_PALETTE: Palette = {
  K: OUTLINE,
  E: OUTLINE,
  G: [164, 214, 164, 255],
  g: [104, 162, 118, 255],
  W: [255, 255, 255, 255],
  M: [124, 24, 34, 255],
  C: [238, 228, 214, 255],
  c: [164, 158, 176, 255],
  P: [78, 78, 88, 255],
  p: [42, 42, 50, 255],
};

const WALKER_HEAD_IDLE = [
  '.....KKKKKKKKKKK......',
  '...KKGGGGGGGGGGGKK....',
  '..KGGGGGGGGGGGGGGgK...',
  '.KGGGGGGGGGGGGGGGGgK..',
  '.KGGGggggggggggggggK..',
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

const WALKER_HEAD_ROAR = [
  '.....KKKKKKKKKKK......',
  '...KKGGGGGGGGGGGKK....',
  '..KGGGGGGGGGGGGGGgK...',
  '.KGGGGGGGGGGGGGGGGgK..',
  '.KGGGggggggggggggggK..',
  'KGGgKKKKKggggKKKKKgK..',
  'KGgKEEEKWKKKKKEEEKWKK.',
  'KGgKEEEEEKKKKKEEEEEKK.',
  'KGgKKKKKKggggKKKKKKgK.',
  'KGgggggWWWWWWWWgggggK.',
  'KGggggKMMMMMMMMKggggK.',
  '.KggggKMMMMMMMMKgggK..',
  '.KggggKWWMMMMWWKggK...',
  '.KggggKMMMMMMMMKggK...',
  '..KgggKKKKKKKKKKgK....',
  '....KKKKKKKKKKKK......',
];

const WALKER_TORSO = [
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

const WALKER_LEG_PLANT = [
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

const WALKER_LEG_FWD = [
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
];

const WALKER_LEG_BACK = [
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
];

const WALKER_ARM_RAISE = [
  '..KKKKKK....',
  '.KGGGGGGK...',
  'KGGGGGGggK..',
  'KGGGgggggK..',
  '.KGGgggggK..',
  '..KKggKKgK..',
  '...KGGGGgK..',
  '...KgggggK..',
  '....KKKKK...',
];

const WALKER_ARM_SLASH_FWD = [
  '..KKKKKKKKKKK....',
  '.KGGGGGGGGGGGKK..',
  'KGGGGGGGGgggggGK.',
  'KGGGgggggggggggK.',
  '.KKKKKKKKKKKKKK..',
  '......KGGGGggK...',
  '......KggggggK...',
  '.......KKKKKK....',
];

const WALKER_ARM_SLASH_LOW = [
  '..KKKKKK........',
  '.KGGGGGGKK......',
  'KGGGGGGGGgKK....',
  '.KGGGgggggggKK..',
  '..KKKgggggggggK.',
  '.....KKKGGGGggK.',
  '........KgggggK.',
  '.........KKKKK..',
];

const WALKER_BACK_ARM_RAISE = [
  '..KKKKKK...',
  '.KGGGGggK..',
  'KGGGGgggK..',
  '.KKgggggK..',
  '...KKgggK..',
  '.....KKK...',
];

const WALKER_BACK_ARM_REACH = [
  '.KKKKKKKKK...',
  'KGGGGGGGGgKK.',
  'KggggggggggGK',
  '.KKKKKKKGGGGK',
  '........KKKK.',
];

function buildWalkerAttack(step: 0 | 1 | 2 | 3): PixelCanvas {
  const c = new PixelCanvas(64, 64);
  const cx = [11, 14, 16, 13][step];

  // Back arm
  if (step === 0) c.stampGrid(WALKER_BACK_ARM_RAISE, cx + 24, 23, WALKER_PALETTE);
  else if (step === 1) c.stampGrid(WALKER_BACK_ARM_REACH, cx + 26, 27, WALKER_PALETTE);
  else if (step === 2) c.stampGrid(WALKER_BACK_ARM_REACH, cx + 28, 30, WALKER_PALETTE);
  else c.stampGrid(WALKER_BACK_ARM_RAISE, cx + 24, 29, WALKER_PALETTE);

  // Legs (planted cleanly on y = 58)
  if (step === 0) {
    c.stampGrid(WALKER_LEG_BACK, cx + 3, 41, WALKER_PALETTE);
    c.stampGrid(WALKER_LEG_PLANT, cx + 16, 41, WALKER_PALETTE);
  } else if (step === 1 || step === 2) {
    c.stampGrid(WALKER_LEG_BACK, cx + 4, 41, WALKER_PALETTE);
    c.stampGrid(WALKER_LEG_FWD, cx + 17, 41, WALKER_PALETTE);
  } else {
    c.stampGrid(WALKER_LEG_PLANT, cx + 7, 41, WALKER_PALETTE);
    c.stampGrid(WALKER_LEG_PLANT, cx + 16, 41, WALKER_PALETTE);
  }

  // Torso & head (torso anchored at 27..40 so waist always meets legs seamlessly at y=41)
  const torsoY = step === 2 ? 28 : 27;
  const headX = step === 0 ? cx + 10 : step === 2 ? cx + 14 : cx + 12;
  const headY = step === 0 ? 12 : step === 2 ? 15 : 13;
  c.stampGrid(WALKER_TORSO, cx + 3, torsoY, WALKER_PALETTE);
  c.stampGrid(step === 1 || step === 2 ? WALKER_HEAD_ROAR : WALKER_HEAD_IDLE, headX, headY, WALKER_PALETTE);

  // Foreground slashing arm
  if (step === 0) c.stampGrid(WALKER_ARM_RAISE, cx + 1, 23, WALKER_PALETTE);
  else if (step === 1) c.stampGrid(WALKER_ARM_SLASH_FWD, cx + 12, 28, WALKER_PALETTE);
  else if (step === 2) c.stampGrid(WALKER_ARM_SLASH_LOW, cx + 14, 31, WALKER_PALETTE);
  else c.stampGrid(WALKER_ARM_RAISE, cx + 6, 30, WALKER_PALETTE);

  c.enforceBinaryAlpha();
  return c;
}

// ============================================================================
// 2. RUNNER ATTACK SPRITESHEET (64x64, 4 frames, footBaselineY = 58, NO SHADOW)
// Simplified <= 10 colors + #0A090D outline matching Runner's cyan skin + red hoodie
// ============================================================================
const RUNNER_PALETTE: Palette = {
  K: OUTLINE,
  E: OUTLINE,
  C: [184, 224, 218, 255],
  c: [106, 158, 156, 255],
  H: [42, 46, 58, 255],
  W: [244, 240, 234, 255],
  M: [148, 24, 34, 255],
  R: [224, 48, 52, 255],
  r: [136, 20, 30, 255],
  P: [58, 66, 92, 255],
  p: [28, 32, 48, 255],
};

const RUNNER_HEAD = [
  '....KK.KKK..........',
  '...KHHKHHHK.........',
  '..KCCCHHCCCcK.......',
  '.KCCcccccccscK......',
  '.KccssCCCCCCsK......',
  'KcsKKKssssKKKsK.....',
  'KcKEEWKKKKKEEWKK....',
  'KcKEEEssssKEEEsK....',
  'KcsKKKsssssKKKKK....',
  '.KcsccWWWWWWscK.....',
  '.KssscMMMMMMscK.....',
  '..KssKWWMWWWsK......',
  '...KKsKKKKKKK.......',
  '....KKKKKKKK........',
]; // uses 's' -> map 's' to 'c' so <= 10 colors + outline!
const RUNNER_PAL_MAPPED: Palette = { ...RUNNER_PALETTE, s: RUNNER_PALETTE.c };

const RUNNER_TORSO = [
  '..KKKKKKKKKKKKK....',
  '.KrrRRRRRRRRRRrK...',
  'KrrRRRRRRRRRrrrqK..',
  'KrrRRRRrrrrrrqqqK..',
  '.KrrRRRRrrrrqqqqK..',
  '..KKrrrqqqqqppKK...',
  '...KppppppppppK....',
  '....KKKKKKKKKK.....',
];
const RUNNER_PAL_FULL: Palette = { ...RUNNER_PAL_MAPPED, q: RUNNER_PALETTE.r };

const RUNNER_LEG_PLANT = [
  '.KKKKK.',
  'KPPPppK',
  'KPPpppK',
  'KpppppK',
  'KpppppK',
  'KpppppK',
  'KpppppK',
  '.KKKKK.',
]; // 8 rows -> 51..58

const RUNNER_LEG_FWD = [
  '.KKKKK...',
  'KPPPppK..',
  '.KPpppK..',
  '..KpppK..',
  '..KppppK.',
  '..KpppppK',
  '..KpppppK',
  '...KKKKK.',
];

const RUNNER_LEG_BACK = [
  '....KKKKK.',
  '...KpppppK',
  '..KpppppK.',
  '.KpppppK..',
  'KpppppK...',
  'KpppppK...',
  'KpppppK...',
  '.KKKKK....',
];

const RUNNER_ARM_CLAW_BACK = [
  '.KKKKK.',
  'KrrRRK.',
  'KrCCcK.',
  '.KccKK.',
  '..KK...',
];

const RUNNER_ARM_CLAW_FWD = [
  '.KKKKKKKK..',
  'KRRRRRRRKK.',
  '.KrrrCCCCcK',
  '..KKKcccKK.',
  '.....KKK...',
];

const RUNNER_ARM_CLAW_SLASH = [
  '..KKKKKK....',
  '.KRRRRRRKK..',
  'KrrrCCCCCcK.',
  '.KKKcccKKK..',
  '....KCK.....',
  '.....K......',
];

function buildRunnerAttack(step: 0 | 1 | 2 | 3): PixelCanvas {
  const c = new PixelCanvas(64, 64);
  const cx = [17, 21, 23, 19][step];
  const crouch = step === 0 ? 2 : step === 2 ? 1 : 0;

  // Back arm
  if (step === 0) c.stampGrid(RUNNER_ARM_CLAW_BACK, cx + 1, 43 + crouch, RUNNER_PAL_FULL);
  else if (step === 1 || step === 2) c.stampGrid(RUNNER_ARM_CLAW_FWD, cx + 16, 42 + crouch, RUNNER_PAL_FULL);
  else c.stampGrid(RUNNER_ARM_CLAW_BACK, cx + 13, 44, RUNNER_PAL_FULL);

  // Legs at y = 58
  if (step === 0) {
    c.stampGrid(RUNNER_LEG_BACK, cx + 1, 51, RUNNER_PAL_FULL);
    c.stampGrid(RUNNER_LEG_PLANT, cx + 10, 51, RUNNER_PAL_FULL);
  } else if (step === 1 || step === 2) {
    c.stampGrid(RUNNER_LEG_BACK, cx + 0, 51, RUNNER_PAL_FULL);
    c.stampGrid(RUNNER_LEG_FWD, cx + 12, 51, RUNNER_PAL_FULL);
  } else {
    c.stampGrid(RUNNER_LEG_PLANT, cx + 4, 51, RUNNER_PAL_FULL);
    c.stampGrid(RUNNER_LEG_PLANT, cx + 11, 51, RUNNER_PAL_FULL);
  }

  // Hunched torso + head
  c.stampGrid(RUNNER_TORSO, cx + 3, 44 + crouch, RUNNER_PAL_FULL);
  c.stampGrid(RUNNER_HEAD, cx + 7, 30 + crouch, RUNNER_PAL_FULL);

  // Foreground slashing claw
  if (step === 0) c.stampGrid(RUNNER_ARM_CLAW_BACK, cx + 2, 43 + crouch, RUNNER_PAL_FULL);
  else if (step === 1) c.stampGrid(RUNNER_ARM_CLAW_FWD, cx + 11, 44 + crouch, RUNNER_PAL_FULL);
  else if (step === 2) c.stampGrid(RUNNER_ARM_CLAW_SLASH, cx + 13, 45 + crouch, RUNNER_PAL_FULL);
  else c.stampGrid(RUNNER_ARM_CLAW_BACK, cx + 6, 45, RUNNER_PAL_FULL);

  c.enforceBinaryAlpha();
  return c;
}

// ============================================================================
// 3. SPITTER ATTACK SPRITESHEET (64x64, 4 frames, footBaselineY = 58, NO SHADOW)
// Opening mouth & spitting bright green acid pose! <= 10 colors + outline
// ============================================================================
const SPITTER_PALETTE: Palette = {
  K: OUTLINE,
  E: OUTLINE,
  M: OUTLINE,
  G: [158, 210, 156, 255],
  g: [88, 146, 102, 255],
  W: [244, 240, 234, 255],
  A: [148, 255, 42, 255],
  a: [76, 196, 28, 255],
  C: [222, 214, 208, 255],
  c: [140, 136, 160, 255],
  R: [192, 38, 38, 255],
  P: [54, 64, 86, 255],
};

const SPITTER_HEAD_CHARGE = [
  '....KKKKKKKKK.......',
  '..KKGGGGGGGGGKK.....',
  '.KGGGGGGGGGGGGgK....',
  'KGGGggggggggggmmK...',
  'KggmKKKKmmmKKKKmzK..',
  'KgmKEEWKKKKKEEWKK...',
  'KgmKEEEgmmKKEEEgmK..',
  'KgmKKKKmmmmKKKKKmK..',
  'KgmgggmWWWWWWmggmK..',
  '.KgmggKMMaaMMKgmK...',
  '.KzmggKWaaaaWKzmK...',
  '..KzmmKKKKKKKKmK....',
  '...KzzzmmmmmmzK.....',
  '....KKKKKKKKKK......',
];

const SPITTER_HEAD_OPEN = [
  '....KKKKKKKKK.........',
  '..KKGGGGGGGGGKK.......',
  '.KGGGGGGGGGGGGgK......',
  'KGGGggggggggggmmK.....',
  'KggmKKKKmmmKKKKmzK....',
  'KgmKEEWKKKKKEEWKK.....',
  'KgmKEEEgmmKKEEEgmK....',
  'KgmKKKKmmmmKKKKKmK....',
  'KgmgggmWWWWWWmggmK....',
  '.KgmggKMMAAaMKgmKK....',
  '.KzmggKWAAAAWKgmAaK...',
  '.KzzmmKMMAAaMKmKaAK...',
  '..KzzzKWWWWWWKmK.KK...',
  '...KKzKKKKKKKKK.......',
];

const SPITTER_HEAD_SPIT = [
  '....KKKKKKKKK..............',
  '..KKGGGGGGGGGKK............',
  '.KGGGGGGGGGGGGgK...........',
  'KGGGggggggggggmmK..........',
  'KggmKKKKmmmKKKKmzK.........',
  'KgmKEEWKKKKKEEWKK..........',
  'KgmKEEEgmmKKEEEgmK.........',
  'KgmKKKKmmmmKKKKKmK.........',
  'KgmgggmWWWWWWmggmK.........',
  '.KgmggKMMAAaMKgmKKKKKK.....',
  '.KzmggKWAAAAWKmmKAAAaaKK...',
  '.KzzmmKMMAAaMKmKaaAAAAAaK..',
  '..KzzzKWWWWWWKmKKaAAaaKK...',
  '...KKzKKKKKKKKK..KKKKK.....',
];

const SPITTER_HEAD_RECOVER = [
  '....KKKKKKKKK...........',
  '..KKGGGGGGGGGKK.........',
  '.KGGGGGGGGGGGGgK........',
  'KGGGggggggggggmmK.......',
  'KggmKKKKmmmKKKKmzK......',
  'KgmKEEWKKKKKEEWKK.......',
  'KgmKEEEgmmKKEEEgmK......',
  'KgmKKKKmmmmKKKKKmK......',
  'KgmgggmWWWWWWmggmK......',
  '.KgmggKMMaaMMKgmK..KK...',
  '.KzmggKWaaaaWKzmK.KAaK..',
  '..KzmmKKKKKKKKmK...KK...',
  '...KzzzmmmmmmzK.........',
  '....KKKKKKKKKK..........',
];

const SPITTER_TORSO = [
  '..KKKKKKKKKKKKKK....',
  '.KCRCCcCCCCCCCCCcK..',
  'KCRRRCcCCCcCRRCCCcK.',
  'KCCrRCcCCCcCRRCCCcK.',
  'KCCCCcCCcCCCCCCCCcK.',
  'KccccCCCCCCrCCCCCcK.',
  '.KcccCCCCcCRrCCccK..',
  '.KccccCCCCCCCCccK...',
  '..KnnnnKccccccKK....',
  '..KPPPPPPPPPPPPK....',
  '...KKKKKKKKKKKK.....',
];

const SPITTER_LEG_PLANT = [
  '.KKKKK.',
  'KPPPPP K'.replace(' ', ''),
  'KPPPPPK',
  'KPPPPPK',
  'KPPPPPK',
  'KPPPPPK',
  'KPPPPPK',
  'KKKKKKK',
  'KKKKKKK',
  'KKKKKKK',
  '.KKKKK.',
]; // 11 rows -> 48..58

const SPITTER_LEG_FWD = [
  '.KKKKK...',
  'KPPPPPK..',
  'KPPPPPK..',
  '.KPPPPK..',
  '.KPPPPPK.',
  '..KPPPPK.',
  '..KPPPPPK',
  '..KKKKKKK',
  '..KKKKKKK',
  '..KKKKKKK',
  '...KKKKK.',
];

const SPITTER_LEG_BACK = [
  '...KKKKK.',
  '..KPPPPPK',
  '..KPPPPPK',
  '.KPPPPPK.',
  '.KPPPPPK.',
  'KPPPPPK..',
  'KPPPPPK..',
  'KKKKKKK..',
  'KKKKKKK..',
  'KKKKKKK..',
  '.KKKKK...',
];

const SPITTER_ARM_BACK = [
  '..KKKK.',
  '.KcccK.',
  'KcccK..',
  'KGgK...',
  'KgK....',
  '.KK....',
];
const SPITTER_ARM_DOWN = [
  '.KKKK..',
  'KCcccK.',
  'KccccK.',
  'KGGggK.',
  'KggggK.',
  '.KKKK..',
];
const SPITTER_ARM_FWD = [
  '..KKKK...',
  '.KCccKK..',
  'KCccGGgK.',
  '.KccGggK.',
  '..KKgggK.',
  '....KKK..',
];

const SPITTER_PAL_FULL: Palette = {
  ...SPITTER_PALETTE,
  m: SPITTER_PALETTE.g,
  z: SPITTER_PALETTE.g,
  r: SPITTER_PALETTE.R,
  n: OUTLINE,
};

function buildSpitterAttack(step: 0 | 1 | 2 | 3): PixelCanvas {
  const c = new PixelCanvas(64, 64);
  const cx = [16, 18, 20, 18][step];

  // Back arm
  if (step >= 1 && step <= 2) c.stampGrid(SPITTER_ARM_FWD, cx + 15, 38, SPITTER_PAL_FULL);
  else c.stampGrid(SPITTER_ARM_DOWN, cx + 13, 38, SPITTER_PAL_FULL);

  // Legs anchored at y = 58
  if (step === 0) {
    c.stampGrid(SPITTER_LEG_BACK, cx + 2, 48, SPITTER_PAL_FULL);
    c.stampGrid(SPITTER_LEG_PLANT, cx + 10, 48, SPITTER_PAL_FULL);
  } else if (step === 1 || step === 2) {
    c.stampGrid(SPITTER_LEG_BACK, cx + 2, 48, SPITTER_PAL_FULL);
    c.stampGrid(SPITTER_LEG_FWD, cx + 10, 48, SPITTER_PAL_FULL);
  } else {
    c.stampGrid(SPITTER_LEG_PLANT, cx + 4, 48, SPITTER_PAL_FULL);
    c.stampGrid(SPITTER_LEG_PLANT, cx + 10, 48, SPITTER_PAL_FULL);
  }

  c.stampGrid(SPITTER_TORSO, cx + (step === 0 ? 1 : step === 2 ? 4 : 3), 38, SPITTER_PAL_FULL);

  const heads = [SPITTER_HEAD_CHARGE, SPITTER_HEAD_OPEN, SPITTER_HEAD_SPIT, SPITTER_HEAD_RECOVER];
  const headX = [cx + 1, cx + 4, cx + 6, cx + 3][step];
  const headY = [25, 25, 25, 25][step];
  c.stampGrid(heads[step], headX, headY, SPITTER_PAL_FULL);

  if (step === 0) c.stampGrid(SPITTER_ARM_BACK, cx + 0, 38, SPITTER_PAL_FULL);
  else c.stampGrid(SPITTER_ARM_DOWN, cx + (step === 2 ? 5 : 3), 39, SPITTER_PAL_FULL);

  c.enforceBinaryAlpha();
  return c;
}

// ============================================================================
// 4. TANK ATTACK SPRITESHEET (96x96, 4 frames, footBaselineY = 88, NO SHADOW)
// Hulking riot-armored brute swinging massive red gauntlets / ground slam!
// <= 10 colors + #0A090D outline
// ============================================================================
const TANK_PALETTE: Palette = {
  K: OUTLINE,
  E: OUTLINE,
  A: [86, 104, 139, 255],  // slate-blue armor highlight
  a: [44, 58, 92, 255],    // armor shadow
  R: [204, 52, 54, 255],   // red chest vest & gauntlet highlight
  r: [136, 24, 32, 255],   // red shadow
  G: [148, 192, 152, 255], // zombie jaw & forearm highlight
  g: [88, 132, 102, 255],  // zombie skin shadow
  W: [244, 240, 234, 255], // teeth & helmet eye glint
  O: [68, 70, 82, 255],    // charcoal overalls highlight
  o: [34, 36, 46, 255],    // overalls/boots shadow
};

function drawTankBox(c: PixelCanvas, x: number, y: number, w: number, h: number, fill: RGBA, hi?: RGBA) {
  c.fillRect(x, y, w, h, fill);
  if (hi) c.fillRect(x, y, Math.max(2, Math.floor(w * 0.65)), Math.max(2, Math.floor(h * 0.55)), hi);
}

function drawTankArm(c: PixelCanvas, x: number, y: number, angle: 'up' | 'swing' | 'slam' | 'ready') {
  // Shoulder pauldron
  c.fillEllipse(x + 8, y + 7, 8, 7, TANK_PALETTE.a);
  c.fillEllipse(x + 7, y + 5, 6, 5, TANK_PALETTE.A);

  if (angle === 'up') {
    // Arm raised high above helmet
    drawTankBox(c, x + 3, y - 14, 9, 16, TANK_PALETTE.g, TANK_PALETTE.G);
    drawTankBox(c, x + 2, y - 24, 12, 11, TANK_PALETTE.r, TANK_PALETTE.R); // massive red gauntlet
  } else if (angle === 'swing') {
    // Sweeping forward-down
    drawTankBox(c, x + 10, y + 6, 12, 12, TANK_PALETTE.g, TANK_PALETTE.G);
    drawTankBox(c, x + 18, y + 14, 13, 13, TANK_PALETTE.r, TANK_PALETTE.R);
  } else if (angle === 'slam') {
    // Crashing down near floor y=88
    drawTankBox(c, x + 8, y + 10, 11, 16, TANK_PALETTE.g, TANK_PALETTE.G);
    drawTankBox(c, x + 10, y + 25, 14, 13, TANK_PALETTE.r, TANK_PALETTE.R);
  } else {
    // Heavy guard down-forward
    drawTankBox(c, x + 3, y + 10, 10, 14, TANK_PALETTE.g, TANK_PALETTE.G);
    drawTankBox(c, x + 4, y + 23, 12, 11, TANK_PALETTE.r, TANK_PALETTE.R);
  }
}

function buildTankAttack(step: 0 | 1 | 2 | 3): PixelCanvas {
  const c = new PixelCanvas(96, 96);
  const ox = [18, 22, 24, 20][step];
  const crouch = step === 0 ? -3 : step === 2 ? 7 : step === 1 ? 3 : 0;

  // Back arm (far right side)
  const backArmAngle = step === 0 ? 'up' : step === 1 ? 'swing' : step === 2 ? 'slam' : 'ready';
  drawTankArm(c, ox + 34, 34 + crouch, backArmAngle);

  // Heavy tactical legs planted at y = 88!
  const legSpread = step === 1 || step === 2 ? 4 : 0;
  // Back leg
  drawTankBox(c, ox + 10 - legSpread, 62 + Math.max(0, crouch - 2), 12, 18 - Math.max(0, crouch - 2), TANK_PALETTE.o, TANK_PALETTE.O);
  drawTankBox(c, ox + 9 - legSpread, 80, 14, 8, TANK_PALETTE.o);
  // Front leg
  drawTankBox(c, ox + 28 + legSpread, 62 + Math.max(0, crouch - 2), 12, 18 - Math.max(0, crouch - 2), TANK_PALETTE.o, TANK_PALETTE.O);
  drawTankBox(c, ox + 28 + legSpread, 80, 15, 8, TANK_PALETTE.o);

  // Broad riot-armored torso + red vest + overalls (top-left lit)
  const ty = 34 + crouch;
  drawTankBox(c, ox + 8, ty, 34, 22, TANK_PALETTE.a, TANK_PALETTE.A);
  drawTankBox(c, ox + 19, ty + 2, 14, 15, TANK_PALETTE.r, TANK_PALETTE.R); // red vest
  drawTankBox(c, ox + 10, ty + 18, 30, 13, TANK_PALETTE.o, TANK_PALETTE.O); // overalls waist

  // Riot Helmet Head (facing right)
  const hx = ox + (step === 2 ? 19 : 16);
  const hy = 16 + crouch;
  c.fillEllipse(hx + 11, hy + 10, 11, 10, TANK_PALETTE.a);
  c.fillEllipse(hx + 10, hy + 8, 9, 7, TANK_PALETTE.A);
  // Visor & glowing/white eye dots
  c.fillRect(hx + 7, hy + 7, 13, 4, TANK_PALETTE.K);
  c.fillRect(hx + 10, hy + 8, 2, 2, TANK_PALETTE.W);
  c.fillRect(hx + 16, hy + 8, 2, 2, TANK_PALETTE.W);
  // Green roaring lower jaw + teeth
  c.fillRect(hx + 7, hy + 11, 13, 8, TANK_PALETTE.g);
  c.fillRect(hx + 8, hy + 11, 9, 4, TANK_PALETTE.G);
  c.fillRect(hx + 9, hy + 13, 9, 4, TANK_PALETTE.K);
  c.fillRect(hx + 10, hy + 13, 2, 1, TANK_PALETTE.W);
  c.fillRect(hx + 14, hy + 13, 2, 1, TANK_PALETTE.W);

  // Foreground arm (left/front shoulder swinging & slamming)
  drawTankArm(c, ox + 4, 34 + crouch, backArmAngle);

  c.applyOutline(OUTLINE);
  c.enforceBinaryAlpha();
  return c;
}

// ============================================================================
// 5. BOSS ATTACK SPRITESHEET (128x128, 4 frames, footBaselineY = 118, NO SHADOW)
// Colossal Mutant Brute roaring + ground slam, facing RIGHT!
// Strictly <= 10 flat colors + #0A090D outline = 11 total
// ============================================================================
const BOSS_PALETTE: Palette = {
  K: OUTLINE,
  F: [218, 198, 192, 255], // light grey-pink skin highlight
  f: [178, 142, 146, 255], // grey-pink midtone
  s: [122, 86, 102, 255],  // bruised mauve shadow
  R: [218, 56, 44, 255],   // bright blood / glowing red eyes
  r: [148, 26, 34, 255],   // deep crimson muscle wound
  B: [246, 242, 236, 255], // white back bone spikes, teeth & claws
  P: [58, 74, 112, 255],   // dark blue torn shorts highlight
  p: [30, 38, 64, 255],    // dark blue torn shorts shadow
  G: [240, 178, 52, 255],  // yellow/gold belt buckle
  g: [156, 92, 36, 255],   // leather belt / knee patch
};

function drawBossClawedArm(
  c: PixelCanvas,
  sx: number,
  sy: number,
  mode: 'roarUp' | 'swing' | 'slam' | 'recover',
  isForeground: boolean
) {
  const main = isForeground ? BOSS_PALETTE.f : BOSS_PALETTE.s;
  const hi = isForeground ? BOSS_PALETTE.F : BOSS_PALETTE.f;
  const sh = BOSS_PALETTE.s;

  if (mode === 'roarUp') {
    // Bulky upper arm + raised roaring fist
    c.fillEllipse(sx, sy - 6, 12, 14, sh);
    c.fillEllipse(sx - 1, sy - 8, 10, 11, main);
    c.fillEllipse(sx - 2, sy - 11, 6, 6, hi);
    c.fillRect(sx - 5, sy - 10, 7, 5, BOSS_PALETTE.R);
    // Colossal fist raised overhead
    c.fillEllipse(sx + 4, sy - 24, 12, 10, sh);
    c.fillEllipse(sx + 3, sy - 26, 9, 8, hi);
    c.fillRect(sx - 4, sy - 33, 3, 4, BOSS_PALETTE.B);
    c.fillRect(sx + 3, sy - 35, 3, 4, BOSS_PALETTE.B);
    c.fillRect(sx + 10, sy - 33, 3, 4, BOSS_PALETTE.B);
  } else if (mode === 'swing') {
    // Massive downward arc forward-right
    c.fillEllipse(sx + 10, sy + 8, 12, 14, sh);
    c.fillEllipse(sx + 9, sy + 6, 10, 11, main);
    c.fillRect(sx + 4, sy + 3, 8, 5, BOSS_PALETTE.R);
    c.fillEllipse(sx + 20, sy + 23, 12, 10, sh);
    c.fillEllipse(sx + 19, sy + 21, 9, 8, hi);
    c.fillRect(sx + 27, sy + 26, 4, 3, BOSS_PALETTE.B);
    c.fillRect(sx + 20, sy + 30, 3, 4, BOSS_PALETTE.B);
  } else if (mode === 'slam') {
    // Crashing fists right onto ground line (bottom <= 117 -> outline = 118)
    c.fillEllipse(sx + 8, sy + 14, 12, 14, sh);
    c.fillEllipse(sx + 7, sy + 12, 10, 11, main);
    c.fillRect(sx + 2, sy + 9, 8, 5, BOSS_PALETTE.R);
    c.fillEllipse(sx + 14, sy + 31, 13, 10, sh);
    c.fillEllipse(sx + 13, sy + 29, 10, 8, hi);
    c.fillRect(sx + 6, sy + 38, 3, 2, BOSS_PALETTE.B);
    c.fillRect(sx + 13, sy + 38, 3, 2, BOSS_PALETTE.B);
    c.fillRect(sx + 20, sy + 38, 3, 2, BOSS_PALETTE.B);
  } else {
    // Hunched combat-ready heavy arm
    c.fillEllipse(sx + 2, sy + 12, 11, 14, sh);
    c.fillEllipse(sx + 1, sy + 10, 9, 11, main);
    c.fillRect(sx - 2, sy + 8, 7, 5, BOSS_PALETTE.R);
    c.fillEllipse(sx + 4, sy + 28, 11, 9, sh);
    c.fillEllipse(sx + 3, sy + 27, 9, 7, hi);
    c.fillRect(sx - 1, sy + 34, 3, 3, BOSS_PALETTE.B);
    c.fillRect(sx + 5, sy + 35, 3, 3, BOSS_PALETTE.B);
  }
}

function buildBossAttack(step: 0 | 1 | 2 | 3): PixelCanvas {
  const c = new PixelCanvas(128, 128);
  const ox = [18, 22, 24, 20][step];
  const crouch = step === 0 ? -3 : step === 1 ? 3 : step === 2 ? 9 : 2;
  const armMode = (['roarUp', 'swing', 'slam', 'recover'] as const)[step];

  // Back colossal arm (far right shoulder)
  drawBossClawedArm(c, ox + 66, 66 + crouch, armMode, false);

  // Thick bent muscular legs + wide clawed feet (bottom at y=117 so applyOutline hits exact y=118!)
  const drawLeg = (lx: number, w: number, xShift: number) => {
    const legTop = 84 + Math.max(0, crouch - 2);
    // Shorts leg
    c.fillRect(lx, legTop, w + 2, 12, BOSS_PALETTE.p);
    c.fillRect(lx + 2, legTop + 1, w - 3, 8, BOSS_PALETTE.P);
    // Thick muscular calf
    const calfTop = legTop + 10;
    const calfH = Math.max(8, 112 - calfTop);
    c.fillRect(lx + 2 + xShift, calfTop, w - 1, calfH, BOSS_PALETTE.f);
    c.fillRect(lx + 2 + xShift, calfTop, 4, calfH, BOSS_PALETTE.s);
    // Wide clawed foot ending strictly at y = 117 (applyOutline -> y = 118)
    c.fillEllipse(lx + 8 + xShift, 113, Math.floor(w * 0.65), 4, BOSS_PALETTE.s);
    c.fillEllipse(lx + 9 + xShift, 112, Math.floor(w * 0.5), 3, BOSS_PALETTE.f);
    c.fillRect(lx + w + 2 + xShift, 114, 3, 2, BOSS_PALETTE.B);
    c.fillRect(lx + w + 2 + xShift, 111, 3, 2, BOSS_PALETTE.B);
  };

  if (step === 0) {
    drawLeg(ox + 16, 17, -2);
    drawLeg(ox + 44, 17, 1);
  } else if (step === 1 || step === 2) {
    drawLeg(ox + 12, 17, -3);
    drawLeg(ox + 46, 17, 3);
  } else {
    drawLeg(ox + 16, 17, -1);
    drawLeg(ox + 44, 17, 1);
  }

  // Massive hunched muscular torso (broad chest + hunched spine)
  const ty = 56 + crouch;
  c.fillEllipse(ox + 40, ty + 8, 30, 23, BOSS_PALETTE.s);
  c.fillEllipse(ox + 42, ty + 6, 26, 19, BOSS_PALETTE.f);
  c.fillEllipse(ox + 46, ty + 3, 18, 13, BOSS_PALETTE.F);

  // Crimson back flesh ridge & diagonal chest muscle tear
  c.fillEllipse(ox + 26, ty - 11, 16, 7, BOSS_PALETTE.r);
  c.fillEllipse(ox + 28, ty - 12, 12, 5, BOSS_PALETTE.R);
  c.fillEllipse(ox + 48, ty + 4, 6, 4, BOSS_PALETTE.R);
  c.fillEllipse(ox + 30, ty + 10, 5, 3, BOSS_PALETTE.r);

  // White pointed bone spikes along back
  const spikeCoords = [
    [ox + 14, ty - 15],
    [ox + 22, ty - 22],
    [ox + 32, ty - 24],
    [ox + 42, ty - 20],
  ];
  for (const [sx, sy] of spikeCoords) {
    c.fillRect(sx, sy + 3, 6, 7, BOSS_PALETTE.f);
    c.fillRect(sx + 1, sy, 4, 8, BOSS_PALETTE.B);
  }

  // Torn dark-blue shorts + leather belt + yellow buckle
  c.fillRect(ox + 16, ty + 23, 46, 13, BOSS_PALETTE.p);
  c.fillRect(ox + 19, ty + 24, 34, 9, BOSS_PALETTE.P);
  c.fillRect(ox + 17, ty + 22, 44, 4, BOSS_PALETTE.g);
  c.fillRect(ox + 44, ty + 21, 9, 5, BOSS_PALETTE.G);

  // Huge Boss Head tucked forward between massive shoulders (big head ratio!)
  const hx = ox + (step === 0 ? 40 : step === 2 ? 50 : 45);
  const hy = 31 + crouch + (step === 0 ? -3 : 0);
  c.fillEllipse(hx + 15, hy + 15, 17, 16, BOSS_PALETTE.s);
  c.fillEllipse(hx + 15, hy + 13, 15, 14, BOSS_PALETTE.f);
  c.fillEllipse(hx + 14, hy + 8, 11, 8, BOSS_PALETTE.F);
  // Forehead blood gash
  c.fillRect(hx + 16, hy + 2, 4, 6, BOSS_PALETTE.R);
  // Fierce brow & glowing red eyes
  c.fillRect(hx + 10, hy + 10, 7, 5, BOSS_PALETTE.K);
  c.fillRect(hx + 21, hy + 10, 6, 5, BOSS_PALETTE.K);
  c.fillRect(hx + 13, hy + 11, 3, 3, BOSS_PALETTE.R);
  c.fillRect(hx + 23, hy + 11, 3, 3, BOSS_PALETTE.R);
  // Wide roaring jaw with sharp white teeth
  const jawH = step === 0 || step === 2 ? 12 : 10;
  c.fillRect(hx + 9, hy + 18, 17, jawH, BOSS_PALETTE.K);
  c.fillRect(hx + 12, hy + 21, 11, jawH - 5, BOSS_PALETTE.r);
  for (let tx = 10; tx <= 22; tx += 4) {
    c.fillRect(hx + tx, hy + 18, 2, 3, BOSS_PALETTE.B);
    c.fillRect(hx + tx, hy + 18 + jawH - 3, 2, 3, BOSS_PALETTE.B);
  }

  // Foreground colossal arm (left/front shoulder)
  drawBossClawedArm(c, ox + 16, 65 + crouch, armMode, true);

  c.applyOutline(OUTLINE);
  c.enforceBinaryAlpha();
  return c;
}

// ============================================================================
// BUILD & WRITE GROUP A TO public/assets/v2/zombies/
// ============================================================================
const walkerFrames = [0, 1, 2, 3].map((s) => buildWalkerAttack(s as 0 | 1 | 2 | 3));
const runnerFrames = [0, 1, 2, 3].map((s) => buildRunnerAttack(s as 0 | 1 | 2 | 3));
const spitterFrames = [0, 1, 2, 3].map((s) => buildSpitterAttack(s as 0 | 1 | 2 | 3));
const tankFrames = [0, 1, 2, 3].map((s) => buildTankAttack(s as 0 | 1 | 2 | 3));
const bossFrames = [0, 1, 2, 3].map((s) => buildBossAttack(s as 0 | 1 | 2 | 3));

saveSheetPNG(OUT_DIR, 'walker_attack_spritesheet.png', buildHorizontalStrip(walkerFrames, 64, 64));
saveSheetPNG(OUT_DIR, 'runner_attack_spritesheet.png', buildHorizontalStrip(runnerFrames, 64, 64));
saveSheetPNG(OUT_DIR, 'spitter_attack_spritesheet.png', buildHorizontalStrip(spitterFrames, 64, 64));
saveSheetPNG(OUT_DIR, 'tank_attack_spritesheet.png', buildHorizontalStrip(tankFrames, 96, 96));
saveSheetPNG(OUT_DIR, 'boss_attack_spritesheet.png', buildHorizontalStrip(bossFrames, 128, 128));

const manifest = {
  group: 'A',
  name: 'Zombie Attack Sprite Sheets (Group A)',
  style: '16-bit pixel art, 1px #0A090D outline, 8-10 flat colors, top-left lighting, facing right, binary alpha, no embedded shadow, no AA, no gradients',
  assets: [
    {
      id: 'walker_attack',
      title: 'Walker Attack',
      file: 'walker_attack_spritesheet.png',
      frameSize: { w: 64, h: 64 },
      frameCount: 4,
      sheetSize: { w: 256, h: 64 },
      footBaselineY: 58,
      paletteCount: countUniqueOpaqueColors(walkerFrames).length,
      animations: {
        attack: [0, 3],
      },
      fps: 9,
      frameOrder: ['0: windup', '1: lunge', '2: slash_peak', '3: recover'],
      frames: walkerFrames.map((f, i) => ({
        index: i,
        name: `attack_${i}`,
        x: i * 64,
        y: 0,
        w: 64,
        h: 64,
        bounds: f.getBounds(),
      })),
    },
    {
      id: 'runner_attack',
      title: 'Runner Attack',
      file: 'runner_attack_spritesheet.png',
      frameSize: { w: 64, h: 64 },
      frameCount: 4,
      sheetSize: { w: 256, h: 64 },
      footBaselineY: 58,
      paletteCount: countUniqueOpaqueColors(runnerFrames).length,
      animations: {
        attack: [0, 3],
      },
      fps: 11,
      frameOrder: ['0: crouch_windup', '1: pounce_lunge', '2: double_claw_strike', '3: recover'],
      frames: runnerFrames.map((f, i) => ({
        index: i,
        name: `attack_${i}`,
        x: i * 64,
        y: 0,
        w: 64,
        h: 64,
        bounds: f.getBounds(),
      })),
    },
    {
      id: 'spitter_attack',
      title: 'Spitter Attack (Acid Spit)',
      file: 'spitter_attack_spritesheet.png',
      frameSize: { w: 64, h: 64 },
      frameCount: 4,
      sheetSize: { w: 256, h: 64 },
      footBaselineY: 58,
      paletteCount: countUniqueOpaqueColors(spitterFrames).length,
      animations: {
        attack: [0, 3],
      },
      fps: 8,
      frameOrder: ['0: acid_charge', '1: jaw_open', '2: acid_spit_launch', '3: recover'],
      frames: spitterFrames.map((f, i) => ({
        index: i,
        name: `attack_${i}`,
        x: i * 64,
        y: 0,
        w: 64,
        h: 64,
        bounds: f.getBounds(),
      })),
    },
    {
      id: 'tank_attack',
      title: 'Tank Attack (Arm Swing / Ground Slam)',
      file: 'tank_attack_spritesheet.png',
      frameSize: { w: 96, h: 96 },
      frameCount: 4,
      sheetSize: { w: 384, h: 96 },
      footBaselineY: 88,
      paletteCount: countUniqueOpaqueColors(tankFrames).length,
      animations: {
        attack: [0, 3],
      },
      fps: 7,
      frameOrder: ['0: overhead_windup', '1: heavy_swing_down', '2: ground_slam_impact', '3: heavy_recoil'],
      frames: tankFrames.map((f, i) => ({
        index: i,
        name: `attack_${i}`,
        x: i * 96,
        y: 0,
        w: 96,
        h: 96,
        bounds: f.getBounds(),
      })),
    },
    {
      id: 'boss_attack',
      title: 'Boss Attack (Roar + Ground Slam)',
      file: 'boss_attack_spritesheet.png',
      frameSize: { w: 128, h: 128 },
      frameCount: 4,
      sheetSize: { w: 512, h: 128 },
      footBaselineY: 118,
      paletteCount: countUniqueOpaqueColors(bossFrames).length,
      animations: {
        attack: [0, 3],
      },
      fps: 6,
      frameOrder: ['0: roaring_windup', '1: downward_crush', '2: ground_smash_impact', '3: follow_through'],
      frames: bossFrames.map((f, i) => ({
        index: i,
        name: `attack_${i}`,
        x: i * 128,
        y: 0,
        w: 128,
        h: 128,
        bounds: f.getBounds(),
      })),
    },
  ],
};

fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Save temporary native-scale & 48px-scaled inspection previews for visual audit
saveInspectionPreview(
  path.resolve(process.cwd(), 'scripts/_inspect_v2_groupA.png'),
  [
    { frames: walkerFrames, frameW: 64, frameH: 64, baselineY: 58 },
    { frames: runnerFrames, frameW: 64, frameH: 64, baselineY: 58 },
    { frames: spitterFrames, frameW: 64, frameH: 64, baselineY: 58 },
    { frames: tankFrames, frameW: 96, frameH: 96, baselineY: 88 },
    { frames: bossFrames, frameW: 128, frameH: 128, baselineY: 118 },
  ],
  2
);

const rows48 = [walkerFrames, runnerFrames, spitterFrames, tankFrames, bossFrames];
const preview48 = new PixelCanvas(4 * 48 * 2, rows48.length * 48 * 2);
for (let r = 0; r < rows48.length; r++) {
  for (let y = 0; y < 48 * 2; y++) {
    for (let x = 0; x < 4 * 48 * 2; x++) {
      preview48.set(x, r * 48 * 2 + y, [140, 196, 47, 255]);
    }
  }
  const smallRow = rows48[r].map(downsampleTo48);
  const strip = buildHorizontalStrip(smallRow, 48, 48);
  // 2x upscale of the 48px downsampled sprites so we inspect exact 48px pixel blocks clearly
  for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 192; x++) {
      const p = strip.get(x, y);
      if (p[3] > 0) {
        preview48.fillRect(x * 2, r * 96 + y * 2, 2, 2, p);
      }
    }
  }
}
fs.writeFileSync(
  path.resolve(process.cwd(), 'scripts/_inspect_v2_groupA_48.png'),
  encodePNG(preview48.width, preview48.height, preview48.data)
);

console.log('Group A generated!');
for (const a of manifest.assets) {
  console.log(a.id, 'colors:', a.paletteCount, 'maxY:', a.frames.map((f) => f.bounds.maxY));
}
