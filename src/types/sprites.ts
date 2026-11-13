export type BgMode = 'checker-dark' | 'checker-light' | 'grass';

export interface FrameMeta {
  index: number;
  name: string;
  label: string;
  clip: 'walk' | 'hurt' | 'death';
  x: number;
  y: number;
  w: number;
  h: number;
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
}

export interface ClipSpec {
  id: 'walk' | 'hurt' | 'death' | 'all';
  label: string;
  startFrame: number;
  count: number;
  fps: number;
  loop: boolean;
}

export interface SheetSpec {
  id: 'survivor' | 'walkerZombie';
  title: string;
  subtitle: string;
  src: string;
  downloadName: string;
  width: number;
  height: number;
  frameCount: number;
  clips: ClipSpec[];
  palette: { name: string; hex: string }[];
  frames: FrameMeta[];
}

export interface AtlasFile {
  meta: {
    frameSize: { w: number; h: number };
    footBaselineY: number;
    antiAliasing: boolean;
    gradients: boolean;
    transparentBackground: boolean;
    perspective: string;
    style: string;
  };
  sheets: {
    survivor: {
      file: string;
      size: { w: number; h: number };
      columns: number;
      rows: number;
      animations: Record<string, { startFrame: number; count: number; fps: number; loop: boolean }>;
      frames: Array<{
        index: number;
        name: string;
        x: number;
        y: number;
        w: number;
        h: number;
        bounds: FrameMeta['bounds'];
      }>;
    };
    walkerZombie: {
      file: string;
      size: { w: number; h: number };
      columns: number;
      rows: number;
      animations: Record<string, { startFrame: number; count: number; fps: number; loop: boolean }>;
      frames: Array<{
        index: number;
        name: string;
        x: number;
        y: number;
        w: number;
        h: number;
        bounds: FrameMeta['bounds'];
      }>;
    };
  };
}
