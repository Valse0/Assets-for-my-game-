import React, { useEffect, useRef, useState } from 'react';
import { Download, Pause, Play, Volume2 } from 'lucide-react';
import { BgMode } from '../types/sprites';

interface ManifestAnimation {
  startFrame: number;
  count: number;
  fps: number;
  loop: boolean;
}

interface ManifestAsset {
  id: string;
  title: string;
  file: string;
  frameSize: { w: number; h: number } | null;
  frameCount: number;
  sheetSize?: { w: number; h: number };
  footBaselineY?: number;
  animations?: Record<string, ManifestAnimation>;
  kind?: 'music' | 'sfx';
  loop?: boolean;
  durationSec?: number;
  sampleRate?: number;
}

interface GroupManifest {
  group: number;
  name: string;
  style?: string;
  format?: string;
  assets: ManifestAsset[];
}

interface AssetGroupsSectionProps {
  zoom: number;
  bgMode: BgMode;
  showGrid: boolean;
  showBaseline: boolean;
}

const GROUP_IDS = [1, 2, 3, 4, 5] as const;

export const AssetGroupsSection: React.FC<AssetGroupsSectionProps> = ({
  zoom,
  bgMode,
  showGrid,
  showBaseline,
}) => {
  const [activeGroup, setActiveGroup] = useState<number>(1);
  const [manifests, setManifests] = useState<Record<number, GroupManifest>>({});
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);
  const [loopBgm, setLoopBgm] = useState<boolean>(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    Promise.all(
      GROUP_IDS.map((id) =>
        fetch(`/assets/packs/group${id}/manifest.json`)
          .then((r) => r.json())
          .then((data: GroupManifest) => [id, data] as const)
      )
    )
      .then((entries) => {
        const map: Record<number, GroupManifest> = {};
        for (const [id, data] of entries) map[id] = data;
        setManifests(map);
      })
      .catch(() => {
        // ignore fetch errors if offline
      });
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const currentManifest = manifests[activeGroup];
  const bgClass =
    bgMode === 'checker-dark'
      ? 'checker-dark'
      : bgMode === 'checker-light'
      ? 'checker-light'
      : 'grass-bg';

  const toggleAudio = (asset: ManifestAsset) => {
    const src = `/assets/packs/group5/${asset.file}`;
    if (playingTrack === asset.id && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingTrack(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(src);
    audio.loop = asset.kind === 'music' ? loopBgm : false;
    audio.onended = () => {
      setPlayingTrack((cur) => (cur === asset.id ? null : cur));
    };
    audio.play().catch(() => {});
    audioRef.current = audio;
    setPlayingTrack(asset.id);
  };

  return (
    <section id="packs" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#F8FAFC]">
            Asset Packs &amp; Group Manifests (Groups 1–5)
          </h2>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Each group reads its layout, frame size, and frame count automatically from{' '}
            <span className="font-mono text-[#CBD5E1]">manifest.json</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#151B24] border border-[#232C3B] rounded-md">
          {[
            [1, '1 · Enemies'],
            [2, '2 · Effects'],
            [3, '3 · World'],
            [4, '4 · UI'],
            [5, '5 · Audio'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveGroup(id as number)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                activeGroup === id
                  ? 'bg-[#4ADE80] text-[#0E1218] font-semibold'
                  : 'text-[#94A3B8] hover:text-[#F1F5F9]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!currentManifest ? (
        <div className="bg-[#151B24] border border-[#232C3B] rounded-lg p-6 text-xs text-[#94A3B8]">
          Loading group manifest...
        </div>
      ) : (
        <div className="space-y-4">
          {/* Group Header & Manifest Download */}
          <div className="bg-[#151B24] border border-[#232C3B] rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-[#F1F5F9]">
                Group {currentManifest.group}: {currentManifest.name}
              </h3>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                {currentManifest.style ?? currentManifest.format}
                <span className="mx-2 text-[#475569]" aria-hidden="true">·</span>
                <span className="font-mono">{currentManifest.assets.length} assets</span>
              </p>
            </div>

            <a
              href={`/assets/packs/group${activeGroup}/manifest.json`}
              download={`group${activeGroup}_manifest.json`}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-[#232C3B] hover:bg-[#2D384B] text-[#F1F5F9] rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Download manifest.json
            </a>
          </div>

          {/* Group 1–4 Visual Sprite Strips */}
          {activeGroup !== 5 ? (
            <div className="space-y-4">
              {currentManifest.assets.map((asset) => {
                const fw = asset.frameSize?.w ?? 64;
                const fh = asset.frameSize?.h ?? 64;
                const sw = asset.sheetSize?.w ?? fw * asset.frameCount;
                const sh = asset.sheetSize?.h ?? fh;
                // Keep large 96x96 sheets comfortable inside viewport
                const effZoom = fw >= 96 ? Math.min(zoom, 2) : zoom;
                const scaledW = sw * effZoom;
                const scaledH = sh * effZoom;
                const cellW = fw * effZoom;

                return (
                  <div
                    key={asset.id}
                    className="bg-[#151B24] border border-[#232C3B] rounded-lg p-5 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-semibold text-[#F1F5F9]">{asset.title}</h4>
                        <p className="text-xs text-[#94A3B8] mt-0.5">
                          <span className="font-mono">{asset.file}</span>
                          <span className="mx-2 text-[#475569]" aria-hidden="true">·</span>
                          <span className="font-mono">
                            {fw}×{fh} px
                          </span>
                          <span className="mx-2 text-[#475569]" aria-hidden="true">·</span>
                          <span className="font-mono">{asset.frameCount} frames</span>
                          {asset.footBaselineY !== undefined && (
                            <>
                              <span className="mx-2 text-[#475569]" aria-hidden="true">·</span>
                              <span className="font-mono text-[#F59E0B]">
                                y={asset.footBaselineY}
                              </span>
                            </>
                          )}
                        </p>
                      </div>

                      <a
                        href={`/assets/packs/group${activeGroup}/${asset.file}`}
                        download={asset.file}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0E1218] bg-[#4ADE80] hover:bg-[#22C55E] rounded-md transition-colors whitespace-nowrap shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" aria-hidden="true" />
                        Download PNG
                      </a>
                    </div>

                    <div className="overflow-x-auto pb-1">
                      <div
                        className={`relative inline-block border border-[#2D3748] rounded ${bgClass}`}
                        style={{ width: scaledW, height: scaledH }}
                      >
                        <img
                          src={`/assets/packs/group${activeGroup}/${asset.file}`}
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

                    {asset.animations && (
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[#94A3B8]">
                        {Object.entries(asset.animations).map(([clipName, clip]) => (
                          <div key={clipName} className="flex items-center gap-1.5">
                            <span className="font-medium text-[#CBD5E1]">{clipName}</span>
                            <span className="text-[#475569]" aria-hidden="true">/</span>
                            <span className="font-mono">
                              {clip.count === 1
                                ? `f${clip.startFrame}`
                                : `f${clip.startFrame}–f${clip.startFrame + clip.count - 1}`}{' '}
                              ({clip.fps} fps)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Group 5 Audio Player List */
            <div className="bg-[#151B24] border border-[#232C3B] rounded-lg divide-y divide-[#232C3B]">
              <div className="px-5 py-3 flex items-center justify-between text-xs text-[#94A3B8]">
                <span>Click Play to preview 16-bit PCM WAV tracks directly in browser</span>
                <label className="inline-flex items-center gap-2 cursor-pointer text-[#CBD5E1]">
                  <input
                    type="checkbox"
                    checked={loopBgm}
                    onChange={(e) => setLoopBgm(e.target.checked)}
                    className="accent-[#4ADE80]"
                  />
                  Loop BGM Track
                </label>
              </div>
              {currentManifest.assets.map((asset) => {
                const isPlaying = playingTrack === asset.id;
                return (
                  <div
                    key={asset.id}
                    className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleAudio(asset)}
                        className={`w-9 h-9 rounded-md flex items-center justify-center transition-colors shrink-0 ${
                          isPlaying
                            ? 'bg-[#4ADE80] text-[#0E1218]'
                            : 'bg-[#232C3B] hover:bg-[#2D384B] text-[#F1F5F9]'
                        }`}
                        aria-label={isPlaying ? `Stop ${asset.title}` : `Play ${asset.title}`}
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#F1F5F9] truncate">
                          {asset.title}
                        </div>
                        <div className="text-xs text-[#94A3B8] font-mono">
                          {asset.file}
                          <span className="mx-2 text-[#475569]" aria-hidden="true">·</span>
                          {asset.kind === 'music' ? 'BGM Loop' : 'SFX'}
                          <span className="mx-2 text-[#475569]" aria-hidden="true">·</span>
                          {asset.durationSec?.toFixed(2)}s
                          <span className="mx-2 text-[#475569]" aria-hidden="true">·</span>
                          {asset.sampleRate} Hz
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Volume2 className="w-3.5 h-3.5 text-[#64748B]" aria-hidden="true" />
                      <a
                        href={`/assets/packs/group5/${asset.file}`}
                        download={asset.file}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0E1218] border border-[#232C3B] hover:border-[#475569] text-[#CBD5E1] rounded-md transition-colors whitespace-nowrap shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" aria-hidden="true" />
                        Download WAV
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
