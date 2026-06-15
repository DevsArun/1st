/**
 * @file GarageScene.js
 * @description Mech upgrade screen — Engine / Armor / Plasma, 5 levels each.
 * Currency (Scrap) is earned during runs and spent here.
 * All state lives in the Phaser registry and is persisted to localStorage.
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main.js';

const MAX_LEVEL = 5;
const COSTS     = [500, 1_200, 2_500, 5_000, 10_000];

const UPGRADES = [
  {
    key:   'upgradeEngine',
    label: 'ENGINE CORE',
    color: 0xff4d00,
    icon:  '⚡',
    perks: ['+ Base speed', '+ Acceleration', '+ Top speed', '++ Boost power', 'MAX OVERDRIVE'],
    stat:  'Speed multiplier',
    statFn: (lvl) => `${(1 + lvl * 0.12).toFixed(2)}×`,
  },
  {
    key:   'upgradeArmor',
    label: 'ARMOR PLATING',
    color: 0x2255bb,
    icon:  '🛡',
    perks: ['+ Impact resist', '+ Energy pool', '+ Drain shield', '++ Barrier', 'INDESTRUCTIBLE'],
    stat:  'Damage reduction',
    statFn: (lvl) => `${Math.round(lvl * 12)}%`,
  },
  {
    key:   'upgradePlasma',
    label: 'PLASMA CANNON',
    color: 0xaa22cc,
    icon:  '☢',
    perks: ['+ Heat capacity', '+ Blast radius', '+ Charge rate', '++ Plasma burst', 'SINGULARITY'],
    stat:  'Heat cap bonus',
    statFn: (lvl) => `+${lvl * 10}`,
  },
];

export default class GarageScene extends Phaser.Scene {
  constructor() { super({ key: 'GarageScene' }); }

  create() {
    this._buildBg();
    this._buildHeader();
    this._buildPanels();
    this._buildBackBtn();
    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  // ── BUILD ──────────────────────────────────────────────────────────────

  _buildBg() {
    // Use sky placeholder (always available via PreloadScene generation)
    this.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, 'bg-sky')
      .setOrigin(0, 0).setDepth(0).setTint(0x884422);

    // Dark overlay
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.70)
      .setDepth(1);

    // Top accent line
    this.add.rectangle(GAME_WIDTH / 2, 2, GAME_WIDTH, 4, 0xff4d00, 0.8).setDepth(2);
  }

  _buildHeader() {
    const cx = GAME_WIDTH / 2;
    this.add.text(cx, 70, 'GARAGE', {
      fontFamily: "'Impact','Arial Black',sans-serif",
      fontSize: '96px', color: '#ffcc00',
      stroke: '#000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(2);

    const scrap = this.registry.get('currency') ?? 0;
    this._scrapText = this.add.text(cx, 160, `⚙  SCRAP:  ${scrap.toLocaleString()}`, {
      fontFamily: 'monospace', fontSize: '34px', color: '#ffdd88',
    }).setOrigin(0.5).setDepth(2);
  }

  _buildPanels() {
    const panelW = 500;
    const panelH = 560;
    const gap    = 60;
    const totalW = UPGRADES.length * panelW + (UPGRADES.length - 1) * gap;
    const startX = GAME_WIDTH / 2 - totalW / 2 + panelW / 2;
    const cy     = GAME_HEIGHT / 2 + 70;

    UPGRADES.forEach((upg, i) => {
      this._buildPanel(startX + i * (panelW + gap), cy, panelW, panelH, upg);
    });
  }

  _buildPanel(cx, cy, w, h, upg) {
    const level     = this.registry.get(upg.key) ?? 0;
    const colorHex  = '#' + upg.color.toString(16).padStart(6, '0');

    // Card background
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(0x080c18, 0.94);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 14);
    g.lineStyle(2, upg.color, level > 0 ? 1.0 : 0.4);
    g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 14);

    // Icon + label
    this.add.text(cx, cy - h / 2 + 38, `${upg.icon}  ${upg.label}`, {
      fontFamily: 'Impact, sans-serif', fontSize: '30px', color: colorHex,
    }).setOrigin(0.5).setDepth(3);

    // Level pip track
    const pipSpacing = 44;
    const pipTotal   = MAX_LEVEL;
    const pipStart   = cx - ((pipTotal - 1) * pipSpacing) / 2;
    for (let j = 0; j < pipTotal; j++) {
      const filled = j < level;
      const px = pipStart + j * pipSpacing;
      const py = cy - h / 2 + 92;
      this.add.rectangle(px, py, 30, 22, filled ? upg.color : 0x1a2233, 1)
        .setStrokeStyle(1, filled ? 0xffffff : 0x334455, 0.5)
        .setDepth(3);
    }

    // Current stat readout
    this.add.text(cx, cy - h / 2 + 132, `${upg.stat}: ${upg.statFn(level)}`, {
      fontFamily: 'monospace', fontSize: '20px', color: '#667799',
    }).setOrigin(0.5).setDepth(3);

    // Active perk description
    const descTxt = level === 0 ? 'NOT UPGRADED' : upg.perks[level - 1];
    this.add.text(cx, cy - h / 2 + 178, descTxt, {
      fontFamily: 'monospace', fontSize: '22px', color: '#aabbcc',
      wordWrap: { width: w - 48 }, align: 'center',
    }).setOrigin(0.5, 0).setDepth(3);

    // Next level preview (if not max)
    if (level < MAX_LEVEL) {
      this.add.text(cx, cy - h / 2 + 240, `NEXT: ${upg.perks[level]}`, {
        fontFamily: 'monospace', fontSize: '19px', color: '#445566',
        wordWrap: { width: w - 48 }, align: 'center',
      }).setOrigin(0.5, 0).setDepth(3);
    }

    // Upgrade button
    this._buildUpgradeBtn(cx, cy + h / 2 - 72, w - 60, 68, level, upg);
  }

  _buildUpgradeBtn(x, y, w, h, level, upg) {
    if (level >= MAX_LEVEL) {
      this.add.text(x, y, '✓  MAX LEVEL', {
        fontFamily: 'Impact, sans-serif', fontSize: '28px', color: '#ffcc00',
      }).setOrigin(0.5).setDepth(3);
      return;
    }

    const cost       = COSTS[level];
    const scrap      = this.registry.get('currency') ?? 0;
    const affordable = scrap >= cost;
    const bgColor    = affordable ? 0x1a5c28 : 0x2a2a2a;

    const btn = this.add.rectangle(x, y, w, h, bgColor, 0.94)
      .setStrokeStyle(2, affordable ? 0x44cc66 : 0x444444, 0.9)
      .setDepth(3)
      .setInteractive({ useHandCursor: affordable });

    const label = affordable
      ? `UPGRADE  ⚙ ${cost.toLocaleString()}`
      : `NEED ⚙ ${cost.toLocaleString()}`;

    const txt = this.add.text(x, y, label, {
      fontFamily: 'monospace', fontSize: '22px',
      color: affordable ? '#ffffff' : '#555555',
    }).setOrigin(0.5).setDepth(3);

    if (affordable) {
      btn.on('pointerover', () => btn.setFillStyle(0x22803a, 1));
      btn.on('pointerout',  () => btn.setFillStyle(bgColor, 0.94));
      btn.on('pointerdown', () => this.tweens.add({ targets: [btn, txt], scaleX: 0.96, scaleY: 0.96, duration: 60 }));
      btn.on('pointerup',   () => {
        this.tweens.add({ targets: [btn, txt], scaleX: 1, scaleY: 1, duration: 60 });
        this._purchase(upg.key, cost);
      });
    }
  }

  _purchase(key, cost) {
    const scrap = this.registry.get('currency') ?? 0;
    if (scrap < cost) return;

    this.registry.set('currency',  scrap - cost);
    this.registry.set(key, (this.registry.get(key) ?? 0) + 1);

    try {
      localStorage.setItem('mkr_currency', JSON.stringify(this.registry.get('currency')));
      localStorage.setItem(`mkr_${key}`,   JSON.stringify(this.registry.get(key)));
    } catch {}

    // Flash and restart scene to rebuild panels
    this.cameras.main.flash(120, 255, 200, 0, false);
    this.time.delayedCall(130, () => this.scene.restart());
  }

  _buildBackBtn() {
    const btn = this.add.text(70, GAME_HEIGHT - 55, '←  BACK', {
      fontFamily: 'Impact, sans-serif', fontSize: '40px', color: '#aabbcc',
    }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true }).setDepth(4);

    btn.on('pointerover', () => btn.setColor('#ffcc00'));
    btn.on('pointerout',  () => btn.setColor('#aabbcc'));
    btn.on('pointerup',   () => {
      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('MainMenuScene'));
    });
  }
}
