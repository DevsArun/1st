# Mech Sprite Assets

All sprites should be pre-multiplied alpha PNGs.

| File              | Size px   | Description                                              |
|-------------------|-----------|----------------------------------------------------------|
| `torso.png`       | 256 × 200 | Main torso body (faces right). Origin center.            |
| `leg_left.png`    | 128 × 128 | Left leg / wheel assembly. Origin center.                |
| `leg_right.png`   | 128 × 128 | Right leg / wheel assembly.                              |
| `thruster.png`    | 128 × 64  | Thruster exhaust glow. BlendMode ADD. Origin right-edge. |
| `mech_walk.png`   | 2048×256  | Spritesheet: 8 frames × 256×256. Walk/run cycle.        |

## Physics Body Mapping
- Torso body: 120 × 80 px rectangle (Matter.js).
- Wheel body: circle radius 44 px (Matter.js).
- Sprite sizes are LARGER than physics bodies for visual style.

## Notes
- The mech design should evoke a heavy quadruped warmachine
  (think Pacific Rim Jaeger meets tank).
- Limbs should be mechanical/industrial — hydraulic pistons visible.
- Color palette: gunmetal grey + electric blue accent lines + orange thruster glow.
