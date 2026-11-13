import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Download, Grid, Ruler } from 'lucide-react';
import { AnimationPlayer } from './components/AnimationPlayer';
import { AssetGroupsSection } from './components/AssetGroupsSection';
import { BossExactSection } from './components/BossExactSection';
import { RefinedComparisonSection } from './components/RefinedComparisonSection';
import { SpriteSheetStrip } from './components/SpriteSheetStrip';
import { SurvivorsArena } from './components/SurvivorsArena';
import { V2GroupASection } from './components/V2GroupASection';
import { V2GroupBCSection } from './components/V2GroupBCSection';
import { AtlasFile, BgMode, SheetSpec } from './types/sprites';

const DEFAULT_PALETTES = {
  survivor: [
    { name: 'Outline', hex: '#0A090D' },
    { name: 'Hair', hex: '#66342B' },
    { name: 'Skin', hex: '#F6B882' },
    { name: 'Jacket', hex: '#EE3436' },
    { name: 'Backpack', hex: '#8A1422' },
    { name: 'Trim', hex: '#F4F4F8' },
    { name: 'Jeans', hex: '#244C84' },
    { name: 'Boots', hex: '#3E3A42' },
  ],
  walkerZombie: [
    { name: 'Outline', hex: '#0A090D' },
    { name: 'Skin Light', hex: '#A2D4A2' },
    { name: 'Skin Mid', hex: '#84BA8A' },
    { name: 'Skin Deep', hex: '#365856' },
    { name: 'Torn Shirt', hex: '#EEE0D0' },
    { name: 'Blood', hex: '#C82C2A' },
    { name: 'Mouth', hex: '#8E1822' },
    { name: 'Trousers', hex: '#404044' },
  ],
};

function formatFrameLabel(name: string): string {
  const [clip, idxStr] = name.split('_');
  const num = Number(idxStr) + 1;
  if (clip === 'walk') return `Walk ${num}`;
  if (clip === 'hurt') return `Hurt ${num}`;
  return `Death ${num}`;
}

export default function App() {
  const [atlas, setAtlas] = useState<AtlasFile | null>(null);
  const [zoom, setZoom] = useState<number>(2);
  const [bgMode, setBgMode] = useState<BgMode>('checker-dark');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showBaseline, setShowBaseline] = useState<boolean>(true);
  const [activeSheetId, setActiveSheetId] = useState<SheetSpec['id']>('survivor');
  const [activeFrameIndex, setActiveFrameIndex] = useState<number>(0);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  useEffect(() => {
    fetch('/sprites/atlas.json')
      .then((res) => res.json())
      .then((data: AtlasFile) => setAtlas(data))
      .catch(() => {
        // Silent fallback handled below if atlas fails to load
      });
  }, []);

  const sheets: SheetSpec[] = useMemo(() => {
    const survivorFrames =
      atlas?.sheets.survivor.frames.map((f) => ({
        ...f,
        clip: (f.name.startsWith('walk')
          ? 'walk'
          : f.name.startsWith('hurt')
          ? 'hurt'
          : 'death') as 'walk' | 'hurt' | 'death',
        label: formatFrameLabel(f.name),
      })) ??
      Array.from({ length: 9 }, (_, i) => ({
        index: i,
        name: i < 4 ? `walk_${i}` : i === 4 ? 'hurt_0' : `death_${i - 5}`,
        clip: (i < 4 ? 'walk' : i === 4 ? 'hurt' : 'death') as 'walk' | 'hurt' | 'death',
        label: i < 4 ? `Walk ${i + 1}` : i === 4 ? 'Hurt 1' : `Death ${i - 4}`,
        x: i * 64,
        y: 0,
        w: 64,
        h: 64,
        bounds: { minX: 20, minY: 19, maxX: 42, maxY: 58, width: 23, height: 40 },
      }));

    const zombieFrames =
      atlas?.sheets.walkerZombie.frames.map((f) => ({
        ...f,
        clip: (f.name.startsWith('walk') ? 'walk' : 'death') as 'walk' | 'death',
        label: formatFrameLabel(f.name),
      })) ??
      Array.from({ length: 8 }, (_, i) => ({
        index: i,
        name: i < 4 ? `walk_${i}` : `death_${i - 4}`,
        clip: (i < 4 ? 'walk' : 'death') as 'walk' | 'death',
        label: i < 4 ? `Walk ${i + 1}` : `Death ${i - 3}`,
        x: i * 64,
        y: 0,
        w: 64,
        h: 64,
        bounds: { minX: 13, minY: 10, maxX: 47, maxY: 58, width: 35, height: 49 },
      }));

    return [
      {
        id: 'survivor',
        title: '1. Survivor (Unarmed Body, Facing Right)',
        subtitle: 'Walk 4f · Hurt 1f · Death 4f',
        src: '/sprites/survivor_spritesheet.png',
        downloadName: 'survivor_64x64_9frames.png',
        width: 576,
        height: 64,
        frameCount: 9,
        clips: [
          { id: 'walk', label: 'Walk', startFrame: 0, count: 4, fps: 10, loop: true },
          { id: 'hurt', label: 'Hurt', startFrame: 4, count: 1, fps: 8, loop: false },
          { id: 'death', label: 'Death', startFrame: 5, count: 4, fps: 8, loop: false },
        ],
        palette: DEFAULT_PALETTES.survivor,
        frames: survivorFrames,
      },
      {
        id: 'walkerZombie',
        title: '2. Walker Zombie (Hulking Green Zombie, Facing Right)',
        subtitle: 'Walk 4f · Death 4f',
        src: '/sprites/walker_zombie_spritesheet.png',
        downloadName: 'walker_zombie_64x64_8frames.png',
        width: 512,
        height: 64,
        frameCount: 8,
        clips: [
          { id: 'walk', label: 'Walk', startFrame: 0, count: 4, fps: 7, loop: true },
          { id: 'death', label: 'Death', startFrame: 4, count: 4, fps: 8, loop: false },
        ],
        palette: DEFAULT_PALETTES.walkerZombie,
        frames: zombieFrames,
      },
    ];
  }, [atlas]);

  const handleSelectFrame = (sheetId: SheetSpec['id'], frameIndex: number) => {
    setActiveSheetId(sheetId);
    setActiveFrameIndex(frameIndex);
  };

  const atlasText = useMemo(() => (atlas ? JSON.stringify(atlas, null, 2) : ''), [atlas]);

  const handleCopyJson = async () => {
    if (!atlasText) return;
    try {
      await navigator.clipboard.writeText(atlasText);
      setCopiedJson(true);
      window.setTimeout(() => setCopiedJson(false), 1800);
    } catch {
      // ignore clipboard errors in restricted iframes
    }
  };

  return (
    <div className="min-h-screen bg-[#0E1218] text-[#E6EBF2]">
      {/* Top Bar Contract: 3 exact zones */}
      <header className="sticky top-0 z-30 bg-[#0E1218]/95 backdrop-blur border-b border-[#232C3B]">
        <div className="max-w-[1200px] mx-auto px-6 py-3.5 flex items-center justify-between gap-8">
          <a
            href="#sheets"
            className="text-base font-bold tracking-tight text-[#F8FAFC] whitespace-nowrap shrink-0"
          >
            Survivors Sprite Studio
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#94A3B8]">
            <a
              href="#v2-group-a"
              className="hover:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0"
            >
              v2 Group A
            </a>
            <a
              href="#v2-group-bc"
              className="hover:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0"
            >
              v2 Groups B–C
            </a>
            <a
              href="#boss-exact"
              className="hover:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0"
            >
              Boss 96×96
            </a>
            <a
              href="#refined"
              className="hover:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0"
            >
              Refined Phase 1
            </a>
            <a
              href="#arena"
              className="hover:text-[#F8FAFC] transition-colors whitespace-nowrap shrink-0"
            >
              Arena Test
            </a>
          </nav>

          <a
            href="/sprites/combined_spritesheet.png"
            download="survivors_combined_64x64_spritesheet.png"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#0E1218] bg-[#4ADE80] hover:bg-[#22C55E] rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            Download Combined PNG
          </a>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-8 space-y-10">
        {/* Hero Overview + Reference Comparison */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-8 bg-[#151B24] border border-[#232C3B] rounded-lg p-6 flex flex-col justify-between gap-5">
            <div className="space-y-2.5">
              <div className="text-xs text-[#94A3B8]">
                16-Bit Survivors-Like Asset Pack
                <span className="mx-2 text-[#475569]" aria-hidden="true">·</span>
                3/4 Top-Down View
                <span className="mx-2 text-[#475569]" aria-hidden="true">·</span>
                Bold Dark Outlines
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC] text-balance">
                64×64 Transparent Sprite Sheets for Survivor &amp; Walker Zombie
              </h1>
              <p className="text-sm text-[#94A3B8] max-w-2xl leading-relaxed">
                Generated strictly at native 64×64 pixel-art resolution with alpha transparency, zero
                anti-aliasing, flat 16-bit shading without gradients, equal horizontal grid spacing, and
                locked foot baseline alignment at y = 58.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#232C3B] text-xs">
              <div>
                <div className="text-[#64748B]">Cell Grid</div>
                <div className="font-mono text-sm font-semibold text-[#F1F5F9] mt-0.5">64×64 px</div>
              </div>
              <div>
                <div className="text-[#64748B]">Survivor Strip</div>
                <div className="font-mono text-sm font-semibold text-[#F1F5F9] mt-0.5">576×64 px (9f)</div>
              </div>
              <div>
                <div className="text-[#64748B]">Walker Zombie Strip</div>
                <div className="font-mono text-sm font-semibold text-[#F1F5F9] mt-0.5">512×64 px (8f)</div>
              </div>
              <div>
                <div className="text-[#64748B]">Foot Baseline</div>
                <div className="font-mono text-sm font-semibold text-[#F59E0B] mt-0.5">y = 58 px</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 bg-[#151B24] border border-[#232C3B] rounded-lg p-4 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between text-xs text-[#94A3B8]">
              <span className="font-medium text-[#CBD5E1]">Style Reference</span>
              <span className="font-mono">1254×1254</span>
            </div>
            <div className="overflow-hidden rounded border border-[#232C3B] bg-[#0E1218] aspect-square max-h-[210px] w-full">
              <img
                src="/assets/aistudio/39D4E0D2-B473-4BFE-961E-2163505AC8D2_8f347dc8.png"
                alt="Original 16-bit survivors-like reference artwork"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-xs text-[#64748B]">
              Source palette &amp; proportions matched directly from your reference art.
            </div>
          </div>
        </section>

        {/* Section 1: Sprite Sheet Strips + Workspace Controls */}
        <section id="sheets" className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[#F8FAFC]">Horizontal Sprite Sheets</h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Click any 64×64 cell to inspect frame bounds in the Animator below.
              </p>
            </div>

            {/* Workspace Toolbar (Zoom, Background, Grid, Footline) */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-[#151B24] border border-[#232C3B] rounded-md">
                {[1, 2, 3, 4].map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setZoom(z)}
                    className={`px-2.5 py-1 text-xs font-mono rounded transition-colors whitespace-nowrap shrink-0 ${
                      zoom === z
                        ? 'bg-[#232C3B] text-[#F1F5F9]'
                        : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                    }`}
                  >
                    {z}×
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 p-1 bg-[#151B24] border border-[#232C3B] rounded-md">
                {(
                  [
                    ['checker-dark', 'Dark'],
                    ['checker-light', 'Light'],
                    ['grass', 'Grass'],
                  ] as [BgMode, string][]
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setBgMode(mode)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                      bgMode === mode
                        ? 'bg-[#232C3B] text-[#F1F5F9]'
                        : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowGrid((g) => !g)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  showGrid
                    ? 'bg-[#151B24] border-[#4ADE80] text-[#4ADE80]'
                    : 'bg-[#151B24] border-[#232C3B] text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                <Grid className="w-3.5 h-3.5" aria-hidden="true" />
                64×64 Grid
              </button>

              <button
                type="button"
                onClick={() => setShowBaseline((b) => !b)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  showBaseline
                    ? 'bg-[#151B24] border-[#F59E0B] text-[#F59E0B]'
                    : 'bg-[#151B24] border-[#232C3B] text-[#94A3B8] hover:text-[#F1F5F9]'
                }`}
              >
                <Ruler className="w-3.5 h-3.5" aria-hidden="true" />
                Footline y=58
              </button>
            </div>
          </div>

          <div className="space-y-5">
            {sheets.map((sheet) => (
              <SpriteSheetStrip
                key={sheet.id}
                sheet={sheet}
                zoom={zoom}
                bgMode={bgMode}
                showGrid={showGrid}
                showBaseline={showBaseline}
                selectedFrameIndex={activeSheetId === sheet.id ? activeFrameIndex : null}
                onSelectFrame={handleSelectFrame}
              />
            ))}
          </div>
        </section>

        {/* assets/v2 — Group A: Zombie Attack Sprite Sheets */}
        <V2GroupASection
          zoom={zoom}
          bgMode={bgMode}
          showGrid={showGrid}
          showBaseline={showBaseline}
        />

        {/* assets/v2 — Groups B & C: World Props, Effects, Shoot & Pickups */}
        <V2GroupBCSection
          zoom={zoom}
          bgMode={bgMode}
          showGrid={showGrid}
          showBaseline={showBaseline}
        />

        {/* Boss Mutant Brute — 96x96 Exact Reference Match (Static + Animated) */}
        <BossExactSection
          zoom={zoom}
          bgMode={bgMode}
          showGrid={showGrid}
          showBaseline={showBaseline}
        />

        {/* Section 1A: Phase 1 Refined Comparison (Survivor & Walker Zombie) */}
        <RefinedComparisonSection
          originalSheets={sheets}
          zoom={zoom}
          bgMode={bgMode}
          showGrid={showGrid}
          showBaseline={showBaseline}
        />

        {/* Section 1B: Groups 1-5 Manifest Browser */}
        <AssetGroupsSection
          zoom={zoom}
          bgMode={bgMode}
          showGrid={showGrid}
          showBaseline={showBaseline}
        />

        {/* Section 2: Animation Player */}
        <section id="animator">
          <AnimationPlayer
            sheets={sheets}
            activeSheetId={activeSheetId}
            activeFrameIndex={activeFrameIndex}
            bgMode={bgMode}
            showGrid={showGrid}
            showBaseline={showBaseline}
            onChangeSheet={setActiveSheetId}
            onChangeFrame={setActiveFrameIndex}
          />
        </section>

        {/* Section 3: Interactive 16-bit Arena Preview */}
        <section id="arena">
          <SurvivorsArena />
        </section>

        {/* Section 4: Atlas JSON Export */}
        <section id="atlas" className="bg-[#151B24] border border-[#232C3B] rounded-lg p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-[#F1F5F9]">Sprite Atlas JSON</h3>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Ready-to-import frame coordinates and animation clip definitions for Unity, Godot, Phaser, or PixiJS.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyJson}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0E1218] border border-[#232C3B] hover:border-[#475569] text-[#CBD5E1] rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                {copiedJson ? <Check className="w-3.5 h-3.5 text-[#4ADE80]" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedJson ? 'Copied' : 'Copy JSON'}
              </button>
              <a
                href="/sprites/atlas.json"
                download="survivors_atlas.json"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#232C3B] hover:bg-[#2D384B] text-[#F1F5F9] rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                Download atlas.json
              </a>
            </div>
          </div>

          <pre className="p-4 bg-[#0E1218] border border-[#232C3B] rounded text-xs font-mono text-[#CBD5E1] overflow-x-auto max-h-72">
            {atlasText || 'Loading atlas metadata...'}
          </pre>
        </section>
      </main>
    </div>
  );
}
