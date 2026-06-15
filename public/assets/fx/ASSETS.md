# Visual Effects Assets

| File              | Size px    | Type         | Description                                   |
|-------------------|------------|--------------|-----------------------------------------------|
| `spark.png`       | 16 × 16    | Single frame | White/yellow spark point. BlendMode ADD.      |
| `debris.png`      | 32 × 32    | Single frame | Chunky debris fragment silhouette.            |
| `smoke.png`       | 64 × 64    | Single frame | Soft smoke puff. Semi-transparent grey.       |
| `explosion.png`   | 1536×128   | Spritesheet  | 12 frames × 128×128. Full explosion cycle.   |

## Particle Emitter Config Reference (set in ObstacleManager.js)
```
Sparks:  speed 100-400, angle 0-360, scale 0.8→0, lifespan 600ms, blendMode ADD
Smoke:   speed 20-80,   angle 240-300, scale 0.3→1.0, alpha 0.6→0, lifespan 1200ms
Debris:  speed 4-14,    angle varies by impact dir,   lifespan 2000ms (Matter body)
```

## Tips
- Spark and smoke textures should be radially symmetric.
- Export with pre-multiplied alpha.
- Use pngquant to compress: target < 20 KB per single-frame texture.
