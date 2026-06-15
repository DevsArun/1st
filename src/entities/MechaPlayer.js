/**
 * @file MechaPlayer.js
 * @description Multi-part Matter.js composite body — the player's Mecha Kaiju.
 *
 * PHYSICS ARCHITECTURE
 * ─────────────────────────────────────────────────────────────────────────
 *  Two bodies connected by a spring constraint (suspension):
 *
 *   ┌─────────────────────┐
 *   │     TORSO BODY      │  rectangle, high density, rotation locked
 *   └──────────┬──────────┘
 *              │  Constraint: stiffness 0.12, damping 0.60
 *   ┌──────────▼──────────┐
 *   │    WHEEL BODY       │  circle, very high friction (grip)
 *   └─────────────────────┘
 *
 * COORDINATE SYSTEM
 * ─────────────────────────────────────────────────────────────────────────
 *  The CAMERA follows the mech horizontally.  The player's physics bodies
 *  move through the world; the camera scrolls to keep them on screen.
 *  Sprites are positioned directly at body.position (world coords) and
 *  rendered with scrollFactor = 1 (default) so the camera moves them.
 *
 * PUBLIC API
 * ─────────────────────────────────────────────────────────────────────────
 *  jump()         — upward impulse if grounded, respects cooldown
 *  boost()        — horizontal speed burst, costs heat
 *  getVelocity()  — { x, y } torso velocity px/frame
 *  getPosition()  — { x, y } torso world position
 *  isGrounded()   — boolean ground state
 *  update(t,d,p)  — frame tick (called by GameScene)
 *  die()          — trigger death state
 *  destroy()      — remove bodies + sprites
 */

import Phaser from 'phaser';

// ── Physics tuning ─────────────────────────────────────────────────────────
const TORSO_W         = 120;
const TORSO_H         = 80;
const TORSO_DENSITY   = 0.008;
const TORSO_FRICTION_AIR = 0.015;
const TORSO_FRICTION  = 0.05;
const TORSO_RESTITUTION = 0.03;

const WHEEL_R         = 44;
const WHEEL_DENSITY   = 0.014;
const WHEEL_FRICTION_AIR = 0.01;
const WHEEL_FRICTION  = 0.98;
const WHEEL_RESTITUTION = 0.02;

const SUSP_STIFFNESS  = 0.12;
const SUSP_DAMPING    = 0.65;
const SUSP_LENGTH     = 88;

// ── Gameplay tuning ────────────────────────────────────────────────────────
export const BASE_RUN_SPEED   = 6.5;   // px/frame — minimum maintained speed
export const MAX_BOOST_SPEED  = 14.0;  // px/frame — hard cap
const MOTOR_GAIN       = 0.05;         // How aggressively motor corrects toward base speed
const JUMP_VY          = -28;          // px/frame upward impulse (negative = up)
const BOOST_VX_ADD     = 7.0;          // px/frame added per boost press
const JUMP_COOLDOWN_MS = 380;
const BOOST_HEAT_COST  = 14;           // heat units per boost

// Collision categories (match TerrainGenerator + ObstacleManager)
const CAT_MECH     = 0x0001;
const CAT_OBSTACLE = 0x0002;
const CAT_TERRAIN  = 0x0004;
const CAT_DEBRIS   = 0x0008;

export class MechaPlayer {
  /**
   * @param {Phaser.Scene} scene
   * @param {number} x  World spawn X
   * @param {number} y  World spawn Y
   */
  constructor(scene, x, y) {
    /** @type {Phaser.Scene} */
    this.scene = scene;

    this._grounded      = false;
    this._lastJumpMs    = 0;
    this._dead          = false;
    this._boostFlash    = 0;     // frames to show thruster glow

    // Upgrade multipliers (read from registry, set on spawn)
    this._engineLevel  = scene.registry.get('upgradeEngine')  ?? 0;
    this._armorLevel   = scene.registry.get('upgradeArmor')   ?? 0;
    this._plasmaLevel  = scene.registry.get('upgradePlasma')  ?? 0;

    // Effective speed with engine upgrade
    this._baseSpeed = BASE_RUN_SPEED + this._engineLevel * 0.8;
    this._maxSpeed  = MAX_BOOST_SPEED + this._engineLevel * 1.2;

    // Energy pool with armor upgrade
    this._maxEnergy = 100 + this._armorLevel * 15;

    // Build everything
    this._buildBodies(x, y);
    this._buildSprites();
    this._buildThrusterFX();
    this._registerCollisions();
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────

  jump() {
    if (this._dead || !this._grounded) return;
    const now = this.scene.time.now;
    if (now - this._lastJumpMs < JUMP_COOLDOWN_MS) return;

    this._lastJumpMs = now;
    Phaser.Physics.Matter.Matter.Body.setVelocity(
      this._torsoBody,
      { x: this._torsoBody.velocity.x, y: JUMP_VY }
    );
    Phaser.Physics.Matter.Matter.Body.setVelocity(
      this._wheelBody,
      { x: this._wheelBody.velocity.x, y: JUMP_VY * 0.5 }
    );

    this.scene.cameras.main.shake(90, 0.004);
    this._playSound('sfx-jump', 0.65);
  }

  boost() {
    if (this._dead) return;

    const heat = this.scene.registry.get('heat') ?? 0;
    // Heat cap reduced by plasma upgrade
    const heatCap = 100 + this._plasmaLevel * 10;
    if (heat >= heatCap) return;

    const vel   = this._torsoBody.velocity;
    const newVx = Math.min(vel.x + BOOST_VX_ADD, this._maxSpeed);
    Phaser.Physics.Matter.Matter.Body.setVelocity(
      this._torsoBody,
      { x: newVx, y: vel.y }
    );

    this.scene.registry.set('heat', Math.min(heat + BOOST_HEAT_COST, heatCap));

    this._boostFlash = 8; // show thruster for 8 frames
    this._thrusterEmitter?.explode(16);
    this._playSound('sfx-thruster', 0.45);
  }

  /** @returns {{ x:number, y:number }} */
  getVelocity() {
    if (!this._torsoBody) return { x: this._baseSpeed, y: 0 };
    return { x: this._torsoBody.velocity.x, y: this._torsoBody.velocity.y };
  }

  /** @returns {{ x:number, y:number }} */
  getPosition() {
    if (!this._torsoBody) return { x: 0, y: 0 };
    return { x: this._torsoBody.position.x, y: this._torsoBody.position.y };
  }

  isGrounded() { return this._grounded; }

  die() {
    if (this._dead) return;
    this._dead = true;
    this.scene.cameras.main.shake(400, 0.02);
    // Fling torso upward on death
    Phaser.Physics.Matter.Matter.Body.setVelocity(
      this._torsoBody,
      { x: this._torsoBody.velocity.x * 0.3, y: -18 }
    );
    // Unfreeze rotation so it tumbles
    Phaser.Physics.Matter.Matter.Body.set(this._torsoBody, {
      inertia:        this._torsoBody.mass * 10000,
      inverseInertia: 1 / (this._torsoBody.mass * 10000),
    });
  }

  /**
   * Frame tick — called by GameScene.update().
   * @param {number} time   ms
   * @param {number} delta  ms
   * @param {boolean} paused
   */
  update(time, delta, paused) {
    if (paused) return;

    if (!this._dead) {
      this._applyMotor();
      this._updateGrounded();
    }

    this._syncSprites();
    this._updateThruster();
    this._updateTilt();
  }

  destroy() {
    const w = this.scene.matter.world;
    try { w.remove(this._torsoBody); } catch {}
    try { w.remove(this._wheelBody); } catch {}
    try { w.removeConstraint(this._suspension); } catch {}

    this._torsoSprite?.destroy();
    this._wheelSprite?.destroy();
    this._thrusterGfx?.destroy();
    this._thrusterEmitter?.destroy();
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE — CONSTRUCTION
  // ─────────────────────────────────────────────────────────────────────────

  _buildBodies(x, y) {
    const M = Phaser.Physics.Matter.Matter;

    // ── Torso ──────────────────────────────────────────────────────────────
    this._torsoBody = M.Bodies.rectangle(x, y - SUSP_LENGTH, TORSO_W, TORSO_H, {
      density:        TORSO_DENSITY,
      frictionAir:    TORSO_FRICTION_AIR,
      friction:       TORSO_FRICTION,
      restitution:    TORSO_RESTITUTION,
      label:          'mechTorso',
      // Lock rotation — torso stays upright; visual tilt is cosmetic only
      inertia:        Infinity,
      inverseInertia: 0,
      collisionFilter: { category: CAT_MECH, mask: CAT_OBSTACLE | CAT_TERRAIN },
    });

    // ── Wheel ──────────────────────────────────────────────────────────────
    this._wheelBody = M.Bodies.circle(x, y, WHEEL_R, {
      density:        WHEEL_DENSITY,
      frictionAir:    WHEEL_FRICTION_AIR,
      friction:       WHEEL_FRICTION,
      restitution:    WHEEL_RESTITUTION,
      label:          'mechWheel',
      collisionFilter: { category: CAT_MECH, mask: CAT_OBSTACLE | CAT_TERRAIN },
    });

    // ── Suspension constraint ──────────────────────────────────────────────
    this._suspension = M.Constraint.create({
      bodyA:     this._torsoBody,
      bodyB:     this._wheelBody,
      pointA:    { x: 0, y: TORSO_H / 2 + 4 },
      pointB:    { x: 0, y: -WHEEL_R - 4 },
      stiffness: SUSP_STIFFNESS,
      damping:   SUSP_DAMPING,
      length:    SUSP_LENGTH,
    });

    this.scene.matter.world.add([this._torsoBody, this._wheelBody, this._suspension]);

    // Kick-start the mech running
    M.Body.setVelocity(this._torsoBody, { x: this._baseSpeed, y: 0 });
    M.Body.setVelocity(this._wheelBody, { x: this._baseSpeed, y: 0 });
  }

  _buildSprites() {
    const s = this.scene;

    // ── Wheel sprite ───────────────────────────────────────────────────────
    if (s.textures.exists('mech-leg-l')) {
      this._wheelSprite = s.add.image(0, 0, 'mech-leg-l')
        .setDisplaySize(WHEEL_R * 2 + 16, WHEEL_R * 2 + 16)
        .setDepth(19);
    } else {
      // Procedural: two concentric circles (tyre + hub)
      const g = s.add.graphics().setDepth(19);
      // Will be redrawn each frame in _syncSprites for rotation effect
      this._wheelGfx = g;
      this._wheelSprite = null;
    }

    // ── Torso sprite ───────────────────────────────────────────────────────
    if (s.textures.exists('mech-torso')) {
      this._torsoSprite = s.add.image(0, 0, 'mech-torso')
        .setDisplaySize(TORSO_W + 40, TORSO_H + 30)
        .setDepth(20);
    } else {
      // Procedural placeholder — drawn once, positioned each frame
      this._torsoSprite = this._makeProceduralTorso();
    }

    // ── Thruster glow (behind torso) ───────────────────────────────────────
    this._thrusterGfx = s.add.graphics().setDepth(18).setBlendMode(Phaser.BlendModes.ADD);
  }

  /**
   * Draws a procedural mech torso as a Phaser.GameObjects.Container
   * containing several colored rectangles (body panels + visor).
   */
  _makeProceduralTorso() {
    const s = this.scene;
    const container = s.add.container(0, 0).setDepth(20);

    // Main body
    const body = s.add.rectangle(0, 0, TORSO_W, TORSO_H, 0x445566);
    // Chest armor plate
    const chest = s.add.rectangle(0, -8, TORSO_W * 0.6, TORSO_H * 0.5, 0x2a3a4a);
    // Visor stripe
    const visor = s.add.rectangle(0, -18, TORSO_W * 0.4, 12, 0x00aaff)
      .setBlendMode(Phaser.BlendModes.ADD);
    // Shoulder pads
    const shoulderL = s.add.rectangle(-TORSO_W * 0.55, -10, 20, TORSO_H * 0.6, 0x334455);
    const shoulderR = s.add.rectangle( TORSO_W * 0.55, -10, 20, TORSO_H * 0.6, 0x334455);
    // Engine glow on back
    const engine = s.add.rectangle(-TORSO_W * 0.5, 10, 10, 24, 0xff4400)
      .setBlendMode(Phaser.BlendModes.ADD);

    container.add([body, chest, visor, shoulderL, shoulderR, engine]);
    container._isProceduralTorso = true;
    return container;
  }

  _buildThrusterFX() {
    // Thruster particle emitter
    if (this.scene.textures.exists('particle-spark')) {
      this._thrusterEmitter = this.scene.add.particles(0, 0, 'particle-spark', {
        speed:     { min: 60,  max: 220 },
        angle:     { min: 155, max: 205 },
        scale:     { start: 0.7, end: 0 },
        alpha:     { start: 1.0, end: 0 },
        tint:      [0xff6600, 0xffaa00, 0xffffff],
        lifespan:  280,
        blendMode: 'ADD',
        emitting:  false,
        quantity:  1,
      }).setDepth(17);
    }
  }

  _registerCollisions() {
    // Grounded detection: wheel touches terrain
    this.scene.matter.world.on('collisionstart', (evt) => {
      for (const pair of evt.pairs) {
        const { bodyA, bodyB } = pair;
        const isWheel   = bodyA.label === 'mechWheel' || bodyB.label === 'mechWheel';
        const isTerrain = bodyA.label === 'terrain'   || bodyB.label === 'terrain';
        if (isWheel && isTerrain) {
          this._grounded = true;
        }

        // Obstacle impact — delegate to GameScene
        if (!this._dead) {
          const mechLabels = ['mechTorso', 'mechWheel'];
          const isMechA    = mechLabels.includes(bodyA.label);
          const isMechB    = mechLabels.includes(bodyB.label);
          const isObsA     = bodyA.label?.startsWith('obstacle_');
          const isObsB     = bodyB.label?.startsWith('obstacle_');

          if ((isMechA && isObsB) || (isMechB && isObsA)) {
            const depth  = pair.collision?.depth ?? 1;
            const force  = depth * 180;
            const pos    = new Phaser.Math.Vector2(
              (bodyA.position.x + bodyB.position.x) / 2,
              (bodyA.position.y + bodyB.position.y) / 2
            );
            this.scene.time.delayedCall(0, () => {
              this.scene.onCollision?.(force, pos);
            });
          }
        }
      }
    });

    this.scene.matter.world.on('collisionend', (evt) => {
      let stillOnGround = false;
      for (const pair of evt.pairs) {
        const { bodyA, bodyB } = pair;
        const isWheel   = bodyA.label === 'mechWheel' || bodyB.label === 'mechWheel';
        const isTerrain = bodyA.label === 'terrain'   || bodyB.label === 'terrain';
        if (isWheel && isTerrain) {
          // Check if any OTHER collision is still active
          // We set a short debounce instead of instant false to handle slopes
          this.scene.time.delayedCall(60, () => {
            // Re-check via position query
            this._updateGrounded();
          });
          break;
        }
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE — RUNTIME
  // ─────────────────────────────────────────────────────────────────────────

  /** Constant-force motor: gently accelerates back to _baseSpeed when slower. */
  _applyMotor() {
    const vel  = this._torsoBody.velocity;
    const diff = this._baseSpeed - vel.x;

    if (diff > 0.05) {
      const F = diff * MOTOR_GAIN * this._torsoBody.mass;
      Phaser.Physics.Matter.Matter.Body.applyForce(
        this._torsoBody,
        this._torsoBody.position,
        { x: F, y: 0 }
      );
    }
    // Never exceed max speed (safety clamp)
    if (vel.x > this._maxSpeed) {
      Phaser.Physics.Matter.Matter.Body.setVelocity(
        this._torsoBody,
        { x: this._maxSpeed, y: vel.y }
      );
    }
  }

  /**
   * Ground detection via a small downward overlap query.
   * More reliable than purely relying on collisionend events on slopes.
   */
  _updateGrounded() {
    const wp  = this._wheelBody.position;
    const M   = Phaser.Physics.Matter.Matter;
    const bounds = {
      min: { x: wp.x - WHEEL_R, y: wp.y + WHEEL_R - 4 },
      max: { x: wp.x + WHEEL_R, y: wp.y + WHEEL_R + 12 },
    };
    const hits = M.Query.region(
      this.scene.matter.world.getAllBodies(),
      bounds
    );
    this._grounded = hits.some(
      (b) => b.isStatic && b.label === 'terrain' && b !== this._torsoBody && b !== this._wheelBody
    );
  }

  _syncSprites() {
    const tp = this._torsoBody.position;
    const wp = this._wheelBody.position;

    // ── Torso ──────────────────────────────────────────────────────────────
    if (this._torsoSprite) {
      this._torsoSprite.setPosition(tp.x, tp.y);
      // Visual tilt only (physics body rotation is locked to Infinity)
      // Applied in _updateTilt()
    }

    // ── Wheel ──────────────────────────────────────────────────────────────
    if (this._wheelSprite) {
      this._wheelSprite.setPosition(wp.x, wp.y);
      this._wheelSprite.setRotation(this._wheelBody.angle);
    } else if (this._wheelGfx) {
      // Procedural wheel — redraw with rotation effect
      this._drawProceduralWheel(wp.x, wp.y, this._wheelBody.angle);
    }

    // ── Thruster position ──────────────────────────────────────────────────
    const thrusterX = tp.x - TORSO_W * 0.55;
    const thrusterY = tp.y + 4;
    this._thrusterEmitter?.setPosition(thrusterX, thrusterY);
  }

  /** Draw the procedural wheel with rotating cross-spoke pattern. */
  _drawProceduralWheel(x, y, angle) {
    const g = this._wheelGfx;
    g.clear();

    // Tyre
    g.lineStyle(8, 0x222222, 1);
    g.strokeCircle(x, y, WHEEL_R);
    g.fillStyle(0x333333, 1);
    g.fillCircle(x, y, WHEEL_R);

    // Spokes (4 spokes, rotate with body angle)
    g.lineStyle(4, 0x555555, 1);
    for (let i = 0; i < 4; i++) {
      const a  = angle + (i / 4) * Math.PI * 2;
      const sx = x + Math.cos(a) * WHEEL_R;
      const sy = y + Math.sin(a) * WHEEL_R;
      g.lineBetween(x, y, sx, sy);
    }

    // Hub
    g.fillStyle(0x888888, 1);
    g.fillCircle(x, y, 10);
  }

  _updateThruster() {
    if (this._boostFlash > 0) {
      this._boostFlash--;
      this._drawThruster(1.0 - (this._boostFlash / 8));
    } else {
      this._thrusterGfx?.clear();
    }
  }

  _drawThruster(intensity) {
    const g  = this._thrusterGfx;
    if (!g) return;
    g.clear();

    const tp = this._torsoBody.position;
    const tx = tp.x - TORSO_W * 0.55;
    const ty = tp.y + 4;

    const len = 40 + intensity * 60;
    const wid = 10 + intensity * 14;

    // Flame gradient (inner white → orange → transparent)
    g.fillStyle(0xffffff, 0.9 * intensity);
    g.fillEllipse(tx - len * 0.15, ty, len * 0.3, wid * 0.4);

    g.fillStyle(0xff8800, 0.75 * intensity);
    g.fillEllipse(tx - len * 0.4, ty, len * 0.55, wid * 0.7);

    g.fillStyle(0xff3300, 0.5 * intensity);
    g.fillEllipse(tx - len * 0.7, ty, len * 0.5, wid);
  }

  _updateTilt() {
    if (!this._torsoSprite) return;

    const vel  = this._torsoBody.velocity;
    // Tilt angle proportional to vertical velocity, capped at ±22°
    const targetTilt = Phaser.Math.Clamp(
      Math.atan2(vel.y, Math.max(Math.abs(vel.x), 0.1)) * 0.35,
      Phaser.Math.DegToRad(-22),
      Phaser.Math.DegToRad(22)
    );

    const current = this._torsoSprite.rotation ?? 0;
    const next    = Phaser.Math.Linear(current, targetTilt, 0.10);

    if (this._torsoSprite.setRotation) {
      this._torsoSprite.setRotation(next);
    }
  }

  _playSound(key, volume = 0.6) {
    if (this.scene.registry.get('sfxMuted')) return;
    if (this.scene.cache.audio.exists(key)) {
      this.scene.sound.play(key, { volume });
    }
  }
}
