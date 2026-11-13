import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, Skull, Zap } from 'lucide-react';

interface ZombieEntity {
  id: number;
  x: number;
  y: number;
  facingRight: boolean;
  state: 'walk' | 'death';
  animTime: number;
  speed: number;
}

export const SurvivorsArena: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const [survivorState, setSurvivorState] = useState<'walk' | 'hurt' | 'death'>('walk');

  const simRef = useRef({
    px: 260,
    py: 170,
    facingRight: true,
    pState: 'walk' as 'idle' | 'walk' | 'hurt' | 'death',
    pTimer: 0,
    zombies: [
      { id: 1, x: 70, y: 120, facingRight: true, state: 'walk', animTime: 0, speed: 34 },
      { id: 2, x: 450, y: 210, facingRight: false, state: 'walk', animTime: 0.4, speed: 28 },
      { id: 3, x: 420, y: 95, facingRight: false, state: 'walk', animTime: 0.8, speed: 31 },
    ] as ZombieEntity[],
  });

  const triggerHurt = () => {
    const s = simRef.current;
    if (s.pState === 'death') return;
    s.pState = 'hurt';
    s.pTimer = 0.45;
    setSurvivorState('hurt');
  };

  const triggerSurvivorDeath = () => {
    const s = simRef.current;
    s.pState = 'death';
    s.pTimer = 0;
    setSurvivorState('death');
  };

  const killNearestZombie = () => {
    const s = simRef.current;
    const alive = s.zombies.filter((z) => z.state === 'walk');
    if (alive.length === 0) return;
    alive.sort(
      (a, b) =>
        Math.hypot(a.x - s.px, a.y - s.py) - Math.hypot(b.x - s.px, b.y - s.py)
    );
    alive[0].state = 'death';
    alive[0].animTime = 0;
  };

  const resetArena = () => {
    simRef.current = {
      px: 260,
      py: 170,
      facingRight: true,
      pState: 'walk',
      pTimer: 0,
      zombies: [
        { id: 1, x: 70, y: 120, facingRight: true, state: 'walk', animTime: 0, speed: 34 },
        { id: 2, x: 450, y: 210, facingRight: false, state: 'walk', animTime: 0.4, speed: 28 },
        { id: 3, x: 420, y: 95, facingRight: false, state: 'walk', animTime: 0.8, speed: 31 },
      ],
    };
    setSurvivorState('walk');
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const survivorImg = new Image();
    survivorImg.src = '/sprites/survivor_spritesheet.png';
    const zombieImg = new Image();
    zombieImg.src = '/sprites/walker_zombie_spritesheet.png';

    let rafId = 0;
    let lastTs = performance.now();

    const drawGrassArena = (w: number, h: number) => {
      ctx.fillStyle = '#8cc42f';
      ctx.fillRect(0, 0, w, h);

      // Crisp 16-bit grass tufts (no gradients)
      const tufts = [
        [44, 52], [130, 88], [210, 42], [320, 68], [470, 50],
        [88, 196], [190, 236], [340, 224], [460, 178], [280, 145],
        [156, 150], [390, 128], [62, 270], [492, 266],
      ];
      for (const [tx, ty] of tufts) {
        ctx.fillStyle = '#68b930';
        ctx.fillRect(tx, ty, 12, 4);
        ctx.fillStyle = '#589c28';
        ctx.fillRect(tx + 2, ty - 4, 3, 4);
        ctx.fillRect(tx + 7, ty - 6, 3, 6);
      }

      // Subtle white pixel flowers matching the reference art
      const flowers = [
        [96, 112], [372, 248], [442, 74],
      ];
      for (const [fx, fy] of flowers) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(fx - 3, fy, 3, 3);
        ctx.fillRect(fx + 3, fy, 3, 3);
        ctx.fillRect(fx, fy - 3, 3, 3);
        ctx.fillRect(fx, fy + 3, 3, 3);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(fx, fy, 3, 3);
      }
    };

    const drawSpriteFrame = (
      img: HTMLImageElement,
      frameIdx: number,
      x: number,
      y: number,
      facingRight: boolean,
      scale: number
    ) => {
      if (!img.complete || img.naturalWidth === 0) return;
      const dw = 64 * scale;
      const dh = 64 * scale;

      // Ground contact shadow ellipse
      ctx.fillStyle = 'rgba(20, 42, 16, 0.35)';
      ctx.fillRect(Math.round(x - 10 * scale), Math.round(y - 2 * scale), 20 * scale, 4 * scale);

      ctx.save();
      ctx.translate(Math.round(x), Math.round(y - 58 * scale));
      if (!facingRight) {
        ctx.scale(-1, 1);
      }
      ctx.drawImage(
        img,
        frameIdx * 64,
        0,
        64,
        64,
        -dw / 2,
        0,
        dw,
        dh
      );
      ctx.restore();
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;
      const s = simRef.current;
      const keys = keysRef.current;

      // Update Survivor
      let dx = 0;
      let dy = 0;
      if (s.pState === 'walk' || s.pState === 'idle') {
        if (keys['a'] || keys['arrowleft']) dx -= 1;
        if (keys['d'] || keys['arrowright']) dx += 1;
        if (keys['w'] || keys['arrowup']) dy -= 1;
        if (keys['s'] || keys['arrowdown']) dy += 1;
      }

      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        s.px = Math.max(40, Math.min(500, s.px + (dx / len) * 95 * dt));
        s.py = Math.max(78, Math.min(284, s.py + (dy / len) * 95 * dt));
        if (dx > 0) s.facingRight = true;
        if (dx < 0) s.facingRight = false;
        s.pTimer += dt;
      } else if (s.pState === 'hurt') {
        s.pTimer -= dt;
        if (s.pTimer <= 0) {
          s.pState = 'walk';
          s.pTimer = 0;
          setSurvivorState('walk');
        }
      } else if (s.pState === 'death') {
        s.pTimer = Math.min(0.6, s.pTimer + dt);
      } else {
        s.pTimer += dt * 0.4;
      }

      // Update Zombies
      for (const z of s.zombies) {
        if (z.state === 'walk') {
          const vx = s.px - z.x;
          const vy = s.py - z.y;
          const dist = Math.hypot(vx, vy);
          if (dist > 34) {
            z.x += (vx / dist) * z.speed * dt;
            z.y += (vy / dist) * z.speed * dt;
            z.facingRight = vx >= 0;
            z.animTime += dt;
          } else {
            z.animTime += dt * 0.6;
          }
        } else {
          z.animTime = Math.min(0.6, z.animTime + dt);
        }
      }

      // Render Arena (540x300)
      ctx.imageSmoothingEnabled = false;
      drawGrassArena(canvas.width, canvas.height);

      // Depth-sort entities by ground foot Y
      const drawList: Array<{ y: number; draw: () => void }> = [];

      // Survivor frame selection
      let pFrame = 0;
      if (s.pState === 'hurt') pFrame = 4;
      else if (s.pState === 'death') {
        pFrame = 5 + Math.min(3, Math.floor((s.pTimer / 0.5) * 4));
      } else if (dx !== 0 || dy !== 0) {
        pFrame = Math.floor(s.pTimer * 10) % 4;
      } else {
        pFrame = 1; // clean standing contact frame when idle
      }

      drawList.push({
        y: s.py,
        draw: () => drawSpriteFrame(survivorImg, pFrame, s.px, s.py, s.facingRight, 2),
      });

      for (const z of s.zombies) {
        const zFrame =
          z.state === 'walk'
            ? Math.floor(z.animTime * 6) % 4
            : 4 + Math.min(3, Math.floor((z.animTime / 0.5) * 4));
        drawList.push({
          y: z.y,
          draw: () => drawSpriteFrame(zombieImg, zFrame, z.x, z.y, z.facingRight, 2),
        });
      }

      drawList.sort((a, b) => a.y - b.y);
      for (const item of drawList) item.draw();

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const holdKey = (key: string, pressed: boolean) => {
    keysRef.current[key] = pressed;
  };

  return (
    <div className="bg-[#151B24] border border-[#232C3B] rounded-lg p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-[#F1F5F9]">16-Bit Arena Live Test</h3>
          <p className="text-xs text-[#94A3B8] mt-0.5">
            Move with WASD / Arrow Keys or the pad below to test depth sorting, horizontal flipping, and combat states.
            <span className="mx-2 text-[#475569]" aria-hidden="true">·</span>
            <span className="font-mono text-[#CBD5E1]">State: {survivorState}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={triggerHurt}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0E1218] border border-[#232C3B] hover:border-[#F59E0B] text-[#FBBF24] rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Zap className="w-3.5 h-3.5" />
            Trigger Hurt
          </button>
          <button
            type="button"
            onClick={killNearestZombie}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0E1218] border border-[#232C3B] hover:border-[#4ADE80] text-[#4ADE80] rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Skull className="w-3.5 h-3.5" />
            Kill Zombie
          </button>
          <button
            type="button"
            onClick={triggerSurvivorDeath}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0E1218] border border-[#232C3B] hover:border-[#F87171] text-[#F87171] rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Skull className="w-3.5 h-3.5" />
            Survivor Death
          </button>
          <button
            type="button"
            onClick={resetArena}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#232C3B] hover:bg-[#2D384B] text-[#F1F5F9] rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Arena
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        <div className="lg:col-span-9 overflow-hidden rounded border border-[#2D3748]">
          <canvas
            ref={canvasRef}
            width={540}
            height={300}
            className="w-full h-auto block pixelated"
          />
        </div>

        {/* Touch / Mouse D-Pad for quick testing */}
        <div className="lg:col-span-3 flex flex-col items-center justify-center gap-2">
          <div className="text-xs text-[#94A3B8] mb-1">Touch / Click Move</div>
          <button
            type="button"
            onPointerDown={() => holdKey('arrowup', true)}
            onPointerUp={() => holdKey('arrowup', false)}
            onPointerLeave={() => holdKey('arrowup', false)}
            className="w-11 h-11 flex items-center justify-center bg-[#0E1218] border border-[#232C3B] active:bg-[#232C3B] rounded-md text-[#CBD5E1]"
            aria-label="Move Up"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onPointerDown={() => holdKey('arrowleft', true)}
              onPointerUp={() => holdKey('arrowleft', false)}
              onPointerLeave={() => holdKey('arrowleft', false)}
              className="w-11 h-11 flex items-center justify-center bg-[#0E1218] border border-[#232C3B] active:bg-[#232C3B] rounded-md text-[#CBD5E1]"
              aria-label="Move Left"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onPointerDown={() => holdKey('arrowdown', true)}
              onPointerUp={() => holdKey('arrowdown', false)}
              onPointerLeave={() => holdKey('arrowdown', false)}
              className="w-11 h-11 flex items-center justify-center bg-[#0E1218] border border-[#232C3B] active:bg-[#232C3B] rounded-md text-[#CBD5E1]"
              aria-label="Move Down"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onPointerDown={() => holdKey('arrowright', true)}
              onPointerUp={() => holdKey('arrowright', false)}
              onPointerLeave={() => holdKey('arrowright', false)}
              className="w-11 h-11 flex items-center justify-center bg-[#0E1218] border border-[#232C3B] active:bg-[#232C3B] rounded-md text-[#CBD5E1]"
              aria-label="Move Right"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
