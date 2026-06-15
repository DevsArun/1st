# 🤖 MECHA KAIJU RUSH

> A production-ready 2D physics runner — pilot a colossal Mech through a post-apocalyptic wasteland, crush everything in your path.

Built with **Phaser 3.80** + **Matter.js** | Target: **CrazyGames** | Bundle size: **≤ 20 MB**

---

## ▶️ Play instantly in GitHub Codespaces

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/DevsArun/1st?quickstart=1)

1. Click the badge above (or press the green **Code → Codespaces → Create codespace** button on GitHub).
2. Wait ~60 seconds for the container to build and `npm install` to finish.
3. Vite starts automatically — Codespace will pop up a **"Open in Browser"** toast.
4. Click it → game opens in a new tab. 🎮

---

## 💻 Local Setup

```bash
git clone https://github.com/DevsArun/1st.git
cd 1st
npm install
npm run dev
# Open http://localhost:3000
```

### Production Build
```bash
npm run build
# Output → /dist  (well under 20 MB)
npm run preview  # Preview the built version locally
```

---

## 🎮 Controls

| Input | Action |
|---|---|
| `SPACE` or tap **upper** half of screen | Jump |
| `SHIFT` or tap **lower** half of screen | Boost / Thruster |
| `ESC` or `P` | Pause |
| Arrow `UP` | Jump (alternate) |
| `X` | Boost (alternate) |

---

## 📁 Project Structure

```
1st/
├── index.html                   # Entry point + boot splash
├── package.json                 # Vite 5 + Phaser 3.80
├── vite.config.js               # ESM aliases, code splitting
│
├── src/
│   ├── main.js                  # Phaser config (1920×1080, Scale.FIT, Matter gravity 3.5)
│   │
│   ├── scenes/
│   │   ├── BootScene.js         # Registry seed from localStorage
│   │   ├── PreloadScene.js      # Asset loading + procedural placeholder textures
│   │   ├── MainMenuScene.js     # Title screen with idle parallax
│   │   ├── GarageScene.js       # Mech upgrades (Engine / Armor / Plasma)
│   │   ├── GameScene.js         # Core gameplay loop
│   │   └── GameOverScene.js     # Score summary + rewarded-ad double-scrap
│   │
│   ├── entities/
│   │   ├── MechaPlayer.js       # Multi-part Matter composite + spring suspension
│   │   └── ObstacleManager.js   # Procedural spawner + destruction physics
│   │
│   ├── ui/
│   │   └── CockpitDashboard.js  # 3 analog dials with LERP needle rotation
│   │
│   └── utils/
│       ├── TerrainGenerator.js  # Catmull-Rom spline terrain, chunk streaming
│       └── CrazyGamesSDK.js     # SDK stub (init/requestAd/gameplayStart/Stop)
│
└── public/assets/               # Drop real PNGs + OGGs here (see ASSETS.md)
    ├── bg/     ← 4 parallax layers (1920×1080 tileable PNGs)
    ├── mech/   ← Mech sprites + walk spritesheet
    ├── obstacles/
    ├── fx/     ← Spark, smoke, debris, explosion spritesheet
    ├── ui/     ← Dial faces, needles, logo, pause button
    └── audio/  ← OGG SFX + music (budget ≤ 8 MB)
```

---

## 🔧 Key Technical Decisions

| Decision | Why |
|---|---|
| `Scale.FIT` | Cockpit HUD is **never cropped** on any device or orientation |
| Matter.js spring constraint | Torso absorbs bumps realistically; wheel stays glued to terrain |
| Catmull-Rom spline terrain | Smooth hills/craters with zero sharp kinks |
| Rotated rectangle bodies | Avoids `poly-decomp` dependency; tilted ground segments work reliably |
| Procedural canvas textures | Game runs immediately without any art files |
| LERP needle rotation | Smooth dial animation at 60fps with no jitter |

---

## 🎯 CrazyGames SDK Integration

The SDK wrapper (`src/utils/CrazyGamesSDK.js`) is a **complete stub** in development.  
To go live:

1. In `index.html`, replace `<!-- CRAZYGAMES_SDK_PLACEHOLDER -->` with:
   ```html
   <script src="https://sdk.crazygames.com/crazygames-sdk-v3.js"></script>
   ```
2. No other code changes needed — the wrapper auto-detects `window.CrazyGames`.

---

## 📦 Adding Real Assets

Each `public/assets/*/ASSETS.md` file contains the exact specs (dimensions, format, budget) for all required art and audio files. The game runs with procedural placeholders until real assets are added.

---

*Made with Phaser 3 + Matter.js · CrazyGames ready*
