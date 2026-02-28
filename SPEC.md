# LARC CloudWalker — Game Specification

**Version:** 1.0
**Date:** 2026-02-28
**Engine:** HTML5 + JavaScript (Canvas API)
**Genre:** Retro RC Plane Side-Scroller

---

## 1. Concept

LARC CloudWalker is a retro-styled 2D side-scrolling game where the player pilots an RC plane from a ground-level takeoff, navigates obstacles and oncoming air traffic, performs aerobatic tricks for points, and must land safely before the battery dies. Survival is all-or-nothing: any collision ends the level immediately.

---

## 2. Core Mechanics

### 2.1 Controls

| Input | Action |
|---|---|
| Arrow Up / W | Climb |
| Arrow Down / S | Descend |
| Arrow Left / A | Slow down (reduce forward speed) |
| Arrow Right / D | Speed up (increase forward speed) |

### 2.2 Tricks (Key Combinations)

Tricks must be executed cleanly (in sequence, within a 0.8 s window) to register. Each successful trick awards game points.

| Trick | Input Sequence | Points |
|---|---|---|
| Aileron Roll | Left, Left or Right, Right | 1 pt |
| Corkscrew | Up, Left, Down or Up, Right, Down | 2 pts |
| Knife Edge | Up + Left (held 1 s) or Up + Right (held 1 s) | 1 pt |
| Inside Loop | Up, Up | 2 pts |
| Outside Loop | Down, Down | 2 pts |
| Death Knot | Up, Right, Down, Left (full 360°) | 3 pts |
| Snap Roll | Right, Up, Left (rapid) | 3 pts |

Tricks are disabled during takeoff, landing, and when the plane is below 50 px from the ground.

### 2.3 LiPo Battery System

- The player starts each level with **6 battery points** displayed as a LiPo indicator in the HUD.
- Every **30 seconds**, 1 battery point is depleted.
- When the battery hits 0, the level ends.
  - If the plane has **landed safely**, the level is complete.
  - If the plane is **still airborne**, it is a crash → level failed.

### 2.4 Game Points

- Earned by clearing obstacles (+1 pt each) and performing tricks (see table above).
- Displayed in the HUD throughout the level.

### 2.5 Level Completion & Progression

To complete a level and advance, the player must:

1. **Land the plane** on the runway before the battery runs out.
2. Have accumulated **at least 6 game points** upon landing.

On completion, **battery points are recharged from game points**: the game points balance is reduced by 6 (the cost of recharging the LiPo), and any remaining points carry over as bonus points for the next level.

If fewer than 6 game points are earned, the player fails the level (battery refusal — can't recharge — cannot fly the next mission).

### 2.6 Takeoff

Each level begins with the plane stationary on the ground. The player must accelerate (hold Right / D) to build speed until liftoff velocity is reached, then pull up (Up / W) to become airborne. There is no auto-takeoff.

### 2.7 Landing

A **runway** appears at the right edge of the level. To land:
1. Descend and align with the runway elevation.
2. Reduce speed (Left / A) to below landing speed threshold.
3. Touch down on the runway surface.

If the plane touches down too fast or at a steep angle, it crashes.

### 2.8 Collision

Any contact with:
- An obstacle
- An oncoming plane
- A bird (from Level 3 onward)
- The ground (outside of takeoff/landing zones)

...results in an **immediate crash** and level failure. There are no life points.

---

## 3. Levels

The game has 5 base levels before the first challenge level. The background pack contains 5 environments assigned one per regular level. After every 5 regular levels there is a **Challenge Level** (twice as hard, double points for everything, and double game points required to advance: 12 pts instead of 6).

### Regular Levels

| # | Name | Background | New Threat |
|---|---|---|---|
| 1 | Lennuplats Kollane | Meadow / open field (`background_01`) | Basic static obstacles |
| 2 | Rannaäär | Coastal / beach (`background_02`) | Oncoming RC planes |
| 3 | Linnaserv | Urban sunset (`background_03`) | Bird strikes begin |
| 4 | Mägine | Mountain valley (`background_04`) | Faster obstacles + turbulence (random vertical drift) |
| 5 | Pilvepiir | High-altitude sky (`background_05`) | Dense air traffic + fast birds |

### Challenge Levels (after every 5 regular levels)

| # | Name | Background | Modifier |
|---|---|---|---|
| 6 | Kollasel Tormisel Päeval | Meadow with storm overlay | 2× obstacle speed, 2× oncoming traffic, 2× points |
| 12 | Rannarünnak | Coastal with rain overlay | Same 2× modifiers |
| ... | ... | Cycling through backgrounds | Same 2× modifiers |

---

## 4. Obstacle Design

| Obstacle Type | First Appears | Speed | Source Asset |
|---|---|---|---|
| Low fence / barrier | Level 1 | Slow | Platformer pack tilemaps |
| Floating platform | Level 1 | Slow | Platformer pack tiles |
| Oncoming RC plane | Level 2 | Medium | PixelPlanes side-view sprites |
| Small bird flock | Level 3 | Fast, erratic | 16×16 bird sprite |
| Fast oncoming plane | Level 4 | Fast | PixelPlanes — different color |
| Dense bird swarm | Level 5 | Very fast, erratic | Bird sprites, scaled |

---

## 5. HUD Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  LARC CloudWalker     ♥♥♥♥♥♥ LIPO     SCORE: 000    TIME: 0:00  │
│                                                                   │
│   [LEVEL 1 — Lennuplats Kollane]                                 │
└─────────────────────────────────────────────────────────────────┘
```

- **LIPO indicator**: 6 coloured cells, one depletes every 30 s (green → yellow → red).
- **SCORE**: running game points total.
- **TIME**: elapsed level time (counts up).
- **Trick flash**: when a trick is recognised, its name briefly flashes on screen with points awarded.

---

## 6. Assets

All assets are relative to the project root `CloudWalker/`.

### 6.1 Player Plane

**Directory:** `Assets/Planes_Obstacles/`

Sprites used:
- `Planes/BluePlane.png` — default player aircraft
- `Planes/GreenPlane.png`, `RedPlane.png`, etc. — oncoming traffic and future unlockable skins
- `Planes/BulletUpdated.png` — projectile / speed trail effect
- `Planes/Explosion_16x16.png` — crash animation
- `Planes/Highlight.png` — selection indicator (menu)
- `GUI/Bars_And_Sliders.png` — LiPo battery bar
- `GUI/Buttons.png` — UI buttons
- `GUI/Icons.png` — HUD icons
- `Collectables/Coin_*.png` — bonus collectables (future)
- `Collectables/Heart_SpriteSheet.png` — battery top-up collectable (future)
- `Collectables/Shield_SpritesSheet.png` — temporary invincibility (future)
- `Enviornment/UpdatedClouds.png` — decorative cloud layer (note: folder name has a typo — `Enviornment`, not `Environment`)
- `Enviornment/Tilemap_One.png`, `Tilemap_Two.png` — ground / runway tiles

### 6.2 Obstacles & Environment

**Directory:** `Assets/Planes_Obstacles/Puhtalt opstikaalid/` (100 PNG sprites, individually extracted)

Key sprites:
- Fence / barrier hazards from hazards sheet
- Platform tiles for low-altitude obstacles
- Saw blade, spikes — higher-level obstacles
- Cannon — fires projectiles on challenge levels (future stretch goal)

### 6.3 Birds

**Directory:** `Assets/Birds/Textuur/`
- `BirdSprite.png` — single bird (16×16)
- `BirdSpriteBig.png` — larger bird / boss bird variant

**Audio:**
- `Assets/Birds/Helid/mixkit-medium-size-bird-flutter-63.wav` — wing flap SFX (on bird spawn)
- `Assets/Birds/Helid/mixkit-bird-movement-while-flying-2703.wav` — ambient bird sound

### 6.4 Backgrounds

**Directory:** `Assets/Environments/`

| Level | File |
|---|---|
| 1 — Lennuplats Kollane | `background_01.png` |
| 2 — Rannaäär | `background_02.png` |
| 3 — Linnaserv | `background_03.png` |
| 4 — Mägivaheline | `background_04.png` |
| 5 — Pilvepiir | `background_05.png` |

Challenge levels overlay a weather/tint effect on the corresponding base background in code.

### 6.5 Audio

| File | Use |
|---|---|
| `Assets/Sounds/Lühike/607776__therandomsoundbyte2637__75-hz-flying-plane-sound-loop.flac` | Plane engine loop (plays while airborne) |
| `Assets/Sounds/Pikk/579505__timbre__ep-remix-of-nomiqbomis-freesound579270.flac` | Background music (menu + in-game) |

---

## 7. Milestones

Each milestone produces a fully playable build.

---

### Milestone 1 — Flyable Core

**Goal:** A single playable level with full flight physics, battery system, collision, takeoff, and landing.

**Scope:**
- HTML5 Canvas game loop (requestAnimationFrame)
- Parallax-scrolling background (Level 1: Lennuplats Kollane, meadow)
- Player plane spawns on ground; takeoff sequence (speed → liftoff)
- Arrow key / WASD flight controls (up/down/left/right)
- LiPo battery: 6 points, 1 depleted every 30 s, HUD indicator
- Static obstacles scroll in from the right at fixed speed
- Pixel-perfect collision detection (one touch = crash)
- Landing runway at right edge; land before battery = 0 to complete
- Crash screen and level-complete screen
- Plane engine sound loop and background music

**Assets used:**
- `Assets/Planes_Obstacles/Planes/` → `BluePlane.png`, `Explosion_16x16.png`
- `Assets/Planes_Obstacles/Enviornment/` → `Tilemap_One.png`, `UpdatedClouds.png`
- `Assets/Planes_Obstacles/GUI/` → `Bars_And_Sliders.png`
- `Assets/Environments/background_01.png`
- `Assets/Planes_Obstacles/Puhtalt opstikaalid/` → fence/platform obstacle sprites
- `Assets/Sounds/Lühike/607776__therandomsoundbyte2637__75-hz-flying-plane-sound-loop.flac` (engine loop)
- `Assets/Sounds/Pikk/579505__timbre__ep-remix-of-nomiqbomis-freesound579270.flac` (music)

**Definition of done:** Player can take off, fly, avoid obstacles, and either land successfully or crash. Battery depletes correctly. All core game-over conditions work.

---

### Milestone 2 — Full Level Progression

**Goal:** All 5 regular levels playable end-to-end with tricks, scoring, oncoming planes, and birds.

**Scope:**
- Tricks system: key-combo detection engine with 0.8 s input window; 7 tricks (aileron roll, corkscrew, knife edge, inside loop, outside loop, death knot, snap roll)
- On-screen trick name flash + points awarded
- Game points system: obstacles cleared (+1), tricks (see table)
- Level completion gate: 6 game points required to land and advance; battery recharged from game points
- Carry-over bonus points between levels
- Levels 2–5 unlocked, each with correct background and escalating difficulty
- Oncoming planes (Level 2+): AI planes fly left at varying speeds, must be dodged
- Bird strikes (Level 3+): bird flocks with erratic vertical movement, spawn from right
- Difficulty scaling: obstacle speed, traffic density, and bird count increase per level
- Full HUD (LiPo cells, score, timer, level name)
- Level select / progress screen between levels

**Assets used (additions):**
- `Assets/Planes_Obstacles/Planes/` → `GreenPlane.png`, `OrangePlane.png`, `PurplePlane.png` (oncoming traffic)
- `Assets/Birds/Textuur/` → `BirdSprite.png`, `BirdSpriteBig.png`
- `Assets/Birds/Helid/mixkit-medium-size-bird-flutter-63.wav`, `mixkit-bird-movement-while-flying-2703.wav`
- `Assets/Environments/background_02.png` through `background_05.png`
- `Assets/Planes_Obstacles/Puhtalt opstikaalid/` → additional obstacle sprites

**Definition of done:** A complete run from Level 1 to Level 5 is possible. Tricks award points. Failing to reach 6 pts blocks progression. All 5 backgrounds display correctly. Birds and oncoming planes behave correctly from their respective level introductions.

---

### Milestone 3 — Challenge Levels, Polish & Release

**Goal:** Challenge levels, full visual/audio polish, menus, and a shippable build.

**Scope:**
- Challenge levels (Level 6, 12, ...): 2× obstacle speed, 2× traffic density, 2× points, 12 pts required to advance; weather overlay (storm tint) on background
- Main menu screen with title "LARC CloudWalker", play/quit
- High score / personal best tracking (localStorage)
- Pause screen (Escape key)
- Turbulence on Level 4+ (random small vertical forces applied to plane each frame)
- Landing approach visual aid: glide slope indicator on HUD when near runway
- Full explosion animation on crash (`Explosion_16x16.png` frame-by-frame)
- Sound effects: obstacle cleared ping, trick success fanfare, crash boom, battery low warning beep
- Responsive canvas scaling (fits any browser window)
- README with controls and rules

**Assets used (additions):**
- `Assets/Planes_Obstacles/Collectables/` → coin, shield, heart collectible sprites (optional stretch goals)
- `Assets/Planes_Obstacles/GUI/Bases/` → all 10 themed GUI bases for menu styling
- All audio assets fully integrated

**Definition of done:** Game is complete from menu to challenge levels. High scores persist. No placeholder graphics. Exported as a single `index.html` + assets folder that runs offline in any modern browser.

---

## 8. Out of Scope (v1)

- Multiplayer
- Mobile / touch controls
- Top-down WW2 plane assets (`export.zip`) — not used in this game
- Platformer character sprites — not used
- Leaderboard server / online scores
- Projectile combat
