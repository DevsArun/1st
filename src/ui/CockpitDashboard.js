/**
 * @file CockpitDashboard.js
 * @description Immersive bottom cockpit HUD — three analog dials, all camera-fixed.
 *
 * NEEDLE ROTATION  (THE KEY DETAIL)
 * ─────────────────────────────────────────────────────────────────────────
 *  We do NOT use Phaser.GameObjects.Triangle (no pivot-based rotation).
 *  Instead, each needle is drawn fresh every frame on a Graphics object
 *  using polar coordinates relative to the dial center, which makes
 *  pivot-at-base rotation trivially correct.
 *
 *  For each needle:
 *    normalized  = clamp(value / maxValue, 0, 1)
 *    angle       = lerp(currentAngle, MIN_A + normalized*(MAX_A-MIN_A), LERP)
 *    // Draw needle as line from pivot to tip:
 *    tip.x = cx + sin(angle) * needleLen
 *    tip.y = cy - cos(angle) * needleLen   ← note: -cos makes 0° point UP
 *
 *  This matches how a real gauge works: 0° = 12-o'clock, clockwise positive.
 *
 * LAYOUT  (1920 × 220 px HUD strip)
 * ─────────────────────────────────────────────────────────────────────────
 *  LEFT_X  = center − 480  → Energy gauge
 *  CENTER  = center         → Speedometer (larger, R=100)
 *  RIGHT_X = center + 480  → Heat / Plasma gauge
 */

import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, HUD_HEIGHT } from '../main.js';
import { MAX_BOOST_SPEED } from '../entities/MechaPlayer.js';

// ── Arc sweep ──────────────────────────────────────────────────────────────
const DEG   = Math.PI / 180;
const MIN_A = -135 * DEG;   // left stop
const MAX_A =  135 * DEG;   // right stop
const ARC   = MAX_A - MIN_A;

// ── Smoothing ──────────────────────────────────────────────────────────────
const LERP  = 0.09;

// ── Layout ─────────────────────────────────────────────────────────────────
const HUD_TOP      = GAME_HEIGHT - HUD_HEIGHT;
const CX           = GAME_WIDTH / 2;
const DIAL_Y       = HUD_TOP + HUD_HEIGHT * 0.52;
const DIAL_R       = 82;
const SPEEDO_R     = 102;
const LEFT_X       = CX - 480;
const RIGHT_X      = CX + 480;

// ── Palette ────────────────────────────────────────────────────────────────
const C_PANEL      = 0x080c18;
const C_BEVEL      = 0x1e3a6e;
const C_FACE       = 0x05080f;
const C_RING       = 0x1a3060;
const C_MAJOR_TICK = 0x6688bb;
const C_MINOR_TICK = 0x334466;
const C_LABEL      = '#556699';
const C_VALUE      = '#ccd8ff';
const C_NEEDLE_E   = 0x33ddaa;   // energy needle: teal-green
const C_NEEDLE_S   = 0xeeeeff;   // speed needle: white
const C_HEAT_LO    = 0x33ee55;
const C_HEAT_MID   = 0xffcc00;
const C_HEAT_HI    = 0xff2200;
const C_GLOW_E     = 0x0055ff;
const C_GLOW_S     = 0xffffff;
const C_GLOW_H     = 0xff4400;

export class CockpitDashboard {
  /**
   * @param {Phaser.Scene} scene
   */
  constructor(scene) {
    /** @type {Phaser.Scene} */
    this.scene = scene;

    // Smoothed needle angles
    this._ea = MIN_A;   // energy
    this._sa = MIN_A;   // speed
    this._ha = MIN_A;   // heat

    // Last dirty values (avoid setText every frame)
    this._le = -1;
    this._ls = -1;
    this._lh = -1;

    this._build();
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * @param {{ energy:number, heat:number, velocity:number }} state
   */
  update(state) {
    const { energy, heat, velocity } = state;

    const en = Phaser.Math.Clamp(energy   / 100,              0, 1);
    const hn = Phaser.Math.Clamp(heat     / 100,              0, 1);
    const sn = Phaser.Math.Clamp(velocity / MAX_BOOST_SPEED,  0, 1);

    this._ea = Phaser.Math.Linear(this._ea, MIN_A + en * ARC, LERP);
    this._sa = Phaser.Math.Linear(this._sa, MIN_A + sn * ARC, LERP);
    this._ha = Phaser.Math.Linear(this._ha, MIN_A + hn * ARC, LERP);

    // Redraw needle layer
    this._needleGfx.clear();
    this._drawNeedle(this._needleGfx, LEFT_X,  DIAL_Y,  DIAL_R  - 16, this._ea, C_NEEDLE_E);
    this._drawNeedle(this._needleGfx, CX,       DIAL_Y,  SPEEDO_R - 20, this._sa, C_NEEDLE_S);
    this._drawNeedle(this._needleGfx, RIGHT_X, DIAL_Y,  DIAL_R  - 16, this._ha,
      this._heatColor(hn));

    // Numeric readouts (dirty check)
    const re = Math.round(energy);
    if (re !== this._le) {
      this._le = re;
      this._energyTxt?.setText(`${re}%`);
      this._energyTxt?.setColor(re < 20 ? '#ff2200' : C_VALUE);
    }

    const rs = Math.round(velocity * 3.6);  // km/h
    if (rs !== this._ls) {
      this._ls = rs;
      this._speedTxt?.setText(`${rs} km/h`);
    }

    const rh = Math.round(heat);
    if (rh !== this._lh) {
      this._lh = rh;
      this._heatTxt?.setText(`${rh}%`);
      this._heatTxt?.setColor(rh > 80 ? '#ff3300' : C_VALUE);
    }

    // Overheat glow pulse
    if (this._heatGlow) {
      const pulse = hn > 0.75
        ? Phaser.Math.Clamp(0.2 + Math.sin(scene_time(this.scene) * 0.008) * 0.3, 0, 0.6)
        : 0;
      this._heatGlow.setAlpha(pulse);
    }

    // Critical energy warning flash
    if (this._energyGlow) {
      const flash = en < 0.2
        ? Phaser.Math.Clamp(0.15 + Math.sin(scene_time(this.scene) * 0.015) * 0.2, 0, 0.4)
        : 0;
      this._energyGlow.setAlpha(flash);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE — CONSTRUCTION
  // ─────────────────────────────────────────────────────────────────────────

  _build() {
    const s = this.scene;
    const sf = 0; // scrollFactor for all HUD elements

    // ── Panel background ──────────────────────────────────────────────────
    const panelGfx = s.add.graphics().setScrollFactor(sf).setDepth(48);
    // Deep metallic panel
    panelGfx.fillStyle(C_PANEL, 0.97);
    panelGfx.fillRect(0, HUD_TOP, GAME_WIDTH, HUD_HEIGHT);
    // Top bevel
    panelGfx.lineStyle(3, C_BEVEL, 0.9);
    panelGfx.lineBetween(0, HUD_TOP + 1, GAME_WIDTH, HUD_TOP + 1);
    // Subtle panel seams
    panelGfx.lineStyle(1, 0x0a1020, 0.7);
    panelGfx.lineBetween(0, HUD_TOP + 40, GAME_WIDTH, HUD_TOP + 40);
    // Rivet row
    panelGfx.fillStyle(0x1a2550, 0.8);
    for (let rx = 30; rx < GAME_WIDTH; rx += 60) {
      panelGfx.fillCircle(rx, HUD_TOP + 8, 3);
    }

    // ── Static dial faces (drawn once) ───────────────────────────────────
    const faceGfx = s.add.graphics().setScrollFactor(sf).setDepth(50);
    this._buildFace(faceGfx, LEFT_X,  DIAL_Y,  DIAL_R,   C_GLOW_E, 10, 4);
    this._buildFace(faceGfx, CX,       DIAL_Y,  SPEEDO_R, C_GLOW_S, 12, 4);
    this._buildFace(faceGfx, RIGHT_X, DIAL_Y,  DIAL_R,   C_GLOW_H, 10, 4);

    // ── Danger arc zones ──────────────────────────────────────────────────
    this._buildArcZone(faceGfx, LEFT_X,  DIAL_Y, DIAL_R  - 10, 0, 0.22, 0xff2200, 0.45);
    this._buildArcZone(faceGfx, RIGHT_X, DIAL_Y, DIAL_R  - 10, 0.78, 1, 0xff2200, 0.45);

    // Speedo speed labels
    this._buildSpeedLabels(CX, DIAL_Y, SPEEDO_R);

    // ── Glow circles (alpha-animated) ─────────────────────────────────────
    this._energyGlow = s.add.circle(LEFT_X,  DIAL_Y, DIAL_R  + 22, 0xff0000, 0)
      .setScrollFactor(sf).setDepth(49);
    this._heatGlow   = s.add.circle(RIGHT_X, DIAL_Y, DIAL_R  + 22, C_GLOW_H, 0)
      .setScrollFactor(sf).setDepth(49);

    // ── Needle layer (redrawn every frame) ───────────────────────────────
    this._needleGfx = s.add.graphics().setScrollFactor(sf).setDepth(54);

    // ── Hub circles (drawn on top of needles) ────────────────────────────
    const hubGfx = s.add.graphics().setScrollFactor(sf).setDepth(56);
    [[LEFT_X, 9], [CX, 11], [RIGHT_X, 9]].forEach(([x, r]) => {
      hubGfx.fillStyle(0xaabbcc, 1);
      hubGfx.fillCircle(x, DIAL_Y, r);
      hubGfx.lineStyle(2, 0x334466, 1);
      hubGfx.strokeCircle(x, DIAL_Y, r);
      hubGfx.fillStyle(0x223355, 1);
      hubGfx.fillCircle(x, DIAL_Y, r * 0.4);
    });

    // ── Value text readouts ───────────────────────────────────────────────
    const textStyle = { fontFamily: "'Courier New', monospace", fontSize: '26px', color: C_VALUE };

    this._energyTxt = s.add.text(LEFT_X,  DIAL_Y - DIAL_R   - 14, '100%', textStyle)
      .setOrigin(0.5, 1).setScrollFactor(sf).setDepth(57);
    this._speedTxt  = s.add.text(CX,       DIAL_Y - SPEEDO_R - 14, '0 km/h',
      { ...textStyle, fontSize: '32px', color: '#ffffff' })
      .setOrigin(0.5, 1).setScrollFactor(sf).setDepth(57);
    this._heatTxt   = s.add.text(RIGHT_X, DIAL_Y - DIAL_R   - 14, '0%', textStyle)
      .setOrigin(0.5, 1).setScrollFactor(sf).setDepth(57);

    // ── Dial labels ───────────────────────────────────────────────────────
    const lblStyle = { fontFamily: 'monospace', fontSize: '18px', color: C_LABEL };
    s.add.text(LEFT_X,  DIAL_Y + DIAL_R   + 14, 'ENERGY', lblStyle).setOrigin(0.5, 0).setScrollFactor(sf).setDepth(51);
    s.add.text(CX,       DIAL_Y + SPEEDO_R + 14, 'SPEED',  lblStyle).setOrigin(0.5, 0).setScrollFactor(sf).setDepth(51);
    s.add.text(RIGHT_X, DIAL_Y + DIAL_R   + 14, 'PLASMA', lblStyle).setOrigin(0.5, 0).setScrollFactor(sf).setDepth(51);

    // ── Decorative elements ───────────────────────────────────────────────
    this._buildDecorations(panelGfx);

    // Do an initial draw so needles are visible at rest
    this._needleGfx.clear();
    this._drawNeedle(this._needleGfx, LEFT_X,  DIAL_Y, DIAL_R  - 16, this._ea, C_NEEDLE_E);
    this._drawNeedle(this._needleGfx, CX,       DIAL_Y, SPEEDO_R - 20, this._sa, C_NEEDLE_S);
    this._drawNeedle(this._needleGfx, RIGHT_X, DIAL_Y, DIAL_R  - 16, this._ha, C_HEAT_LO);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE — DRAWING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Draw a complete static dial face: glow, bezel, dark fill, tick marks.
   */
  _buildFace(g, cx, cy, R, glowColor, majorCount, minorPerMajor) {
    // Outer glow
    g.lineStyle(8, glowColor, 0.10);
    g.strokeCircle(cx, cy, R + 10);
    g.lineStyle(4, glowColor, 0.18);
    g.strokeCircle(cx, cy, R + 4);

    // Bezel ring
    g.lineStyle(4, C_RING, 1);
    g.strokeCircle(cx, cy, R);

    // Dark inner fill
    g.fillStyle(C_FACE, 1);
    g.fillCircle(cx, cy, R - 2);

    // Inner accent ring
    g.lineStyle(1, 0x1a2860, 0.6);
    g.strokeCircle(cx, cy, R - 12);

    // Tick marks
    const totalIntervals = (majorCount - 1) * (minorPerMajor + 1) + (majorCount - 1);
    const totalTicks     = totalIntervals + 1;  // inclusive

    for (let t = 0; t < totalTicks; t++) {
      const frac     = t / (totalTicks - 1);
      const angle    = MIN_A + frac * ARC;
      const isMajor  = (t % (minorPerMajor + 1)) === 0;
      const tickLen  = isMajor ? 15 : 7;
      const tickW    = isMajor ? 2  : 1;
      const tColor   = isMajor ? C_MAJOR_TICK : C_MINOR_TICK;
      const alpha    = isMajor ? 0.9 : 0.5;

      const sinA = Math.sin(angle), cosA = Math.cos(angle);
      const outerR = R - 3;
      g.lineStyle(tickW, tColor, alpha);
      g.lineBetween(
        cx + sinA * outerR,        cy - cosA * outerR,
        cx + sinA * (outerR - tickLen), cy - cosA * (outerR - tickLen)
      );
    }
  }

  /**
   * Draw a colored arc zone on a dial (danger / safe zone indicator).
   */
  _buildArcZone(g, cx, cy, R, fromN, toN, color, alpha) {
    const a0    = MIN_A + fromN * ARC;
    const a1    = MIN_A + toN   * ARC;
    const steps = 20;

    g.lineStyle(9, color, alpha);
    g.beginPath();
    for (let i = 0; i <= steps; i++) {
      const a  = a0 + (i / steps) * (a1 - a0);
      const px = cx + Math.sin(a) * R;
      const py = cy - Math.cos(a) * R;
      i === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
    }
    g.strokePath();
  }

  /** Render speed labels around the speedometer. */
  _buildSpeedLabels(cx, cy, R) {
    const kmhLabels = ['0', '25', '50', '75', '100', '125'];
    const s = this.scene;
    kmhLabels.forEach((lbl, i) => {
      const frac  = i / (kmhLabels.length - 1);
      const angle = MIN_A + frac * ARC;
      const lx    = cx + Math.sin(angle) * (R - 24);
      const ly    = cy - Math.cos(angle) * (R - 24);
      s.add.text(lx, ly, lbl, {
        fontFamily: 'monospace', fontSize: '13px', color: '#4466aa',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(52);
    });
  }

  /**
   * Draw a needle as two lines (thick base + thin tip) from the pivot
   * using polar coords. This is the correct, artifact-free approach.
   *
   * @param {Phaser.GameObjects.Graphics} g
   * @param {number} cx       Dial center X
   * @param {number} cy       Dial center Y
   * @param {number} len      Needle length
   * @param {number} angle    Current angle in radians (0 = up, clockwise+)
   * @param {number} color    Hex color
   */
  _drawNeedle(g, cx, cy, len, angle, color) {
    const sinA = Math.sin(angle);
    const cosA = Math.cos(angle);

    // Tip (thin)
    const tipX = cx + sinA * len;
    const tipY = cy - cosA * len;

    // Counterpoise (short line in opposite direction for realism)
    const ctrLen = len * 0.22;
    const ctrX   = cx - sinA * ctrLen;
    const ctrY   = cy + cosA * ctrLen;

    // Glow shadow
    g.lineStyle(6, color, 0.2);
    g.lineBetween(ctrX, ctrY, tipX, tipY);

    // Main needle body
    g.lineStyle(3, color, 1.0);
    g.lineBetween(ctrX, ctrY, tipX, tipY);

    // Bright tip accent
    const accentLen = len * 0.3;
    const acX = cx + sinA * (len - accentLen);
    const acY = cy - cosA * (len - accentLen);
    g.lineStyle(2, 0xffffff, 0.7);
    g.lineBetween(acX, acY, tipX, tipY);
  }

  /** Interpolate heat needle color: green → yellow → red. */
  _heatColor(hn) {
    if (hn <= 0.5) {
      const t = hn * 2;
      return Phaser.Display.Color.GetColor(
        Math.round(Phaser.Math.Linear(0x33, 0xff, t)),
        Math.round(Phaser.Math.Linear(0xee, 0xcc, t)),
        Math.round(Phaser.Math.Linear(0x55, 0x00, t))
      );
    } else {
      const t = (hn - 0.5) * 2;
      return Phaser.Display.Color.GetColor(
        0xff,
        Math.round(Phaser.Math.Linear(0xcc, 0x22, t)),
        0x00
      );
    }
  }

  _buildDecorations(g) {
    const s = this.scene;

    // Separator lines between dial zones
    g.lineStyle(1, 0x0d1a33, 0.8);
    const sx1 = (LEFT_X + CX)      / 2;
    const sx2 = (CX     + RIGHT_X) / 2;
    g.lineBetween(sx1, HUD_TOP + 10, sx1, GAME_HEIGHT - 10);
    g.lineBetween(sx2, HUD_TOP + 10, sx2, GAME_HEIGHT - 10);

    // Warning indicator lamps (bottom center)
    const lampColors = [0x00ff44, 0x00ff44, 0xffcc00, 0xff2200];
    lampColors.forEach((c, i) => {
      const lx = CX - 60 + i * 42;
      const ly = GAME_HEIGHT - 16;
      g.fillStyle(c, 0.35);
      g.fillCircle(lx, ly, 6);
      g.lineStyle(1, c, 0.75);
      g.strokeCircle(lx, ly, 6);
    });

    // MKR watermark
    s.add.text(GAME_WIDTH - 18, GAME_HEIGHT - 10, 'MKR-01', {
      fontFamily: 'monospace', fontSize: '13px', color: '#1a2a3a',
    }).setOrigin(1, 1).setScrollFactor(0).setDepth(51);

    // Left side: mini status text
    s.add.text(40, HUD_TOP + 16, 'MECHA KAIJU RUSH', {
      fontFamily: 'monospace', fontSize: '16px', color: '#1e3a6e',
    }).setScrollFactor(0).setDepth(51);
  }
}

/** Helper to get scene time without coupling to scene internals. */
function scene_time(scene) {
  return scene.time.now;
}
