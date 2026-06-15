/**
 * @file GameOverScene.js
 * @description End-of-run summary: distance, scrap earned, high-score badge,
 *              rewarded-ad double-scrap offer, Play Again / Main Menu buttons.
 *
 * Receives from GameScene.start():
 *   { distance: number, win: boolean, reason: string, currency: number }
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main.js';
import { CrazyGamesSDK } from '../utils/CrazyGamesSDK.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
    this._data      = null;
    this._adWatched = false;
  }

  init(data) {
    this._data = {
      distance: 0,
      win:      false,
      reason:   'DESTROYED',
      currency: 0,
      ...data,
    };
    this._adWatched = false;
  }

  create() {
    this._buildBg();
    this._buildBanner();
    this._buildStats();
    this._buildButtons();
    this._buildAdOffer();
    this.cameras.main.fadeIn(350, 0, 0, 0);
    CrazyGamesSDK.gameplayStop();
  }

  // ── BUILD ──────────────────────────────────────────────────────────────

  _buildBg() {
    const { win } = this._data;
    const bgTint  = win ? 0xffffff : 0x661111;

    // Parallax bg reuse
    if (this.textures.exists('bg-sky')) {
      this.add.image(0, 0, 'bg-sky')
        .setOrigin(0)
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
        .setTint(bgTint)
        .setDepth(0);
    }

    // Dark overlay
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT,
      win ? 0x001122 : 0x110000, 0.78).setDepth(1);

    // Particle atmosphere (sparks on win, smoke on lose)
    const particleKey = win ? 'particle-spark' : 'particle-smoke';
    if (this.textures.exists(particleKey)) {
      this.add.particles(GAME_WIDTH / 2, GAME_HEIGHT / 2, particleKey, {
        speed:     { min: 20,  max: 80 },
        angle:     { min: 0,   max: 360 },
        scale:     { start: win ? 0.8 : 0.3, end: 0 },
        alpha:     { start: win ? 0.6 : 0.3, end: 0 },
        lifespan:  win ? 2000 : 3000,
        frequency: 80,
        blendMode: win ? 'ADD' : 'NORMAL',
        tint:      win ? [0xffcc00, 0xffffff] : [0x444444, 0x222222],
        emitZone:  { type: 'random', source: new Phaser.Geom.Rectangle(-GAME_WIDTH/2, -GAME_HEIGHT/2, GAME_WIDTH, GAME_HEIGHT) },
      }).setDepth(2);
    }
  }

  _buildBanner() {
    const { win, reason } = this._data;
    const cx = GAME_WIDTH / 2;

    const bannerTxt   = win ? 'MISSION COMPLETE!' : 'MECH DESTROYED';
    const bannerColor = win ? '#ffcc00' : '#ff2200';

    const banner = this.add.text(cx, 140, bannerTxt, {
      fontFamily: 'Impact, sans-serif',
      fontSize:   '100px',
      color:      bannerColor,
      stroke:     '#000000',
      strokeThickness: 7,
      shadow: { blur: 50, color: bannerColor + '66', fill: true },
    }).setOrigin(0.5).setDepth(3);

    // Entrance tween
    banner.setAlpha(0).setScale(1.3);
    this.tweens.add({ targets: banner, alpha: 1, scaleX: 1, scaleY: 1, duration: 450, ease: 'Back.Out' });

    if (!win) {
      this.add.text(cx, 258, reason, {
        fontFamily: 'monospace', fontSize: '30px', color: '#ff6655',
      }).setOrigin(0.5).setDepth(3);
    }
  }

  _buildStats() {
    const { distance, currency, win } = this._data;
    const cx = GAME_WIDTH / 2;

    const highScore = this.registry.get('highScore') ?? 0;
    const isNewHS   = distance >= highScore && distance > 0;

    // Stats card
    const cardY = 460;
    const g     = this.add.graphics().setDepth(3);
    g.fillStyle(0x000000, 0.72);
    g.fillRoundedRect(cx - 370, cardY - 160, 740, 320, 16);
    g.lineStyle(2, 0x334466, 0.8);
    g.strokeRoundedRect(cx - 370, cardY - 160, 740, 320, 16);

    const rows = [
      ['DISTANCE',    `${distance.toLocaleString()} m`,              '#aabbff'],
      ['SCRAP EARNED',`⚙ ${currency.toLocaleString()}`,               '#ffdd88'],
      ['HIGH SCORE',  `${highScore.toLocaleString()} m${isNewHS ? '  🏆 NEW!' : ''}`,
                      isNewHS ? '#ffcc00' : '#667799'],
    ];

    rows.forEach(([label, value, color], i) => {
      const rowY = cardY - 80 + i * 82;
      this.add.text(cx - 300, rowY, label, {
        fontFamily: 'monospace', fontSize: '26px', color: '#445566',
      }).setOrigin(0, 0.5).setDepth(4);

      this.add.text(cx + 300, rowY, value, {
        fontFamily: 'Impact, sans-serif', fontSize: '32px', color,
      }).setOrigin(1, 0.5).setDepth(4);
    });
  }

  _buildButtons() {
    const cx   = GAME_WIDTH / 2;
    const btnY = GAME_HEIGHT - 210;

    this._makeBtn(cx - 230, btnY, 'PLAY AGAIN', 0xff4d00, () => {
      this.cameras.main.fadeOut(280, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameScene'));
    });

    this._makeBtn(cx + 230, btnY, 'MAIN MENU', 0x1e3a8a, () => {
      this.cameras.main.fadeOut(280, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MainMenuScene'));
    });
  }

  _buildAdOffer() {
    const cx = GAME_WIDTH / 2;

    const offer = this.add.text(cx, GAME_HEIGHT - 108,
      '📺  Watch an ad to DOUBLE your scrap!', {
        fontFamily: 'monospace', fontSize: '26px', color: '#ffdd44',
      }).setOrigin(0.5).setDepth(4)
      .setInteractive({ useHandCursor: true });

    offer.on('pointerover', () => offer.setColor('#ffffff'));
    offer.on('pointerout',  () => offer.setColor('#ffdd44'));
    offer.on('pointerup',   () => this._triggerRewardedAd(offer));

    // If ads are blocked, dim the offer
    if (CrazyGamesSDK.isAdBlocked()) {
      offer.setColor('#334455').setAlpha(0.5).disableInteractive();
    }
  }

  async _triggerRewardedAd(offerText) {
    if (this._adWatched) return;
    offerText.setText('⏳ Loading ad…').disableInteractive().setColor('#888888');

    try {
      await CrazyGamesSDK.requestAd('rewarded');
      this._adWatched = true;

      const newCurrency = this._data.currency * 2;
      this._data.currency = newCurrency;
      this.registry.set('currency', newCurrency);
      try { localStorage.setItem('mkr_currency', JSON.stringify(newCurrency)); } catch {}

      offerText.setText(`✓ Scrap doubled!  ⚙ ${newCurrency.toLocaleString()}`)
        .setColor('#44ff88');

    } catch (err) {
      console.warn('[GameOver] Ad failed:', err);
      offerText.setText('Ad unavailable — try again later').setColor('#ff4444');
      this.time.delayedCall(3000, () => {
        offerText.setText('📺  Watch an ad to DOUBLE your scrap!')
          .setColor('#ffdd44')
          .setInteractive({ useHandCursor: true });
      });
    }
  }

  _makeBtn(x, y, label, color, cb) {
    const bg = this.add.rectangle(x, y, 380, 82, color, 0.90)
      .setStrokeStyle(2, 0xffffff, 0.45)
      .setInteractive({ useHandCursor: true })
      .setDepth(4);

    const txt = this.add.text(x, y, label, {
      fontFamily: 'Impact, sans-serif', fontSize: '40px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(4);

    bg.on('pointerover', () => this.tweens.add({ targets: [bg, txt], scaleX: 1.05, scaleY: 1.05, duration: 70 }));
    bg.on('pointerout',  () => this.tweens.add({ targets: [bg, txt], scaleX: 1,    scaleY: 1,    duration: 70 }));
    bg.on('pointerdown', () => this.tweens.add({ targets: [bg, txt], scaleX: 0.96, scaleY: 0.96, duration: 55 }));
    bg.on('pointerup',   () => {
      this.tweens.add({
        targets: [bg, txt], scaleX: 1, scaleY: 1, duration: 55,
        onComplete: cb,
      });
    });
  }
}
