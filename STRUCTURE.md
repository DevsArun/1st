# MECHA KAIJU RUSH — Project Structure

```
mecha-kaiju-rush/
│
├── index.html                   # Entry point. Canvas mount + boot splash.
├── package.json                 # Vite + Phaser 3.80 + ESLint
├── vite.config.js               # Build config: base='./', code splitting, aliases
├── .gitignore
│
├── src/
│   ├── main.js                  # Phaser.Game config (1920×1080, Scale.FIT, Matter gravity 3.5)
│   │
│   ├── scenes/
│   │   ├── BootScene.js         # Registry seed, localStorage hydration
│   │   ├── PreloadScene.js      # Asset manifest, progress bar, anim defs, portrait check
│   │   ├── MainMenuScene.js     # Parallax title screen, Play/Garage buttons
│   │   ├── GarageScene.js       # Upgrade panels: Engine / Armor / Plasma (5 levels each)
│   │   ├── GameScene.js         # Core loop: parallax, terrain, player, obstacles, HUD
│   │   └── GameOverScene.js     # Score summary, rewarded ad (double scrap), nav buttons
│   │
│   ├── entities/
│   │   ├── MechaPlayer.js       # Multi-part Matter composite (torso + wheel + suspension constraint)
│   │   └── ObstacleManager.js   # Procedural spawner, destruction physics, debris, particles
│   │
│   ├── ui/
│   │   └── CockpitDashboard.js  # Bottom HUD: Energy dial, Speedometer, Heat dial (needle rotation)
│   │
│   └── utils/
│       └── CrazyGamesSDK.js     # Stub wrapper: init, requestAd, gameplayStart/Stop, saveData
│
└── public/
    └── assets/
        ├── bg/                  # 4× parallax TileSprite PNGs (1920×1080, tileable)
        │   └── ASSETS.md
        ├── mech/                # Torso, leg sprites, walk spritesheet
        │   └── ASSETS.md
        ├── obstacles/           # Car, building, barrel PNGs
        │   └── ASSETS.md
        ├── fx/                  # Spark, smoke, debris, explosion spritesheet
        │   └── ASSETS.md
        ├── ui/                  # Dial faces, needles, progress bar, pause btn, logo
        │   └── ASSETS.md
        └── audio/               # OGG: SFX (5 files) + Music (2 files) — budget ≤ 8 MB
            └── ASSETS.md
```

## Phase Roadmap

| Phase | Deliverable                                                       | Status  |
|-------|-------------------------------------------------------------------|---------|
| 1     | Scaffold: config, scenes, entity stubs, HUD stub, SDK wrapper     | ✅ Done  |
| 2     | TerrainGenerator (spline segments), full MechaPlayer physics      | Pending |
| 3     | ObstacleManager full destruction + particle FX                    | Pending |
| 4     | CockpitDashboard real assets + polish                             | Pending |
| 5     | Garage upgrades wired to gameplay stats                           | Pending |
| 6     | Audio integration (SFX + music)                                   | Pending |
| 7     | CrazyGames SDK real integration + QA pass                         | Pending |
| 8     | Performance profiling, bundle analysis (target ≤ 20 MB)           | Pending |

## Key Design Decisions

### Why Scale.FIT?
Guarantees 1920×1080 design is always fully visible.  No cropping of the
cockpit dashboard on any device or orientation.  Letterboxes/pillarboxes
with the dark #0a0a0f background color.

### Why TileSprite for parallax?
TileSprite.tilePositionX is GPU-accelerated (single draw call per layer).
We scroll tilePositionX manually each frame using PARALLAX ratio × worldX,
giving precise control at zero overhead.

### Why Matter.js Constraint for suspension?
A spring constraint between torso and wheel bodies gives physically correct
terrain absorption.  The torso stays visually stable while the wheel follows
every bump.  stiffness=0.12 + damping=0.6 eliminates floatiness.

### Why pool obstacles?
Matter.Bodies.rectangle() is slow.  Reusing pre-created bodies by
repositioning them avoids GC pressure at high obstacle density.
