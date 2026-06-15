/**
 * @file PreloadScene.js
 * @description Asset loading + procedural placeholder texture generation.
 *
 * KEY FEATURE: If any real asset fails to load (404), we generate a
 * procedural canvas texture for it so the game runs completely without
 * any art files. This means `npm run dev` works immediately out of the box.
 *
 * PLACEHOLDER SYSTEM
 * ─────────────────────────────────────────────────────────────────────────
 *  _generatePlaceholders() is called BEFORE queueing real assets.
 *  It uses this.textures.createCanvas() to draw colored shapes.
 *  Real assets loaded afterwards REPLACE these textures if they succeed.
 *  On loaderror, the placeholder already exists so Phaser keeps using it.
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main.js';

// ─── Asset Manifest ────────────────────────────────────────────────────────
const IMAGES = [
  { key: 'bg-sky',             path: 'assets/bg/sky.png' },
  { key: 'bg-city',            path: 'assets/bg/city.png' },
  { key: 'bg-midground',       path: 'assets/bg/midground.png' },
  { key: 'bg-foreground',      path: 'assets/bg/foreground.png' },
  { key: 'mech-torso',         path: 'assets/mech/torso.png' },
  { key: 'mech-leg-l',         path: 'assets/mech/leg_left.png' },
  { key: 'mech-leg-r',         path: 'assets/mech/leg_right.png' },
  { key: 'mech-thruster',      path: 'assets/mech/thruster.png' },
  { key: 'obs-car',            path: 'assets/obstacles/car.png' },
  { key: 'obs-building',       path: 'assets/obstacles/building.png' },
  { key: 'obs-barrel',         path: 'assets/obstacles/barrel.png' },
  { key: 'particle-spark',     path: 'assets/fx/spark.png' },
  { key: 'particle-debris',    path: 'assets/fx/debris.png' },
  { key: 'particle-smoke',     path: 'assets/fx/smoke.png' },
  { key: 'btn-pause',          path: 'assets/ui/btn_pause.png' },
  { key: 'logo',               path: 'assets/ui/logo.png' },
];

const SPRITESHEETS = [
  { key: 'mech-walk',  path: 'assets/mech/mech_walk.png',  frame: { frameWidth: 256, frameHeight: 256 } },
  { key: 'explosion',  path: 'assets/fx/explosion.png',     frame: { frameWidth: 128, frameHeight: 128 } },
];

const AUDIO = [
  { key: 'sfx-impact-heavy', path: 'assets/audio/impact_heavy.ogg' },
  { key: 'sfx-impact-light', path: 'assets/audio/impact_light.ogg' },
  { key: 'sfx-thruster',     path: 'assets/audio/thruster_loop.ogg' },
  { key: 'sfx-explosion',    path: 'assets/audio/explosion.ogg' },
  { key: 'sfx-jump',         path: 'assets/audio/jump.ogg' },
  { key: 'music-game',       path: 'assets/audio/music_game.ogg' },
  { key: 'music-menu',       path: 'assets/audio/music_menu.ogg' },
];


export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
    this._barFill = null;
    this._pctText = null;
    this._barX = 0; this._barY = 0; this._barW = 0; this._barH = 0;
  }

  // ─────────────────────────────────────────────────────────────────────────

  preload() {
    this._buildProgressUI();
    // Generate ALL placeholders first — guarantees no null textures
    this._generatePlaceholders();
    this._queueRealAssets();
    this._hookLoadEvents();
  }

  create() {
    this._persistRegistry();
    this._buildAnimations();

    if (this._isPortrait()) {
      this._showRotatePrompt();
    } else {
      this.scene.start('MainMenuScene');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE — PROGRESS UI
  // ─────────────────────────────────────────────────────────────────────────

  _buildProgressUI() {
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;

    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x080c18);

    this.add.text(cx, cy - 130, 'MECHA KAIJU RUSH', {
      fontFamily: "'Impact', 'Arial Black', sans-serif",
      fontSize: '76px', color: '#ff4d00',
      stroke: '#000', strokeThickness: 6,
      shadow: { blur: 40, color: '#ff4d0066', fill: true },
    }).setOrigin(0.5);

    this.add.text(cx, cy - 40, 'LOADING', {
      fontFamily: 'monospace', fontSize: '22px', color: '#334466',
    }).setOrigin(0.5);

    const BW = 640, BH = 22, BX = cx - BW / 2, BY = cy + 10;
    this.add.graphics()
      .fillStyle(0x0d1020, 1).fillRoundedRect(BX - 2, BY - 2, BW + 4, BH + 4, 11)
      .lineStyle(1, 0x334466, 0.9).strokeRoundedRect(BX, BY, BW, BH, 9);

    this._barFill = this.add.graphics();
    this._pctText = this.add.text(cx, BY + BH + 18, '0%', {
      fontFamily: 'monospace', fontSize: '20px', color: '#445577',
    }).setOrigin(0.5, 0);

    this._barX = BX; this._barY = BY; this._barW = BW; this._barH = BH;
  }

  _hookLoadEvents() {
    this.load.on('progress', (v) => {
      this._barFill.clear();
      this._barFill.fillStyle(0xff4d00, 1);
      this._barFill.fillRoundedRect(this._barX, this._barY, this._barW * v, this._barH, 9);
      // Bright leading edge
      if (v > 0.04) {
        this._barFill.fillStyle(0xffffff, 0.5);
        this._barFill.fillRect(this._barX + this._barW * v - 3, this._barY + 3, 3, this._barH - 6);
      }
      this._pctText?.setText(`${Math.floor(v * 100)}%`);
    });

    this.load.on('complete', () => this._pctText?.setText('100%'));

    // Non-fatal — placeholder already covers any missing file
    this.load.on('loaderror', (file) => {
      console.info(`[Preload] Asset missing (using placeholder): ${file.key}`);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE — PLACEHOLDER TEXTURES
  // ─────────────────────────────────────────────────────────────────────────

  _generatePlaceholders() {
    this._makeBgSky();
    this._makeBgCity();
    this._makeBgMidground();
    this._makeBgForeground();
    this._makeMechTorso();
    this._makeMechWheel();
    this._makeObstacleCar();
    this._makeObstacleBuilding();
    this._makeObstacleBarrel();
    this._makeParticleSpark();
    this._makeParticleSmoke();
    this._makeParticleDebris();
    this._makePauseButton();
    this._makeLogo();
  }

  /** Helper: create a named canvas texture. */
  _canvas(key, w, h) {
    if (this.textures.exists(key)) this.textures.remove(key);
    return this.textures.createCanvas(key, w, h);
  }

  _makeBgSky() {
    const t = this._canvas('bg-sky', 1920, 860);
    const ctx = t.getContext();
    // Gradient sky: ochre → amber
    const grad = ctx.createLinearGradient(0, 0, 0, 860);
    grad.addColorStop(0,   '#c8781a');
    grad.addColorStop(0.4, '#d4950a');
    grad.addColorStop(0.8, '#b87020');
    grad.addColorStop(1,   '#8b5014');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1920, 860);
    // Sun
    ctx.beginPath();
    ctx.arc(1400, 140, 90, 0, Math.PI * 2);
    const sunGrad = ctx.createRadialGradient(1400, 140, 0, 1400, 140, 90);
    sunGrad.addColorStop(0, '#ffffcc');
    sunGrad.addColorStop(0.4, '#ffdd44');
    sunGrad.addColorStop(1, 'rgba(255,180,0,0)');
    ctx.fillStyle = sunGrad;
    ctx.fill();
    // Cloud wisps
    ctx.fillStyle = 'rgba(255,220,150,0.15)';
    [[200,120,280,40],[600,80,320,30],[900,160,200,25],[1100,100,250,28]].forEach(([x,y,w,h]) => {
      ctx.beginPath(); ctx.ellipse(x,y,w,h,0,0,Math.PI*2); ctx.fill();
    });
    // Haze layer at bottom
    const hazeGrad = ctx.createLinearGradient(0, 600, 0, 860);
    hazeGrad.addColorStop(0, 'rgba(180,100,30,0)');
    hazeGrad.addColorStop(1, 'rgba(100,60,20,0.6)');
    ctx.fillStyle = hazeGrad;
    ctx.fillRect(0, 0, 1920, 860);
    t.refresh();
  }

  _makeBgCity() {
    const t = this._canvas('bg-city', 1920, 860);
    const ctx = t.getContext();
    ctx.clearRect(0, 0, 1920, 860);
    // Distant ruined skyline silhouette
    ctx.fillStyle = 'rgba(80,50,20,0.55)';
    const buildings = [
      [0,520,160,340],[150,480,100,380],[240,440,80,420],[310,500,120,360],[420,420,90,440],
      [500,460,150,400],[640,380,70,480],[700,430,110,430],[800,470,130,390],[920,400,80,460],
      [990,450,160,410],[1140,390,70,470],[1200,470,130,390],[1320,420,100,440],[1410,480,140,380],
      [1540,440,80,420],[1610,410,120,450],[1720,460,110,400],[1820,490,100,370],
    ];
    buildings.forEach(([x,y,w,h]) => {
      ctx.fillRect(x, y, w, h);
      // Ruined top
      ctx.clearRect(x+5, y, 10, 20);
      ctx.clearRect(x+w-20, y, 15, 15);
    });
    // Mountains behind
    ctx.fillStyle = 'rgba(100,65,25,0.4)';
    ctx.beginPath(); ctx.moveTo(0, 860);
    const mtPts = [[0,680],[200,580],[400,640],[600,520],[800,600],[1000,540],[1200,620],[1400,560],[1600,620],[1800,570],[1920,600],[1920,860]];
    mtPts.forEach(([x,y]) => ctx.lineTo(x,y));
    ctx.closePath(); ctx.fill();
    t.refresh();
  }


  _makeBgMidground() {
    const t = this._canvas('bg-midground', 1920, 860);
    const ctx = t.getContext();
    ctx.clearRect(0, 0, 1920, 860);
    ctx.fillStyle = 'rgba(60,38,14,0.65)';
    // Ruined structures + power poles
    [[50,620,40,180],[180,580,60,220],[350,600,30,200],[500,570,50,230],
     [700,590,80,210],[900,610,35,190],[1050,565,65,225],[1200,595,50,205],
     [1350,580,40,210],[1500,600,55,200],[1650,570,35,220],[1800,590,60,200]].forEach(([x,y,w,h]) => {
      ctx.fillRect(x, y, w, h);
    });
    // Power line poles
    ctx.strokeStyle = 'rgba(60,38,14,0.5)';
    ctx.lineWidth = 4;
    for (let px = 100; px < 1900; px += 220) {
      ctx.beginPath(); ctx.moveTo(px, 760); ctx.lineTo(px, 600); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px-30, 620); ctx.lineTo(px+30, 620); ctx.stroke();
    }
    // Power lines (sagging)
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(60,38,14,0.35)';
    for (let px = 100; px < 1700; px += 220) {
      ctx.beginPath(); ctx.moveTo(px, 618);
      ctx.quadraticCurveTo(px+110, 640, px+220, 618);
      ctx.stroke();
    }
    t.refresh();
  }

  _makeBgForeground() {
    const t = this._canvas('bg-foreground', 1920, 860);
    const ctx = t.getContext();
    ctx.clearRect(0, 0, 1920, 860);
    // Foreground rocks and debris silhouettes
    ctx.fillStyle = 'rgba(50,30,10,0.7)';
    [[0,760,200,100],[300,770,150,90],[550,780,100,80],[750,765,180,95],
     [1000,775,120,85],[1200,760,160,100],[1400,770,130,90],[1600,780,200,80],[1850,755,70,105]].forEach(([x,y,w,h]) => {
      ctx.beginPath(); ctx.ellipse(x+w/2, y+h/2, w/2, h/2, 0, 0, Math.PI*2); ctx.fill();
    });
    t.refresh();
  }

  _makeMechTorso() {
    const t = this._canvas('mech-torso', 160, 110);
    const ctx = t.getContext();
    // Body
    ctx.fillStyle = '#445566'; ctx.fillRect(20, 15, 120, 80);
    // Armor plates
    ctx.fillStyle = '#2a3a4a'; ctx.fillRect(35, 20, 90, 45);
    // Visor
    ctx.fillStyle = '#00aaff'; ctx.fillRect(45, 22, 70, 14);
    ctx.fillStyle = 'rgba(0,180,255,0.3)'; ctx.fillRect(45, 22, 70, 14);
    // Shoulder pads
    ctx.fillStyle = '#334455'; ctx.fillRect(8, 15, 18, 55); ctx.fillRect(134, 15, 18, 55);
    // Engine glow
    ctx.fillStyle = '#ff4400'; ctx.fillRect(10, 55, 12, 28);
    // Highlight stripe
    ctx.fillStyle = 'rgba(150,200,255,0.2)'; ctx.fillRect(20, 15, 120, 8);
    t.refresh();
  }

  _makeMechWheel() {
    const t = this._canvas('mech-leg-l', 100, 100);
    const ctx = t.getContext();
    ctx.clearRect(0, 0, 100, 100);
    // Tyre
    ctx.beginPath(); ctx.arc(50, 50, 44, 0, Math.PI*2);
    ctx.fillStyle = '#222222'; ctx.fill();
    ctx.lineStyle = 7; ctx.strokeStyle = '#111'; ctx.lineWidth = 7; ctx.stroke();
    // Spokes
    ctx.strokeStyle = '#555'; ctx.lineWidth = 4;
    for (let i = 0; i < 4; i++) {
      const a = (i/4)*Math.PI*2;
      ctx.beginPath(); ctx.moveTo(50, 50);
      ctx.lineTo(50 + Math.cos(a)*40, 50 + Math.sin(a)*40); ctx.stroke();
    }
    // Hub
    ctx.beginPath(); ctx.arc(50, 50, 10, 0, Math.PI*2);
    ctx.fillStyle = '#888'; ctx.fill();
    t.refresh();
  }

  _makeObstacleCar() {
    const t = this._canvas('obs-car', 164, 72);
    const ctx = t.getContext();
    // Body
    ctx.fillStyle = '#5577aa'; ctx.fillRect(10, 26, 144, 40);
    // Cab
    ctx.fillStyle = '#446688'; ctx.fillRect(40, 8, 80, 24);
    // Windows
    ctx.fillStyle = 'rgba(180,220,255,0.5)'; ctx.fillRect(44, 10, 34, 18); ctx.fillRect(82, 10, 34, 18);
    // Wheels
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(30,60,13,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(134,60,13,0,Math.PI*2); ctx.fill();
    // Rust
    ctx.fillStyle = 'rgba(120,60,20,0.3)'; ctx.fillRect(10, 40, 40, 15); ctx.fillRect(120, 32, 30, 10);
    t.refresh();
  }

  _makeObstacleBuilding() {
    const t = this._canvas('obs-building', 204, 310);
    const ctx = t.getContext();
    ctx.fillStyle = '#445533'; ctx.fillRect(10, 20, 184, 290);
    // Windows (mostly dark/broken)
    ctx.fillStyle = '#222'; 
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 4; col++) {
        if (Math.random() > 0.3) {
          ctx.fillRect(20 + col*44, 35 + row*44, 30, 26);
        }
      }
    }
    // Cracks
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(50, 50); ctx.lineTo(70, 120); ctx.lineTo(90, 200); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(150, 30); ctx.lineTo(130, 100); ctx.stroke();
    // Broken top
    ctx.fillStyle = '#333'; ctx.fillRect(10, 20, 60, 20); ctx.fillRect(130, 20, 50, 25);
    t.refresh();
  }

  _makeObstacleBarrel() {
    const t = this._canvas('obs-barrel', 52, 62);
    const ctx = t.getContext();
    ctx.fillStyle = '#7a5c2e'; ctx.fillRect(8, 4, 36, 54);
    // Bands
    ctx.strokeStyle = '#5a3c0e'; ctx.lineWidth = 3;
    [15, 30, 46].forEach(y => { ctx.beginPath(); ctx.moveTo(8,y); ctx.lineTo(44,y); ctx.stroke(); });
    // Hazard symbol hint
    ctx.fillStyle = 'rgba(255,200,0,0.6)'; ctx.fillRect(16, 20, 20, 20);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.arc(26, 30, 6, 0, Math.PI*2); ctx.fill();
    t.refresh();
  }


  _makeParticleSpark() {
    const t = this._canvas('particle-spark', 16, 16);
    const ctx = t.getContext();
    const grad = ctx.createRadialGradient(8,8,0,8,8,8);
    grad.addColorStop(0,   'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(255,220,80,0.9)');
    grad.addColorStop(1,   'rgba(255,100,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);
    t.refresh();
  }

  _makeParticleSmoke() {
    const t = this._canvas('particle-smoke', 48, 48);
    const ctx = t.getContext();
    const grad = ctx.createRadialGradient(24,24,0,24,24,24);
    grad.addColorStop(0,   'rgba(120,120,120,0.7)');
    grad.addColorStop(0.5, 'rgba(80,80,80,0.4)');
    grad.addColorStop(1,   'rgba(50,50,50,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 48, 48);
    t.refresh();
  }

  _makeParticleDebris() {
    const t = this._canvas('particle-debris', 24, 16);
    const ctx = t.getContext();
    ctx.fillStyle = '#886644';
    ctx.fillRect(0, 0, 24, 16);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, 0, 12, 8);
    t.refresh();
  }

  _makePauseButton() {
    const t = this._canvas('btn-pause', 64, 64);
    const ctx = t.getContext();
    // Circle background
    ctx.beginPath(); ctx.arc(32, 32, 30, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(20,30,60,0.85)'; ctx.fill();
    ctx.strokeStyle = '#334488'; ctx.lineWidth = 2; ctx.stroke();
    // Two bars
    ctx.fillStyle = '#aabbcc';
    ctx.fillRect(16, 18, 10, 28);
    ctx.fillRect(38, 18, 10, 28);
    t.refresh();
  }

  _makeLogo() {
    // Logo is rendered as text in MainMenuScene fallback — just need a blank key
    const t = this._canvas('logo', 2, 2);
    t.refresh();
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE — REAL ASSET LOADING
  // ─────────────────────────────────────────────────────────────────────────

  _queueRealAssets() {
    // Images — silently ignored if 404 (placeholder already exists)
    IMAGES.forEach(({ key, path }) => {
      if (!this.textures.exists(key)) this.load.image(key, path);
    });

    SPRITESHEETS.forEach(({ key, path, frame }) => {
      if (!this.textures.exists(key)) this.load.spritesheet(key, path, frame);
    });

    AUDIO.forEach(({ key, path }) => {
      if (!this.cache.audio.exists(key)) this.load.audio(key, path);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE — ANIMATIONS
  // ─────────────────────────────────────────────────────────────────────────

  _buildAnimations() {
    if (this.textures.exists('mech-walk') && !this.anims.exists('mech-walk')) {
      this.anims.create({
        key: 'mech-walk',
        frames: this.anims.generateFrameNumbers('mech-walk', { start: 0, end: 7 }),
        frameRate: 16,
        repeat: -1,
      });
    }
    if (this.textures.exists('explosion') && !this.anims.exists('explosion')) {
      this.anims.create({
        key: 'explosion',
        frames: this.anims.generateFrameNumbers('explosion', { start: 0, end: 11 }),
        frameRate: 24,
        repeat: 0,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE — PERSISTENCE
  // ─────────────────────────────────────────────────────────────────────────

  _persistRegistry() {
    ['highScore','currency','upgradeEngine','upgradeArmor','upgradePlasma','sfxMuted','musicMuted']
      .forEach((k) => {
        try { localStorage.setItem(`mkr_${k}`, JSON.stringify(this.registry.get(k))); } catch {}
      });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE — ORIENTATION
  // ─────────────────────────────────────────────────────────────────────────

  _isPortrait() { return window.innerHeight > window.innerWidth; }

  _showRotatePrompt() {
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;
    const overlay = this.add.container(cx, cy);
    const bg      = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.9);
    const icon    = this.add.text(0, -80, '🔄', { fontSize: '96px' }).setOrigin(0.5);
    const lbl     = this.add.text(0, 40, 'ROTATE YOUR DEVICE\nTO LANDSCAPE', {
      fontFamily: 'Impact, sans-serif', fontSize: '48px',
      color: '#ffffff', align: 'center',
    }).setOrigin(0.5);
    overlay.add([bg, icon, lbl]);

    const timer = this.time.addEvent({
      delay: 300, loop: true,
      callback: () => {
        if (!this._isPortrait()) {
          timer.destroy();
          overlay.destroy();
          this.scene.start('MainMenuScene');
        }
      },
    });
  }
}
