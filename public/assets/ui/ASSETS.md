# UI Assets

## HUD — Cockpit Dashboard

| File                | Size px    | Description                                            |
|---------------------|------------|--------------------------------------------------------|
| `cockpit_panel.png` | 1920 × 220 | Full dashboard background panel (optional overlay).   |
| `dial_bg.png`       | 200 × 200  | Circular dial face (used for energy + heat gauges).   |
| `dial_needle.png`   | 16 × 80    | Needle pointer. **Origin must be (0.5, 1.0)** — base  |
|                     |            | of needle at bottom so rotation pivots correctly.     |
| `speedo_bg.png`     | 240 × 240  | Larger speedometer dial face.                         |
| `speedo_needle.png` | 20 × 100   | Larger speedometer needle. Origin (0.5, 1.0).         |

### Critical: Needle Pivot
The needle PNG must have transparent padding at the TOP so the tip can overhang,
and the BOTTOM of the image is the rotation pivot point:

```
    ▲  (transparent top)
    │  needle body
    ■  rotation pivot  ← image bottom edge = setOrigin(0.5, 1.0)
```

## Top HUD

| File              | Size px    | Description                                          |
|-------------------|------------|------------------------------------------------------|
| `progress_bar.png`| 1400 × 24  | Optional decorative border for the progress bar.    |
| `progress_pip.png`| 16 × 24    | Milestone pip marker.                                |
| `btn_pause.png`   | 64 × 64    | Pause button icon (two vertical bars).               |

## Branding / Menus

| File          | Size px    | Description                                              |
|---------------|------------|----------------------------------------------------------|
| `logo.png`    | 900 × 240  | MECHA KAIJU RUSH logo with glow treatment.              |
| `menu_bg.png` | 1920×1080  | Main menu atmospheric background (used as static image).|

## Audio (reference only — actual files in /audio/)

All audio: OGG Vorbis, 44.1kHz, stereo.
- SFX: normalize to -6 dBFS, trim silence.
- Music loops: ensure perfect loop point (start sample = end sample).
- Total audio budget: ≤ 8 MB.
