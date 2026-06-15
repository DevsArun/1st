/**
 * @file TerrainGenerator.js
 * @description Procedural spline-based terrain generator for MECHA KAIJU RUSH.
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  ALGORITHM OVERVIEW
 * ══════════════════════════════════════════════════════════════════════════
 *
 *  1. CONTROL POINTS — A sparse array of (x, y) heights is generated using
 *     a seeded RNG.  Heights follow a weighted-random profile:
 *       • Flat stretches    (20 % chance)  — rest after a hard section
 *       • Gentle slopes     (40 % chance)  — standard running terrain
 *       • Hill crests       (25 % chance)  — jump opportunities
 *       • Craters / dips    (15 % chance)  — momentum-killing hazards
 *
 *  2. CATMULL-ROM SPLINE — Control points are interpolated with a
 *     Catmull-Rom spline to produce smooth, continuous ground.
 *     This gives natural-looking hills without sharp kinks.
 *
 *  3. SEGMENT BODIES — The interpolated polyline is split into fixed-width
 *     horizontal "slabs" (SEGMENT_WIDTH = 80 px).  Each slab is a
 *     Matter.js static trapezoid body (two vertices at the top, two at a
 *     deep underground baseline) so the mech never falls through.
 *
 *  4. CHUNK MANAGEMENT — Terrain is generated SEGMENT_CHUNK_COUNT segments
 *     at a time, always keeping at least LOOKAHEAD_CHUNKS ahead of the
 *     camera.  Chunks that fall CULL_BEHIND_PX behind the camera are
 *     destroyed and their bodies removed from the world.
 *
 *  5. VISUAL LAYER — A Phaser.GameObjects.Graphics object is redrawn each
 *     chunk to render the visible ground polygon (fill + stroke).
 *
 * ══════════════════════════════════════════════════════════════════════════
 *  PUBLIC API
 * ══════════════════════════════════════════════════════════════════════════
 *
 *  new TerrainGenerator(scene, seed?)
 *  .update(cameraScrollX)          → call every frame from GameScene
 *  .getYAtX(worldX)                → returns surface Y at given X (for obstacle placement)
 *  .destroy()                      → remove all bodies + graphics
 */

import Phaser from 'phaser';
import { GAME_HEIGHT, HUD_HEIGHT } from '../main.js';

// ── Layout ─────────────────────────────────────────────────────────────────
/** Width of a single terrain segment body (px). Smaller = smoother but more bodies. */
const SEGMENT_WIDTH       = 80;
/** How deep underground the terrain slab extends (prevents fall-through). */
const SLAB_DEPTH          = 400;
/** Number of segments per generated chunk. */
const CHUNK_SIZE          = 40;            // 40 × 80 = 3200 px per chunk
/** How many chunks to keep ahead of the camera. */
const LOOKAHEAD_CHUNKS    = 3;
/** Destroy chunks this far behind the camera left edge. */
const CULL_BEHIND_PX      = SEGMENT_WIDTH * CHUNK_SIZE * 1.5;

// ── Height profile (world Y values for the ground surface) ─────────────────
/** Y coordinate of the "rest" / flat ground (below viewport center). */
const BASE_Y   = GAME_HEIGHT - HUD_HEIGHT - 80;
/** Maximum upward deviation from BASE_Y for a hill crest. */
const MAX_HILL = 260;
/** Maximum downward deviation (crater bottom). */
const MAX_DIP  = 60;
/** Control point spacing along X axis. */
const CP_SPACING = 320;

// ── Visuals ────────────────────────────────────────────────────────────────
const GROUND_FILL_COLOR   = 0x5c3d1e;   // Sandy brown — wasteland soil
const GROUND_FILL_ALPHA   = 1.0;
const GROUND_EDGE_COLOR   = 0x8b6534;   // Lighter edge highlight
const GROUND_EDGE_WIDTH   = 3;
const GROUND_DEPTH_COLOR  = 0x2a1a08;   // Darker underground fill

// ─────────────────────────────────────────────────────────────────────────────

export class TerrainGenerator {
  /**
   * @param {Phaser.Scene} scene
   * @param {string|number} [seed='mkr-terrain-1']
   */
  constructor(scene, seed = 'mkr-terrain-1') {
    /** @type {Phaser.Scene} */
    this.scene = scene;

    /** Seeded RNG for deterministic terrain */
    this._rng = new Phaser.Math.RandomDataGenerator([String(seed)]);

    /**
     * Generated height samples: index → world Y.
     * Key = segment index (worldX / SEGMENT_WIDTH).
     * @type {Map<number, number>}
     */
    this._heights = new Map();

    /**
     * Active Matter.js terrain bodies, grouped by chunk index.
     * @type {Map<number, { bodies: MatterBody[], gfx: Phaser.GameObjects.Graphics }>}
     */
    this._chunks = new Map();

    /** Index of the furthest generated segment. */
    this._genHeadSeg = 0;

    /** X coordinate of furthest generated chunk's right edge. */
    this._genHeadX = 0;

    // Pre-generate the first few control points so we have data for chunk 0
    this._ensureHeightsUpTo(CHUNK_SIZE * LOOKAHEAD_CHUNKS * 2);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Must be called every frame. Generates terrain ahead of camera and
   * culls terrain far behind.
   * @param {number} cameraScrollX  Current camera.scrollX value
   */
  update(cameraScrollX) {
    const rightEdge  = cameraScrollX + this.scene.sys.game.config.width;
    const targetGenX = rightEdge + SEGMENT_WIDTH * CHUNK_SIZE * LOOKAHEAD_CHUNKS;

    // Generate new chunks if needed
    while (this._genHeadX < targetGenX) {
      this._buildChunk(Math.floor(this._genHeadX / (SEGMENT_WIDTH * CHUNK_SIZE)));
    }

    // Cull old chunks
    const cullX = cameraScrollX - CULL_BEHIND_PX;
    for (const [chunkIdx, chunk] of this._chunks) {
      const chunkRightX = (chunkIdx + 1) * SEGMENT_WIDTH * CHUNK_SIZE;
      if (chunkRightX < cullX) {
        this._destroyChunk(chunkIdx);
      }
    }
  }

  /**
   * Returns the surface Y coordinate at a given world X.
   * Used by ObstacleManager to place obstacles on the ground.
   * @param {number} worldX
   * @returns {number}
   */
  getYAtX(worldX) {
    const segIndex = worldX / SEGMENT_WIDTH;
    const segFloor = Math.floor(segIndex);
    const t        = segIndex - segFloor;

    const y0 = this._getSegmentY(segFloor);
    const y1 = this._getSegmentY(segFloor + 1);

    // Linear interpolation between adjacent segment heights
    return Phaser.Math.Linear(y0, y1, t);
  }

  /**
   * Remove all Matter bodies and Graphics objects.
   */
  destroy() {
    for (const chunkIdx of this._chunks.keys()) {
      this._destroyChunk(chunkIdx);
    }
    this._chunks.clear();
    this._heights.clear();
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE — HEIGHT GENERATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Ensure heights are generated at least up to segment `upToSeg`.
   * @param {number} upToSeg
   */
  _ensureHeightsUpTo(upToSeg) {
    // Control points are placed every CP_SPACING / SEGMENT_WIDTH segments
    const cpStride = Math.max(1, Math.round(CP_SPACING / SEGMENT_WIDTH));

    while (this._genHeadSeg <= upToSeg) {
      if (this._genHeadSeg % cpStride === 0) {
        // Generate a new control point at this segment
        this._heights.set(this._genHeadSeg, this._nextControlY(this._genHeadSeg));
      }
      this._genHeadSeg++;
    }
  }

  /**
   * Generates the Y value for a control point at the given segment index.
   * Uses a weighted random profile to vary terrain type.
   * @param {number} segIdx
   * @returns {number}
   */
  _nextControlY(segIdx) {
    // Flat entry ramp for the first 8 segments
    if (segIdx < 8) return BASE_Y;

    const roll = this._rng.frac();

    if (roll < 0.20) {
      // Flat stretch — stay close to base
      return BASE_Y + this._rng.between(-15, 15);
    } else if (roll < 0.60) {
      // Gentle slope / undulation
      const prev = this._heights.get(segIdx - Math.round(CP_SPACING / SEGMENT_WIDTH)) ?? BASE_Y;
      const delta = this._rng.between(-80, 80);
      return Phaser.Math.Clamp(prev + delta, BASE_Y - MAX_HILL, BASE_Y + MAX_DIP);
    } else if (roll < 0.85) {
      // Hill crest
      return BASE_Y - this._rng.between(60, MAX_HILL);
    } else {
      // Crater / dip
      return BASE_Y + this._rng.between(20, MAX_DIP);
    }
  }

  /**
   * Get the surface Y for a specific segment, interpolating between
   * the sparse control points using Catmull-Rom.
   * @param {number} segIdx
   * @returns {number}
   */
  _getSegmentY(segIdx) {
    if (this._heights.has(segIdx)) return this._heights.get(segIdx);

    // Ensure we have data
    this._ensureHeightsUpTo(segIdx + 4);

    // Find surrounding control points
    const cpStride = Math.max(1, Math.round(CP_SPACING / SEGMENT_WIDTH));
    const cp0Idx = Math.floor(segIdx / cpStride) * cpStride;
    const cp1Idx = cp0Idx + cpStride;
    const cpM1Idx = Math.max(0, cp0Idx - cpStride);
    const cp2Idx  = cp1Idx + cpStride;

    const t  = (segIdx - cp0Idx) / cpStride;
    const p0 = this._heights.get(cpM1Idx) ?? BASE_Y;
    const p1 = this._heights.get(cp0Idx)  ?? BASE_Y;
    const p2 = this._heights.get(cp1Idx)  ?? BASE_Y;
    const p3 = this._heights.get(cp2Idx)  ?? BASE_Y;

    const y = this._catmullRom(t, p0, p1, p2, p3);
    this._heights.set(segIdx, y);
    return y;
  }

  /**
   * Catmull-Rom spline interpolation.
   * Returns the value at parameter t (0..1) between p1 and p2.
   */
  _catmullRom(t, p0, p1, p2, p3) {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * (
      (2 * p1) +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE — CHUNK BUILDING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Build a complete terrain chunk (CHUNK_SIZE segments) at the given index.
   * Creates Matter.js static trapezoid bodies + a Graphics visual layer.
   * @param {number} chunkIdx
   */
  _buildChunk(chunkIdx) {
    if (this._chunks.has(chunkIdx)) return; // Already built

    const startSeg = chunkIdx * CHUNK_SIZE;
    const endSeg   = startSeg + CHUNK_SIZE;

    // Ensure heights are available
    this._ensureHeightsUpTo(endSeg + Math.round(CP_SPACING / SEGMENT_WIDTH) + 4);

    const bodies  = [];
    const Matter  = Phaser.Physics.Matter.Matter;

    // Graphics for this chunk (drawn below physics layer)
    const gfx = this.scene.add.graphics().setDepth(5);

    // Collect all surface points for the polygon fill
    const surfacePoints = [];
    for (let s = startSeg; s <= endSeg; s++) {
      surfacePoints.push({
        x: s * SEGMENT_WIDTH,
        y: this._getSegmentY(s),
      });
    }

    // ── Draw filled ground polygon ────────────────────────────────────────
    // Deep underground bottom edge
    const bottomY = GAME_HEIGHT + SLAB_DEPTH;

    gfx.fillStyle(GROUND_DEPTH_COLOR, 1);
    gfx.beginPath();
    gfx.moveTo(surfacePoints[0].x, bottomY);
    surfacePoints.forEach((p) => gfx.lineTo(p.x, p.y));
    gfx.lineTo(surfacePoints[surfacePoints.length - 1].x, bottomY);
    gfx.closePath();
    gfx.fillPath();

    // Lighter top layer (surface)
    gfx.fillStyle(GROUND_FILL_COLOR, GROUND_FILL_ALPHA);
    gfx.beginPath();
    gfx.moveTo(surfacePoints[0].x, bottomY);
    surfacePoints.forEach((p) => gfx.lineTo(p.x, p.y));
    // Build subtle visual depth: second fill only covers top 60px
    surfacePoints.slice().reverse().forEach((p) => gfx.lineTo(p.x, p.y + 60));
    gfx.closePath();
    gfx.fillPath();

    // Surface edge line
    gfx.lineStyle(GROUND_EDGE_WIDTH, GROUND_EDGE_COLOR, 0.9);
    gfx.beginPath();
    surfacePoints.forEach((p, i) =>
      i === 0 ? gfx.moveTo(p.x, p.y) : gfx.lineTo(p.x, p.y)
    );
    gfx.strokePath();

    // ── Build Matter bodies ───────────────────────────────────────────────
    // Each segment: a rectangle tilted to match the slope between y0 and y1.
    // Using a rotated rectangle avoids the poly-decomp dependency that
    // Bodies.fromVertices requires for non-trivial convex shapes.
    for (let s = startSeg; s < endSeg; s++) {
      const x0 = s * SEGMENT_WIDTH;
      const x1 = x0 + SEGMENT_WIDTH;
      const y0 = this._getSegmentY(s);
      const y1 = this._getSegmentY(s + 1);

      // Segment midpoint
      const mx    = (x0 + x1) / 2;
      const my    = (y0 + y1) / 2 + SLAB_DEPTH / 2;

      // Slope angle of this segment
      const angle = Math.atan2(y1 - y0, SEGMENT_WIDTH);

      // Length along the slope
      const segLen = Math.sqrt(SEGMENT_WIDTH * SEGMENT_WIDTH + (y1 - y0) * (y1 - y0));

      const body = Matter.Bodies.rectangle(mx, my, segLen, SLAB_DEPTH, {
        isStatic:    true,
        angle:       angle,
        friction:    0.85,
        restitution: 0.02,
        label:       'terrain',
        collisionFilter: { category: 0x0004, mask: 0x0001 | 0x0002 | 0x0008 },
      });

      this.scene.matter.world.add(body);
      bodies.push(body);
    }

    this._chunks.set(chunkIdx, { bodies, gfx });

    // Advance generation head
    const chunkRightX = endSeg * SEGMENT_WIDTH;
    if (chunkRightX > this._genHeadX) {
      this._genHeadX = chunkRightX;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  PRIVATE — CHUNK DESTRUCTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Remove all Matter bodies and the Graphics layer for a chunk.
   * @param {number} chunkIdx
   */
  _destroyChunk(chunkIdx) {
    const chunk = this._chunks.get(chunkIdx);
    if (!chunk) return;

    chunk.bodies.forEach((body) => {
      try { this.scene.matter.world.remove(body); } catch {}
    });
    chunk.gfx?.destroy();
    this._chunks.delete(chunkIdx);
  }
}
