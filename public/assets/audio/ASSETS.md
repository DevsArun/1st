# Audio Assets

All files: **OGG Vorbis** format (best browser support + smallest size for HTML5 games).
Fallback MP3 not required — all modern browsers used by CrazyGames support OGG.

## SFX

| File                  | Duration | Notes                                              |
|-----------------------|----------|----------------------------------------------------|
| `impact_heavy.ogg`    | 0.5 s    | Deep metallic THUD for building/large impacts.    |
| `impact_light.ogg`    | 0.3 s    | Crunchy pop for barrel/car impacts.               |
| `thruster_loop.ogg`   | 1.0 s    | Seamless loop. Pitch-shifted by boost intensity.  |
| `explosion.ogg`       | 1.2 s    | Full explosive burst with tail.                   |
| `jump.ogg`            | 0.4 s    | Hydraulic WHOOSH + metal clank.                   |

## Music

| File               | Duration | Notes                                               |
|--------------------|----------|-----------------------------------------------------|
| `music_game.ogg`   | 120 s    | High-energy industrial/electronic. Perfect loop.   |
| `music_menu.ogg`   | 60 s     | Atmospheric/tense. Perfect loop.                   |

## Budget
- SFX total:   < 1.5 MB
- Music total: < 6.5 MB
- **Grand total: < 8 MB** (leaves 12 MB for art + code under 20 MB CrazyGames limit)

## Recommended Tools
- Audacity (free) for editing/normalizing
- sfxr / jsfxr for procedural SFX generation
- LAME (MP3) or oggenc (OGG) for encoding
- Bitrate guide: SFX at 96 kbps OGG, Music at 128 kbps OGG
