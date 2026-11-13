import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, FlipHorizontal2, Pause, Play, RotateCcw } from 'lucide-react';
import { BgMode, ClipSpec, SheetSpec } from '../types/sprites';

interface AnimationPlayerProps {
  sheets: SheetSpec[];
  activeSheetId: SheetSpec['id'];
  activeFrameIndex: number;
  bgMode: BgMode;
  showGrid: boolean;
  showBaseline: boolean;
  onChangeSheet: (id: SheetSpec['id']) => void;
  onChangeFrame: (index: number) => void;
}

export const AnimationPlayer: React.FC<AnimationPlayerProps> = ({
  sheets,
  activeSheetId,
  activeFrameIndex,
  bgMode,
  showGrid,
  showBaseline,
  onChangeSheet,
  onChangeFrame,
}) => {
  const sheet = sheets.find((s) => s.id === activeSheetId) ?? sheets[0];
  const [clipId, setClipId] = useState<ClipSpec['id']>('walk');
  const [isPlaying, setIsPlaying] = useState(true);
  const [fps, setFps] = useState(8);
  const [flipX, setFlipX] = useState(false);

  const allClip: ClipSpec = {
    id: 'all',
    label: 'All Frames',
    startFrame: 0,
    count: sheet.frameCount,
    fps: 8,
    loop: true,
  };

  const availableClips: ClipSpec[] = [...sheet.clips, allClip];
  const currentClip = availableClips.find((c) => c.id === clipId) ?? availableClips[0];

  // Reset clip if current sheet doesn't have it (e.g. hurt on zombie)
  useEffect(() => {
    if (!availableClips.some((c) => c.id === clipId)) {
      setClipId('walk');
      onChangeFrame(0);
    }
  }, [activeSheetId]);

  useEffect(() => {
    if (!isPlaying) return;
    if (currentClip.count <= 1) {
      onChangeFrame(currentClip.startFrame);
      return;
    }
    const intervalMs = Math.max(40, Math.round(1000 / fps));
    const timer = window.setInterval(() => {
      onChangeFrame((() => {
        const rel = activeFrameIndex - currentClip.startFrame;
        if (rel < 0 || rel >= currentClip.count) return currentClip.startFrame;
        const nextRel = (rel + 1) % currentClip.count;
        return currentClip.startFrame + nextRel;
      })());
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [isPlaying, fps, currentClip.startFrame, currentClip.count, activeFrameIndex]);

  const handleSelectClip = (nextClip: ClipSpec) => {
    setClipId(nextClip.id);
    setFps(nextClip.fps);
    onChangeFrame(nextClip.startFrame);
    setIsPlaying(nextClip.count > 1);
  };

  const stepFrame = (delta: number) => {
    setIsPlaying(false);
    const next = (activeFrameIndex + delta + sheet.frameCount) % sheet.frameCount;
    onChangeFrame(next);
  };

  const frame = sheet.frames[activeFrameIndex] ?? sheet.frames[0];
  const scale = 4; // 64 * 4 = 256px crisp inspection viewport
  const bgClass =
    bgMode === 'checker-dark'
      ? 'checker-dark'
      : bgMode === 'checker-light'
      ? 'checker-light'
      : 'grass-bg';

  return (
    <div className="bg-[#151B24] border border-[#232C3B] rounded-lg p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-[#F1F5F9]">Animation & Alignment Inspector</h3>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Verify walk cycle cadence, hit recoil, and death ground alignment at 4× nearest-neighbor scale.
          </p>
        </div>

        {/* Character Switcher */}
        <div className="flex items-center gap-1 p-1 bg-[#0E1218] border border-[#232C3B] rounded-md">
          {sheets.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onChangeSheet(s.id);
                onChangeFrame(0);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                activeSheetId === s.id
                  ? 'bg-[#232C3B] text-[#F1F5F9]'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              {s.id === 'survivor' ? 'Survivor' : 'Walker Zombie'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: 256x256 Crisp Sprite Viewport */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div
            className={`relative w-[256px] h-[256px] border border-[#2D3748] rounded overflow-hidden ${bgClass}`}
          >
            {/* Sprite slice rendered via CSS background-position for zero-blur nearest-neighbor */}
            <div
              className="w-[256px] h-[256px] pixelated"
              style={{
                backgroundImage: `url(${sheet.src})`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: `${sheet.width * scale}px ${sheet.height * scale}px`,
                backgroundPosition: `-${frame.index * 64 * scale}px 0px`,
                transform: flipX ? 'scaleX(-1)' : undefined,
              }}
            />

            {showGrid && (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
                  backgroundSize: '32px 32px',
                }}
              />
            )}

            {showBaseline && (
              <div
                className="pointer-events-none absolute left-0 right-0 border-t border-[#F59E0B]"
                style={{ top: 58 * scale }}
              />
            )}

            <div className="pointer-events-none absolute bottom-2 left-2.5 text-[11px] font-mono text-white/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
              #{String(frame.index).padStart(2, '0')} · {frame.label}
            </div>
          </div>
        </div>

        {/* Right: Playback & Frame Metrics */}
        <div className="lg:col-span-7 space-y-5">
          {/* Clip Selector */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-[#94A3B8]">Animation Clip</div>
            <div className="flex flex-wrap gap-2">
              {availableClips.map((clip) => (
                <button
                  key={clip.id}
                  type="button"
                  onClick={() => handleSelectClip(clip)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                    clipId === clip.id
                      ? 'bg-[#4ADE80] text-[#0E1218] border-[#4ADE80]'
                      : 'bg-[#0E1218] text-[#CBD5E1] border-[#232C3B] hover:border-[#475569]'
                  }`}
                >
                  {clip.label} ({clip.count}f)
                </button>
              ))}
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium bg-[#232C3B] hover:bg-[#2D384B] text-[#F1F5F9] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>

            <button
              type="button"
              onClick={() => stepFrame(-1)}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium bg-[#0E1218] border border-[#232C3B] hover:border-[#475569] text-[#CBD5E1] rounded-md transition-colors whitespace-nowrap shrink-0"
              aria-label="Previous frame"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </button>

            <button
              type="button"
              onClick={() => stepFrame(1)}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium bg-[#0E1218] border border-[#232C3B] hover:border-[#475569] text-[#CBD5E1] rounded-md transition-colors whitespace-nowrap shrink-0"
              aria-label="Next frame"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setFlipX((f) => !f)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border rounded-md transition-colors whitespace-nowrap shrink-0 ${
                flipX
                  ? 'bg-[#232C3B] border-[#4ADE80] text-[#4ADE80]'
                  : 'bg-[#0E1218] border-[#232C3B] text-[#CBD5E1] hover:border-[#475569]'
              }`}
            >
              <FlipHorizontal2 className="w-3.5 h-3.5" />
              {flipX ? 'Facing Left' : 'Facing Right'}
            </button>

            <button
              type="button"
              onClick={() => {
                onChangeFrame(currentClip.startFrame);
                setIsPlaying(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#0E1218] border border-[#232C3B] hover:border-[#475569] text-[#CBD5E1] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restart
            </button>
          </div>

          {/* FPS Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#94A3B8]">Playback Speed</span>
              <span className="font-mono text-[#F1F5F9]">{fps} FPS</span>
            </div>
            <input
              type="range"
              min={2}
              max={18}
              step={1}
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
              className="w-full accent-[#4ADE80] cursor-pointer"
            />
          </div>

          {/* Selected Frame Metrics Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-[#232C3B] text-xs">
            <div>
              <div className="text-[#64748B]">Cell Origin</div>
              <div className="font-mono text-[#F1F5F9] mt-0.5">
                {frame.x}, {frame.y}
              </div>
            </div>
            <div>
              <div className="text-[#64748B]">Sprite Bounds</div>
              <div className="font-mono text-[#F1F5F9] mt-0.5">
                {frame.bounds.width}×{frame.bounds.height} px
              </div>
            </div>
            <div>
              <div className="text-[#64748B]">Foot Baseline</div>
              <div className="font-mono text-[#F59E0B] mt-0.5">y = {frame.bounds.maxY}</div>
            </div>
            <div>
              <div className="text-[#64748B]">Top Margin</div>
              <div className="font-mono text-[#F1F5F9] mt-0.5">{frame.bounds.minY} px</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
