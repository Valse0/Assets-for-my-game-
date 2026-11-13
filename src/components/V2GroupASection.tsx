import React, { useEffect, useState } from 'react';
import { Check, Copy, Download, Pause, Play } from 'lucide-react';
import { BgMode } from '../types/sprites';

interface GroupAAsset {
  id: string;
  title: string;
  file: string;
  frameSize: { w: number; h: number };
  frameCount: number;
  sheetSize: { w: number; h: number };
  footBaselineY: number;
  paletteCount: number;
  animations: { attack: [number, number] };
  fps: number;
  frameOrder: string[];
}

interface GroupAManifest {
  group: string;
  name: string;
  style: string;
  assets: GroupAAsset[];
}

interface V2GroupASectionProps {
  zoom: number;
  bgMode: BgMode;
  showGrid: boolean;
  showBaseline: boolean;
}

export const V2GroupASection: React.FC<V2GroupASectionProps> = ({
  zoom,
  bgMode,
  showGrid,
  showBaseline,
}) => {
  const [manifest, setManifest] = useState<GroupAManifest | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [tick, setTick] = useState<number>(0);
  const [copiedManifest, setCopiedManifest] = useState<boolean>(false);

  useEffect(() => {
    fetch('/assets/v2/zombies/manifest.json')
      .then((r) => r.json())
      .then((data: GroupAManifest) =>
        setManifest({
          ...data,
          assets: data.assets.filter((a) => a.id !== 'boss_exact_animated'),
        })
      )
      .catch(() => {
        // ignore
      });
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setTick((t) => (t + 1) % 4);
    }, 150);
    return () => window.clearInterval(timer);
  }, [isPlaying]);

  const bgClass =
    bgMode === 'checker-dark'
      ? 'checker-dark'
      : bgMode === 'checker-light'
      ? 'checker-light'
      : 'grass-bg';

  const manifestText = manifest
    ? JSON.stringify(
        manifest.assets.map((a) => ({
          file: a.file,
          frameSize: a.frameSize,
          frameCount: a.frameCount,
          animations: a.animations,
        })),
        null,
        2
      )
    : '';

  const handleCopyManifest = async () => {
    if (!manifestText) return;
    try {
      await navigator.clipboard.writeText(manifestText);
      setCopiedManifest(true);
      window.setTimeout(() => setCopiedManifest(false), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <section id="v2-group-a" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#F8FAFC]">
            assets/v2 — Group A: Zombie Attack Sprite Sheets
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            4-frame right-facing attack sheets (no baked shadow, 1px #0A090D outline, 8–10 flat colors, binary alpha) with 48×48 px mobile gameplay previews.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#232C3B] hover:bg-[#2D384B] text-[#F1F5F9] rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {isPlaying ? 'Pause 48px Preview' : 'Play 48px Preview'}
          </button>

          <button
            type="button"
            onClick={handleCopyManifest}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#151B24] border border-[#232C3B] hover:border-[#475569] text-[#CBD5E1] rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            {copiedManifest ? (
              <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copiedManifest ? 'Copied Manifest' : 'Copy Manifest'}
          </button>

          <a
            href="/assets/v2/zombies/manifest.json"
            download="v2_groupA_manifest.json"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#232C3B] hover:bg-[#2D384B] text-[#F1F5F9] rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            manifest.json
          </a>
        </div>
      </div>

      {!manifest ? (
        <div className="bg-[#151B24] border border-[#232C3B] rounded-lg p-5 text-xs text-[#94A3B8]">
          Loading assets/v2 Group A manifest...
        </div>
      ) : (
        <div className="space-y-4">
          {manifest.assets.map((asset) => {
            const effZoom = asset.frameSize.w >= 128 ? 1 : asset.frameSize.w >= 96 ? Math.min(zoom, 2) : zoom;
            const scaledW = asset.sheetSize.w * effZoom;
            const scaledH = asset.sheetSize.h * effZoom;
            const cellW = asset.frameSize.w * effZoom;
            const src = `/assets/v2/zombies/${asset.file}`;

            return (
              <div
                key={asset.id}
                className="bg-[#151B24] border border-[#232C3B] rounded-lg p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[#F1F5F9]">{asset.title}</h3>
                    <p className="text-xs text-[#94A3B8] mt-0.5 font-mono">
                      assets/v2/zombies/{asset.file} · {asset.frameSize.w}×{asset.frameSize.h} · {asset.frameCount}f · y={asset.footBaselineY} · {asset.paletteCount} colors
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
                  {/* Horizontal Strip */}
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
                      {showBaseline && (
                        <div
                          className="pointer-events-none absolute left-0 right-0 border-t border-[#F59E0B]"
                          style={{ top: asset.footBaselineY * effZoom }}
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </div>

                  {/* 48 px Downscaled Preview (Animated + Frame Order) */}
                  <div className="lg:col-span-4 bg-[#0E1218] border border-[#232C3B] rounded-md p-3.5 flex items-center gap-4">
                    <div className="shrink-0">
                      <div className="text-[10px] font-mono text-[#64748B] mb-1">48×48 Preview</div>
                      <div className="w-[72px] h-[72px] grass-bg border border-[#2D3748] rounded flex items-center justify-center">
                        <div
                          className="w-[48px] h-[48px] pixelated"
                          style={{
                            backgroundImage: `url(${src})`,
                            backgroundRepeat: 'no-repeat',
                            backgroundSize: `${asset.frameCount * 48}px 48px`,
                            backgroundPosition: `-${tick * 48}px 0px`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="min-w-0 text-[11px] font-mono text-[#94A3B8] space-y-0.5">
                      <div className="text-[#4ADE80]">
                        attack: [{asset.animations.attack[0]}, {asset.animations.attack[1]}] (f{tick})
                      </div>
                      {asset.frameOrder.map((desc) => (
                        <div key={desc} className="truncate">
                          {desc}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Copy-Ready Compact Manifest Block */}
          <div className="bg-[#151B24] border border-[#232C3B] rounded-lg p-5 space-y-2.5">
            <div className="text-xs font-medium text-[#CBD5E1]">
              Group A Compact Manifest (assets/v2/zombies/manifest.json)
            </div>
            <pre className="p-3.5 bg-[#0E1218] border border-[#232C3B] rounded text-xs font-mono text-[#CBD5E1] overflow-x-auto max-h-64">
              {manifestText}
            </pre>
          </div>
        </div>
      )}
    </section>
  );
};
