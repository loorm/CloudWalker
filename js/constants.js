// Canvas & layout
export const CANVAS_W = 960;
export const CANVAS_H = 540;
export const HUD_H    = 44;
export const GROUND_Y = 490;   // Y of ground surface (plane crashes if bottom touches this outside runway)

// Plane display
export const PLANE_W        = 80;
export const PLANE_H        = 36;
export const PLANE_SCREEN_X = 200; // fixed screen X; camera tracks world X

// Physics
export const GRAVITY           = 350;  // px/s² downward (used when UP or DOWN is held)
export const GLIDE_GRAVITY     = 80;   // px/s² downward when no vertical key is held
export const GLIDE_VY_MAX      = 200;  // max sink speed during passive glide (~45° at cruise)
export const VX_MIN            = 60;   // minimum forward speed while airborne
export const VX_MAX            = 380;  // maximum forward speed
export const VX_ACCEL          = 100;  // speed change per second (air)
export const VX_GROUND_ACCEL   = 150;  // speed change per second (ground takeoff)
export const VY_LIFT_ACCEL     = 560;  // upward counterforce when holding Up (must exceed gravity to climb)
export const VY_DESCEND_EXTRA  = 200;  // extra downward accel when holding Down
export const VY_MAX            = 320;  // terminal vertical speed
export const LIFTOFF_VX        = 200;  // ground speed required before Up key lifts off

// Battery
export const BATTERY_MAX        = 6;
export const BATTERY_DRAIN_SEC  = 30;  // seconds per battery point (airborne only)

// Obstacles
export const OBS_COL_W       = 44;    // obstacle column pixel width
export const OBS_GAP_MIN     = 450;   // minimum world-px gap between obstacles
export const OBS_GAP_MAX     = 750;
export const OBS_GATE_GAP    = 150;   // vertical gap in gate obstacle
export const OBS_FIRST_X     = 900;   // world X of first obstacle (gives player time to take off)
export const HITBOX_PAD      = 7;     // shrink collision box each side for fairness

// Takeoff runway
export const TAKEOFF_RUNWAY_START = -200; // world X of left edge (fills initial screen)
export const TAKEOFF_RUNWAY_END   =  380; // world X of right edge; crash if still rolling past here

// Runway / landing
export const RUNWAY_W                = 420;
export const RUNWAY_TRIGGER_BATTERY  = 1;   // runway spawns when battery reaches this
export const RUNWAY_AHEAD            = 1100; // world px ahead of camera when runway spawns
export const LAND_VX_MAX             = 180;  // max horizontal speed for safe landing
export const LAND_VY_MAX             = 130;  // max vertical speed for safe landing

// Visual
export const PARALLAX_BG    = 0.3;  // background scrolls at 30% of camera speed
export const PARALLAX_CLOUD = 0.6;

// Explosion animation
export const EXPLOSION_FRAME_H  = 16;  // each frame is square; width determined from image
export const EXPLOSION_DURATION = 0.7; // seconds

// Tricks
export const TRICK_WINDOW       = 0.8;  // sequence input window (seconds)
export const TRICK_FLASH_DUR    = 2.0;  // how long trick name stays on screen
export const HIGH_ALPHA_HOLD         = 1.0;  // hold duration for High Alpha
export const HIGH_ALPHA_TILT_ANGLE   = 1.35; // radians (~77°) tilt at full high alpha
export const HIGH_ALPHA_WOBBLE_AMP   = 0.09; // radians (~5°) wobble amplitude while held
export const HIGH_ALPHA_WOBBLE_RATE  = 19;   // radians/s (~3 Hz) wobble frequency
export const HIGH_ALPHA_TILT_SPEED   = 8;    // lerp speed for entry/exit (full tilt in ~0.25 s)
export const MIN_TRICK_Y        = 50;   // min px above GROUND_Y for tricks to fire
export const DEATH_KNOT_SPIN    = 0.45; // seconds for the 360° visual spin
export const DEATH_KNOT_ARC_H   = 28;   // px the plane rises at the top of the inside loop
export const CORKSCREW_SPIN     = 0.55; // seconds for one full corkscrew roll
export const CORKSCREW_ARC_H    = 22;   // px the plane climbs during the corkscrew
export const SNAP_ROLL_SPIN     = 1.10; // seconds for snap roll (2× slower than corkscrew)
export const SNAP_ROLL_ARC_H    = 22;   // px the plane drops during the snap roll

// Level progression
export const LEVEL_COUNT              = 8;
export const POINTS_TO_LAND           = 60;
export const POINTS_TO_LAND_CHALLENGE = 60;

// NPC planes (oncoming traffic)
export const NPC_W               = 60;   // display width
export const NPC_H               = 28;   // display height
export const NPC_SPAWN_INTERVAL  = 3.5;  // base seconds between NPC spawns
export const NPC_SPAWN_JITTER    = 3.0;  // ± random added to interval

// Birds
export const BIRD_W          = 32;   // display width
export const BIRD_H          = 24;   // display height
export const BIRD_FRAME_SIZE = 16;   // source frame size in BirdSprite.png
export const BIRD_FRAMES     = 8;    // frames per row
export const BIRD_FPS        = 10;   // animation frames per second
export const BIRD_SPAWN_INTERVAL = 2.0;
export const BIRD_SPAWN_JITTER   = 0.5;
