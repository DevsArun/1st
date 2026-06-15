/**
 * @file main.js
 * @description Phaser 3 game bootstrap for MECHA KAIJU RUSH.
 *
 * Scaling strategy: Scale.FIT + CENTER_BOTH
 *   — Canvas always fits entirely within the viewport (no cropping).
 *   — Letterboxed with #0a0a0f so the bottom cockpit HUD is NEVER clipped.
 *   — Minimum size guard (320×180) prevents unusable tiny canvas.
 *
 * All scene coordinates are authored at 1920×1080.
 * The physics world uses Matter.js gravity y=3.5 (heavy, impactful feel).
 */

import Phaser from 'phaser';

// ── Scene imports (relative paths — resolved by Vite aliases in build,
//    and directly in dev via Vite's dev server module resolution)
import BootScene     from './scenes/BootScene.js';
import PreloadScene  from './scenes/PreloadScene.js';
import MainMenuScene from './scenes/MainMenuScene.js';
import GarageScene   from './scenes/GarageScene.js';
import GameScene     from './scenes/GameScene.js';
import GameOverScene from './scenes/GameOverScene.js';

import { CrazyGamesSDK } from './utils/CrazyGamesSDK.js';

// ── Exported constants (used by all scenes) ────────────────────────────────
export const GAME_WIDTH  = 1920;
export const GAME_HEIGHT = 1080;
export const HUD_HEIGHT  = 220;

// ── Debug flag ─────────────────────────────────────────────────────────────
const debugPhysics = typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).has('debug');

// ── Phaser config ──────────────────────────────────────────────────────────
const config = {
  type: Phaser.AUTO,

  width:  GAME_WIDTH,
  height: GAME_HEIGHT,

  backgroundColor: '#0a0a0f',

  parent: 'game-container',

  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width:      GAME_WIDTH,
    height:     GAME_HEIGHT,
    parent:     'game-container',
    zoom:       1,
    min: { width: 320, height: 180 },
  },

  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 3.5 },
      velocityIterations: 12,
      positionIterations: 6,
      debug: debugPhysics
        ? { showCollisions: true, showVelocity: true, lineColor: 0x00ff88, lineOpacity: 0.7 }
        : false,
    },
  },

  audio: {
    disableWebAudio: false,
  },

  dom: {
    createContainer: false,
  },

  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    GarageScene,
    GameScene,
    GameOverScene,
  ],
};

// ── Bootstrap ──────────────────────────────────────────────────────────────
async function bootstrap() {
  
  

  try {
    await CrazyGamesSDK.init();
  } catch (e) {
    console.warn('[MKR] CrazyGames SDK init failed — continuing without SDK', e);
  }

  window.__MECHA_GAME__ = new Phaser.Game(config);

  window.addEventListener('resize', () => {
    window.__MECHA_GAME__?.scale.refresh();
  });

  window.addEventListener('orientationchange', () => {
    setTimeout(() => window.__MECHA_GAME__?.scale.refresh(), 200);
  });
}

bootstrap();
