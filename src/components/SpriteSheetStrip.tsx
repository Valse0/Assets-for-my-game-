import React from 'react';
import { Download } from 'lucide-react';
import { BgMode, SheetSpec } from '../types/sprites';

interface SpriteSheetStripProps {
  sheet: SheetSpec;
  zoom: number;
  bgMode: BgMode;
  showGrid: boolean;
  showBaseline: boolean;
  selectedFrameIndex: number | null;
  onSelectFrame: (sheetId: SheetSpec['id'], frameIndex: number) => void;
}

export const SpriteSheetStrip: React.FC<SpriteSheetStripProps> = ({
  sheet,
  zoom,
  bgMode,
  showGrid,
  showBaseline,
  selectedFrameIndex,
  onSelectFrame,
}) => {
  const scaledWidth = sheet.width * zoom;
  const scaledHeight = sheet.height * zoom;
  const cellSize = 64 * zoom;
  const baselineTop = 58 * zoom;

  const bgClass =
    bgMode === 'checker-dark'
      ? 'checker-dark'
      : bgMode === 'checker-light'
      ? 'checker-light'
      : 'grass-bg';

  return (
    <div className="bg-[#151B24] border border-[#232C3B] rounded-lg p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-[#F1F5F9]">{sheet.title}</h3>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            {sheet.subtitle}
            <span className="mx-2 text-[#475569]" aria-hidden="true">·</span>
            <span className="font-mono">{sheet.width}×{sheet.height} px</span>
            <span className="mx-2 text-[#475569]" aria-hidden="true">·</span>
            <span className="font-mono">{sheet.frameCount} frames (64×64)</span>
          </p>
        </div>

        <a
          href={sheet.src}
          download={sheet.downloadName}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#0E1218] bg-[#4ADE80] hover:bg-[#22C55E] rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" aria-hidden="true" />
          Download PNG
        </a>
      </div>

      {/* Horizontal Sprite Strip Viewport */}
      <div className="overflow-x-auto pb-2">
        <div
          className={`relative inline-block border border-[#2D3748] rounded ${bgClass}`}
          style={{ width: scaledWidth, height: scaledHeight }}
        >
          <img
            src={sheet.src}
            alt={sheet.title}
            width={scaledWidth}
            height={scaledHeight}
            referrerPolicy="no-referrer"
            className="block pixelated select-none"
            style={{ width: scaledWidth, height: scaledHeight }}
          />

          {/* 64x64 Equal Grid & Clickable Frame Cells */}
          <div className="absolute inset-0 flex">
            {sheet.frames.map((frame) => {
              const isSelected = selectedFrameIndex === frame.index;
              return (
                <button
                  key={frame.index}
                  type="button"
                  onClick={() => onSelectFrame(sheet.id, frame.index)}
                  title={`Frame ${frame.index + 1}: ${frame.label}`}
                  className={`relative h-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4ADE80] transition-colors ${
                    showGrid ? 'border-r border-white/20 last:border-r-0' : ''
                  } ${isSelected ? 'ring-2 ring-inset ring-[#4ADE80] bg-[#4ADE80]/10' : 'hover:bg-white/5'}`}
                  style={{ width: cellSize }}
                >
                  {showGrid && (
                    <span className="absolute top-1 left-1.5 text-[10px] font-mono leading-none text-white/80 drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
                      {String(frame.index).padStart(2, '0')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Foot Baseline Guide (y = 58) */}
          {showBaseline && (
            <div
              className="pointer-events-none absolute left-0 right-0 border-t border-[#F59E0B]"
              style={{ top: baselineTop }}
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      {/* Frame Index Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-[#94A3B8]">
        {sheet.clips.map((clip) => (
          <div key={clip.id} className="flex items-center gap-1.5">
            <span className="font-medium text-[#CBD5E1]">{clip.label}</span>
            <span className="text-[#475569]" aria-hidden="true">/</span>
            <span className="font-mono text-[#94A3B8]">
              {clip.count === 1
                ? `Frame ${clip.startFrame}`
                : `Frames ${clip.startFrame}–${clip.startFrame + clip.count - 1}`}
            </span>
          </div>
        ))}
      </div>

      {/* Extracted 16-bit Palette Swatches */}
      <div className="pt-2 border-t border-[#232C3B] flex flex-wrap items-center gap-3">
        <span className="text-xs text-[#64748B]">16-bit Palette:</span>
        {sheet.palette.map((swatch) => (
          <div key={swatch.hex + swatch.name} className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
            <span
              className="w-3 h-3 rounded-xs border border-white/20 shrink-0"
              style={{ backgroundColor: swatch.hex }}
            />
            <span>{swatch.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
