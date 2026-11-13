import React, { useEffect, useState } from 'react';
import { Download, Pause, Play } from 'lucide-react';
import { BgMode } from '../types/sprites';

interface BossExactManifest {
  pack: string;
  name: string;
  style: string;
  assets: Array<{
    id: string;
    title: string;
    file: string;
    frameSize: { w: number; h: number };
    frameCount: number;
    sheetSize: { w: number; h: number };
    footBaselineY: number;
    paletteCount: number;
    palette: string[];
    frames: Array<{
      index: number;
      name: string;
      bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number };
    }>;
  }>;
}

interface BossAnimatedEntry {
  id: string;
  file: string;
  frameSize: { w: number; h: number };
  frameCount: number;
  sheetSize: { w: number; h: number };
  footBaselineY: number;
  paletteCount: number;
  animations: { idle_walk: [number, number]; attack: [number, number] };
  fps: number;
  frameOrder: string[];
}

interface BossExactSectionProps {
  zoom: number;
  bgMode: BgMode;
  showGrid: boolean;
  showBaseline: boolean;
}

type BossClipMode = 'idle_walk' | 'attack' | 'all' | 'static';

export const BossExactSection: React.FC<BossExactSectionProps> = ({
  zoom,
  bgMode,
  showGrid,
  showBaseline,
}) => {
  const [manifest, setManifest] = useState<BossExactManifest | null>(null);
  const [animEntry, setAnimEntry] = useState<BossAnimatedEntry | null>(null);
  const [clipMode, setClipMode] = useState<BossClipMode>('idle_walk');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [fps, setFps] = useState<number>(7);
  const [tick, setTick] = useState<number>(0);

  useEffect(() => {
    fetch('/assets/packs/boss_exact/manifest.json')
      .then((r) => r.json())
      .then((data: BossExactManifest) => setManifest(data))
      .catch(() => {
        // ignore
      });

    fetch('/assets/v2/zombies/manifest.json')
      .then((r) => r.json())
      .then((data: { assets: BossAnimatedEntry[] }) => {
        const found = data.assets.find((a) => a.id === 'boss_exact_animated');
        if (found) setAnimEntry(found);
      })
      .catch(() => {
        // ignore
      });
  }, []);

  const range: [number, number] =
    clipMode === 'static'
      ? [0, 0]
      : clipMode === 'idle_walk'
      ? animEntry?.animations.idle_walk ?? [0, 3]
      : clipMode === 'attack'
      ? animEntry?.animations.attack ?? [4, 7]
      : [0, 7];

  const clipLength = range[1] - range[0] + 1;
  const activeFrame = range[0] + (tick % clipLength);

  useEffect(() => {
    if (!isPlaying || clipMode === 'static') return;
    const ms = Math.max(60, Math.round(1000 / fps));
    const id = window.setInterval(() => {
      setTick((t) => (t + 1) % clipLength);
    }, ms);
    return () => window.clearInterval(id);
  }, [isPlaying, clipMode, fps, clipLength]);

  const asset = manifest?.assets[0];
  const bgClass =
    bgMode === 'checker-dark'
      ? 'checker-dark'
      : bgMode === 'checker-light'
      ? 'checker-light'
      : 'grass-bg';

  const inspectZoom = Math.min(Math.max(zoom, 2), 4);
  const scaledSize = 96 * inspectZoom;
  const baselineY = asset?.footBaselineY ?? 78;
  const animSrc = '/assets/v2/zombies/boss_exact_animated_spritesheet.png';
  const stripZoom = Math.min(zoom, 2);

  return (
    <section id="boss-exact" className="bg-[#151B24] border border-[#232C3B] rounded-lg p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#F8FAFC]">
            Boss Mutant Brute — 96×96 Exact Reference Sprite (Static + Animated)
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Preserves exact 96×96 proportions, 1px #0A090D outline, and all 19 reference colors with 8 articulated frames (idle_walk [0,3] + attack [4,7], binary alpha, zero soft shadows).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/assets/packs/boss_exact/manifest.json"
            download="boss_mutant_brute_manifest.json"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#232C3B] hover:bg-[#2D384B] text-[#F1F5F9] rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            manifest.json
          </a>
          <a
            href="/assets/packs/boss_exact/boss_mutant_brute_96x96.png"
            download="boss_mutant_brute_96x96.png"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#232C3B] hover:bg-[#2D384B] text-[#F1F5F9] rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Static 96×96 PNG
          </a>
          <a
            href={animSrc}
            download="boss_exact_animated_spritesheet.png"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#0E1218] bg-[#4ADE80] hover:bg-[#22C55E] rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Download Animated Strip (768×96)
          </a>
        </div>
      </div>

      {/* Animation Clip Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0E1218] border border-[#232C3B] rounded-md px-3.5 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ['idle_walk', 'Idle / Walk [0–3]'],
              ['attack', 'Attack Slam [4–7]'],
              ['all', 'Full Loop [0–7]'],
              ['static', 'Static Ref [f0]'],
            ] as [BossClipMode, string][]
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setClipMode(mode);
                setTick(0);
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                clipMode === mode
                  ? 'bg-[#4ADE80] text-[#0E1218] font-semibold'
                  : 'bg-[#151B24] text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            disabled={clipMode === 'static'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-[#232C3B] hover:bg-[#2D384B] disabled:opacity-40 text-[#F1F5F9] rounded transition-colors whitespace-nowrap shrink-0"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? 'Pause' : 'Play'}
          </button>

          <label className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <span className="font-mono tabular-nums">{fps} FPS</span>
            <input
              type="range"
              min={4}
              max={12}
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
              className="w-20 accent-[#4ADE80]"
            />
          </label>

          <span className="text-xs font-mono text-[#4ADE80] tabular-nums">
            f{activeFrame}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 flex flex-wrap items-end gap-5">
          {/* Zoomed Animated Canvas */}
          <div>
            <div className="text-[11px] font-mono text-[#94A3B8] mb-1.5">
              {inspectZoom}× Animated ({scaledSize}×{scaledSize} px)
            </div>
            <div
              className={`relative border border-[#2D3748] rounded overflow-hidden ${bgClass}`}
              style={{ width: scaledSize, height: scaledSize }}
            >
              <div
                className="w-full h-full pixelated select-none"
                style={{
                  backgroundImage: `url(${animSrc})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: `${8 * scaledSize}px ${scaledSize}px`,
                  backgroundPosition: `-${activeFrame * scaledSize}px 0px`,
                }}
                role="img"
                aria-label={`Boss Mutant Brute animated frame ${activeFrame}`}
              />
              {showGrid && (
                <div
                  className="pointer-events-none absolute inset-0 border border-white/15"
                  aria-hidden="true"
                />
              )}
              {showBaseline && (
                <div
                  className="pointer-events-none absolute left-0 right-0 border-t border-[#F59E0B]"
                  style={{ top: baselineY * inspectZoom }}
                  aria-hidden="true"
                />
              )}
            </div>
          </div>

          {/* Native 1:1 96x96 Animated */}
          <div>
            <div className="text-[11px] font-mono text-[#94A3B8] mb-1.5">Native 1× (96×96 px)</div>
            <div
              className={`relative border border-[#2D3748] rounded overflow-hidden ${bgClass}`}
              style={{ width: 96, height: 96 }}
            >
              <div
                className="w-[96px] h-[96px] pixelated select-none"
                style={{
                  backgroundImage: `url(${animSrc})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: '768px 96px',
                  backgroundPosition: `-${activeFrame * 96}px 0px`,
                }}
              />
            </div>
          </div>

          {/* 48x48 Gameplay Scale Preview */}
          <div>
            <div className="text-[11px] font-mono text-[#94A3B8] mb-1.5">48×48 Game Scale</div>
            <div className="w-[72px] h-[72px] grass-bg border border-[#2D3748] rounded flex items-center justify-center">
              <div
                className="w-[48px] h-[48px] pixelated select-none"
                style={{
                  backgroundImage: `url(${animSrc})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: `${8 * 48}px 48px`,
                  backgroundPosition: `-${activeFrame * 48}px 0px`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Metrics & Exact Color Palette */}
        <div className="lg:col-span-5 space-y-4">
          <div className="grid grid-cols-2 gap-4 bg-[#0E1218] border border-[#232C3B] rounded-md p-4 text-xs">
            <div>
              <div className="text-[#64748B]">Animated Strip</div>
              <div className="font-mono text-[#F1F5F9] mt-0.5">768×96 px (8f × 96×96)</div>
            </div>
            <div>
              <div className="text-[#64748B]">Animations</div>
              <div className="font-mono text-[#F1F5F9] mt-0.5">idle_walk [0,3] · attack [4,7]</div>
            </div>
            <div>
              <div className="text-[#64748B]">Palette Colors</div>
              <div className="font-mono text-[#4ADE80] mt-0.5 tabular-nums">
                {animEntry?.paletteCount ?? asset?.paletteCount ?? 19} exact colors
              </div>
            </div>
            <div>
              <div className="text-[#64748B]">Facing / Alpha</div>
              <div className="font-mono text-[#F1F5F9] mt-0.5">Left (ref match) · Binary</div>
            </div>
          </div>

          {asset?.palette && (
            <div className="bg-[#0E1218] border border-[#232C3B] rounded-md p-4 space-y-2">
              <div className="text-xs font-medium text-[#CBD5E1]">Extracted Exact Palette (Zero Loss)</div>
              <div className="flex flex-wrap gap-1.5">
                {asset.palette.map((hex) => (
                  <div
                    key={hex}
                    className="flex items-center gap-1.5 px-1.5 py-0.5 bg-[#151B24] border border-[#232C3B] rounded text-[11px] font-mono text-[#94A3B8]"
                  >
                    <span
                      className="w-3 h-3 rounded-xs border border-white/20 shrink-0"
                      style={{ backgroundColor: hex }}
                    />
                    <span>{hex.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full 8-frame strip with click-to-inspect */}
      <div className="space-y-1.5">
        <div className="text-xs font-mono text-[#94A3B8]">
          assets/v2/zombies/boss_exact_animated_spritesheet.png (click any frame to inspect)
        </div>
        <div className="overflow-x-auto pb-1">
          <div
            className={`relative inline-block border border-[#2D3748] rounded ${bgClass}`}
            style={{ width: 768 * stripZoom, height: 96 * stripZoom }}
          >
            <img
              src={animSrc}
              alt="Boss Mutant Brute 8-frame animated horizontal strip"
              width={768 * stripZoom}
              height={96 * stripZoom}
              referrerPolicy="no-referrer"
              className="block pixelated select-none"
              style={{ width: 768 * stripZoom, height: 96 * stripZoom }}
            />
            <div className="absolute inset-0 flex">
              {Array.from({ length: 8 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    setClipMode('all');
                    setTick(i);
                  }}
                  className={`h-full border-r border-white/20 last:border-r-0 relative text-left transition-colors ${
                    activeFrame === i ? 'ring-2 ring-inset ring-[#4ADE80]' : 'hover:bg-white/5'
                  }`}
                  style={{ width: 96 * stripZoom }}
                  aria-label={`Select Boss frame ${i}`}
                >
                  <span className="absolute top-1 left-1 text-[10px] font-mono leading-none text-white/85 drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
                    {String(i).padStart(2, '0')}
                  </span>
                </button>
              ))}
            </div>
            {showBaseline && (
              <div
                className="pointer-events-none absolute left-0 right-0 border-t border-[#F59E0B]"
                style={{ top: baselineY * stripZoom }}
                aria-hidden="true"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
