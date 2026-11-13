import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve(process.cwd(), 'public/assets/packs/group5');
const SAMPLE_RATE = 44100;

function writeWAV(filepath: string, samples: Float32Array) {
  const numSamples = samples.length;
  const buffer = Buffer.alloc(44 + numSamples * 2);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(1, 22);  // Mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // Byte rate
  buffer.writeUInt16LE(2, 32);  // Block align
  buffer.writeUInt16LE(16, 34); // Bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);

  for (let i = 0; i < numSamples; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }

  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, buffer);
}

function square(phase: number, duty = 0.5): number {
  return (phase % 1) < duty ? 1 : -1;
}

function triangle(phase: number): number {
  const p = phase % 1;
  return p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
}

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Deterministic PRNG for retro noise channel
function makeNoise() {
  let seed = 0x13579bdf;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed / 0xffffffff) * 2 - 1;
  };
}

// 1. 16-bit Chiptune Action BGM Loop (8 seconds @ 120 BPM = 16 beats / 32 eighth-notes)
function synthBGM(): Float32Array {
  const duration = 8.0;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  const rand = makeNoise();

  // E minor driving bassline (32 eighth-notes)
  const bassNotes = [
    40, 40, 52, 40, 40, 40, 52, 40,
    43, 43, 55, 43, 43, 43, 55, 43,
    45, 45, 57, 45, 47, 47, 59, 47,
    40, 40, 52, 40, 38, 38, 50, 38,
  ];
  // Lead melody (32 eighth-notes, 0 = rest)
  const leadNotes = [
    64, 0, 67, 71, 72, 71, 67, 0,
    67, 0, 71, 74, 76, 74, 71, 67,
    69, 72, 76, 0, 74, 71, 69, 67,
    64, 67, 71, 67, 64, 0, 62, 0,
  ];

  const stepSec = duration / 32; // 0.25s per eighth-note
  let bassPhase = 0;
  let leadPhase = 0;

  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const step = Math.min(31, Math.floor(t / stepSec));
    const localT = t - step * stepSec;
    const stepProg = localT / stepSec;

    // Bass
    const bHz = midiToHz(bassNotes[step]);
    bassPhase += bHz / SAMPLE_RATE;
    const bassEnv = Math.max(0, 1 - stepProg * 0.7);
    const bassSample = triangle(bassPhase) * 0.28 * bassEnv;

    // Lead pulse (25% duty)
    let leadSample = 0;
    const lMidi = leadNotes[step];
    if (lMidi > 0) {
      const lHz = midiToHz(lMidi);
      leadPhase += lHz / SAMPLE_RATE;
      const leadEnv = Math.min(1, localT * 80) * Math.max(0, 1 - stepProg * 0.55);
      leadSample = square(leadPhase, 0.25) * 0.16 * leadEnv;
    }

    // Drums: kick on even beats, snare on off-beats, hi-hat every eighth
    let drumSample = 0;
    if (step % 4 === 0 && localT < 0.11) {
      const kickHz = 130 * Math.exp(-localT * 28) + 42;
      drumSample += Math.sin(2 * Math.PI * kickHz * localT) * Math.exp(-localT * 20) * 0.35;
    } else if (step % 4 === 2 && localT < 0.09) {
      drumSample += rand() * Math.exp(-localT * 30) * 0.22;
    }
    if (localT < 0.035) {
      drumSample += rand() * Math.exp(-localT * 75) * 0.08;
    }

    out[i] = bassSample + leadSample + drumSample;
  }
  return out;
}

// 2. Gunshot SFX
function synthGunshot(): Float32Array {
  const duration = 0.14;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  const rand = makeNoise();
  let phase = 0;
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const hz = 220 * Math.exp(-t * 28) + 55;
    phase += hz / SAMPLE_RATE;
    const noise = rand() * Math.exp(-t * 32) * 0.65;
    const punch = square(phase, 0.5) * Math.exp(-t * 36) * 0.35;
    out[i] = (noise + punch) * 0.85;
  }
  return out;
}

// 3. Hit Spark SFX
function synthHit(): Float32Array {
  const duration = 0.1;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  const rand = makeNoise();
  let phase = 0;
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    phase += (340 - t * 1800) / SAMPLE_RATE;
    out[i] = (square(phase, 0.3) * 0.4 + rand() * 0.4) * Math.exp(-t * 35);
  }
  return out;
}

// 4. Zombie Death SFX
function synthZombieDeath(): Float32Array {
  const duration = 0.3;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  const rand = makeNoise();
  let phase = 0;
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const hz = 150 * Math.exp(-t * 4.5) + 45;
    phase += hz / SAMPLE_RATE;
    const env = Math.sin(Math.min(1, t / 0.03) * (Math.PI / 2)) * Math.exp(-t * 6.5);
    out[i] = (square(phase, 0.4) * 0.55 + rand() * 0.25) * env;
  }
  return out;
}

// 5. XP Gem Pickup SFX
function synthXPPickup(): Float32Array {
  const duration = 0.12;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  let phase = 0;
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const hz = t < 0.055 ? 880 : 1318.5;
    phase += hz / SAMPLE_RATE;
    out[i] = square(phase, 0.25) * 0.35 * Math.exp(-t * 16);
  }
  return out;
}

// 6. Level Up Fanfare SFX
function synthLevelUp(): Float32Array {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  const noteDur = 0.11;
  const duration = 0.58;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  let phase = 0;
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const idx = Math.min(3, Math.floor(t / noteDur));
    const localT = t - idx * noteDur;
    phase += notes[idx] / SAMPLE_RATE;
    const env = idx === 3 ? Math.exp(-localT * 6) : Math.exp(-localT * 10);
    out[i] = square(phase, 0.25) * 0.38 * env;
  }
  return out;
}

// 7. Player Hurt SFX
function synthHurt(): Float32Array {
  const duration = 0.18;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  const rand = makeNoise();
  let phase = 0;
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    const hz = 190 - t * 650;
    phase += Math.max(60, hz) / SAMPLE_RATE;
    out[i] = (square(phase, 0.5) * 0.55 + rand() * 0.3) * Math.exp(-t * 14);
  }
  return out;
}

// 8. UI Click SFX
function synthUIClick(): Float32Array {
  const duration = 0.06;
  const total = Math.floor(SAMPLE_RATE * duration);
  const out = new Float32Array(total);
  let phase = 0;
  for (let i = 0; i < total; i++) {
    const t = i / SAMPLE_RATE;
    phase += 987.77 / SAMPLE_RATE;
    out[i] = triangle(phase) * 0.45 * Math.exp(-t * 45);
  }
  return out;
}

const tracks = [
  { id: 'bgm_loop', title: 'Survivors 16-Bit Action Theme (Loop)', file: 'bgm_survivors_loop.wav', kind: 'music', loop: true, samples: synthBGM() },
  { id: 'sfx_gunshot', title: 'Gunshot Fire', file: 'sfx_gunshot.wav', kind: 'sfx', loop: false, samples: synthGunshot() },
  { id: 'sfx_hit', title: 'Bullet Hit Spark', file: 'sfx_hit_spark.wav', kind: 'sfx', loop: false, samples: synthHit() },
  { id: 'sfx_zombie_death', title: 'Zombie Defeat', file: 'sfx_zombie_death.wav', kind: 'sfx', loop: false, samples: synthZombieDeath() },
  { id: 'sfx_xp_gem', title: 'XP Gem Pickup', file: 'sfx_xp_gem.wav', kind: 'sfx', loop: false, samples: synthXPPickup() },
  { id: 'sfx_level_up', title: 'Level Up Fanfare', file: 'sfx_level_up.wav', kind: 'sfx', loop: false, samples: synthLevelUp() },
  { id: 'sfx_player_hurt', title: 'Survivor Hurt', file: 'sfx_player_hurt.wav', kind: 'sfx', loop: false, samples: synthHurt() },
  { id: 'sfx_ui_click', title: 'UI Button Click', file: 'sfx_ui_click.wav', kind: 'sfx', loop: false, samples: synthUIClick() },
];

for (const tr of tracks) {
  writeWAV(path.join(OUT_DIR, tr.file), tr.samples);
}

const manifest = {
  group: 5,
  name: '16-Bit Chiptune Music & Retro Sound Effects',
  format: 'PCM WAV (44.1 kHz, 16-bit Mono)',
  assets: tracks.map((tr) => ({
    id: tr.id,
    title: tr.title,
    file: tr.file,
    kind: tr.kind,
    loop: tr.loop,
    sampleRate: SAMPLE_RATE,
    channels: 1,
    bitDepth: 16,
    durationSec: Number((tr.samples.length / SAMPLE_RATE).toFixed(3)),
    frameSize: null,
    frameCount: 1,
  })),
};

fs.writeFileSync(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('Group 5 audio generated!', tracks.map((t) => `${t.file} (${(t.samples.length / SAMPLE_RATE).toFixed(2)}s)`));
