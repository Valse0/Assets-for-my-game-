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

const OUT_DIR = path.resolve(process.cwd(), 'public/assets/packs/group1');

// ============================================================================
// 1. RUNNER ZOMBIE (Fast hunched cyan-teal zombie in red hoodie, 64x64, 8f)
// ============================================================================
const RUNNER_PALETTE: Palette = {
  K: OUTLINE,
  C: [184, 224, 218, 255], // cyan-mint skin highlight
  c: [132, 182, 178, 255], // cyan-mint mid
  s: [78, 124, 128, 255],  // teal shadow
  E: [12, 10, 14, 255],    // eye socket
  W: [244, 240, 234, 255], // teeth / pupil glint
  M: [42, 10, 16, 255],    // dark mouth
  T: [152, 24, 34, 255],   // tongue/blood
  H: [42, 46, 58, 255],    // messy hair tufts
  R: [224, 48, 52, 255],   // red hoodie bright
  r: [174, 24, 34, 255],   // red hoodie mid
  q: [116, 16, 26, 255],   // red hoodie shadow
  P: [62, 68, 92, 255],    // navy-slate pants highlight
  p: [38, 44, 64, 255],    // pants mid
  n: [22, 26, 40, 255],    // pants shadow
  u: [18, 18, 24, 255],    // dark shoes
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
  '..KssKWWTWWWsK......',
  '...KKsKKKKKKK.......',
  '....KKKKKKKK........',
];

const RUNNER_TORSO = [
  '..KKKKKKKKKKKKK....',
  '.KqqRRRRRRRRRRrK...',
  'KqqrRRRRRRRRrrrqK..',
  'KqqrRRRrrrrrrqqqK..',
  '.KqqRRRRrrrrqqqqK..',
  '..KKrrrqqqqqppKK...',
  '...KppppppnnnnK....',
  '....KKKKKKKKKK.....',
];

const RUNNER_ARM_FWD = [
  '.KKKKK...',
  'KRRRRrKK.',
  '.KrrCCcsK',
  '..KKcsKK.',
  '....KK...',
];
const RUNNER_ARM_BACK = [
  '..KKKK.',
  '.KqqrK.',
  'KqqCsK.',
  'KcsKK..',
  '.KK....',
];
const RUNNER_ARM_MID = [
  '.KKKK..',
  'KRRrrK.',
  '.KCCcK.',
  '.KcsK..',
  '..KK...',
];

const RUNNER_LEG_FWD = [
  '.KKKKK...',
  'KPPPppK..',
  '.KPppnnK.',
  '..KppnnK.',
  '..KppnnnK',
  '..KuuuuuuK',
  '..KuuuuuuK',
  '...KKKKKK.',
]; // 8 rows -> 51..58
const RUNNER_LEG_BACK = [
  '....KKKKK.',
  '...KppnnnK',
  '..KppnnnK.',
  '.KppnnnK..',
  'KppnnnK...',
  'KuuuuuK...',
  'KuuuuuK...',
  '.KKKKK....',
]; // 8 rows -> 51..58
const RUNNER_LEG_PLANT = [
  '.KKKKK.',
  'KPPPppK',
  'KPPppnK',
  'KppnnnK',
  'KppnnnK',
  'KuuuuuK',
  'KuuuuuK',
  '.KKKKK.',
]; // 8 rows -> 51..58
const RUNNER_LEG_LIFT = [
  '.KKKKK.',
  'KPPPppK',
  'KppnnnK',
  'KuuuuuK',
  '.KKKKK.',
];

function buildRunnerWalk(step: 0 | 1 | 2 | 3): PixelCanvas {
  const c = new PixelCanvas(64, 64);
  const bob = step === 1 ? 1 : step === 3 ? -1 : 0;
  const cx = 20;

  // Back arm reaching out wildly (connected cleanly to shoulder at y=42)
  if (step === 0 || step === 3) c.stampGrid(RUNNER_ARM_FWD, cx + 15, 42 + bob, RUNNER_PALETTE);
  else c.stampGrid(RUNNER_ARM_MID, cx + 14, 43 + bob, RUNNER_PALETTE);

  // Back leg
  if (step === 0) c.stampGrid(RUNNER_LEG_BACK, cx + 1, 51, RUNNER_PALETTE);
  else if (step === 1) c.stampGrid(RUNNER_LEG_LIFT, cx + 8, 49, RUNNER_PALETTE);
  else if (step === 2) c.stampGrid(RUNNER_LEG_FWD, cx + 9, 51, RUNNER_PALETTE);
  else c.stampGrid(RUNNER_LEG_PLANT, cx + 8, 51, RUNNER_PALETTE);

  // Front leg
  if (step === 0) c.stampGrid(RUNNER_LEG_FWD, cx + 9, 51, RUNNER_PALETTE);
  else if (step === 1) c.stampGrid(RUNNER_LEG_PLANT, cx + 8, 51, RUNNER_PALETTE);
  else if (step === 2) c.stampGrid(RUNNER_LEG_BACK, cx + 1, 51, RUNNER_PALETTE);
  else c.stampGrid(RUNNER_LEG_LIFT, cx + 8, 49, RUNNER_PALETTE);

  // Hunched torso leaning right (y=44..51 overlaps hips seamlessly!)
  c.stampGrid(RUNNER_TORSO, cx + 4, 44 + bob, RUNNER_PALETTE);
  // Head hunched forward-right (y=31..44)
  c.stampGrid(RUNNER_HEAD, cx + 7, 31 + bob, RUNNER_PALETTE);

  // Front arm
  if (step === 0) c.stampGrid(RUNNER_ARM_BACK, cx + 1, 45 + bob, RUNNER_PALETTE);
  else if (step === 1 || step === 3) c.stampGrid(RUNNER_ARM_MID, cx + 5, 45 + bob, RUNNER_PALETTE);
  else c.stampGrid(RUNNER_ARM_FWD, cx + 8, 44 + bob, RUNNER_PALETTE);

  c.enforceBinaryAlpha();
  return c;
}

const RUNNER_DEATH_1 = [
  '....KK.KKK.....................',
  '...KHHKHHHK....................',
  '..KCCCHHCCCcK..................',
  '.KCCcccccccscK.................',
  '.KccssCCCCCCsK.................',
  'KcsKKKssssKKKsK................',
  'KcKEEWKKKKKEEWKK...............',
  'KcKEEEssssKEEEsK...............',
  'KcsKKKsssssKKKKK...............',
  '.KcsccWWWWWWscK................',
  '.KssscMMMMMMscK................',
  '..KssKWWTWWWsK.................',
  '...KKsKKKKKKKKKKKKKK...........',
  '...KqqRRRRRRRRRRrKKRRRRrKK.....',
  '..KqqrRRRRRRRRrrrqKKrrCCcsK....',
  '..KqqrRRRrrrrrrqqqK..KKcsKK....',
  '...KqqRRRRrrrrqqqqK............',
  '....KppppppnnnnnnK.............',
  '....KPPPppK.KPPPppK............',
  '....KPppnnK..KPppnnK...........',
  '....KppnnnK...KppnnnK..........',
  '....KppnnnK...KppnnnK..........',
  '....KuuuuuK....KuuuuuK.........',
  '....KuuuuuK....KuuuuuK.........',
  '.....KKKKK......KKKKK..........',
];

const RUNNER_DEATH_2 = [
  '....KK.KKK.....................',
  '...KHHKHHHK....................',
  '..KCCCHHCCCcK..................',
  '.KCCcccccccscK.................',
  '.KccssCCCCCCsK.................',
  'KcsKKKssssKKKsK................',
  'KcKEEWKKKKKEEWKK...............',
  'KcKEEEssssKEEEsK...............',
  'KcsKKKsssssKKKKK...............',
  '.KcsccWWWWWWscK................',
  '..KssKWWTWWWsK.................',
  '..KKKKKKKKKKKKKKKKKK...........',
  '.KqqRRRRRRRRRRrKKRRRRrKK.......',
  '.KqqrRRRrrrrrrqqqKrrCCcsK......',
  '..KqqRRRRrrrrqqqqK.KKcsKK......',
  '..KppppppnnnnnnnnK.............',
  '.KuuuKPPPppKKPPPppK............',
  '.KuuuKppnnnKKppnnnK............',
  '.KuuuKuuuuuKKuuuuuK............',
  '..KKKKuuuuuKKuuuuuK............',
  '......KKKKK..KKKKK.............',
];

const RUNNER_DEATH_3 = [
  '.....KK.KKK.........................',
  '....KHHKHHHK........................',
  '...KCCCHHCCCcK..KKKKKKKKKKKK........',
  '..KccssCCCCCCsKKqqRRRRRRRRrKK.......',
  '..KcsKKKssssKKKqqrRRRRRRRRrrK.KKKK..',
  '..KcKEEWKKKKKEKqqrRRRrrrrrqqKKRRrrK.',
  '..KcsKKKsssssKKKqqRRRRrrrqqqKKCCcsK.',
  '...KcsccWWWWWWsKppppppnnnnnnK..KKK..',
  '....KKKKKKKKKKKKPPPppKKPPPppK.......',
  '.....KuuuuuK....KppnnnKKuuuuuK......',
  '.....KuuuuuK....KuuuuuKKuuuuuK......',
  '......KKKKK......KKKKK..KKKKK.......',
];

const RUNNER_DEATH_4 = [
  '.....KK.KKK.................................',
  '....KHHKHHHK.....KKKKKKKKKKKK...............',
  '...KCCCHHCCCcK..KqqRRRRRRRRrKK..............',
  '..KccssCCCCCCsKKqqrRRRRRRRRrrKKKKKK.........',
  '..KcsKKKssssKKKqqrRRRrrrrrqqqKppppppKK......',
  '..KcKEEEKKKKKEKqqRRRRrrrrqqqKKPPPppnnK.KKKK.',
  '..KcsKKKsssssKKKppppppnnnnnnKKppnnnnKKKuuuuK',
  '...KcsccWWWWWWsKKKKKKKKKKKKKKKuuuuuuKKKuuuuK',
  '....KKKKKKKKKKK..KCCcsK.......KuuuuuuKKKKKK.',
  '..................KKKK.........KKKKKK.......',
];

function buildRunnerDeath(step: 0 | 1 | 2 | 3): PixelCanvas {
  const c = new PixelCanvas(64, 64);
  const grids = [RUNNER_DEATH_1, RUNNER_DEATH_2, RUNNER_DEATH_3, RUNNER_DEATH_4];
  const oxs = [17, 16, 14, 10];
  const g = grids[step];
  c.stampGrid(g, oxs[step], 59 - g.length, RUNNER_PALETTE);
  c.enforceBinaryAlpha();
  return c;
}

// ============================================================================
// 2. SPITTER ZOMBIE (Pale-green zombie in bloody grey shirt, 64x64, 10f: 4w + 2spit + 4d)
// ============================================================================
const SPITTER_PALETTE: Palette = {
  K: OUTLINE,
  G: [158, 210, 156, 255], // pale green highlight
  g: [122, 178, 128, 255], // mid green
  m: [76, 126, 94, 255],   // green shadow
  z: [46, 80, 74, 255],    // deep shadow
  E: [12, 10, 14, 255],    // dark eye
  W: [244, 240, 234, 255], // teeth / eye glint
  A: [148, 255, 42, 255],  // bright glowing acid neon lime
  a: [84, 208, 30, 255],   // acid midtone
  M: [36, 12, 16, 255],    // mouth interior
  C: [222, 214, 208, 255], // tattered grey-white shirt
  c: [176, 170, 174, 255], // shirt mid
  v: [118, 114, 142, 255], // shirt shadow
  R: [196, 40, 38, 255],   // blood splatter
  r: [132, 22, 26, 255],   // dark blood
  P: [74, 86, 108, 255],   // slate-blue pants
  p: [50, 58, 76, 255],    // pants mid
  n: [30, 34, 48, 255],    // pants dark
  u: [22, 22, 28, 255],    // dark boots
};

const SPITTER_HEAD_WALK = [
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

const SPITTER_HEAD_SPIT = [
  '....KKKKKKKKK.........',
  '..KKGGGGGGGGGKK.......',
  '.KGGGGGGGGGGGGgK......',
  'KGGGggggggggggmmK.....',
  'KggmKKKKmmmKKKKmzK....',
  'KgmKEEWKKKKKEEWKK.....',
  'KgmKEEEgmmKKEEEgmK....',
  'KgmKKKKmmmmKKKKKmK....',
  'KgmgggmWWWWWWmggmK....',
  '.KgmggKMMAAaMKgmKKK...',
  '.KzmggKWAAAaaWKKAAaK..',
  '.KzzmmKMMAAaMKmKaaAAK.',
  '..KzzzKWWWWWWKmK.KKK..',
  '...KKzKKKKKKKKK.......',
];

const SPITTER_TORSO = [
  '..KKKKKKKKKKKKKK....',
  '.KCRCCcCCCCCCCCCcK..',
  'KCRRRCcCCCcCrrCCcvK.',
  'KCCrrCcCCCcCRrCCcvK.',
  'KCCCCcCCcCCCCCCCcvK.',
  'KccvvCCCCCCrCCCCvvK.',
  '.KvvvCCCCcCRrCCvvK..',
  '.KvvvvCCCCCCCCvvK...',
  '..KnnnnKvvvvvvKK....',
  '..KPPPPPPppppnnK....',
  '...KKKKKKKKKKKK.....',
];

const SPITTER_ARM_FWD = [
  '..KKKK...',
  '.KCccKK..',
  'KCccGGgK.',
  '.KvvGgmK.',
  '..KKgmmK.',
  '....KKK..',
];
const SPITTER_ARM_DOWN = [
  '.KKKK..',
  'KCcccK.',
  'KcvvvK.',
  'KGGggK.',
  'KgmmzK.',
  '.KKKK..',
];
const SPITTER_ARM_BACK = [
  '..KKKK.',
  '.KcvvK.',
  'KcvvK..',
  'KGgmK..',
  'KmzK...',
  '.KK....',
];

const SPITTER_LEG_PLANT = [
  '.KKKKK.',
  'KPPPppK',
  'KPPppnK',
  'KppnnnK',
  'KppnnnK',
  'KppnnnK',
  'KppnnnK',
  'KuuuuuK',
  'KuuuuuK',
  'KuuuuuK',
  '.KKKKK.',
]; // 11 rows -> 48..58

const SPITTER_LEG_FWD = [
  '.KKKKK...',
  'KPPPppK..',
  'KPPppnK..',
  '.KppnnnK.',
  '.KppnnnK.',
  '..KppnnnK',
  '..KppnnnK',
  '..KuuuuuuK',
  '..KuuuuuuK',
  '..KuuuuuuK',
  '...KKKKKK.',
]; // 11 rows -> 48..58

const SPITTER_LEG_BACK = [
  '...KKKKK.',
  '..KppnnnK',
  '..KppnnnK',
  '.KppnnnK.',
  '.KppnnnK.',
  'KppnnnK..',
  'KppnnnK..',
  'KuuuuuK..',
  'KuuuuuK..',
  'KuuuuuK..',
  '.KKKKK...',
]; // 11 rows -> 48..58

const SPITTER_LEG_LIFT = [
  '.KKKKK.',
  'KPPPppK',
  'KppnnnK',
  'KppnnnK',
  'KuuuuuK',
  'KuuuuuK',
  '.KKKKK.',
];

function buildSpitterWalk(step: 0 | 1 | 2 | 3): PixelCanvas {
  const c = new PixelCanvas(64, 64);
  const bob = step === 1 ? 1 : step === 3 ? -1 : 0;
  const cx = 20;

  if (step === 0 || step === 3) c.stampGrid(SPITTER_ARM_FWD, cx + 14, 37 + bob, SPITTER_PALETTE);
  else c.stampGrid(SPITTER_ARM_DOWN, cx + 13, 38 + bob, SPITTER_PALETTE);

  if (step === 0) c.stampGrid(SPITTER_LEG_BACK, cx + 3, 48, SPITTER_PALETTE);
  else if (step === 1) c.stampGrid(SPITTER_LEG_LIFT, cx + 8, 46, SPITTER_PALETTE);
  else if (step === 2) c.stampGrid(SPITTER_LEG_FWD, cx + 9, 48, SPITTER_PALETTE);
  else c.stampGrid(SPITTER_LEG_PLANT, cx + 9, 48, SPITTER_PALETTE);

  if (step === 0) c.stampGrid(SPITTER_LEG_FWD, cx + 9, 48, SPITTER_PALETTE);
  else if (step === 1) c.stampGrid(SPITTER_LEG_PLANT, cx + 8, 48, SPITTER_PALETTE);
  else if (step === 2) c.stampGrid(SPITTER_LEG_BACK, cx + 3, 48, SPITTER_PALETTE);
  else c.stampGrid(SPITTER_LEG_LIFT, cx + 8, 46, SPITTER_PALETTE);

  c.stampGrid(SPITTER_TORSO, cx + 3, 38 + bob, SPITTER_PALETTE);
  c.stampGrid(SPITTER_HEAD_WALK, cx + 4, 24 + bob, SPITTER_PALETTE);

  if (step === 0) c.stampGrid(SPITTER_ARM_BACK, cx + 1, 39 + bob, SPITTER_PALETTE);
  else if (step === 1 || step === 3) c.stampGrid(SPITTER_ARM_DOWN, cx + 3, 39 + bob, SPITTER_PALETTE);
  else c.stampGrid(SPITTER_ARM_FWD, cx + 6, 39 + bob, SPITTER_PALETTE);

  c.enforceBinaryAlpha();
  return c;
}

function buildSpitterAttack(step: 0 | 1): PixelCanvas {
  const c = new PixelCanvas(64, 64);
  const cx = 19;
  // Wide planted stance
  c.stampGrid(SPITTER_LEG_BACK, cx + 2, 48, SPITTER_PALETTE);
  c.stampGrid(SPITTER_LEG_FWD, cx + 10, 48, SPITTER_PALETTE);
  c.stampGrid(SPITTER_TORSO, cx + (step === 0 ? 1 : 4), 38, SPITTER_PALETTE);
  if (step === 0) {
    // Windup leaning back, glowing acid building in mouth
    c.stampGrid(SPITTER_HEAD_WALK, cx + 1, 23, SPITTER_PALETTE);
    c.stampGrid(SPITTER_ARM_BACK, cx + 0, 38, SPITTER_PALETTE);
  } else {
    // Lunging forward spitting glowing acid!
    c.stampGrid(SPITTER_ARM_FWD, cx + 15, 38, SPITTER_PALETTE);
    c.stampGrid(SPITTER_HEAD_SPIT, cx + 6, 24, SPITTER_PALETTE);
    c.stampGrid(SPITTER_ARM_DOWN, cx + 4, 39, SPITTER_PALETTE);
  }
  c.enforceBinaryAlpha();
  return c;
}

const SPITTER_DEATH_1 = [
  '....KKKKKKKKK................',
  '..KKGGGGGGGGGKK..............',
  '.KGGGGGGGGGGGGgK.............',
  'KGGGggggggggggmmK............',
  'KggmKKKKmmmKKKKmzK...........',
  'KgmKEEWKKKKKEEWKK............',
  'KgmKEEEgmmKKEEEgmK...........',
  'KgmKKKKmmmmKKKKKmK...........',
  'KgmgggmWWWWWWmggmK...........',
  '.KgmggKMMaaMMKgmK............',
  '.KzmggKWaaaaWKzmK............',
  '..KzmmKKKKKKKKmK.............',
  '..KKKKKKKKKKKKKKKKKK.........',
  '.KCRCCcCCCCCCCCCcKKCccKK.....',
  'KCRRRCcCCCcCrrCCcvKCccGGgK...',
  'KCCrrCcCCCcCRrCCcvK.KKgmmK...',
  'KCCCCcCCcCCCCCCCcvK...KKK....',
  '.KvvvvCCCCCCCCvvK............',
  '..KPPPPPPppppnnK.............',
  '..KPPPppK..KPPPppK...........',
  '..KPPppnK...KPPppnK..........',
  '..KppnnnK...KppnnnK..........',
  '..KppnnnK....KppnnnK.........',
  '..KppnnnK....KppnnnK.........',
  '..KuuuuuK....KuuuuuK.........',
  '..KuuuuuK....KuuuuuK.........',
  '..KuuuuuK....KuuuuuK.........',
  '...KKKKK......KKKKK..........',
];

const SPITTER_DEATH_2 = [
  '....KKKKKKKKK................',
  '..KKGGGGGGGGGKK..............',
  '.KGGGGGGGGGGGGgK.............',
  'KGGGggggggggggmmK............',
  'KggmKKKKmmmKKKKmzK...........',
  'KgmKEEWKKKKKEEWKK............',
  'KgmKEEEgmmKKEEEgmK...........',
  'KgmKKKKmmmmKKKKKmK...........',
  'KgmgggmWWWWWWmggmK...........',
  '.KgmggKMMaaMMKgmK............',
  '..KzmmKKKKKKKKmK.............',
  '..KKKKKKKKKKKKKKKKKK.........',
  '.KCRCCcCCCCCCCCCcKKCccKK.....',
  'KCRRRCcCCCcCrrCCcvKCccGGgK...',
  'KCCrrCcCCCcCRrCCcvK.KKgmmK...',
  '.KvvvvCCCCCCCCvvK............',
  '..KPPPPPPppppnnK.............',
  '.KuuuKPPPppKKPPPppK..........',
  '.KuuuKppnnnKKppnnnK..........',
  '.KuuuKuuuuuKKuuuuuK..........',
  '..KKKKuuuuuKKuuuuuK..........',
  '......KKKKK..KKKKK...........',
];

const SPITTER_DEATH_3 = [
  '.....KKKKKKKKK......................',
  '...KKGGGGGGGGGKK....................',
  '..KGGGGGGGGGGGGgK.KKKKKKKKKKKK......',
  '.KggmKKKKmmmKKKKKKCRCCcCCCCCCCCcK...',
  '.KgmKEEWKKKKKEEWKKCRRRCcCrrCCcvKK...',
  '.KgmKKKKmmmmKKKKKKCCrrCcCRrCCcvKCcK.',
  '..KgmgggmWWWWWWmgKvvvvCCCCCCCvvKGgK.',
  '..KzmggKMMaaMMKzmKKPPPPPPppppnnKKK..',
  '...KKKKKKKKKKKKKKKPPPppKKPPPppK.....',
  '.....KuuuuuK......KppnnnKKuuuuuK....',
  '.....KuuuuuK......KuuuuuKKuuuuuK....',
  '......KKKKK........KKKKK..KKKKK.....',
];

const SPITTER_DEATH_4 = [
  '.....KKKKKKKKK................................',
  '...KKGGGGGGGGGKK......KKKKKKKKKKKK............',
  '..KGGGGGGGGGGGGgK....KCRCCcCCCCCCCCcK.........',
  '.KggmKKKKmmmKKKKKzK.KCRRRCcCCrrCCCcvKKKKK.....',
  '.KgmKEEEKKKKKEEEgmK.KCCrrCcCCRrCCCcvKppppKK...',
  '.KgmKKKKmmmmKKKKKmK.KvvvvCCCCCCCCvvvKPPPppnK..',
  '..KgmgggmWWWWWWmggK..KKKKKKKKKKKKKKKKppnnnKKK.',
  '..KzmggKMMaaMMKzzmK.....KGGggK......KuuuuuuuK.',
  '...KKKKKKKKKKKKKKK......KgmmzK......KuuuuuuuK.',
  '.........................KKKK........KKKKKKK..',
];

function buildSpitterDeath(step: 0 | 1 | 2 | 3): PixelCanvas {
  const c = new PixelCanvas(64, 64);
  const grids = [SPITTER_DEATH_1, SPITTER_DEATH_2, SPITTER_DEATH_3, SPITTER_DEATH_4];
  const oxs = [17, 16, 14, 10];
  const g = grids[step];
  c.stampGrid(g, oxs[step], 59 - g.length, SPITTER_PALETTE);
  c.enforceBinaryAlpha();
  return c;
}

// ============================================================================
// 3. TANK ZOMBIE (Riot-armored hulking zombie, 64x64, 8f: 4w + 4d)
// ============================================================================
const TANK_PALETTE: Palette = {
  K: OUTLINE,
  A: [86, 104, 139, 255],  // slate-blue armor highlight
  a: [56, 74, 108, 255],   // armor midtone
  d: [36, 48, 72, 255],    // armor shadow
  R: [204, 52, 54, 255],   // red chest vest / gauntlet bright
  r: [148, 28, 36, 255],   // red midtone
  G: [148, 192, 152, 255], // zombie arm skin highlight
  g: [104, 148, 114, 255], // zombie skin mid
  m: [68, 98, 82, 255],    // zombie skin shadow
  E: [12, 10, 14, 255],    // helmet visor dark
  W: [244, 240, 234, 255], // teeth / eye pinprick
  O: [74, 76, 86, 255],    // charcoal overalls highlight
  o: [48, 50, 62, 255],    // overalls mid
  n: [30, 30, 40, 255],    // overalls shadow
  u: [20, 20, 26, 255],    // heavy tactical boots
};

// Riot helmet head (20x16)
const TANK_HEAD = [
  '.....KKKKKKKKKK.....',
  '...KKAAAAAAAAAAKK...',
  '..KAAAaaaaaaaaaaAK..',
  '.KAAaaAAAAAAAAAAadK.',
  '.KaaaddKKKKKKKKdddK.',
  'KaadKEEEEWKKKEEEEWK.',
  'KaddKEEEEEKKKEEEEEKK',
  'KdddKgggggmmmggggmK.',
  '.KddKgmWWWWWWWWmgK..',
  '.KddKgmEEEEEEEEgmK..',
  '..KKKgmWWWWWWWWmgK..',
  '....KmmKKKKKKKKmmK..',
  '.....KKKKKKKKKKKK...',
];

// Broad Riot Armor Torso + Red Vest + Overalls (30x19)
const TANK_TORSO = [
  '....KKKKKKKKKKKKKKKKKKKKKK....',
  '..KKAAAAaaKRRRRRRRKKaaaaAAKK..',
  '.KAAAaaaaaKRRrrrrrKKaaaaaaaAK.',
  'KAAaaaadddKRrrrrrrKKaaadddddAK',
  'KaaaddddddKRRRRRRRKKdddddKKKK.',
  'KaaaddddKKKOOOOOOOKKKdddK.....',
  '.KKKKKKKOOORRRRRROOOKKKK......',
  '....KOOOOOORrrrrrOOOOOOK......',
  '....KOOOOooOOOOOOooooOOK......',
  '....KOooooooOOOOooooooonK.....',
  '....KoooooooOOOOooooonnnK.....',
  '....KoooonnnnnnnnnnnnnnnK.....',
  '.....KOOOOOoooooonnnnnnK......',
  '.....KOOOOOoooooonnnnnnK......',
  '......KKKKKKKKKKKKKKKKK.......',
];

// Heavy Gauntlet Arm
const TANK_ARM_DOWN = [
  '..KKKKKK....',
  '.KAAAAaaK...',
  'KAAaaaaddK..',
  'KaaadddddK..',
  '.KGGGgggK...',
  '.KggmmmmK...',
  '.KRRRRRRK...',
  '.KRrrrrrK...',
  '.KRRRRrrK...',
  '..KKKKKK....',
];
const TANK_ARM_FWD = [
  '..KKKKKK.....',
  '.KAAAAaaK....',
  'KAAaaaaddKK..',
  'KaaaddGGGggK.',
  '.KKKKKggmmmK.',
  '....KRRRRRRK.',
  '....KRrrrrrK.',
  '.....KKKKKK..',
];
const TANK_ARM_BACK = [
  '..KKKKKK....',
  '.KAAAAaaK...',
  'KAAaaaaddK..',
  'KaaaddddK...',
  'KGGGgggK....',
  'KRRRRRRK....',
  'KRrrrrrK....',
  '.KKKKKK.....',
];
const TANK_BACK_ARM = [
  '.KKKKKK.....',
  'KAAAaaKK....',
  'KaaadGGgKK..',
  '.KKKdgmRRRKK',
  '....KKRrrrK.',
  '......KKKK..',
];

// Heavy Tactical Legs (18 rows -> 41..58, seamless overlap with overalls y=39..41)
const TANK_LEG_PLANT = [
  '.KKKKKKKK.',
  'KOOOOooooK',
  'KOOOOoooonK',
  'KOOOoooonnK',
  'KoooonnnnnK',
  'KoooonnnnnK',
  'KoooonnnnnK',
  'KoooonnnnnK',
  'KoooonnnnnK',
  'KoooonnnnnK',
  'KoooonnnnnK',
  'KoooonnnnnK',
  'KuuuuuuuuuK',
  'KuuuuuuuuuK',
  'KuuuuuuuuuK',
  'KuuuuuuuuuK',
  '.KKKKKKKKK.',
]; // 17 rows -> 42..58
const TANK_LEG_FWD = [
  '.KKKKKKKK...',
  'KOOOOooooK..',
  'KOOOOoooonK.',
  '.KOOOoooonK.',
  '.KoooonnnnnK',
  '.KoooonnnnnK',
  '..KoooonnnnK',
  '..KoooonnnnK',
  '..KoooonnnnnK',
  '..KoooonnnnnK',
  '..KoooonnnnnK',
  '..KuuuuuuuuuuK',
  '..KuuuuuuuuuuK',
  '..KuuuuuuuuuuK',
  '..KuuuuuuuuuuK',
  '...KKKKKKKKKK.',
]; // 16 rows -> 43..58
const TANK_LEG_BACK = [
  '.....KKKKKKKK.',
  '....KoooonnnnnK',
  '...KoooonnnnnK.',
  '...KoooonnnnK..',
  '..KoooonnnnK...',
  '..KoooonnnnK...',
  '.KoooonnnnK....',
  '.KoooonnnnK....',
  'KoooonnnnK.....',
  'KoooonnnnK.....',
  'KuuuuuuuuK.....',
  'KuuuuuuuuK.....',
  'KuuuuuuuuK.....',
  'KuuuuuuuuK.....',
  '.KKKKKKKK......',
]; // 15 rows -> 44..58
const TANK_LEG_LIFT = [
  '.KKKKKKKK.',
  'KOOOOooooK',
  'KOOOOoooonK',
  'KoooonnnnnK',
  'KoooonnnnnK',
  'KoooonnnnnK',
  'KuuuuuuuuuK',
  'KuuuuuuuuuK',
  'KuuuuuuuuuK',
  '.KKKKKKKKK.',
];

function buildTankWalk(step: 0 | 1 | 2 | 3): PixelCanvas {
  const c = new PixelCanvas(64, 64);
  const bob = step === 1 ? 1 : step === 3 ? -1 : 0;
  const cx = 13;

  c.stampGrid(TANK_BACK_ARM, cx + 25, 29 + bob, TANK_PALETTE);

  if (step === 0) c.stampGrid(TANK_LEG_BACK, cx + 4, 59 - TANK_LEG_BACK.length, TANK_PALETTE);
  else if (step === 1) c.stampGrid(TANK_LEG_LIFT, cx + 11, 41, TANK_PALETTE);
  else if (step === 2) c.stampGrid(TANK_LEG_FWD, cx + 16, 59 - TANK_LEG_FWD.length, TANK_PALETTE);
  else c.stampGrid(TANK_LEG_PLANT, cx + 13, 59 - TANK_LEG_PLANT.length, TANK_PALETTE);

  if (step === 0) c.stampGrid(TANK_LEG_FWD, cx + 16, 59 - TANK_LEG_FWD.length, TANK_PALETTE);
  else if (step === 1) c.stampGrid(TANK_LEG_PLANT, cx + 12, 59 - TANK_LEG_PLANT.length, TANK_PALETTE);
  else if (step === 2) c.stampGrid(TANK_LEG_BACK, cx + 4, 59 - TANK_LEG_BACK.length, TANK_PALETTE);
  else c.stampGrid(TANK_LEG_LIFT, cx + 10, 41, TANK_PALETTE);

  c.stampGrid(TANK_TORSO, cx + 3, 27 + bob, TANK_PALETTE);
  c.stampGrid(TANK_HEAD, cx + 12, 15 + bob, TANK_PALETTE);

  if (step === 0) c.stampGrid(TANK_ARM_BACK, cx + 0, 29 + bob, TANK_PALETTE);
  else if (step === 1 || step === 3) c.stampGrid(TANK_ARM_DOWN, cx + 2, 29 + bob, TANK_PALETTE);
  else c.stampGrid(TANK_ARM_FWD, cx + 4, 29 + bob, TANK_PALETTE);

  c.enforceBinaryAlpha();
  return c;
}

const TANK_DEATH_1 = [
  '.....KKKKKKKKKK.......................',
  '...KKAAAAAAAAAAKK.....................',
  '..KAAAaaaaaaaaaaAK....................',
  '.KAAaaAAAAAAAAAAadK...................',
  '.KaaaddKKKKKKKKdddK...................',
  'KaadKEEEEWKKKEEEEWK...................',
  'KaddKEEEEEKKKEEEEEKK..................',
  'KdddKgggggmmmggggmK...................',
  '.KddKgmWWWWWWWWmgK....................',
  '.KddKgmEEEEEEEEgmK....................',
  '..KKKgmWWWWWWWWmgK....................',
  '...KKKKKKKKKKKKKKKKKKKKKK.............',
  '..KKAAAAaaKRRRRRRRKKaaaaAAKK.KKKKKK...',
  '.KAAAaaaaaKRRrrrrrKKaaaaaaaAKAAAAaaK..',
  'KAAaaaadddKRrrrrrrKKaaaddddKKaaadddK..',
  'KaaaddddddKRRRRRRRKKdddddKKKGGGgggK...',
  'KaaaddddKKKOOOOOOOKKKdddK...KRRRRRRK..',
  '.KKKKKKKOOORRRRRROOOKKKK....KRrrrrrK..',
  '...KOOOOOORrrrrrOOOOOOK......KKKKKK...',
  '...KOOOOooOOOOOOooooOOK...............',
  '...KOOOOOoooooonnnnnnK................',
  '...KOOOOooooK..KOOOOooooK.............',
  '...KOOOoooonK...KOOOoooonK............',
  '...KoooonnnnK...KoooonnnnK............',
  '...KoooonnnnK....KoooonnnnK...........',
  '...KoooonnnnK....KoooonnnnK...........',
  '...KoooonnnnK....KoooonnnnK...........',
  '...KoooonnnnK....KoooonnnnK...........',
  '...KuuuuuuuuK....KuuuuuuuuK...........',
  '...KuuuuuuuuK....KuuuuuuuuK...........',
  '...KuuuuuuuuK....KuuuuuuuuK...........',
  '...KuuuuuuuuK....KuuuuuuuuK...........',
  '....KKKKKKKK......KKKKKKKK............',
];

const TANK_DEATH_2 = [
  '.....KKKKKKKKKK.......................',
  '...KKAAAAAAAAAAKK.....................',
  '..KAAAaaaaaaaaaaAK....................',
  '.KAAaaAAAAAAAAAAadK...................',
  '.KaaaddKKKKKKKKdddK...................',
  'KaadKEEEEWKKKEEEEWK...................',
  'KaddKEEEEEKKKEEEEEKK..................',
  'KdddKgggggmmmggggmK...................',
  '.KddKgmWWWWWWWWmgK....................',
  '..KKKgmWWWWWWWWmgK....................',
  '..KKKKKKKKKKKKKKKKKKKKKK..............',
  '.KAAAAaaKRRRRRRRKKaaaaAAKK.KKKKKK.....',
  'KAAaaaaddKRrrrrrKKaaaddddKKAAAAaaK....',
  'KaaaddddddKRRRRRRRKKdddddKKaaadddK....',
  '.KKKKKKKOOORRRRRROOOKKKK..KGGGgggK....',
  '...KOOOOOORrrrrrOOOOOOK...KRRRRRRK....',
  '...KOOOOOoooooonnnnnnnK....KKKKKK.....',
  '..KuuuuKOOOOooooKKOOOOooooK...........',
  '..KuuuuKoooonnnnKKoooonnnnK...........',
  '..KuuuuKoooonnnnKKoooonnnnK...........',
  '..KuuuuKuuuuuuuuKKuuuuuuuuK...........',
  '..KuuuuKuuuuuuuuKKuuuuuuuuK...........',
  '...KKKKKuuuuuuuuKKuuuuuuuuK...........',
  '........KKKKKKKK..KKKKKKKK............',
];

const TANK_DEATH_3 = [
  '.......KKKKKKKKKK...........................',
  '.....KKAAAAAAAAAAKK.........................',
  '....KAAAaaaaaaaaaaAK..KKKKKKKKKKKKKKKKK.....',
  '...KAAaaAAAAAAAAAAadKKAAAAaaKRRRRRRRKKaK....',
  '...KaadKEEEEWKKKEEEEKAAaaaaddKRrrrrrKKaaK...',
  '...KdddKgggggmmmggggKaaaddddddKRRRRRRRKKaK..',
  '....KddKgmWWWWWWWWmgKOOOOOORrrrrrOOOOOOKKK..',
  '.....KKKKKKKKKKKKKKKKOOOOOoooooonnnnnnnK....',
  '......KAAAAaaKKAAAAaaKOOOOooooKKOOOOooooK...',
  '.....KGGGgggKKRRRRRRK.KoooonnnnKKuuuuuuuuK..',
  '.....KRRRRRRKKRrrrrrK.KuuuuuuuuKKuuuuuuuuK..',
  '......KKKKKK..KKKKKK...KKKKKKKK..KKKKKKKK...',
];

const TANK_DEATH_4 = [
  '.......KKKKKKKKKK..................................',
  '.....KKAAAAAAAAAAKK.....KKKKKKKKKKKKKKKK...........',
  '....KAAAaaaaaaaaaaAK...KAAAAaaKRRRRRRRKKaaK........',
  '...KAAaaAAAAAAAAAAadK.KAAaaaaddKRrrrrrKKaaadK......',
  '...KaadKEEEEKKKEEEEKK.KaaaddddddKRRRRRRRKKdddK.....',
  '...KdddKgggggmmmggggK.KOOOOOORrrrrrOOOOOOKOOOOoK...',
  '....KddKgmWWWWWWWWmgK.KOOOOOoooooonnnnnnnKOOOoooonK',
  '.....KKKKKKKKKKKKKKKK..KKKKKKKKKKKoooonnnnKKuuuuuuK',
  '.......KAAAAaaKKRRRRRK..........KoooonnnnKKuuuuuuuK',
  '.......KGGGgggKKRrrrrK..........KuuuuuuuuKKKKKKKKK.',
  '........KKKKKK..KKKKK............KKKKKKKK..........',
];

function buildTankDeath(step: 0 | 1 | 2 | 3): PixelCanvas {
  const c = new PixelCanvas(64, 64);
  const grids = [TANK_DEATH_1, TANK_DEATH_2, TANK_DEATH_3, TANK_DEATH_4];
  const oxs = [13, 13, 10, 6];
  const g = grids[step];
  c.stampGrid(g, oxs[step], 59 - g.length, TANK_PALETTE);
  c.enforceBinaryAlpha();
  return c;
}

// ============================================================================
// 4. BOSS ZOMBIE (Colossal spiked mutant brute, 96x96 frames, 10f: 4w + 2slam + 4d)
// Foot baseline at y = 88!
// ============================================================================
const BOSS_PALETTE: Palette = {
  K: OUTLINE,
  F: [218, 196, 182, 255], // bruised flesh highlight
  f: [195, 164, 159, 255], // flesh midtone
  s: [143, 107, 125, 255], // purplish-grey shadow
  z: [106, 70, 93, 255],   // deep purple-taupe shadow
  R: [214, 52, 48, 255],   // raw muscle / wound bright
  r: [152, 28, 34, 255],   // deep crimson wound
  B: [244, 238, 228, 255], // white bone spikes & teeth
  b: [204, 194, 186, 255], // bone spike shadow
  E: [12, 10, 14, 255],    // socket / mouth cavity
  Y: [255, 56, 48, 255],   // glowing red boss eyes
  P: [54, 60, 88, 255],    // torn navy shorts highlight
  p: [32, 36, 57, 255],    // torn navy shorts mid
  n: [18, 20, 34, 255],    // shorts shadow
  G: [212, 148, 44, 255],  // gold belt buckle
  g: [148, 92, 26, 255],   // leather belt
};

function drawBossBody(
  c: PixelCanvas,
  ox: number,
  oy: number,
  pose: 'walk0' | 'walk1' | 'walk2' | 'walk3' | 'slam0' | 'slam1'
) {
  const bob = pose === 'walk1' ? 2 : pose === 'walk3' ? -2 : pose === 'slam0' ? -4 : pose === 'slam1' ? 4 : 0;

  // Back colossal arm (far right)
  const backArmX = pose === 'slam0' ? ox + 52 : pose === 'slam1' ? ox + 58 : pose === 'walk0' || pose === 'walk3' ? ox + 56 : ox + 52;
  const backArmY = pose === 'slam0' ? oy + 12 : pose === 'slam1' ? oy + 42 : oy + 32 + bob;
  c.fillEllipse(backArmX + 8, backArmY + 12, 9, 13, BOSS_PALETTE.s);
  c.fillEllipse(backArmX + 8, backArmY + 11, 7, 10, BOSS_PALETTE.f);
  c.fillEllipse(backArmX + 10, backArmY + 23, 8, 7, BOSS_PALETTE.s); // huge fist
  c.fillRect(backArmX + 5, backArmY + 14, 5, 4, BOSS_PALETTE.R); // forearm wound

  // Legs (planted cleanly so foot bottom = y=88 -> oy=12 means leg bottom at oy+76 = 88)
  const drawLeg = (lx: number, ly: number, stride: 'fwd' | 'back' | 'plant' | 'lift') => {
    const h = stride === 'lift' ? 14 : 21;
    const xShift = stride === 'fwd' ? 5 : stride === 'back' ? -5 : 0;
    // Torn shorts leg
    c.fillRect(lx, ly, 14, 9, BOSS_PALETTE.p);
    c.fillRect(lx + 2, ly + 1, 9, 6, BOSS_PALETTE.P);
    // Thick muscular calf & clawed foot
    c.fillRect(lx + 1 + xShift / 2, ly + 8, 12, h - 10, BOSS_PALETTE.f);
    c.fillRect(lx + 1 + xShift / 2, ly + 8, 4, h - 10, BOSS_PALETTE.s);
    // Massive clawed foot touching bottom
    c.fillRect(lx - 1 + xShift, ly + h - 6, 16, 6, BOSS_PALETTE.s);
    c.fillRect(lx + 1 + xShift, ly + h - 5, 11, 4, BOSS_PALETTE.f);
    // Claws
    c.set(lx + 14 + xShift, ly + h - 2, BOSS_PALETTE.B);
    c.set(lx + 14 + xShift, ly + h - 4, BOSS_PALETTE.B);
  };

  if (pose === 'walk0') {
    drawLeg(ox + 20, oy + 55, 'back');
    drawLeg(ox + 38, oy + 55, 'fwd');
  } else if (pose === 'walk1') {
    drawLeg(ox + 28, oy + 53, 'lift');
    drawLeg(ox + 32, oy + 55, 'plant');
  } else if (pose === 'walk2') {
    drawLeg(ox + 38, oy + 55, 'fwd');
    drawLeg(ox + 20, oy + 55, 'back');
  } else if (pose === 'walk3') {
    drawLeg(ox + 32, oy + 55, 'plant');
    drawLeg(ox + 28, oy + 53, 'lift');
  } else {
    drawLeg(ox + 18, oy + 55, 'back');
    drawLeg(ox + 40, oy + 55, 'fwd');
  }

  // Massive hunched muscular torso (ox+14..ox+56, oy+16..oy+58)
  c.fillEllipse(ox + 34, oy + 36 + bob, 22, 18, BOSS_PALETTE.s);
  c.fillEllipse(ox + 35, oy + 34 + bob, 19, 15, BOSS_PALETTE.f);
  c.fillEllipse(ox + 37, oy + 32 + bob, 13, 10, BOSS_PALETTE.F);

  // Crimson back ridge & exposed muscle wounds
  c.fillEllipse(ox + 22, oy + 24 + bob, 10, 6, BOSS_PALETTE.r);
  c.fillRect(ox + 19, oy + 21 + bob, 12, 4, BOSS_PALETTE.R);
  c.fillRect(ox + 42, oy + 32 + bob, 8, 5, BOSS_PALETTE.R);
  c.fillRect(ox + 26, oy + 38 + bob, 7, 5, BOSS_PALETTE.r);

  // White bone spikes along back & shoulders (matching attachment!)
  const spikes = [
    [ox + 14, oy + 20 + bob],
    [ox + 20, oy + 14 + bob],
    [ox + 27, oy + 12 + bob],
    [ox + 34, oy + 13 + bob],
  ];
  for (const [sx, sy] of spikes) {
    c.fillRect(sx, sy + 2, 5, 6, BOSS_PALETTE.b);
    c.fillRect(sx + 1, sy, 3, 6, BOSS_PALETTE.B);
  }

  // Torn shorts waist + belt + gold buckle
  c.fillRect(ox + 19, oy + 49 + bob, 31, 9, BOSS_PALETTE.p);
  c.fillRect(ox + 22, oy + 50 + bob, 22, 6, BOSS_PALETTE.P);
  c.fillRect(ox + 20, oy + 48 + bob, 29, 3, BOSS_PALETTE.g);
  c.fillRect(ox + 37, oy + 47 + bob, 6, 4, BOSS_PALETTE.G);

  // Colossal Boss Head (set forward on chest/shoulders, roaring right)
  const hx = ox + 36;
  const hy = oy + 13 + bob;
  c.fillEllipse(hx + 10, hy + 11, 13, 12, BOSS_PALETTE.s);
  c.fillEllipse(hx + 10, hy + 9, 11, 10, BOSS_PALETTE.f);
  c.fillEllipse(hx + 9, hy + 6, 8, 6, BOSS_PALETTE.F);
  // Crimson forehead scar/wound
  c.fillRect(hx + 10, hy + 2, 4, 5, BOSS_PALETTE.R);
  // Glowing angry red eyes
  c.fillRect(hx + 6, hy + 8, 5, 4, BOSS_PALETTE.E);
  c.fillRect(hx + 14, hy + 8, 5, 4, BOSS_PALETTE.E);
  c.fillRect(hx + 8, hy + 9, 2, 2, BOSS_PALETTE.Y);
  c.fillRect(hx + 16, hy + 9, 2, 2, BOSS_PALETTE.Y);
  // Massive roaring jaw with sharp white teeth
  c.fillRect(hx + 5, hy + 14, 13, 8, BOSS_PALETTE.E);
  c.fillRect(hx + 7, hy + 16, 8, 4, BOSS_PALETTE.r);
  for (let tx = 6; tx <= 16; tx += 3) {
    c.fillRect(hx + tx, hy + 14, 2, 2, BOSS_PALETTE.B);
    c.fillRect(hx + tx, hy + 20, 2, 2, BOSS_PALETTE.B);
  }

  // Massive Foreground Left Arm & Clawed Fist
  const faX = pose === 'slam0' ? ox + 10 : pose === 'slam1' ? ox + 24 : pose === 'walk0' ? ox + 6 : pose === 'walk2' ? ox + 16 : ox + 10;
  const faY = pose === 'slam0' ? oy + 10 : pose === 'slam1' ? oy + 38 : oy + 30 + bob;
  c.fillEllipse(faX + 8, faY + 12, 10, 14, BOSS_PALETTE.s);
  c.fillEllipse(faX + 7, faY + 10, 8, 11, BOSS_PALETTE.f);
  c.fillRect(faX + 3, faY + 6, 7, 5, BOSS_PALETTE.R); // shoulder wound
  c.fillRect(faX + 4, faY + 17, 6, 4, BOSS_PALETTE.r); // forearm wound
  // Giant clawed fist
  c.fillEllipse(faX + 9, faY + 26, 9, 7, BOSS_PALETTE.s);
  c.fillEllipse(faX + 8, faY + 25, 7, 5, BOSS_PALETTE.f);
  c.fillRect(faX + 3, faY + 30, 3, 3, BOSS_PALETTE.B);
  c.fillRect(faX + 8, faY + 31, 3, 3, BOSS_PALETTE.B);
  c.fillRect(faX + 13, faY + 30, 3, 3, BOSS_PALETTE.B);
}

function buildBossFrame(pose: 'walk0' | 'walk1' | 'walk2' | 'walk3' | 'slam0' | 'slam1'): PixelCanvas {
  const c = new PixelCanvas(96, 96);
  // 88 - 76 = 12 => feet end right at y = 88!
  drawBossBody(c, 14, 12, pose);
  c.applyOutline(OUTLINE);
  c.enforceBinaryAlpha();
  return c;
}

function buildBossDeath(step: 0 | 1 | 2 | 3): PixelCanvas {
  const c = new PixelCanvas(96, 96);
  if (step === 0) {
    // Heavy stagger back (feet at y=88)
    drawBossBody(c, 10, 12, 'slam0');
  } else if (step === 1) {
    // Crashing to knees (lowered cleanly onto y=88, full internal detail)
    const ox = 12;
    const oy = 32;
    c.fillEllipse(ox + 34, oy + 32, 23, 17, BOSS_PALETTE.s);
    c.fillEllipse(ox + 35, oy + 30, 19, 14, BOSS_PALETTE.f);
    c.fillRect(ox + 20, oy + 16, 12, 5, BOSS_PALETTE.R);
    c.fillRect(ox + 22, oy + 10, 4, 6, BOSS_PALETTE.B);
    c.fillRect(ox + 30, oy + 9, 4, 6, BOSS_PALETTE.B);
    c.fillRect(ox + 18, oy + 43, 34, 11, BOSS_PALETTE.p);
    c.fillRect(ox + 20, oy + 42, 30, 3, BOSS_PALETTE.g);
    c.fillRect(ox + 36, oy + 41, 6, 4, BOSS_PALETTE.G);
    // Knees on ground y=88
    c.fillRect(ox + 15, oy + 48, 15, 7, BOSS_PALETTE.s);
    c.fillRect(ox + 38, oy + 48, 15, 7, BOSS_PALETTE.s);
    c.fillRect(ox + 17, oy + 49, 11, 5, BOSS_PALETTE.f);
    c.fillRect(ox + 40, oy + 49, 11, 5, BOSS_PALETTE.f);
    // Head slumped with dark outline separation, red eyes & teeth
    c.fillEllipse(ox + 45, oy + 19, 13, 11, BOSS_PALETTE.K);
    c.fillEllipse(ox + 45, oy + 19, 12, 10, BOSS_PALETTE.f);
    c.fillRect(ox + 45, oy + 10, 4, 4, BOSS_PALETTE.R);
    c.fillRect(ox + 40, oy + 16, 4, 3, BOSS_PALETTE.E);
    c.fillRect(ox + 48, oy + 16, 4, 3, BOSS_PALETTE.E);
    c.fillRect(ox + 42, oy + 17, 2, 1, BOSS_PALETTE.Y);
    c.fillRect(ox + 50, oy + 17, 2, 1, BOSS_PALETTE.Y);
    c.fillRect(ox + 39, oy + 22, 12, 6, BOSS_PALETTE.E);
    c.fillRect(ox + 41, oy + 22, 2, 2, BOSS_PALETTE.B);
    c.fillRect(ox + 45, oy + 22, 2, 2, BOSS_PALETTE.B);
    c.fillRect(ox + 49, oy + 22, 2, 2, BOSS_PALETTE.B);
    // Massive arms crashing down with dark separation
    c.fillEllipse(ox + 14, oy + 36, 10, 12, BOSS_PALETTE.K);
    c.fillEllipse(ox + 14, oy + 36, 9, 11, BOSS_PALETTE.f);
    c.fillRect(ox + 10, oy + 32, 6, 4, BOSS_PALETTE.R);
    c.fillEllipse(ox + 56, oy + 36, 10, 12, BOSS_PALETTE.K);
    c.fillEllipse(ox + 56, oy + 36, 9, 11, BOSS_PALETTE.f);
    c.fillRect(ox + 52, oy + 33, 6, 4, BOSS_PALETTE.r);
  } else if (step === 2) {
    // Collapsing flat onto chest
    const ox = 8;
    const oy = 51;
    c.fillEllipse(ox + 40, oy + 20, 27, 14, BOSS_PALETTE.s);
    c.fillEllipse(ox + 40, oy + 18, 23, 11, BOSS_PALETTE.f);
    c.fillRect(ox + 26, oy + 6, 16, 5, BOSS_PALETTE.R);
    c.fillRect(ox + 28, oy + 1, 4, 6, BOSS_PALETTE.B);
    c.fillRect(ox + 36, oy + 0, 4, 6, BOSS_PALETTE.B);
    c.fillRect(ox + 52, oy + 13, 18, 17, BOSS_PALETTE.K);
    c.fillRect(ox + 53, oy + 14, 16, 15, BOSS_PALETTE.p);
    c.fillRect(ox + 53, oy + 14, 4, 15, BOSS_PALETTE.g);
    c.fillRect(ox + 53, oy + 19, 4, 4, BOSS_PALETTE.G);
    c.fillRect(ox + 68, oy + 22, 12, 12, BOSS_PALETTE.s);
    c.fillRect(ox + 70, oy + 24, 9, 9, BOSS_PALETTE.f);
    // Head
    c.fillEllipse(ox + 18, oy + 22, 13, 12, BOSS_PALETTE.K);
    c.fillEllipse(ox + 18, oy + 22, 12, 11, BOSS_PALETTE.f);
    c.fillRect(ox + 12, oy + 20, 4, 3, BOSS_PALETTE.E);
    c.fillRect(ox + 14, oy + 21, 1, 1, BOSS_PALETTE.Y);
    c.fillRect(ox + 12, oy + 26, 10, 5, BOSS_PALETTE.E);
    c.fillRect(ox + 14, oy + 26, 2, 2, BOSS_PALETTE.B);
    c.fillRect(ox + 18, oy + 26, 2, 2, BOSS_PALETTE.B);
    // Arm
    c.fillEllipse(ox + 33, oy + 28, 12, 8, BOSS_PALETTE.K);
    c.fillEllipse(ox + 33, oy + 28, 11, 7, BOSS_PALETTE.s);
    c.fillEllipse(ox + 33, oy + 27, 9, 5, BOSS_PALETTE.f);
  } else {
    // Sprawled flat horizontally at y=88
    const ox = 6;
    const oy = 62;
    c.fillEllipse(ox + 44, oy + 14, 23, 11, BOSS_PALETTE.s);
    c.fillEllipse(ox + 42, oy + 12, 19, 9, BOSS_PALETTE.f);
    c.fillRect(ox + 32, oy + 4, 14, 4, BOSS_PALETTE.R);
    c.fillRect(ox + 34, oy + 0, 4, 5, BOSS_PALETTE.B);
    c.fillRect(ox + 42, oy + 1, 4, 5, BOSS_PALETTE.B);
    c.fillRect(ox + 58, oy + 8, 18, 16, BOSS_PALETTE.K);
    c.fillRect(ox + 59, oy + 9, 16, 14, BOSS_PALETTE.p);
    c.fillRect(ox + 64, oy + 9, 4, 14, BOSS_PALETTE.g);
    c.fillRect(ox + 64, oy + 14, 4, 4, BOSS_PALETTE.G);
    c.fillRect(ox + 75, oy + 12, 11, 11, BOSS_PALETTE.s);
    c.fillRect(ox + 76, oy + 13, 9, 9, BOSS_PALETTE.f);
    // Slumped head & arms on ground with dark line separation
    c.fillEllipse(ox + 18, oy + 15, 13, 10, BOSS_PALETTE.K);
    c.fillEllipse(ox + 18, oy + 15, 12, 9, BOSS_PALETTE.f);
    c.fillRect(ox + 12, oy + 13, 5, 2, BOSS_PALETTE.E);
    c.fillRect(ox + 13, oy + 18, 9, 4, BOSS_PALETTE.E);
    c.fillRect(ox + 15, oy + 18, 2, 1, BOSS_PALETTE.B);
    c.fillRect(ox + 19, oy + 18, 2, 1, BOSS_PALETTE.B);
    c.fillEllipse(ox + 34, oy + 20, 12, 5, BOSS_PALETTE.K);
    c.fillEllipse(ox + 34, oy + 20, 11, 4, BOSS_PALETTE.s);
    c.fillEllipse(ox + 32, oy + 19, 9, 3, BOSS_PALETTE.f);
  }
  c.applyOutline(OUTLINE);
  c.enforceBinaryAlpha();
  return c;
}

// Generate all Group 1 sheets
const runnerFrames = [
  buildRunnerWalk(0),
  buildRunnerWalk(1),
  buildRunnerWalk(2),
  buildRunnerWalk(3),
  buildRunnerDeath(0),
  buildRunnerDeath(1),
  buildRunnerDeath(2),
  buildRunnerDeath(3),
];
const spitterFrames = [
  buildSpitterWalk(0),
  buildSpitterWalk(1),
  buildSpitterWalk(2),
  buildSpitterWalk(3),
  buildSpitterAttack(0),
  buildSpitterAttack(1),
  buildSpitterDeath(0),
  buildSpitterDeath(1),
  buildSpitterDeath(2),
  buildSpitterDeath(3),
];
const tankFrames = [
  buildTankWalk(0),
  buildTankWalk(1),
  buildTankWalk(2),
  buildTankWalk(3),
  buildTankDeath(0),
  buildTankDeath(1),
  buildTankDeath(2),
  buildTankDeath(3),
];
const bossFrames = [
  buildBossFrame('walk0'),
  buildBossFrame('walk1'),
  buildBossFrame('walk2'),
  buildBossFrame('walk3'),
  buildBossFrame('slam0'),
  buildBossFrame('slam1'),
  buildBossDeath(0),
  buildBossDeath(1),
  buildBossDeath(2),
  buildBossDeath(3),
];

saveSheetPNG(OUT_DIR, 'runner_spritesheet.png', buildHorizontalStrip(runnerFrames, 64, 64));
saveSheetPNG(OUT_DIR, 'spitter_spritesheet.png', buildHorizontalStrip(spitterFrames, 64, 64));
saveSheetPNG(OUT_DIR, 'tank_spritesheet.png', buildHorizontalStrip(tankFrames, 64, 64));
saveSheetPNG(OUT_DIR, 'boss_spritesheet.png', buildHorizontalStrip(bossFrames, 96, 96));

const manifest = {
  group: 1,
  name: 'Enemy Characters (Runner, Spitter, Tank, Boss)',
  style: '16-bit bold dark outline, 3/4 view, transparent RGBA, no AA, no gradients',
  assets: [
    {
      id: 'runner',
      title: 'Runner Zombie',
      file: 'runner_spritesheet.png',
      frameSize: { w: 64, h: 64 },
      frameCount: runnerFrames.length,
      sheetSize: { w: runnerFrames.length * 64, h: 64 },
      footBaselineY: 58,
      animations: {
        walk: { startFrame: 0, count: 4, fps: 12, loop: true },
        death: { startFrame: 4, count: 4, fps: 9, loop: false },
      },
      frames: runnerFrames.map((f, i) => ({
        index: i,
        name: i < 4 ? `walk_${i}` : `death_${i - 4}`,
        x: i * 64,
        y: 0,
        w: 64,
        h: 64,
        bounds: f.getBounds(),
      })),
    },
    {
      id: 'spitter',
      title: 'Spitter Zombie',
      file: 'spitter_spritesheet.png',
      frameSize: { w: 64, h: 64 },
      frameCount: spitterFrames.length,
      sheetSize: { w: spitterFrames.length * 64, h: 64 },
      footBaselineY: 58,
      animations: {
        walk: { startFrame: 0, count: 4, fps: 8, loop: true },
        attack: { startFrame: 4, count: 2, fps: 8, loop: false },
        death: { startFrame: 6, count: 4, fps: 8, loop: false },
      },
      frames: spitterFrames.map((f, i) => ({
        index: i,
        name: i < 4 ? `walk_${i}` : i < 6 ? `attack_${i - 4}` : `death_${i - 6}`,
        x: i * 64,
        y: 0,
        w: 64,
        h: 64,
        bounds: f.getBounds(),
      })),
    },
    {
      id: 'tank',
      title: 'Tank Zombie (Armored Riot)',
      file: 'tank_spritesheet.png',
      frameSize: { w: 64, h: 64 },
      frameCount: tankFrames.length,
      sheetSize: { w: tankFrames.length * 64, h: 64 },
      footBaselineY: 58,
      animations: {
        walk: { startFrame: 0, count: 4, fps: 6, loop: true },
        death: { startFrame: 4, count: 4, fps: 8, loop: false },
      },
      frames: tankFrames.map((f, i) => ({
        index: i,
        name: i < 4 ? `walk_${i}` : `death_${i - 4}`,
        x: i * 64,
        y: 0,
        w: 64,
        h: 64,
        bounds: f.getBounds(),
      })),
    },
    {
      id: 'boss',
      title: 'Boss Mutant Brute',
      file: 'boss_spritesheet.png',
      frameSize: { w: 96, h: 96 },
      frameCount: bossFrames.length,
      sheetSize: { w: bossFrames.length * 96, h: 96 },
      footBaselineY: 88,
      animations: {
        walk: { startFrame: 0, count: 4, fps: 6, loop: true },
        attack: { startFrame: 4, count: 2, fps: 7, loop: false },
        death: { startFrame: 6, count: 4, fps: 7, loop: false },
      },
      frames: bossFrames.map((f, i) => ({
        index: i,
        name: i < 4 ? `walk_${i}` : i < 6 ? `attack_${i - 4}` : `death_${i - 6}`,
        x: i * 96,
        y: 0,
        w: 96,
        h: 96,
        bounds: f.getBounds(),
      })),
    },
  ],
};

fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

// Temporary visual inspection sheet for verification
saveInspectionPreview(
  path.resolve(process.cwd(), 'scripts/_inspect_group1.png'),
  [
    { frames: runnerFrames, frameW: 64, frameH: 64, baselineY: 58 },
    { frames: spitterFrames, frameW: 64, frameH: 64, baselineY: 58 },
    { frames: tankFrames, frameW: 64, frameH: 64, baselineY: 58 },
    { frames: bossFrames, frameW: 96, frameH: 96, baselineY: 88 },
  ],
  2
);

console.log('Group 1 generated!');
console.log('Runner maxY:', runnerFrames.map((f) => f.getBounds().maxY));
console.log('Spitter maxY:', spitterFrames.map((f) => f.getBounds().maxY));
console.log('Tank maxY:', tankFrames.map((f) => f.getBounds().maxY));
console.log('Boss maxY:', bossFrames.map((f) => f.getBounds().maxY));
