import type { Template, Frame, Font } from './types';

export const CANVAS_WIDTH = 1080;
export const CANVAS_HEIGHT = 1920;

export const TEMPLATES: Template[] = [
  { id: 'cyber-glitch', name: 'Cyber Glitch' },
  { id: 'pixel-arcade', name: 'Pixel Arcade' },
  { id: 'future-neon', name: 'Future Neon' },
  { id: 'neon-noir', name: 'Neon Noir' },
  { id: 'holo-grid', name: 'Holo-Grid' },
  { id: 'arcade-overload', name: 'Arcade Overload' },
  { id: 'quantum-flare', name: 'Quantum Flare' },
  { id: 'analog-dream', name: 'Analog Dream' },
  { id: 'data-corruption', name: 'Data Corruption' },
];

export const FRAMES: Frame[] = [
  { id: 'none', name: 'No Frame' },
  { id: 'nexus-corners', name: 'Nexus Corners' },
  { id: 'data-stream', name: 'Data Stream' },
  { id: 'quantum-edge', name: 'Quantum Edge' },
  { id: 'hud-interface', name: 'HUD Interface' },
  { id: 'night-city-interface', name: 'Night City Interface' },
  { id: 'glitch-interface', name: 'Glitch Interface' },
];

export const FONTS: Font[] = [
    { id: 'Inter', name: 'Inter (Sans)' },
    { id: 'Cairo', name: 'Cairo' },
    { id: 'Orbitron', name: 'Orbitron' },
    { id: 'VT323', name: 'VT323 (Pixel)' },
    { id: 'Bebas Neue', name: 'Bebas Neue' },
    { id: 'Rajdhani', name: 'Rajdhani' },
];