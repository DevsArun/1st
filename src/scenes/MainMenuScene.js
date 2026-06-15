/**
 * @file MainMenuScene.js
 * @description Title screen — 4-layer idle parallax, logo, Play/Garage buttons,
 *              high-score display, and mute toggle. No DOM elements.
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main.js';
import { CrazyGamesSDK } from '../utils/CrazyGamesSDK.js';

// Idle parallax drift speeds (px/sec per layer)
const IDLE_SCROLL = [12, 35, 70, 0];

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
    this._layers = [];
    this._music  = null;
  }

  create() {
    this._buildBg();
    this._buildLogo();
    this._buildButtons();
    this._buildFooter();
    this._buildMuteBtn();
    this._startMusic();
    CrazyGamesSDK.gameplayStop();
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  update(_, delta) {
    const dt = delta / 1000;
    this._layers.forEach((layer, i) => {
      if (layer) layer.tilePositionX += IDLE_SCROLL[i] * dt;
    });
  }

  // ── BUILD ──────────────────────────────────────────────────────────────

  _buildBg() {
    const keys = ['bg-sky', 'bg-city', 'bg-midground', 'bg-foreground'];
    this._layers = keys.map((key, i) =>
      this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, key)
        .setOrigin(0, 0)
        .setDepth(i)
    );

    // Dark gradient overlay to make text legible
    const overlay = this.add.graphics().setDepth(4);
    overlay.fillStyle(0x000000, 0.45);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  _buildLogo() {
    const cx = GAME_WIDTH / 2;

    if (this.textures.exists('logo') && this.textures.get('logo').getSourceImage().width > 4) {
      this.add.image(cx, 210, 'logo').setOrigin(0.5).setDepth(5);
    } else {
      this.add.text(cx, 200, 'MECHA KAIJU RUSH', {
        fontFamily: "'Impact', 'Arial Black', sans-serif",
        fontSize:   '110px',
        color:      '#ff4d00',
        stroke:     '#000000',
        strokeThickness: 8,
        shadow: { blur: 50, color: '#ff4d0066', fill: true },
      }).setOrigin(0.5).setDepth(5);
    }

    this.add.text(cx, 360, 'CRUSH  ·  SMASH  ·  SURVIVE', {
      fontFamily: 'monospace',
      fontSize:   '30px',
      color:      '#ffcc00',
      letterSpacing: 6,
    }).setOrigin(0.5).setDepth(5);

    // Animated chevron hint
    const chevron = this.add.text(cx, 820, '▼  TAP TO BEGIN  ▼', {
      fontFamily: 'monospace', fontSize: '24px', color: '#667799',
    }).setOrigin(0.5).setDepth(5);

    this.tweens.add({
      targets: chevron, alpha: 0.2, duration: 900,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });
  }

  _buildButtons() {
    const cx = GAME_WIDTH / 2;

    this._makeBtn(cx, 520, 'PLAY', 0xff4d00, 400, 86, () => {
      this._music?.stop();
      this.cameras.main.fadeOut(350, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameScene'));
    });

    this._makeBtn(cx, 638, 'GARAGE  /  UPGRADES', 0x1e3a8a, 400, 74, () => {
      this._music?.stop();
      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GarageScene'));
    });
  }

  _makeBtn(x, y, label, color, w, h, cb) {
    const bg = this.add.rectangle(x, y, w, h, color, 0.88)
      .setStrokeStyle(2, 0xffffff, 0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(5);

    const txt = this.add.text(x, y, label, {
      fontFamily: "'Impact','Arial Black',sans-serif",
      fontSize:   '38px',
      color:      '#ffffff',
    }).setOrigin(0.5).setDepth(5);

    bg.on('pointerover', () => {
      bg.setFillStyle(color, 1.0);
      this.tweens.add({ targets: [bg, txt], scaleX: 1.04, scaleY: 1.04, duration: 70 });
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(color, 0.88);
      this.tweens.add({ targets: [bg, txt], scaleX: 1, scaleY: 1, duration: 70 });
    });
    bg.on('pointerdown', () => {
      this.tweens.add({ targets: [bg, txt], scaleX: 0.96, scaleY: 0.96, duration: 55 });
    });
    bg.on('pointerup', () => {
      this.tweens.add({ targets: [bg, txt], scaleX: 1, scaleY: 1, duration: 55 });
      cb();
    });
  }

  _buildFooter() {
    const hs = this.registry.get('highScore') ?? 0;
    const cu = this.registry.get('currency')  ?? 0;

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 56,
      `HIGH SCORE: ${hs.toLocaleString()} m      ⚙ SCRAP: ${cu.toLocaleString()}`, {
        fontFamily: 'monospace', fontSize: '24px', color: '#445566',
      }).setOrigin(0.5).setDepth(5);

    // Version / controls hint
    this.add.text(20, GAME_HEIGHT - 20,
      'SPACE/TAP: jump   SHIFT/SWIPE: boost   ESC: pause', {
        fontFamily: 'monospace', fontSize: '17px', color: '#2a3a4a',
      }).setOrigin(0, 1).setDepth(5);
  }

  _buildMuteBtn() {
    const muted = this.registry.get('sfxMuted') ?? false;
    const btn = this.add.text(GAME_WIDTH - 56, 44,
      muted ? '🔇' : '🔊', { fontSize: '38px' })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setDepth(6);

    btn.on('pointerup', () => {
      const now = !this.registry.get('sfxMuted');
      this.registry.set('sfxMuted', now);
      this.registry.set('musicMuted', now);
      btn.setText(now ? '🔇' : '🔊');
      try { localStorage.setItem('mkr_sfxMuted',   JSON.stringify(now)); } catch {}
      try { localStorage.setItem('mkr_musicMuted', JSON.stringify(now)); } catch {}
      if (now) { this._music?.pause(); } else { this._music?.resume(); }
    });
  }

  _startMusic() {
    if (this.registry.get('musicMuted')) return;
    if (!this.cache.audio.exists('music-menu')) return;
    // Avoid double-playing if scene restarts
    if (this.sound.get('music-menu')?.isPlaying) return;
    this._music = this.sound.add('music-menu', { loop: true, volume: 0.38 });
    this._music.play();
  }
}
