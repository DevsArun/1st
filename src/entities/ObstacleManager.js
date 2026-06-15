/**
 * @file ObstacleManager.js
 * @description Procedural spawner + full destruction physics for obstacles.
 *
 * COORDINATE SYSTEM
 * ─────────────────────────────────────────────────────────────────────────
 *  Everything is in WORLD coordinates.  The camera follows the player, so
 *  sprites at world positions are rendered correctly without any offset.
 *
 * DESTRUCTION PIPELINE
 * ─────────────────────────────────────────────────────────────────────────
 *  1. Mech ↔ obstacle collision fires via Matter collisionstart event.
 *  2. destroyObstacle() called next tick (safe from mid-collision removal).
 *  3. Obstacle body removed; sprite destroyed.
 *  4. N debris trapezoid bodies launched outward with angular velocity.
 *  5. Spark + smoke particle burst at impact point.
 *  6. GameScene.onCollision(force, pos) called for camera shake + energy drain.
 *  7. Scrap granted to registry.
 *  8. Debris bodies + sprites auto-removed after 2.5 s.
 *
 * BODY POOL
 * ─────────────────────────────────────────────────────────────────────────
 *  Destroyed obstacle bodies are NOT reused (they're simple rectangles that
 *  can be reconstructed cheaply).  The "pool" here is the _active list —
 *  we avoid redundant allocation by culling off-screen bodies early.
 */

import Phaser from 'phaser';

// ── Obstacle catalog ───────────────────────────────────────────────────────
const TYPES = {
  barrel: {
    key: 'obs-barrel', w: 52, h: 62,
    density: 0.002, friction: 0.35, restitution: 0.45,
    fragments: 3, scrap: 15, minDistM: 0,
    color: 0x7a5c2e,   // fallback color
  },
  car: {
    key: 'obs-car', w: 164, h: 72,
    density: 0.003, friction: 0.50, restitution: 0.25,
    fragments: 4, scrap: 30, minDistM: 80,
    color: 0x5577aa,
  },
  building: {
    key: 'obs-building', w: 204, h: 310,
    density: 0.009, friction: 0.65, restitution: 0.08,
    fragments: 6, scrap: 80, minDistM: 350,
    color: 0x445533,
  },
};

const TYPE_KEYS    = Object.keys(TYPES);
const MIN_GAP_PX   = 420;   // Minimum px gap between spawns
const MAX_GAP_PX   = 900;
const SPAWN_LEAD   = 2200;  // Spawn this far ahead of camera right edge
const CULL_BEHIND  = 400;   // Destroy if this far behind camera left edge

// Collision categories
const CAT_MECH     = 0x0001;
const CAT_OBSTACLE = 0x0002;
const CAT_TERRAIN  = 0x0004;
const CAT_DEBRIS   = 0x0008;

export class ObstacleManager {
  /**
   * @param {Phaser.Scene}   scene
   * @param {TerrainGenerator} terrain  Used for ground Y queries
   */
  constructor(scene, terrain) {
    /** @type {Phaser.Scene} */
    this.scene   = scene;
    /** @type {import('../utils/TerrainGenerator.js').TerrainGenerator} */
    this.terrain = terrain;

    /**
     * Active obstacle entries.
     * @type {Array<{typeName:string, body:MatterBody, sprite:Phaser.GameObjects.GameObject}>}
     */
    this._active = [];

    /** X of the furthest spawned obstacle. */
    this._headX  = 900;   // start well after player

    /** Seeded RNG — same seed = same level layout. */
    this._rng    = new Phaser.Math.RandomDataGenerator(['mkr-obs-1']);

    /** Set of body IDs currently being destroyed (prevents double-destroy). */
    this._destroying = new Set();

    this._registerCollisions();
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Frame tick — called by GameScene.update().
   * @param {number} cameraScrollX  Camera's current scrollX
   * @param {number} distanceM      Distance in meters (for difficulty scaling)
   */
  update(cameraScrollX, distanceM) {
    this._cull(cameraScrollX);
    this._spawnAhead(cameraScrollX, distanceM);
    this._syncSprites();
  }

  /**
   * Force-destroy an obstacle body after a collision.
   * Safe to call multiple times for same body (guarded by _destroying set).
   * @param {MatterBody}          body
   * @param {Phaser.Math.Vector2} impactVel
   */
  destroyObstacle(body, impactVel) {
    if (this._destroying.has(body.id)) return;
    this._destroying.add(body.id);

    const idx = this._active.findIndex((o) => o.body === body);
    if (idx === -1) { this._destroying.delete(body.id); return; }

    const entry = this._active.splice(idx, 1)[0];
    const def   = TYPES[entry.typeName];

    // Scrap reward
    const scrap = this.scene.registry.get('currency') ?? 0;
    this.scene.registry.set('currency', scrap + def.scrap);

    // Remove body from world
    try { this.scene.matter.world.remove(body); } catch {}
    entry.sprite?.destroy();

    // Spawn debris + particles
    this._spawnDebris(body.position, def, impactVel);
    this._spawnParticles(body.position);

    this._destroying.delete(body.id);
  }

  destroy() {
    this._active.forEach((o) => {
      try { this.scene.matter.world.remove(o.body); } catch {}
      o.sprite?.destroy();
    });
    this._active = [];
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE — SPAWN
  // ─────────────────────────────────────────────────────────────────────────

  _spawnAhead(cameraScrollX, distanceM) {
    const rightEdge = cameraScrollX + this.scene.sys.game.config.width;
    const spawnTo   = rightEdge + SPAWN_LEAD;

    while (this._headX < spawnTo) {
      const gap  = this._rng.between(MIN_GAP_PX, MAX_GAP_PX);
      this._headX += gap;

      const typeName = this._pickType(distanceM);
      const def      = TYPES[typeName];

      // Get exact ground Y from terrain
      const groundY = this.terrain
        ? this.terrain.getYAtX(this._headX)
        : this.scene.sys.game.config.height - 250;

      const wx = this._headX;
      const wy = groundY - def.h / 2 - 2;   // sit flush on ground

      this._spawnOne(typeName, def, wx, wy);
    }
  }

  _pickType(distanceM) {
    const eligible = TYPE_KEYS.filter((k) => distanceM >= TYPES[k].minDistM);
    if (eligible.length === 0) return 'barrel';
    return eligible[this._rng.between(0, eligible.length - 1)];
  }

  _spawnOne(typeName, def, wx, wy) {
    const M = Phaser.Physics.Matter.Matter;

    const body = M.Bodies.rectangle(wx, wy, def.w, def.h, {
      isStatic:   false,
      density:    def.density,
      friction:   def.friction,
      restitution:def.restitution,
      label:      `obstacle_${typeName}`,
      collisionFilter: { category: CAT_OBSTACLE, mask: CAT_MECH | CAT_TERRAIN },
    });

    this.scene.matter.world.add(body);

    // Sprite
    let sprite;
    if (this.scene.textures.exists(def.key)) {
      sprite = this.scene.add.image(wx, wy, def.key)
        .setDisplaySize(def.w, def.h)
        .setDepth(15);
    } else {
      sprite = this._makeProceduralObstacle(wx, wy, def, typeName);
    }

    this._active.push({ typeName, body, sprite });
  }

  /** Draw a colored procedural placeholder for each obstacle type. */
  _makeProceduralObstacle(x, y, def, typeName) {
    const s = this.scene;
    const c = s.add.container(x, y).setDepth(15);

    const bg = s.add.rectangle(0, 0, def.w, def.h, def.color, 1)
      .setStrokeStyle(2, 0x000000, 0.4);

    const label = s.add.text(0, 0, typeName.toUpperCase(), {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffffff',
    }).setOrigin(0.5);

    c.add([bg, label]);
    // Store ref so we can rotate/position it
    c._bg = bg;
    return c;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE — CULL
  // ─────────────────────────────────────────────────────────────────────────

  _cull(cameraScrollX) {
    const cutoff = cameraScrollX - CULL_BEHIND;
    for (let i = this._active.length - 1; i >= 0; i--) {
      const o = this._active[i];
      if (o.body.position.x < cutoff) {
        try { this.scene.matter.world.remove(o.body); } catch {}
        o.sprite?.destroy();
        this._active.splice(i, 1);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE — SYNC
  // ─────────────────────────────────────────────────────────────────────────

  _syncSprites() {
    for (const o of this._active) {
      if (!o.body || !o.sprite) continue;
      o.sprite.setPosition(o.body.position.x, o.body.position.y);
      if (o.sprite.setRotation) o.sprite.setRotation(o.body.angle);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE — DESTRUCTION FX
  // ─────────────────────────────────────────────────────────────────────────

  _spawnDebris(pos, def, impactVel) {
    const M   = Phaser.Physics.Matter.Matter;
    const ivx = impactVel?.x ?? 6;
    const ivy = impactVel?.y ?? -2;

    for (let i = 0; i < def.fragments; i++) {
      const fw = this._rng.between(18, 55);
      const fh = this._rng.between(12, 38);
      const fx = pos.x + this._rng.between(-def.w * 0.4, def.w * 0.4);
      const fy = pos.y + this._rng.between(-def.h * 0.4, def.h * 0.4);

      const frag = M.Bodies.rectangle(fx, fy, fw, fh, {
        density:     0.0008,
        restitution: 0.38,
        friction:    0.35,
        label:       'debris',
        collisionFilter: { category: CAT_DEBRIS, mask: CAT_TERRAIN },
      });

      // Launch: mostly upward + forward
      const angle  = this._rng.realInRange(-2.4, -0.6);
      const speed  = this._rng.realInRange(5, 15);
      M.Body.setVelocity(frag, {
        x: Math.cos(angle) * speed + ivx * 0.25,
        y: Math.sin(angle) * speed + ivy * 0.15,
      });
      M.Body.setAngularVelocity(frag, this._rng.realInRange(-0.25, 0.25));

      this.scene.matter.world.add(frag);

      // Visual — use debris texture or a tinted rectangle
      let fragSprite;
      if (this.scene.textures.exists('particle-debris')) {
        fragSprite = this.scene.add.image(fx, fy, 'particle-debris')
          .setDisplaySize(fw, fh)
          .setTint(def.color ?? 0x886644)
          .setDepth(14);
      } else {
        fragSprite = this.scene.add.rectangle(fx, fy, fw, fh, def.color ?? 0x886644)
          .setDepth(14);
      }

      // Sync sprite to physics body each frame
      const syncFn = () => {
        if (!fragSprite.active) return;
        fragSprite.setPosition(frag.position.x, frag.position.y);
        if (fragSprite.setRotation) fragSprite.setRotation(frag.angle);
      };
      this.scene.events.on('update', syncFn);

      // Remove after 2.5 s
      this.scene.time.delayedCall(2500, () => {
        this.scene.events.off('update', syncFn);
        try { this.scene.matter.world.remove(frag); } catch {}
        if (fragSprite.active) {
          this.scene.tweens.add({
            targets: fragSprite, alpha: 0, duration: 300,
            onComplete: () => fragSprite.destroy(),
          });
        }
      });
    }
  }

  _spawnParticles(pos) {
    // Sparks
    if (this.scene.textures.exists('particle-spark')) {
      const sparks = this.scene.add.particles(pos.x, pos.y, 'particle-spark', {
        speed:     { min: 80,  max: 420 },
        angle:     { min: 200, max: 340 },
        scale:     { start: 0.9, end: 0 },
        alpha:     { start: 1.0, end: 0 },
        tint:      [0xffffff, 0xffcc00, 0xff6600],
        lifespan:  550,
        blendMode: 'ADD',
        emitting:  false,
      }).setDepth(26);
      sparks.explode(22);
      this.scene.time.delayedCall(600, () => sparks.destroy());
    }

    // Smoke
    if (this.scene.textures.exists('particle-smoke')) {
      const smoke = this.scene.add.particles(pos.x, pos.y, 'particle-smoke', {
        speed:    { min: 15, max: 70 },
        angle:    { min: 230, max: 310 },
        scale:    { start: 0.2, end: 1.2 },
        alpha:    { start: 0.7, end: 0 },
        lifespan: 1100,
        tint:     [0x888888, 0x555555],
        emitting: false,
      }).setDepth(24);
      smoke.explode(10);
      this.scene.time.delayedCall(1300, () => smoke.destroy());
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE — COLLISION REGISTRATION
  // ─────────────────────────────────────────────────────────────────────────

  _registerCollisions() {
    this.scene.matter.world.on('collisionstart', (evt) => {
      for (const pair of evt.pairs) {
        const { bodyA, bodyB } = pair;
        const mechLabels = ['mechTorso', 'mechWheel'];
        const isMechA    = mechLabels.includes(bodyA.label);
        const isMechB    = mechLabels.includes(bodyB.label);
        const isObsA     = bodyA.label?.startsWith('obstacle_');
        const isObsB     = bodyB.label?.startsWith('obstacle_');

        if (!((isMechA && isObsB) || (isMechB && isObsA))) continue;

        const obstBody = isObsA ? bodyA : bodyB;
        const mechBody = isMechA ? bodyA : bodyB;

        const impactVel = new Phaser.Math.Vector2(
          mechBody.velocity.x,
          mechBody.velocity.y
        );

        this.scene.time.delayedCall(0, () => {
          this.destroyObstacle(obstBody, impactVel);
        });
      }
    });
  }
}
