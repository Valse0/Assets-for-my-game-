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

const OUT_DIR = path.resolve(process.cwd(), 'public/assets/packs/group4');

// ============================================================================
// 1. UPGRADE CARDS (48x64, 3 card variants: Weapon, Passive, Rare)
// ============================================================================
function buildUpgradeCard(
  accentLight: RGBA,
  accentMid: RGBA,
  accentDark: RGBA,
  emblem: 'weapon' | 'speed' | 'rare'
): PixelCanvas {
  const c = new PixelCanvas(48, 64);
  const GOLD_L: RGBA = [254, 240, 138, 255];
  const GOLD_M: RGBA = [234, 179, 8, 255];
  const GOLD_D: RGBA = [161, 98, 7, 255];
  const BG_DARK: RGBA = [26, 30, 44, 255];
  const BG_MID: RGBA = [38, 44, 62, 255];
  const WHITE: RGBA = [248, 250, 252, 255];

  // Outer card frame (40x56 centered inside 48x64 -> ox=4, oy=4)
  c.fillRect(4, 4, 40, 56, GOLD_D);
  c.fillRect(4, 4, 40, 3, GOLD_L);
  c.fillRect(4, 4, 3, 56, GOLD_M);
  c.fillRect(41, 4, 3, 56, GOLD_D);
  c.fillRect(4, 57, 40, 3, GOLD_D);

  // Inner dark slate card body
  c.fillRect(7, 7, 34, 50, BG_DARK);
  c.fillRect(8, 8, 32, 28, BG_MID);

  // Colored emblem banner header inside card
  c.fillRect(9, 9, 30, 26, accentDark);
  c.fillRect(10, 10, 28, 24, accentMid);
  c.fillRect(10, 10, 28, 3, accentLight);

  // Bottom text-bar placeholder lines (16-bit pixel card UI)
  c.fillRect(11, 39, 26, 3, WHITE);
  c.fillRect(11, 45, 22, 2, [148, 163, 184, 255]);
  c.fillRect(11, 49, 18, 2, [148, 163, 184, 255]);

  // Crisp center emblem inside banner
  if (emblem === 'weapon') {
    // Bold pixel bullet / crossed sword emblem
    for (let i = 0; i < 12; i++) {
      c.fillRect(18 + i, 27 - i, 3, 3, WHITE);
      c.fillRect(28 - i, 27 - i, 3, 3, GOLD_L);
    }
    c.fillRect(16, 25, 4, 4, GOLD_M);
    c.fillRect(28, 25, 4, 4, GOLD_M);
  } else if (emblem === 'speed') {
    // Pixel lightning bolt
    c.fillRect(23, 13, 6, 3, GOLD_L);
    c.fillRect(21, 16, 6, 3, GOLD_L);
    c.fillRect(19, 19, 10, 3, WHITE);
    c.fillRect(22, 22, 6, 3, GOLD_L);
    c.fillRect(20, 25, 5, 3, GOLD_M);
  } else {
    // Rare star / crown
    c.fillRect(23, 13, 2, 16, WHITE);
    c.fillRect(16, 20, 16, 2, WHITE);
    c.fillRect(20, 16, 8, 10, GOLD_L);
    c.fillRect(22, 18, 4, 6, WHITE);
  }

  c.applyOutline(OUTLINE);
  c.enforceBinaryAlpha();
  return c;
}

// ============================================================================
// 2. PAUSE BUTTON (32x32, 2 frames: normal & active)
// ============================================================================
function buildPauseIcon(pressed: boolean): PixelCanvas {
  const c = new PixelCanvas(32, 32);
  const TOP: RGBA = pressed ? [250, 204, 21, 255] : [100, 116, 139, 255];
  const MID: RGBA = pressed ? [202, 138, 4, 255] : [51, 65, 85, 255];
  const BOT: RGBA = pressed ? [133, 77, 14, 255] : [30, 41, 59, 255];
  const BAR: RGBA = [248, 250, 252, 255];
  const BAR_SHAD: RGBA = [148, 163, 184, 255];

  const oy = pressed ? 5 : 4;
  c.fillRect(4, oy, 24, 24, MID);
  c.fillRect(4, oy, 24, 3, TOP);
  c.fillRect(4, oy + 21, 24, 3, BOT);

  // Two pause bars with dark inner outline
  c.fillRect(9, oy + 6, 5, 12, OUTLINE);
  c.fillRect(10, oy + 7, 3, 10, BAR);
  c.fillRect(12, oy + 8, 1, 9, BAR_SHAD);

  c.fillRect(18, oy + 6, 5, 12, OUTLINE);
  c.fillRect(19, oy + 7, 3, 10, BAR);
  c.fillRect(21, oy + 8, 1, 9, BAR_SHAD);

  c.applyOutline(OUTLINE);
  c.enforceBinaryAlpha();
  return c;
}

// ============================================================================
// 3. GOLD COIN (24x24, 4 frames: spinning coin)
// ============================================================================
const COIN_PAL: Palette = {
  K: OUTLINE,
  W: [255, 255, 232, 255], // specular shine
  L: [254, 240, 138, 255], // bright gold
  M: [250, 204, 21, 255],  // gold midtone
  D: [202, 138, 4, 255],   // gold shadow
  S: [133, 77, 14, 255],   // deep bronze edge
};

const COIN_0 = [
  '....KKKKKK....',
  '..KKLLLLLLKK..',
  '.KLLWWMMMMDDK.',
  'KLLWMMLLMMDDDK',
  'KLMMMLWWLMDDDK',
  'KLMMMLWWLMDDDK',
  'KLMMMLWWLMDDDK',
  'KLMMMLWWLMDDDK',
  'KLLMMLLLLMDDSK',
  '.KDDMMMMMDDDK.',
  '..KKDDDDDDKK..',
  '....KKKKKK....',
];

const COIN_1 = [
  '...KKKKK...',
  '.KKLLLLLKK.',
  'KLWMMMDDSK.',
  'KLWMLWMDSK.',
  'KLWMLWMDSK.',
  'KLWMLWMDSK.',
  'KLWMLWMDSK.',
  'KLWMMMDDSK.',
  '.KDDMMDSK..',
  '..KKDDDKK..',
  '...KKKKK...',
];

const COIN_2 = [
  '.KKKK.',
  'KLLMDK',
  'KWMMDK',
  'KWMMDK',
  'KWMMDK',
  'KWMMDK',
  'KWMMDK',
  'KWMMDK',
  'KDMMSK',
  'KDDSSK',
  '.KKKK.',
];

const COIN_3 = [
  '...KKKKK...',
  '.KKLLLLLKK.',
  'KSMMMWWLLK.',
  'KSMWLWMLWK.',
  'KSMWLWMLWK.',
  'KSMWLWMLWK.',
  'KSMWLWMLWK.',
  'KSMMMWWLLK.',
  '.KSDDMMDK..',
  '..KKDDDKK..',
  '...KKKKK...',
];

function buildGoldCoins(): PixelCanvas[] {
  return [COIN_0, COIN_1, COIN_2, COIN_3].map((g) => {
    const c = new PixelCanvas(24, 24);
    const ox = Math.floor((24 - g[0].length) / 2);
    const oy = Math.floor((24 - g.length) / 2);
    c.stampGrid(g, ox, oy, COIN_PAL);
    c.enforceBinaryAlpha();
    return c;
  });
}

const cardFrames = [
  buildUpgradeCard([248, 113, 113, 255], [220, 38, 38, 255], [153, 27, 27, 255], 'weapon'),
  buildUpgradeCard([134, 239, 172, 255], [34, 197, 94, 255], [21, 128, 61, 255], 'speed'),
  buildUpgradeCard([216, 180, 254, 255], [147, 51, 234, 255], [107, 33, 168, 255], 'rare'),
];
const pauseFrames = [buildPauseIcon(false), buildPauseIcon(true)];
const coinFrames = buildGoldCoins();

saveSheetPNG(OUT_DIR, 'ui_upgrade_cards_spritesheet.png', buildHorizontalStrip(cardFrames, 48, 64));
saveSheetPNG(OUT_DIR, 'ui_pause_spritesheet.png', buildHorizontalStrip(pauseFrames, 32, 32));
saveSheetPNG(OUT_DIR, 'ui_gold_coin_spritesheet.png', buildHorizontalStrip(coinFrames, 24, 24));

const manifest = {
  group: 4,
  name: 'UI Icons (Upgrade Cards, Pause, Gold Coin)',
  style: '16-bit bold dark outline, transparent RGBA, no AA, no gradients',
  assets: [
    {
      id: 'ui_upgrade_cards',
      title: 'Upgrade Selection Cards',
      file: 'ui_upgrade_cards_spritesheet.png',
      frameSize: { w: 48, h: 64 },
      frameCount: cardFrames.length,
      sheetSize: { w: cardFrames.length * 48, h: 64 },
      frames: cardFrames.map((f, i) => ({
        index: i,
        name: ['card_weapon', 'card_passive', 'card_rare'][i],
        x: i * 48,
        y: 0,
        w: 48,
        h: 64,
        bounds: f.getBounds(),
      })),
    },
    {
      id: 'ui_pause',
      title: 'Pause Button',
      file: 'ui_pause_spritesheet.png',
      frameSize: { w: 32, h: 32 },
      frameCount: pauseFrames.length,
      sheetSize: { w: pauseFrames.length * 32, h: 32 },
      frames: pauseFrames.map((f, i) => ({
        index: i,
        name: i === 0 ? 'pause_normal' : 'pause_active',
        x: i * 32,
        y: 0,
        w: 32,
        h: 32,
        bounds: f.getBounds(),
      })),
    },
    {
      id: 'ui_gold_coin',
      title: 'Gold Coin Spin',
      file: 'ui_gold_coin_spritesheet.png',
      frameSize: { w: 24, h: 24 },
      frameCount: coinFrames.length,
      sheetSize: { w: coinFrames.length * 24, h: 24 },
      animations: { spin: { startFrame: 0, count: 4, fps: 8, loop: true } },
      frames: coinFrames.map((f, i) => ({
        index: i,
        name: `coin_${i}`,
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
  path.resolve(process.cwd(), 'scripts/_inspect_group4.png'),
  [
    { frames: cardFrames, frameW: 48, frameH: 64 },
    { frames: pauseFrames, frameW: 32, frameH: 32 },
    { frames: coinFrames, frameW: 24, frameH: 24 },
  ],
  3
);

console.log('Group 4 generated!');
