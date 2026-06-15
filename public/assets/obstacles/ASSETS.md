# Obstacle Assets

| File            | Size px   | Physics body  | Description                                  |
|-----------------|-----------|---------------|----------------------------------------------|
| `car.png`       | 200 × 90  | 160 × 70 rect | Wrecked post-apoc car. Rolls on impact.      |
| `building.png`  | 240 × 360 | 200 × 300 rect| Ruined building shard. Breaks into 5 frags.  |
| `barrel.png`    | 60 × 75   | 50 × 60 rect  | Oil drum. Pops into 2 fragments.             |

## Destruction Fragments
No separate fragment textures needed — debris is rendered as Phaser rectangles
with random brown/grey tints until dedicated fragment sheets are available.

Replace with `debris_sheet.png` (4 frames × 64×64) in Phase 2.

## Style Notes
- All obstacles should look heavily weathered, rusted, sand-blasted.
- No bright colors — everything should blend into the wasteland palette.
- Consider 2× resolution sprites (400×180 for car) then display at half size
  for crisp rendering on HiDPI screens.
