import {
    CANVAS_W, CANVAS_H, HUD_H, GROUND_Y, PLANE_SCREEN_X,
    OBS_COL_W, OBS_GAP_MIN, OBS_GAP_MAX, OBS_GATE_GAP, OBS_FIRST_X, HITBOX_PAD,
    RUNWAY_W, RUNWAY_TRIGGER_BATTERY, RUNWAY_AHEAD,
    PARALLAX_BG,
    NPC_W, NPC_H, NPC_SPAWN_INTERVAL, NPC_SPAWN_JITTER,
    BIRD_W, BIRD_H, BIRD_FRAME_SIZE, BIRD_FRAMES, BIRD_FPS,
    BIRD_SPAWN_INTERVAL, BIRD_SPAWN_JITTER,
} from './constants.js';
import { img } from './assets.js';
import { playBirdFlutter } from './audio.js';

const PLAY_H    = GROUND_Y - HUD_H;
const OBS_TYPES = ['column', 'hang', 'gate'];
const OBS_MIN_H = 70;
const OBS_MAX_H = PLAY_H * 0.55;

const NPC_KEYS  = ['npc_green', 'npc_orange', 'npc_purple'];

// ── Factory helpers ───────────────────────────────────────────────────────────

function makeNpc(worldX, y, speed) {
    return {
        worldX,
        y,
        speed,
        imgKey: NPC_KEYS[Math.floor(Math.random() * NPC_KEYS.length)],
    };
}

function makeBird(worldX, y, speed, phase) {
    // phase in [0,1): fraction of one animation cycle — distribute evenly within flock
    // so birds are never in the same frame at the same time.
    const cycleLen = BIRD_FRAMES / BIRD_FPS; // seconds per full cycle
    return {
        worldX,
        y,
        speed,
        vy:        (Math.random() - 0.5) * 80,
        flapTimer: phase * cycleLen,
    };
}

// ── Bird sprite scanner ───────────────────────────────────────────────────────
// Reads pixel data once to find which frames actually contain visible pixels.
// Skips blank/transparent frames that cause the bird to "disappear" mid-animation.
function _scanBirdFrames(birdImg) {
    try {
        const size  = BIRD_FRAME_SIZE;
        const total = Math.max(1, Math.floor(birdImg.width / size));
        const c     = document.createElement('canvas');
        c.width     = birdImg.width;
        c.height    = size;
        const cx    = c.getContext('2d');
        cx.drawImage(birdImg, 0, 0);
        const valid = [];
        for (let f = 0; f < total; f++) {
            const data = cx.getImageData(f * size, 0, size, size).data;
            // Frame counts as valid if any pixel has alpha > 32
            for (let i = 3; i < data.length; i += 4) {
                if (data[i] > 32) { valid.push(f); break; }
            }
        }
        console.log(`[birds] sprite ${birdImg.width}×${birdImg.height}px · ${total} frames · valid:`, valid);
        return valid.length > 0 ? valid : Array.from({ length: total }, (_, i) => i);
    } catch {
        // Tainted canvas (CORS) — fall back to all frames
        const total = Math.max(1, Math.floor(birdImg.width / BIRD_FRAME_SIZE));
        console.warn('[birds] cannot scan frames, using all', total);
        return Array.from({ length: total }, (_, i) => i);
    }
}

// ── World class ───────────────────────────────────────────────────────────────

export class World {
    constructor() {
        this._validBirdFrames = null; // populated on first draw by _scanBirdFrames
        this.levelCfg = null;
        this.reset({ num: 1, bgKey: 'bg_1', obsGapFactor: 1, trafficCount: 0,
                     trafficSpeed: 0, birdCount: 0, birdSpeed: 0, turbulence: 0 }, 0);
    }

    reset(levelCfg, initialScore = 0) {
        this.levelCfg = levelCfg;

        // Obstacles
        this.obstacles     = [];
        this.nextObsWorldX = OBS_FIRST_X;

        // Runway
        this.runway        = null;
        this.runwaySpawned = false;

        // Score
        this.score = initialScore;

        // NPC planes
        this.npcs     = [];
        this.npcTimer = NPC_SPAWN_INTERVAL * 0.5; // first NPC arrives sooner

        // Birds
        this.birds     = [];
        this.birdTimer = BIRD_SPAWN_INTERVAL;
    }

    addScore(pts) {
        this.score += pts;
    }

    // ── Per-frame update ──────────────────────────────────────────────────────

    update(planeWorldX, battery) {
        const cameraX = planeWorldX - PLANE_SCREEN_X;
        const cfg     = this.levelCfg;

        this._updateObstacles(planeWorldX, cameraX, cfg);
        this._updateRunway(cameraX, battery);
        if (cfg.trafficCount > 0) this._updateNpcs(cameraX, cfg);
        if (cfg.birdCount    > 0) this._updateBirds(cameraX, cfg);
    }

    // ── Obstacle management ───────────────────────────────────────────────────

    _updateObstacles(planeWorldX, cameraX, cfg) {
        const gMin = OBS_GAP_MIN * cfg.obsGapFactor;
        const gMax = OBS_GAP_MAX * cfg.obsGapFactor;

        while (this.nextObsWorldX < cameraX + CANVAS_W + 300) {
            this._spawnObstacle(this.nextObsWorldX);
            this.nextObsWorldX += OBS_COL_W + gMin + Math.random() * (gMax - gMin);
        }

        for (const obs of this.obstacles) {
            if (!obs.scored && obs.worldX + OBS_COL_W < planeWorldX) {
                obs.scored = true;
                this.score += (cfg.pointMultiplier ?? 1);
            }
        }
        this.obstacles = this.obstacles.filter(o => o.worldX - cameraX > -400);
    }

    _spawnObstacle(worldX) {
        const type = OBS_TYPES[Math.floor(Math.random() * OBS_TYPES.length)];
        const obs  = { worldX, type, scored: false };

        if (type === 'column') {
            obs.h = OBS_MIN_H + Math.random() * (OBS_MAX_H - OBS_MIN_H);
            obs.y = GROUND_Y - obs.h;
        } else if (type === 'hang') {
            obs.h = OBS_MIN_H + Math.random() * (OBS_MAX_H - OBS_MIN_H);
            obs.y = HUD_H;
        } else { // gate
            const gapCentre = HUD_H + OBS_MIN_H +
                Math.random() * (PLAY_H - OBS_GATE_GAP - OBS_MIN_H * 2);
            obs.topH = gapCentre - HUD_H;
            obs.botY = gapCentre + OBS_GATE_GAP;
            obs.botH = GROUND_Y - obs.botY;
        }
        this.obstacles.push(obs);
    }

    // ── Runway ────────────────────────────────────────────────────────────────

    _updateRunway(cameraX, battery) {
        if (!this.runwaySpawned && battery <= RUNWAY_TRIGGER_BATTERY) {
            this.runway = { worldX: cameraX + RUNWAY_AHEAD };
            this.runwaySpawned = true;
        }
    }

    // ── NPC planes ────────────────────────────────────────────────────────────

    _updateNpcs(cameraX, cfg) {
        const dt_ref = 1 / 60; // caller passes dt via update(); we don't have it here
        // NPC movement is done in updateWithDt instead — see below
        this.npcs = this.npcs.filter(n => n.worldX > cameraX - 200);

        // Spawn if below cap
        if (this.npcs.length < cfg.trafficCount && this.npcTimer <= 0) {
            const margin = NPC_H / 2 + 10;
            const y = HUD_H + margin + Math.random() * (PLAY_H - margin * 2);
            this.npcs.push(makeNpc(cameraX + CANVAS_W + 120, y, cfg.trafficSpeed));
            this.npcTimer = NPC_SPAWN_INTERVAL + (Math.random() - 0.5) * NPC_SPAWN_JITTER;
        }
    }

    _updateBirds(cameraX, cfg) {
        // Remove birds that are past the draw cutoff so the spawn check triggers
        // the instant the last bird leaves the screen (not 158 px later).
        this.birds = this.birds.filter(b => b.worldX > cameraX - BIRD_W - 10);

        if (this.birds.length < cfg.birdCount && this.birdTimer <= 0) {
            const flockSize = Math.min(2 + Math.floor(Math.random() * 3), cfg.birdCount); // 2-4 but never over cap
            const baseY = HUD_H + 60 + Math.random() * (PLAY_H - 120);
            for (let i = 0; i < flockSize; i++) {
                this.birds.push(makeBird(
                    cameraX + CANVAS_W + 80 + i * 35,
                    baseY + (Math.random() - 0.5) * 60,
                    cfg.birdSpeed,
                    i / flockSize, // evenly spaced phases: 0 and 0.5 for 2 birds, etc.
                ));
            }
            this.birdTimer = BIRD_SPAWN_INTERVAL + (Math.random() - 0.5) * BIRD_SPAWN_JITTER;
            playBirdFlutter();
        }
    }

    /**
     * Move NPCs and birds. Called separately with actual dt so timers are accurate.
     */
    tick(dt) {
        for (const npc of this.npcs)   npc.worldX -= npc.speed * dt;
        for (const bird of this.birds) {
            bird.worldX   -= bird.speed * dt;
            bird.vy       += (Math.random() - 0.5) * 280 * dt; // erratic vertical
            bird.vy        = Math.max(-110, Math.min(110, bird.vy));
            bird.y        += bird.vy * dt;
            bird.y         = Math.max(HUD_H + 20, Math.min(GROUND_Y - 30, bird.y));
            bird.flapTimer += dt;
        }
        this.npcTimer  -= dt;
        this.birdTimer -= dt;
    }

    // ── Collision detection ───────────────────────────────────────────────────

    checkObstacleCollision(plane) {
        const left   = plane.worldLeft  + HITBOX_PAD;
        const right  = plane.worldRight - HITBOX_PAD;
        const top    = plane.top        + HITBOX_PAD;
        const bottom = plane.bottom     - HITBOX_PAD;

        for (const obs of this.obstacles) {
            const oL = obs.worldX;
            const oR = obs.worldX + OBS_COL_W;
            if (right <= oL || left >= oR) continue;

            let hit = false;
            if (obs.type === 'column') {
                hit = bottom >= obs.y;
            } else if (obs.type === 'hang') {
                hit = top <= obs.y + obs.h;
            } else {
                hit = top <= HUD_H + obs.topH || bottom >= obs.botY;
            }
            if (hit) return true;
        }
        return false;
    }

    checkNpcCollision(plane) {
        const left   = plane.worldLeft  + HITBOX_PAD;
        const right  = plane.worldRight - HITBOX_PAD;
        const top    = plane.top        + HITBOX_PAD;
        const bottom = plane.bottom     - HITBOX_PAD;

        for (const npc of this.npcs) {
            if (right  > npc.worldX - NPC_W / 2 &&
                left   < npc.worldX + NPC_W / 2 &&
                bottom > npc.y      - NPC_H / 2 &&
                top    < npc.y      + NPC_H / 2) return true;
        }
        return false;
    }

    checkBirdCollision(plane) {
        const left   = plane.worldLeft  + HITBOX_PAD + 4;
        const right  = plane.worldRight - HITBOX_PAD - 4;
        const top    = plane.top        + HITBOX_PAD + 4;
        const bottom = plane.bottom     - HITBOX_PAD - 4;

        for (const bird of this.birds) {
            if (right  > bird.worldX - BIRD_W / 2 &&
                left   < bird.worldX + BIRD_W / 2 &&
                bottom > bird.y      - BIRD_H / 2 &&
                top    < bird.y      + BIRD_H / 2) return true;
        }
        return false;
    }

    isOnRunway(plane) {
        if (!this.runway) return false;
        return plane.worldX >= this.runway.worldX &&
               plane.worldX <= this.runway.worldX + RUNWAY_W;
    }

    // ── Rendering ─────────────────────────────────────────────────────────────

    draw(ctx, cameraX) {
        this._drawBackground(ctx, cameraX);
        if (this.levelCfg.storm) this._drawStormOverlay(ctx);
        this._drawGround(ctx);
        this._drawObstacles(ctx, cameraX);
        if (this.runway) this._drawRunway(ctx, cameraX);
        this._drawBirds(ctx, cameraX);
        this._drawNpcs(ctx, cameraX);
    }

    _drawBackground(ctx, cameraX) {
        const bgImg = img(this.levelCfg.bgKey);
        const h     = CANVAS_H - HUD_H;

        if (bgImg) {
            ctx.imageSmoothingEnabled = true;
            const scale   = h / bgImg.height;
            const scaledW = bgImg.width * scale;
            let   x       = -((cameraX * PARALLAX_BG) % scaledW);
            if (x > 0) x -= scaledW;
            for (; x < CANVAS_W; x += scaledW) {
                ctx.drawImage(bgImg, x, HUD_H, scaledW, h);
            }
        } else {
            const grad = ctx.createLinearGradient(0, HUD_H, 0, CANVAS_H);
            grad.addColorStop(0, '#5ba3dc');
            grad.addColorStop(1, '#aed6f1');
            ctx.fillStyle = grad;
            ctx.fillRect(0, HUD_H, CANVAS_W, h);
        }
    }

    _drawStormOverlay(ctx) {
        // Dark blue tint
        ctx.fillStyle = 'rgba(5, 10, 40, 0.35)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Animated rain streaks
        const playH = GROUND_Y - HUD_H;
        const t = Date.now();
        ctx.save();
        ctx.strokeStyle = 'rgba(180, 210, 255, 0.25)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 60; i++) {
            const x  = (i * 16 + 8) % CANVAS_W;
            // Each streak drifts down at ~330 px/s, wraps within play area
            const y0 = ((i * 53 + Math.floor(t / 3)) % playH) + HUD_H;
            const len = 8 + (i % 4) * 4;
            ctx.beginPath();
            ctx.moveTo(x, y0);
            ctx.lineTo(x - 3, y0 + len); // slight diagonal wind lean
            ctx.stroke();
        }
        ctx.restore();
    }

    _drawGround(ctx) {
        const groundH = CANVAS_H - GROUND_Y;
        ctx.fillStyle = '#5a3a1a';
        ctx.fillRect(0, GROUND_Y, CANVAS_W, groundH);
        ctx.fillStyle = '#3a6e3d';
        ctx.fillRect(0, GROUND_Y, CANVAS_W, 3);
    }

    _drawObstacles(ctx, cameraX) {
        ctx.imageSmoothingEnabled = false;
        for (const obs of this.obstacles) {
            this._drawObstacle(ctx, obs, Math.round(obs.worldX - cameraX));
        }
    }

    _drawObstacle(ctx, obs, sx) {
        const BASE_W   = OBS_COL_W;
        const TIP_W    = Math.round(BASE_W * 0.52); // narrower at tip
        const TIP_H    = 14;
        const STRIPE_H = 20;
        const cx = sx + BASE_W / 2;

        // Draw a single pylon: trapezoid with alternating red/white stripes and yellow tip.
        // tipAtTop=true  → wide base at bottom (column from ground), tip points up.
        // tipAtTop=false → wide base at top (hang from ceiling), tip points down.
        const drawPylon = (y, h, tipAtTop) => {
            if (h <= 0) return;
            const topW = tipAtTop ? TIP_W  : BASE_W;
            const botW = tipAtTop ? BASE_W : TIP_W;

            ctx.save();

            // Clip to trapezoid shape
            ctx.beginPath();
            ctx.moveTo(cx - topW / 2, y);
            ctx.lineTo(cx + topW / 2, y);
            ctx.lineTo(cx + botW / 2, y + h);
            ctx.lineTo(cx - botW / 2, y + h);
            ctx.closePath();
            ctx.clip();

            if (tipAtTop) {
                // Paint stripes from base (bottom) up toward tip, then yellow cap at top
                const bodyBot = y + h;
                const bodyTop = y + TIP_H;
                let row = 0;
                for (let ry = bodyBot; ry > bodyTop; ry -= STRIPE_H) {
                    ctx.fillStyle = row % 2 === 0 ? '#cc0000' : '#ffffff';
                    const sh = Math.min(STRIPE_H, ry - bodyTop);
                    ctx.fillRect(cx - BASE_W, ry - sh, BASE_W * 2, sh);
                    row++;
                }
                ctx.fillStyle = '#ffdd00';
                ctx.fillRect(cx - BASE_W, y, BASE_W * 2, TIP_H);
            } else {
                // Paint stripes from base (top) down toward tip, then yellow cap at bottom
                const bodyTop = y;
                const bodyBot = y + h - TIP_H;
                let row = 0;
                for (let ry = bodyTop; ry < bodyBot; ry += STRIPE_H) {
                    ctx.fillStyle = row % 2 === 0 ? '#cc0000' : '#ffffff';
                    ctx.fillRect(cx - BASE_W, ry, BASE_W * 2, Math.min(STRIPE_H, bodyBot - ry));
                    row++;
                }
                ctx.fillStyle = '#ffdd00';
                ctx.fillRect(cx - BASE_W, y + h - TIP_H, BASE_W * 2, TIP_H);
            }

            ctx.restore();

            // Thin outline for definition
            ctx.strokeStyle = 'rgba(0,0,0,0.3)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(cx - topW / 2, y);
            ctx.lineTo(cx + topW / 2, y);
            ctx.lineTo(cx + botW / 2, y + h);
            ctx.lineTo(cx - botW / 2, y + h);
            ctx.closePath();
            ctx.stroke();
        };

        if (obs.type === 'column') {
            drawPylon(obs.y, obs.h, true);           // base at ground, tip up
        } else if (obs.type === 'hang') {
            drawPylon(obs.y, obs.h, false);          // base at ceiling, tip down
        } else {
            drawPylon(HUD_H,    obs.topH,  false);   // top gate piece: tip down
            drawPylon(obs.botY, obs.botH,  true);    // bottom gate piece: tip up
        }
    }

    _drawRunway(ctx, cameraX) {
        const rx = Math.round(this.runway.worldX - cameraX);
        const ry = GROUND_Y - 3;
        ctx.fillStyle = '#666677';
        ctx.fillRect(rx, ry, RUNWAY_W, 8);
        ctx.fillStyle = '#ffffff';
        const dashW = 28, gap = 20;
        for (let x = rx + 10; x < rx + RUNWAY_W - dashW; x += dashW + gap) {
            ctx.fillRect(x, ry + 2, dashW, 3);
        }
        ctx.fillStyle = '#ffff88';
        ctx.fillRect(rx, ry, 8, 8);
        ctx.fillRect(rx + RUNWAY_W - 8, ry, 8, 8);
    }

    _drawNpcs(ctx, cameraX) {
        ctx.imageSmoothingEnabled = false;
        for (const npc of this.npcs) {
            const sx = Math.round(npc.worldX - cameraX);
            if (sx < -NPC_W - 10 || sx > CANVAS_W + NPC_W) continue;

            const npcImg = img(npc.imgKey);
            ctx.save();
            ctx.translate(sx, npc.y);
            if (npcImg) {
                ctx.drawImage(npcImg, 0, 0, npcImg.width, npcImg.height,
                    -NPC_W / 2, -NPC_H / 2, NPC_W, NPC_H);
            } else {
                ctx.fillStyle = '#cc3322';
                ctx.fillRect(-NPC_W / 2, -NPC_H / 2, NPC_W, NPC_H);
            }
            ctx.restore();
        }
    }

    _drawBirds(ctx, cameraX) {
        ctx.imageSmoothingEnabled = false;
        const birdImg = img('bird');

        // Scan sprite once to build list of non-transparent frames
        if (!this._validBirdFrames && birdImg) {
            this._validBirdFrames = _scanBirdFrames(birdImg);
        }
        const validFrames = this._validBirdFrames ?? [0];

        for (const bird of this.birds) {
            const sx = Math.round(bird.worldX - cameraX);
            if (sx < -BIRD_W - 10 || sx > CANVAS_W + BIRD_W) continue;

            // Only cycle through frames that have actual pixels
            const frame = validFrames[Math.floor(bird.flapTimer * BIRD_FPS) % validFrames.length];
            ctx.save();
            ctx.translate(sx, bird.y);
            if (birdImg) {
                ctx.drawImage(birdImg,
                    frame * BIRD_FRAME_SIZE, 0, BIRD_FRAME_SIZE, BIRD_FRAME_SIZE,
                    -BIRD_W / 2, -BIRD_H / 2, BIRD_W, BIRD_H);
            } else {
                ctx.fillStyle = '#222211';
                ctx.fillRect(-BIRD_W / 2, -BIRD_H / 2, BIRD_W, BIRD_H);
            }
            ctx.restore();
        }
    }
}
