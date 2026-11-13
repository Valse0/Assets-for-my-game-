import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
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

interface BossExactSectionProps {
  zoom: number;
  bgMode: BgMode;
  showGrid: boolean;
  showBaseline: boolean;
}

export const BossExactSection: React.FC<BossExactSectionProps> = ({
  zoom,
  bgMode,
  showGrid,
  showBaseline,
}) => {
  const [manifest, setManifest] = useState<BossExactManifest | null>(null);

  useEffect(() => {
    fetch('/assets/packs/boss_exact/manifest.json')
      .then((r) => r.json())
      .then((data: BossExactManifest) => setManifest(data))
      .catch(() => {
        // ignore
      });
  }, []);

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

  return (
    <section id="boss-exact" className="bg-[#151B24] border border-[#232C3B] rounded-lg p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#F8FAFC]">
            Boss Mutant Brute — 96×96 Exact Reference Sprite
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Transparent 96×96 RGBA pixel art preserving exact reference proportions, 1px #0A090D outline, sharp pixels, and full color detail (no soft shadows).
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
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-[#0E1218] bg-[#4ADE80] hover:bg-[#22C55E] rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Download 96×96 PNG
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 flex flex-wrap items-end gap-6">
          {/* Zoomed Inspection Canvas */}
          <div>
            <div className="text-[11px] font-mono text-[#94A3B8] mb-1.5">
              {inspectZoom}× Zoom ({scaledSize}×{scaledSize} px)
            </div>
            <div
              className={`relative border border-[#2D3748] rounded overflow-hidden ${bgClass}`}
              style={{ width: scaledSize, height: scaledSize }}
            >
              <img
                src="/assets/packs/boss_exact/boss_mutant_brute_96x96.png"
                alt="Boss Mutant Brute 96x96 transparent pixel art"
                width={scaledSize}
                height={scaledSize}
                referrerPolicy="no-referrer"
                className="block pixelated select-none"
                style={{ width: scaledSize, height: scaledSize }}
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

          {/* Native 1:1 96x96 Canvas */}
          <div>
            <div className="text-[11px] font-mono text-[#94A3B8] mb-1.5">Native 1× (96×96 px)</div>
            <div
              className={`relative border border-[#2D3748] rounded overflow-hidden ${bgClass}`}
              style={{ width: 96, height: 96 }}
            >
              <img
                src="/assets/packs/boss_exact/boss_mutant_brute_96x96.png"
                alt="Boss Mutant Brute native 96x96 pixel art"
                width={96}
                height={96}
                referrerPolicy="no-referrer"
                className="block pixelated select-none"
                style={{ width: 96, height: 96 }}
              />
            </div>
          </div>
        </div>

        {/* Metrics & Exact Color Palette */}
        <div className="lg:col-span-5 space-y-4">
          <div className="grid grid-cols-2 gap-4 bg-[#0E1218] border border-[#232C3B] rounded-md p-4 text-xs">
            <div>
              <div className="text-[#64748B]">Canvas Size</div>
              <div className="font-mono text-[#F1F5F9] mt-0.5">96×96 px (RGBA)</div>
            </div>
            <div>
              <div className="text-[#64748B]">Sprite Bounds</div>
              <div className="font-mono text-[#F1F5F9] mt-0.5 tabular-nums">
                {asset?.frames[0]?.bounds.width ?? 76}×{asset?.frames[0]?.bounds.height ?? 62} px
              </div>
            </div>
            <div>
              <div className="text-[#64748B]">Palette Colors</div>
              <div className="font-mono text-[#4ADE80] mt-0.5 tabular-nums">
                {asset?.paletteCount ?? 19} crisp colors
              </div>
            </div>
            <div>
              <div className="text-[#64748B]">Anti-Aliasing / Soft Shadow</div>
              <div className="font-mono text-[#F1F5F9] mt-0.5">None (Binary Alpha)</div>
            </div>
          </div>

          {asset?.palette && (
            <div className="bg-[#0E1218] border border-[#232C3B] rounded-md p-4 space-y-2">
              <div className="text-xs font-medium text-[#CBD5E1]">Extracted Exact Palette</div>
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
    </section>
  );
};
