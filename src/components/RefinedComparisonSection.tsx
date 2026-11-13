import React, { useEffect, useRef, useState } from 'react';
import { Download, Play, RotateCcw, Zap } from 'lucide-react';
import { BgMode, SheetSpec } from '../types/sprites';

interface RefinedManifestAsset {
  id: 'survivor_refined' | 'walker_refined';
  title: string;
  file: string;
  frameSize: { w: number; h: number };
  frameCount: number;
  sheetSize: { w: number; h: number };
  footBaselineY: number;
  colorCountIncludingOutline: number;
  animations: Record<string, { startFrame: number; count: number; fps: number; loop: boolean; transientFlash?: boolean }>;
}

interface RefinedManifest {
  pack: string;
  name: string;
  style: string;
  assets: RefinedManifestAsset[];
}

interface RefinedComparisonSectionProps {
  originalSheets: SheetSpec[];
  zoom: number;
  bgMode: BgMode;
  showGrid: boolean;
  showBaseline: boolean;
}

type CharacterKey = 'survivor' | 'walker';
type ClipKey = 'walk' | 'hurt' | 'death';

export const RefinedComparisonSection: React.FC<RefinedComparisonSectionProps> = ({
  originalSheets,
  zoom,
  bgMode,
  showGrid,
  showBaseline,
}) => {
  const [manifest, setManifest] = useState<RefinedManifest | null>(null);
  const [activeChar, setActiveChar] = useState<CharacterKey>('survivor');
  const [activeClip, setActiveClip] = useState<ClipKey>('walk');
  const [frameOffset, setFrameOffset] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [hurtFlashActive, setHurtFlashActive] = useState<boolean>(false);
  const flashTimerRef = useRef<number | null>(null);

  useEffect(() => {
    fetch('/assets/packs/refined/manifest.json')
      .then((r) => r.json())
      .then((data: RefinedManifest) => setManifest(data))
      .catch(() => {
        // ignore if unavailable
      });
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current !== null) {
        window.clearTimeout(flashTimerRef.current);
      }
    };
  }, []);

  // Ensure walker doesn't remain on 'hurt' clip
  useEffect(() => {
    if (activeChar === 'walker' && activeClip === 'hurt') {
      setActiveClip('walk');
      setFrameOffset(0);
    }
    setHurtFlashActive(false);
  }, [activeChar, activeClip]);

  const origSheet =
    activeChar === 'survivor'
      ? originalSheets.find((s) => s.id === 'survivor')
      : originalSheets.find((s) => s.id === 'walkerZombie');

  const refAsset = manifest?.assets.find((a) =>
    activeChar === 'survivor' ? a.id === 'survivor_refined' : a.id === 'walker_refined'
  );

  const clipMeta = refAsset?.animations[activeClip] ?? {
    startFrame: 0,
    count: 4,
    fps: activeChar === 'survivor' ? 10 : 7,
    loop: true,
  };

  // Animation loop
  useEffect(() => {
    if (!isPlaying || hurtFlashActive) return;
    if (clipMeta.count <= 1) {
      setFrameOffset(0);
      return;
    }
    const intervalMs = Math.max(50, Math.round(1000 / clipMeta.fps));
    const timer = window.setInterval(() => {
      setFrameOffset((prev) => {
        const next = prev + 1;
        if (next >= clipMeta.count) {
          return clipMeta.loop ? 0 : clipMeta.count - 1;
        }
        return next;
      });
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [isPlaying, hurtFlashActive, clipMeta.startFrame, clipMeta.count, clipMeta.fps, clipMeta.loop]);

  const triggerTransientHurtFlash = () => {
    if (activeChar !== 'survivor') return;
    if (flashTimerRef.current !== null) {
      window.clearTimeout(flashTimerRef.current);
    }
    setActiveClip('walk');
    setHurtFlashActive(true);
    flashTimerRef.current = window.setTimeout(() => {
      setHurtFlashActive(false);
      flashTimerRef.current = null;
    }, 150);
  };

  const displayFrameIndex = hurtFlashActive
    ? 4
    : clipMeta.startFrame + (frameOffset % Math.max(1, clipMeta.count));

  const bgClass =
    bgMode === 'checker-dark'
      ? 'checker-dark'
      : bgMode === 'checker-light'
      ? 'checker-light'
      : 'grass-bg';

  const origSrc =
    activeChar === 'survivor'
      ? '/sprites/survivor_spritesheet.png'
      : '/sprites/walker_zombie_spritesheet.png';
  const refSrc = refAsset
    ? `/assets/packs/refined/${refAsset.file}`
    : activeChar === 'survivor'
    ? '/assets/packs/refined/survivor_refined_spritesheet.png'
    : '/assets/packs/refined/walker_refined_spritesheet.png';

  const sheetWidth = origSheet?.width ?? (activeChar === 'survivor' ? 576 : 512);
  const frameCount = origSheet?.frameCount ?? (activeChar === 'survivor' ? 9 : 8);

  return (
    <section id="refined" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#F8FAFC]">
            Phase 1 Refinement Comparison (Survivor &amp; Walker Zombie)
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Simplified 16-bit silhouettes (8–10 flat colors + 1px #0A090D outline, top-left light, baked ground ellipse) compared directly against intact originals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-[#151B24] border border-[#232C3B] rounded-md">
            {(
              [
                ['survivor', 'Survivor (9f)'],
                ['walker', 'Walker Zombie (8f)'],
              ] as [CharacterKey, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setActiveChar(key);
                  setFrameOffset(0);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  activeChar === key
                    ? 'bg-[#4ADE80] text-[#0E1218] font-semibold'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <a
            href="/assets/packs/refined/manifest.json"
            download="refined_phase1_manifest.json"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#232C3B] hover:bg-[#2D384B] text-[#F1F5F9] rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            manifest.json
          </a>
        </div>
      </div>

      {/* Dual-Scale Animated Comparison + Transient Hurt Flash Tester */}
      <div className="bg-[#151B24] border border-[#232C3B] rounded-lg p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-[#F1F5F9]">
              64×64 Detail vs. 48×48 Mobile Gameplay Scale (Grass Contrast Test)
            </h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Inspect motion fluidity, volume retention, and silhouette clarity at both zoomed 3× (192px) and exact 48×48 in-game size.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(['walk', ...(activeChar === 'survivor' ? ['hurt'] : []), 'death'] as ClipKey[]).map(
              (clip) => (
                <button
                  key={clip}
                  type="button"
                  onClick={() => {
                    setHurtFlashActive(false);
                    setActiveClip(clip);
                    setFrameOffset(0);
                    setIsPlaying(true);
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors capitalize whitespace-nowrap shrink-0 ${
                    activeClip === clip && !hurtFlashActive
                      ? 'bg-[#4ADE80] text-[#0E1218] border-[#4ADE80] font-semibold'
                      : 'bg-[#0E1218] text-[#CBD5E1] border-[#232C3B] hover:border-[#475569]'
                  }`}
                >
                  {clip}
                </button>
              )
            )}

            <button
              type="button"
              onClick={() => {
                setFrameOffset(0);
                setIsPlaying((p) => !p);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#232C3B] hover:bg-[#2D384B] text-[#F1F5F9] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              {isPlaying ? <RotateCcw className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>

            {activeChar === 'survivor' && (
              <button
                type="button"
                onClick={triggerTransientHurtFlash}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                  hurtFlashActive
                    ? 'bg-[#EF4444] text-white border-[#EF4444]'
                    : 'bg-[#0E1218] text-[#F87171] border-[#EF4444]/50 hover:border-[#EF4444]'
                }`}
              >
                <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                Test Transient Hurt Flash (150ms)
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Original Box */}
          <div className="bg-[#0E1218] border border-[#232C3B] rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#CBD5E1]">Original (Untouched)</span>
              <span className="font-mono text-[#94A3B8] tabular-nums">
                Frame #{String(displayFrameIndex).padStart(2, '0')}
              </span>
            </div>
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <div className="text-[11px] font-mono text-[#64748B] mb-1.5">3× Detail (192×192)</div>
                <div className="w-[192px] h-[192px] grass-bg border border-[#2D3748] rounded overflow-hidden relative">
                  <div
                    className="w-[192px] h-[192px] pixelated"
                    style={{
                      backgroundImage: `url(${origSrc})`,
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: `${sheetWidth * 3}px 192px`,
                      backgroundPosition: `-${displayFrameIndex * 64 * 3}px 0px`,
                    }}
                  />
                  {showBaseline && (
                    <div
                      className="pointer-events-none absolute left-0 right-0 border-t border-[#F59E0B]/80"
                      style={{ top: 58 * 3 }}
                    />
                  )}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-mono text-[#64748B] mb-1.5">48×48 Game Scale</div>
                <div className="w-[96px] h-[96px] grass-bg border border-[#2D3748] rounded flex items-center justify-center">
                  <div
                    className="w-[48px] h-[48px] pixelated"
                    style={{
                      backgroundImage: `url(${origSrc})`,
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: `${frameCount * 48}px 48px`,
                      backgroundPosition: `-${displayFrameIndex * 48}px 0px`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Refined Box */}
          <div className="bg-[#0E1218] border border-[#4ADE80]/40 rounded-md p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#4ADE80]">Refined Phase 1</span>
              <span className="font-mono text-[#94A3B8] tabular-nums">
                {refAsset ? `${refAsset.colorCountIncludingOutline} colors incl. outline` : '≤11 colors'}{' '}
                · {hurtFlashActive ? 'HIT FLASH → RECOVERING' : `Frame #${String(displayFrameIndex).padStart(2, '0')}`}
              </span>
            </div>
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <div className="text-[11px] font-mono text-[#64748B] mb-1.5">3× Detail (192×192)</div>
                <div className="w-[192px] h-[192px] grass-bg border border-[#2D3748] rounded overflow-hidden relative">
                  <div
                    className="w-[192px] h-[192px] pixelated"
                    style={{
                      backgroundImage: `url(${refSrc})`,
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: `${sheetWidth * 3}px 192px`,
                      backgroundPosition: `-${displayFrameIndex * 64 * 3}px 0px`,
                    }}
                  />
                  {showBaseline && (
                    <div
                      className="pointer-events-none absolute left-0 right-0 border-t border-[#F59E0B]/80"
                      style={{ top: 58 * 3 }}
                    />
                  )}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-mono text-[#64748B] mb-1.5">48×48 Game Scale</div>
                <div className="w-[96px] h-[96px] grass-bg border border-[#2D3748] rounded flex items-center justify-center">
                  <div
                    className="w-[48px] h-[48px] pixelated"
                    style={{
                      backgroundImage: `url(${refSrc})`,
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: `${frameCount * 48}px 48px`,
                      backgroundPosition: `-${displayFrameIndex * 48}px 0px`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Horizontal Strip Comparison */}
      <div className="bg-[#151B24] border border-[#232C3B] rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-[#F1F5F9]">
              Full Horizontal Strip Comparison — {activeChar === 'survivor' ? 'Survivor (576×64)' : 'Walker Zombie (512×64)'}
            </h3>
            <p className="text-xs text-[#94A3B8] mt-0.5">
              Same 64×64 grid, same pose count, same y=58 foot baseline. Original top, Refined bottom.
            </p>
          </div>

          <a
            href={refSrc}
            download={refAsset?.file ?? `${activeChar}_refined_spritesheet.png`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0E1218] bg-[#4ADE80] hover:bg-[#22C55E] rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Download Refined PNG
          </a>
        </div>

        <div className="overflow-x-auto space-y-3 pb-1">
          {[
            { label: 'Original', src: origSrc },
            { label: 'Refined', src: refSrc },
          ].map((row) => {
            const scaledW = sheetWidth * zoom;
            const scaledH = 64 * zoom;
            const cellW = 64 * zoom;
            return (
              <div key={row.label} className="space-y-1">
                <div className="text-[11px] font-mono text-[#94A3B8]">{row.label}</div>
                <div
                  className={`relative inline-block border border-[#2D3748] rounded ${bgClass}`}
                  style={{ width: scaledW, height: scaledH }}
                >
                  <img
                    src={row.src}
                    alt={`${row.label} ${activeChar} spritesheet`}
                    width={scaledW}
                    height={scaledH}
                    referrerPolicy="no-referrer"
                    className="block pixelated select-none"
                    style={{ width: scaledW, height: scaledH }}
                  />
                  {showGrid && (
                    <div className="pointer-events-none absolute inset-0 flex">
                      {Array.from({ length: frameCount }, (_, i) => (
                        <div
                          key={i}
                          className="h-full border-r border-white/20 last:border-r-0 relative"
                          style={{ width: cellW }}
                        >
                          <span className="absolute top-1 left-1 text-[10px] font-mono leading-none text-white/80 drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
                            {String(i).padStart(2, '0')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  {showBaseline && (
                    <div
                      className="pointer-events-none absolute left-0 right-0 border-t border-[#F59E0B]"
                      style={{ top: 58 * zoom }}
                      aria-hidden="true"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
