/**
 * @file GameScene.js
 * @description Core gameplay scene — fully wired Phase 2 implementation.
 *
 * COORDINATE SYSTEM
 * ─────────────────────────────────────────────────────────────────────────
 *  Everything lives in world coordinates. The camera follows the player
 *  horizontally (camera.startFollow). Parallax TileSprites use
 *  tilePositionX = camera.scrollX * ratio so they scroll at correct speeds
 *  without any manual worldX bookkeeping.
 *
 * SCENE GRAPH (depth order, low = back)
 * ─────────────────────────────────────────────────────────────────────────
 *  depth  0   bg-sky TileSprite      (parallax 0.10)
 *  depth  1   bg-city TileSprite     (parallax 0.30)
 *  depth  2   bg-midground           (parallax 0.60)
 *  depth  3   bg-foreground          (parallax 1.00, scrollFactor 0 — manual)
 *  depth  5   TerrainGenerator gfx
 *  depth 14   Debris fragment sprites
 *  depth 15   Obstacle sprites
 *  depth 17   Thruster emitter
 *  depth 18   Thruster gfx
 *  depth 19   Wheel sprite
 *  depth 20   Torso sprite
 *  depth 24   Smoke particles
 *  depth 25   Spark particles
 *  depth 26   More spark particles
 *  depth 48-57 CockpitDashboard (scrollFactor 0)
 *  depth 100  Progress bar track (scrollFactor 0)
 *  depth 101  Progress fill + dist text (scrollFactor 0)
 *  depth 102  Pause button (scrollFactor 0)
 *  depth 200  Pause menu (scrollFactor 0)
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, HUD_HEIGHT } from '../main.js';
import { CockpitDashboard }  from '../ui/CockpitDashboard.js';
import { MechaPlayer }       from '../entities/MechaPlayer.js';
import { ObstacleManager }   from '../entities/ObstacleManager.js';
import { TerrainGenerator }  from '../utils/TerrainGenerator.js';
import { CrazyGamesSDK }     from '../utils/CrazyGamesSDK.js';

// ── Level constants ────────────────────────────────────────────────────────
const LEVEL_LENGTH_PX  = 24_000;   // total world width
const LEVEL_LENGTH_M   = LEVEL_LENGTH_PX / 4;   // metres
const PARALLAX_RATIOS  = [0.10, 0.30, 0.60, 1.00];
const BG_KEYS          = ['bg-sky', 'bg-city', 'bg-midground', 'bg-foreground'];

// ── Player spawn position ─────────────────────────────────────────────────
const SPAWN_X = 300;
const SPAWN_Y = 400;   // will be corrected to terrain surface in create()

// ── Energy drain rates (per second) ───────────────────────────────────────
const ENERGY_DRAIN_BASE  = 1.0;
const HEAT_DISSIPATE     = 5.0;


export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  create() {
    // ── State reset ────────────────────────────────────────────────────────
    this._paused       = false;
    this._dead         = false;
    this._energy       = 100;
    this._heat         = 0;
    this._distance     = 0;
    this._runScrap     = 0;

    // ── Build order matters (depth / physics dependency) ───────────────────
    this._buildParallax();       // depth 0-3
    this._buildTerrain();        // depth 5  — must be before player
    this._buildPlayer();         // depth 17-20
    this._buildObstacles();      // depth 14-15
    this._buildHUD();            // depth 48-102
    this._buildPauseMenu();      // depth 200
    this._buildInputHandlers();
    this._setupCamera();
    this._startMusic();

    // Notify SDK
    CrazyGamesSDK.gameplayStart();

    // Fade in
    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  update(time, delta) {
    if (this._dead) return;
    if (this._paused) return;

    const dt = delta / 1000;
    const cam = this.cameras.main;

    // ── Parallax ──────────────────────────────────────────────────────────
    PARALLAX_RATIOS.forEach((ratio, i) => {
      if (this._bgLayers[i]) {
        this._bgLayers[i].tilePositionX = cam.scrollX * ratio;
      }
    });

    // ── Terrain streaming ─────────────────────────────────────────────────
    this._terrain?.update(cam.scrollX);

    // ── Player tick ───────────────────────────────────────────────────────
    this._player?.update(time, delta, this._paused);

    // ── Obstacles ─────────────────────────────────────────────────────────
    this._obstacles?.update(cam.scrollX, this._distance);

    // ── Resources ─────────────────────────────────────────────────────────
    this._tickResources(dt);

    // ── HUD ───────────────────────────────────────────────────────────────
    const vel = this._player?.getVelocity() ?? { x: 0, y: 0 };
    const pos = this._player?.getPosition() ?? { x: 0, y: 0 };
    this._distance = Math.max(this._distance, (pos.x - SPAWN_X) / 4);

    this._hud?.update({
      energy:   this._energy,
      heat:     this._heat,
      velocity: vel.x,
    });
    this._updateProgressBar();

    // ── Death / win conditions ────────────────────────────────────────────
    if (this._energy <= 0) this._triggerGameOver('ENERGY DEPLETED');
    if (this._distance >= LEVEL_LENGTH_M) this._triggerGameOver('LEVEL COMPLETE', true);

    // Death from falling off-screen
    if (pos.y > GAME_HEIGHT + 200) this._triggerGameOver('FELL INTO THE ABYSS');
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PUBLIC — called by MechaPlayer / ObstacleManager
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * @param {number}              force   Impact force magnitude
   * @param {Phaser.Math.Vector2} pos     World position
   */
  onCollision(force, pos) {
    if (this._dead) return;

    // Camera shake scaled to force
    const intensity = Phaser.Math.Clamp(force * 0.00015, 0.003, 0.022);
    this.cameras.main.shake(280, intensity);

    // Energy drain
    const armorMult = 1 - (this.registry.get('upgradeArmor') ?? 0) * 0.12;
    const drain = Phaser.Math.Clamp(force * 0.04 * armorMult, 0.5, 18);
    this._energy = Phaser.Math.Clamp(this._energy - drain, 0, 100);

    // Heat spike
    const heatSpike = Phaser.Math.Clamp(force * 0.025, 0.3, 7);
    this._heat = Phaser.Math.Clamp(this._heat + heatSpike, 0, 100);

    // Play impact SFX
    const sfxKey = force > 8000 ? 'sfx-impact-heavy' : 'sfx-impact-light';
    if (!this.registry.get('sfxMuted') && this.cache.audio.exists(sfxKey)) {
      this.sound.play(sfxKey, { volume: Phaser.Math.Clamp(force / 15000, 0.2, 1.0) });
    }
  }


  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE — BUILD METHODS
  // ─────────────────────────────────────────────────────────────────────────

  _buildParallax() {
    const gameH = GAME_HEIGHT - HUD_HEIGHT;
    this._bgLayers = BG_KEYS.map((key, i) => {
      const tex = this.textures.exists(key) ? key : `__placeholder_bg${i}`;
      return this.add.tileSprite(0, 0, GAME_WIDTH, gameH, tex)
        .setOrigin(0, 0)
        .setScrollFactor(0)   // We manually set tilePositionX each frame
        .setDepth(i);
    });
  }

  _buildTerrain() {
    this._terrain = new TerrainGenerator(this, 'mkr-terrain-1');
    // Force an initial build so terrain exists before player spawns
    this._terrain.update(0);
  }

  _buildPlayer() {
    // Get exact spawn Y from terrain surface
    const surfaceY = this._terrain.getYAtX(SPAWN_X);
    const spawnY   = surfaceY - 160;   // start above ground so it falls naturally

    this._player = new MechaPlayer(this, SPAWN_X, spawnY);
  }

  _buildObstacles() {
    this._obstacles = new ObstacleManager(this, this._terrain);
  }

  _buildHUD() {
    // Cockpit dashboard (camera-fixed, built entirely inside CockpitDashboard)
    this._hud = new CockpitDashboard(this);

    // ── Top progress bar ───────────────────────────────────────────────────
    const BAR_X = 60, BAR_Y = 20, BAR_W = GAME_WIDTH - 280, BAR_H = 18, R = 9;

    // Track
    const track = this.add.graphics().setScrollFactor(0).setDepth(100);
    track.fillStyle(0x111111, 0.75);
    track.fillRoundedRect(BAR_X, BAR_Y, BAR_W, BAR_H, R);
    track.lineStyle(1, 0x334466, 0.9);
    track.strokeRoundedRect(BAR_X, BAR_Y, BAR_W, BAR_H, R);

    // Fill graphics (updated each frame)
    this._progressFill = this.add.graphics().setScrollFactor(0).setDepth(101);

    // Distance text
    this._distText = this.add.text(BAR_X, BAR_Y + BAR_H + 6, '0 m', {
      fontFamily: 'monospace', fontSize: '18px', color: '#667799',
    }).setScrollFactor(0).setDepth(101);

    // Goal marker text
    this.add.text(BAR_X + BAR_W, BAR_Y + BAR_H + 6,
      `${LEVEL_LENGTH_M.toLocaleString()} m`, {
        fontFamily: 'monospace', fontSize: '18px', color: '#445566',
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(101);

    this._progressMeta = { x: BAR_X, y: BAR_Y, w: BAR_W, h: BAR_H, r: R };

    // ── Pause button ───────────────────────────────────────────────────────
    if (this.textures.exists('btn-pause')) {
      const btn = this.add.image(GAME_WIDTH - 55, 34, 'btn-pause')
        .setScrollFactor(0).setDepth(102)
        .setInteractive({ useHandCursor: true });
      btn.on('pointerup',   () => this._togglePause());
      btn.on('pointerover', () => btn.setTint(0xffcc00));
      btn.on('pointerout',  () => btn.clearTint());
    } else {
      // Procedural pause button
      const pauseBtn = this.add.rectangle(GAME_WIDTH - 55, 34, 56, 44, 0x223355, 0.9)
        .setStrokeStyle(2, 0x4466aa, 0.9)
        .setScrollFactor(0).setDepth(102)
        .setInteractive({ useHandCursor: true });
      // Draw two vertical bars
      const pauseGfx = this.add.graphics().setScrollFactor(0).setDepth(103);
      pauseGfx.fillStyle(0xaabbcc, 1);
      pauseGfx.fillRect(GAME_WIDTH - 68, 20, 9, 28);
      pauseGfx.fillRect(GAME_WIDTH - 54, 20, 9, 28);
      pauseBtn.on('pointerup',   () => this._togglePause());
      pauseBtn.on('pointerover', () => pauseBtn.setFillStyle(0x334466, 1));
      pauseBtn.on('pointerout',  () => pauseBtn.setFillStyle(0x223355, 0.9));
    }
  }

  _buildPauseMenu() {
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;

    this._pauseOverlay = this.add.container(cx, cy)
      .setScrollFactor(0).setDepth(200).setVisible(false);

    const backdrop = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6);
    const panel    = this.add.rectangle(0, 0, 620, 420, 0x0a0c18, 0.96)
      .setStrokeStyle(2, 0x223366, 1);

    const title = this.add.text(0, -150, 'PAUSED', {
      fontFamily: 'Impact, sans-serif',
      fontSize: '72px', color: '#ffcc00',
    }).setOrigin(0.5);

    const resumeBtn = this._makePauseMenuBtn(0, -40, 'RESUME',    () => this._togglePause());
    const menuBtn   = this._makePauseMenuBtn(0,  70, 'MAIN MENU', () => {
      this._cleanup();
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MainMenuScene'));
    });

    this._pauseOverlay.add([backdrop, panel, title,
      resumeBtn.bg, resumeBtn.txt, menuBtn.bg, menuBtn.txt]);
  }

  _makePauseMenuBtn(x, y, label, cb) {
    const bg = this.add.rectangle(x, y, 360, 72, 0x1a2244, 0.95)
      .setStrokeStyle(2, 0x3355aa, 0.9)
      .setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, {
      fontFamily: 'Impact, sans-serif', fontSize: '38px', color: '#ffffff',
    }).setOrigin(0.5);
    bg.on('pointerover', () => bg.setFillStyle(0x223366, 1));
    bg.on('pointerout',  () => bg.setFillStyle(0x1a2244, 0.95));
    bg.on('pointerup',   cb);
    return { bg, txt };
  }

  _buildInputHandlers() {
    const kb = this.input.keyboard;
    this._keyJump  = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this._keyJump2 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this._keyBoost = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this._keyBoost2= kb.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this._keyPause = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this._keyPause2= kb.addKey(Phaser.Input.Keyboard.KeyCodes.P);

    this._keyJump.on('down',   () => { if (!this._paused && !this._dead) this._player?.jump();  });
    this._keyJump2.on('down',  () => { if (!this._paused && !this._dead) this._player?.jump();  });
    this._keyBoost.on('down',  () => { if (!this._paused && !this._dead) this._player?.boost(); });
    this._keyBoost2.on('down', () => { if (!this._paused && !this._dead) this._player?.boost(); });
    this._keyPause.on('down',  () => this._togglePause());
    this._keyPause2.on('down', () => this._togglePause());

    // Touch zones: upper half = jump, lower half (but above HUD) = boost
    this.input.on('pointerdown', (ptr) => {
      if (this._paused || this._dead) return;
      const gameArea = GAME_HEIGHT - HUD_HEIGHT;
      if (ptr.y < gameArea / 2) {
        this._player?.jump();
      } else if (ptr.y < gameArea) {
        this._player?.boost();
      }
    });
  }

  _setupCamera() {
    const cam = this.cameras.main;
    cam.setBackgroundColor('#0a0a0f');
    // Follow the player body with slight look-ahead offset
    // We follow the torso position manually in update for fine control
    cam.setBounds(0, 0, LEVEL_LENGTH_PX + GAME_WIDTH, GAME_HEIGHT + 600);
    // Smooth follow using lerp
    this._camTargetX = SPAWN_X;
  }

  _startMusic() {
    if (this.registry.get('musicMuted')) return;
    if (!this.cache.audio.exists('music-game')) return;
    this._music = this.sound.add('music-game', { loop: true, volume: 0.45 });
    this._music.play();
  }


  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE — RUNTIME
  // ─────────────────────────────────────────────────────────────────────────

  _tickResources(dt) {
    // Passive energy drain, reduced by armor upgrade
    const armorBonus = (this.registry.get('upgradeArmor') ?? 0) * 0.08;
    const drainRate  = ENERGY_DRAIN_BASE * (1 - armorBonus);
    this._energy = Phaser.Math.Clamp(this._energy - drainRate * dt, 0, 100);

    // Heat dissipates when not boosting
    if (!this._keyBoost?.isDown && !this._keyBoost2?.isDown) {
      this._heat = Phaser.Math.Clamp(this._heat - HEAT_DISSIPATE * dt, 0, 100);
    }

    // Also sync heat to registry so MechaPlayer.boost() reads it
    this.registry.set('heat', this._heat);

    // Smooth camera follow with look-ahead
    const pos   = this._player?.getPosition();
    const vel   = this._player?.getVelocity();
    if (pos && vel) {
      const lookAhead  = Phaser.Math.Clamp(vel.x * 18, 0, 320);
      const targetX    = pos.x + lookAhead - GAME_WIDTH * 0.28;
      this._camTargetX = Phaser.Math.Linear(this._camTargetX, targetX, 0.06);
      this.cameras.main.scrollX = Math.max(0, this._camTargetX);

      // Vertical follow — keep mech in top 60% of game area
      const targetY = pos.y - GAME_HEIGHT * 0.45;
      this.cameras.main.scrollY = Phaser.Math.Linear(
        this.cameras.main.scrollY,
        Phaser.Math.Clamp(targetY, 0, 400),
        0.04
      );
    }
  }

  _updateProgressBar() {
    const m = this._progressMeta;
    if (!m || !this._progressFill) return;

    const ratio = Phaser.Math.Clamp(this._distance / LEVEL_LENGTH_M, 0, 1);

    this._progressFill.clear();

    // Background fill (empty portion)
    // Already drawn on track graphics — just draw fill
    const fillW = m.w * ratio;
    if (fillW > m.r * 2) {
      this._progressFill.fillStyle(0xff4d00, 1);
      this._progressFill.fillRoundedRect(m.x, m.y, fillW, m.h, m.r);
      // Bright leading edge
      this._progressFill.fillStyle(0xffffff, 0.6);
      this._progressFill.fillRect(m.x + fillW - 3, m.y + 2, 3, m.h - 4);
    }

    // Milestone pips every 25%
    for (let p = 1; p <= 3; p++) {
      const px = m.x + m.w * (p / 4);
      this._progressFill.lineStyle(1, ratio >= p / 4 ? 0xffffff : 0x334466, 0.6);
      this._progressFill.lineBetween(px, m.y, px, m.y + m.h);
    }

    // Distance text
    if (this._distText) {
      this._distText.setText(`${Math.floor(this._distance)} m`);
    }
  }

  _togglePause() {
    this._paused = !this._paused;

    if (this._paused) {
      this.matter.world.pause();
      this._music?.pause();
      this._pauseOverlay?.setVisible(true);
      CrazyGamesSDK.gameplayStop();
    } else {
      this.matter.world.resume();
      this._music?.resume();
      this._pauseOverlay?.setVisible(false);
      CrazyGamesSDK.gameplayStart();
    }
  }

  _triggerGameOver(reason, win = false) {
    if (this._dead) return;
    this._dead = true;

    // Player death visual
    if (!win) this._player?.die();

    this._music?.stop();
    CrazyGamesSDK.gameplayStop();

    // Update high score
    const dist = Math.floor(this._distance);
    const prev = this.registry.get('highScore') ?? 0;
    if (dist > prev) {
      this.registry.set('highScore', dist);
      try { localStorage.setItem('mkr_highScore', JSON.stringify(dist)); } catch {}
    }

    // Persist earned scrap
    const totalScrap = (this.registry.get('currency') ?? 0);
    try { localStorage.setItem('mkr_currency', JSON.stringify(totalScrap)); } catch {}

    const delay = win ? 1200 : 1800;
    this.time.delayedCall(delay, () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this._cleanup();
        this.scene.start('GameOverScene', { distance: dist, win, reason, currency: totalScrap });
      });
    });
  }

  _cleanup() {
    this._music?.stop();
    this._terrain?.destroy();
    this._obstacles?.destroy();
    this._player?.destroy();
    CrazyGamesSDK.gameplayStop();
  }
}
