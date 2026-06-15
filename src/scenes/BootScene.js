/**
 * @file BootScene.js
 * @description First scene — seeds registry from localStorage, then hands off to PreloadScene.
 * Intentionally minimal: no asset loading, no heavy logic.
 */
import Phaser from 'phaser';

export default class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  create() {
    this._seedRegistry();

    // Suppress right-click context menu on the canvas
    this.input.mouse?.disableContextMenu();

    // Capture keys that would otherwise scroll the browser page
    this.input.keyboard?.addCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
    ]);

    this.scene.start('PreloadScene');
  }

  _seedRegistry() {
    const r = this.registry;
    const load = (key, fallback) => {
      try {
        const v = localStorage.getItem(`mkr_${key}`);
        return v !== null ? JSON.parse(v) : fallback;
      } catch { return fallback; }
    };

    r.set('highScore',      load('highScore',      0));
    r.set('currency',       load('currency',        0));
    r.set('upgradeEngine',  load('upgradeEngine',   0));
    r.set('upgradeArmor',   load('upgradeArmor',    0));
    r.set('upgradePlasma',  load('upgradePlasma',   0));
    r.set('sfxMuted',       load('sfxMuted',        false));
    r.set('musicMuted',     load('musicMuted',      false));

    // Per-run state (reset on each game start)
    r.set('heat',     0);
    r.set('energy',   100);
    r.set('velocity', 0);
  }
}
