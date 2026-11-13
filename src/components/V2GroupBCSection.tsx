import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, Pause, Play } from 'lucide-react';
import { BgMode } from '../types/sprites';

interface V2AssetEntry {
  id: string;
  title: string;
  file: string;
  frameSize: { w: number; h: number };
  frameCount: number;
  sheetSize: { w: number; h: number };
  footBaselineY?: number;
  paletteCount: number;
  animations: Record<string, [number, number]>;
  fps: number;
  frameOrder: string[];
}

interface V2CategoryManifest {
  group: string;
  category: string;
  name: string;
  assets: V2AssetEntry[];
}

interface V2GroupBCSectionProps {
  zoom: number;
  bgMode: BgMode;
  showGrid: boolean;
  showBaseline: boolean;
}

const CATEGORIES: Array<{ key: 'world' | 'effects' | 'characters' | 'ui'; label: string; groupTag: string }> = [
  { key: 'world', label: 'World (Group B)', groupTag: 'Group B' },
  { key: 'effects', label: 'Effects (Groups B & C)', groupTag: 'Groups B & C' },
  { key: 'characters', label: 'Characters (Group C)', groupTag: 'Group C' },
  { key: 'ui', label: 'UI Pickups (Group C)', groupTag: 'Group C' },
];

export const V2GroupBCSection: React.FC<V2GroupBCSectionProps> = ({
  zoom,
  bgMode,
  showGrid,
  showBaseline,
}) => {
  const [manifests, setManifests] = useState<Partial<Record<'world' | 'effects' | 'characters' | 'ui', V2CategoryManifest>>>({});
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [tick, setTick] = useState<number>(0);
  const [copiedManifest, setCopiedManifest] = useState<boolean>(false);

  useEffect(() => {
    Promise.all(
      CATEGORIES.map(async ({ key }) => {
        const res = await fetch(`/assets/v2/${key}/manifest.json`);
        const json = (await res.json()) as V2CategoryManifest;
        return [key, json] as const;
      })
    )
      .then((entries) => {
        const next: Partial<Record<'world' | 'effects' | 'characters' | 'ui', V2CategoryManifest>> = {};
        for (const [k, v] of entries) next[k] = v;
        setManifests(next);
      })
      .catch(() => {
        // ignore
      });
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setTick((t) => (t + 1) % 840);
    }, 140);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const bgClass =
    bgMode === 'checker-dark'
      ? 'checker-dark'
      : bgMode === 'checker-light'
      ? 'checker-light'
      : 'grass-bg';

  const compactManifestText = useMemo(() => {
    const out: Record<string, Array<{ file: string; frameSize: { w: number; h: number }; frameCount: number; animations: Record<string, [number, number]> }>> = {};
    for (const { key } of CATEGORIES) {
      const m = manifests[key];
      if (!m) continue;
      out[`assets/v2/${key}`] = m.assets.map((a) => ({
        file: a.file,
        frameSize: a.frameSize,
        frameCount: a.frameCount,
        animations: a.animations,
      }));
    }
    return JSON.stringify(out, null, 2);
  }, [manifests]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(compactManifestText);
      setCopiedManifest(true);
      window.setTimeout(() => setCopiedManifest(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <section id="v2-group-bc" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#F8FAFC]">
            assets/v2 — Groups B &amp; C: Props, Effects, Shoot &amp; Pickups
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Transparent 16-bit pixel sheets (1px #0A090D outline, binary alpha, zero soft gradients, zero embedded shadows) organized for direct drop-in to assets/v2/.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#232C3B] hover:bg-[#2D384B] text-[#F1F5F9] rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? 'Pause Previews' : 'Play Previews'}
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#151B24] border border-[#232C3B] hover:border-[#475569] text-[#CBD5E1] rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            {copiedManifest ? <Check className="w-3.5 h-3.5 text-[#4ADE80]" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedManifest ? 'Copied B+C Manifests' : 'Copy B+C Manifests'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {CATEGORIES.map(({ key, label }) => {
          const catManifest = manifests[key];
          if (!catManifest) return null;

          return (
            <div key={key} className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[#CBD5E1] font-mono">
                  assets/v2/{key}/ — {label}
                </h3>
                <a
                  href={`/assets/v2/${key}/manifest.json`}
                  download={`v2_${key}_manifest.json`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-[#232C3B] hover:bg-[#2D384B] text-[#F1F5F9] rounded transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3 h-3" aria-hidden="true" />
                  {key}/manifest.json
                </a>
              </div>

              <div className="space-y-4">
                {catManifest.assets.map((asset) => {
                  const effZoom =
                    asset.sheetSize.w >= 500
                      ? 1
                      : asset.frameSize.w >= 96
                      ? Math.min(zoom, 2)
                      : asset.frameSize.w <= 32
                      ? Math.max(zoom, 2)
                      : zoom;
                  const scaledW = asset.sheetSize.w * effZoom;
                  const scaledH = asset.sheetSize.h * effZoom;
                  const cellW = asset.frameSize.w * effZoom;
                  const src = `/assets/v2/${key}/${asset.file}`;
                  const animEntries = Object.entries(asset.animations);

                  return (
                    <div
                      key={asset.id}
                      className="bg-[#151B24] border border-[#232C3B] rounded-lg p-5 space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <h4 className="text-sm font-semibold text-[#F1F5F9]">{asset.title}</h4>
                          <p className="text-xs text-[#94A3B8] mt-0.5 font-mono">
                            assets/v2/{key}/{asset.file} · {asset.frameSize.w}×{asset.frameSize.h} · {asset.frameCount}f
                            {asset.footBaselineY !== undefined ? ` · y=${asset.footBaselineY}` : ''} · {asset.paletteCount} colors
                          </p>
                        </div>

                        <a
                          href={src}
                          download={asset.file}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0E1218] bg-[#4ADE80] hover:bg-[#22C55E] rounded-md transition-colors whitespace-nowrap shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" aria-hidden="true" />
                          Download PNG
                        </a>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
                        {/* Strip */}
                        <div className="lg:col-span-8 overflow-x-auto pb-1">
                          <div
                            className={`relative inline-block border border-[#2D3748] rounded ${bgClass}`}
                            style={{ width: scaledW, height: scaledH }}
                          >
                            <img
                              src={src}
                              alt={asset.title}
                              width={scaledW}
                              height={scaledH}
                              referrerPolicy="no-referrer"
                              className="block pixelated select-none"
                              style={{ width: scaledW, height: scaledH }}
                            />
                            {showGrid && (
                              <div className="pointer-events-none absolute inset-0 flex">
                                {Array.from({ length: asset.frameCount }, (_, i) => (
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
                            {showBaseline && asset.footBaselineY !== undefined && (
                              <div
                                className="pointer-events-none absolute left-0 right-0 border-t border-[#F59E0B]"
                                style={{ top: asset.footBaselineY * effZoom }}
                                aria-hidden="true"
                              />
                            )}
                          </div>
                        </div>

                        {/* Animated Previews */}
                        <div className="lg:col-span-4 bg-[#0E1218] border border-[#232C3B] rounded-md p-3.5 space-y-2.5">
                          <div className="flex flex-wrap gap-3">
                            {animEntries.map(([clipName, [start, end]]) => {
                              const len = end - start + 1;
                              const frameIdx = start + (tick % len);
                              const box = asset.frameSize.w <= 32 ? 48 : 48;
                              const aspectH = Math.round((asset.frameSize.h / asset.frameSize.w) * box);

                              return (
                                <div key={clipName} className="flex items-center gap-2">
                                  <div className="w-[64px] h-[64px] grass-bg border border-[#2D3748] rounded flex items-center justify-center shrink-0">
                                    <div
                                      className="pixelated"
                                      style={{
                                        width: box,
                                        height: aspectH,
                                        backgroundImage: `url(${src})`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundSize: `${asset.frameCount * box}px ${aspectH}px`,
                                        backgroundPosition: `-${frameIdx * box}px 0px`,
                                      }}
                                    />
                                  </div>
                                  {animEntries.length === 1 && (
                                    <div className="text-[11px] font-mono text-[#94A3B8]">
                                      <div className="text-[#4ADE80]">
                                        {clipName}: [{start}, {end}] (f{frameIdx})
                                      </div>
                                      {asset.frameOrder.slice(0, 4).map((desc) => (
                                        <div key={desc} className="truncate max-w-[160px]">
                                          {desc}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {animEntries.length > 1 && (
                                    <div className="text-[11px] font-mono text-[#4ADE80]">
                                      {clipName} [{start},{end}]
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Compact B+C Manifest Viewer */}
        <div className="bg-[#151B24] border border-[#232C3B] rounded-lg p-5 space-y-2.5">
          <div className="text-xs font-medium text-[#CBD5E1]">
            Groups B &amp; C Explicit Manifests (world / effects / characters / ui)
          </div>
          <pre className="p-3.5 bg-[#0E1218] border border-[#232C3B] rounded text-xs font-mono text-[#CBD5E1] overflow-x-auto max-h-64">
            {compactManifestText}
          </pre>
        </div>
      </div>
    </section>
  );
};
