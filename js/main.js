import { initInput, UP, DOWN, LEFT, RIGHT, SPACE, anyKey, PAUSE_KEY, KEY_HELP } from './input.js';
import { loadImages } from './assets.js';
import {
    prefetchAudio, initAudio, startEngine, stopEngine, setEnginePitch, playCrash,
    playTrickFanfare, playBatteryBeep, suspendAudio, resumeAudio,
} from './audio.js';
import { Plane } from './plane.js';
import { World } from './world.js';
import { HUD }   from './hud.js';
import { initTricks, updateTricks } from './tricks.js';
import { LEVEL_DATA } from './levels.js';
import {
    CANVAS_W, CANVAS_H, HUD_H, GROUND_Y,
    PLANE_H, PLANE_SCREEN_X,
    BATTERY_MAX, BATTERY_DRAIN_SEC,
    LAND_VX_MAX, LAND_VY_MAX, LIFTOFF_VX,
    LEVEL_COUNT, POINTS_TO_LAND, POINTS_TO_LAND_CHALLENGE,
    TRICK_FLASH_DUR,
} from './constants.js';

const STATE = { TITLE: 0, TAKEOFF: 1, FLYING: 2, CRASHED: 3, LANDED: 4, PAUSED: 5, INSTRUCTIONS: 6, DEV_SELECT: 7 };

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx    = canvas.getContext('2d');

        this.plane = new Plane();
        this.world = new World();
        this.hud   = new HUD();

        this.state = STATE.TITLE;

        // Level progression
        this.levelIdx  = 0;   // index into LEVEL_DATA (0 = level 1)
        this.carryOver = 0;   // points carried from previous level

        // Battery / time
        this.battery      = BATTERY_MAX;
        this.batteryTimer = 0;
        this.elapsed      = 0;

        // Trick flash
        this.trickFlash  = null; // { name, pts, timer }
        this.crashReason = '';   // '' | 'bird'

        // High score (persisted via localStorage)
        this.totalScore = 0;
        this.bestScore  = parseInt(localStorage.getItem('cloudwalker_best') || '0', 10);

        // Loop state
        this.prevTimestamp = null;
        this.audioStarted  = false;
        this.prevSpace     = false;
        this.prevPause     = false;
        this.prevHelp      = false;
        this.explodeDone   = false;

        // Dev cheat: A×4 on title → level select
        this.devKeyCount = 0;
    }

    get cameraX()   { return this.plane.worldX - PLANE_SCREEN_X; }
    get levelData() { return LEVEL_DATA[this.levelIdx]; }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    async start() {
        initInput();
        prefetchAudio();

        // Dev cheat keydown listener (separate from held-key input system)
        window.addEventListener('keydown', e => this._devKeydown(e));

        // Trick callback: award points (with level multiplier) + trigger fanfare
        initTricks((name, pts) => {
            const mult      = this.levelData.pointMultiplier ?? 1;
            const actualPts = pts * mult;
            this.world.addScore(actualPts);
            this.trickFlash = { name, pts: actualPts, timer: TRICK_FLASH_DUR };
            if (name === 'Death Knot') this.plane.startDeathKnot();
            playTrickFanfare();
        });

        await loadImages();
        requestAnimationFrame(ts => this._loop(ts));
    }

    _loop(timestamp) {
        const dt = this.prevTimestamp
            ? Math.min((timestamp - this.prevTimestamp) / 1000, 0.05)
            : 0.016;
        this.prevTimestamp = timestamp;

        this._update(dt);
        this._render();
        requestAnimationFrame(ts => this._loop(ts));
    }

    // ── Update ────────────────────────────────────────────────────────────────

    _update(dt) {
        if (!this.audioStarted && anyKey()) {
            this.audioStarted = true;
            initAudio();
        }

        const spaceNow = SPACE();
        const spaceHit = spaceNow && !this.prevSpace;
        this.prevSpace = spaceNow;

        const pauseNow = PAUSE_KEY();
        const pauseHit = pauseNow && !this.prevPause;
        this.prevPause = pauseNow;

        const helpNow = KEY_HELP();
        const helpHit = helpNow && !this.prevHelp;
        this.prevHelp = helpNow;

        switch (this.state) {
            case STATE.TITLE:
                if (helpHit) {
                    this.state = STATE.INSTRUCTIONS;
                    break;
                }
                if (spaceHit) {
                    this.levelIdx  = 0;
                    this.carryOver = 0;
                    this.totalScore = 0;
                    this._startLevel();
                }
                break;

            case STATE.TAKEOFF: {
                const liftoff = this.plane.updateTakeoff(dt, { UP, DOWN, LEFT, RIGHT });
                if (liftoff) {
                    this.plane.liftoff();
                    this.state = STATE.FLYING;
                    startEngine();
                }
                break;
            }

            case STATE.FLYING:
                if (pauseHit) {
                    this.state = STATE.PAUSED;
                    suspendAudio();
                    break;
                }
                this._updateFlying(dt);
                break;

            case STATE.PAUSED:
                if (pauseHit) {
                    this.state = STATE.FLYING;
                    resumeAudio();
                }
                break;

            case STATE.INSTRUCTIONS:
                if (spaceHit || helpHit) this.state = STATE.TITLE;
                break;

            case STATE.DEV_SELECT:
                // Handled entirely in _devKeydown; block all other input here
                break;

            case STATE.CRASHED:
                this.explodeDone = this.plane.updateExplosion(dt);
                if (spaceHit && this.explodeDone) {
                    // Restart current level from scratch (zero points, no carry-over).
                    // levelIdx is preserved so the player stays on the same level.
                    // Only a browser refresh resets to level 1.
                    this.carryOver = 0;
                    this._startLevel();
                }
                break;

            case STATE.LANDED:
                if (spaceHit) {
                    const score        = this.world.score;
                    const pointsNeeded = this.levelData.challenge
                        ? POINTS_TO_LAND_CHALLENGE
                        : POINTS_TO_LAND;
                    const success = score >= pointsNeeded;
                    const isLast  = this.levelIdx >= LEVEL_COUNT - 1;

                    if (success) {
                        this.totalScore += score;
                        if (isLast) {
                            // Game complete — save high score if beaten
                            if (this.totalScore > this.bestScore) {
                                this.bestScore = this.totalScore;
                                localStorage.setItem('cloudwalker_best', String(this.bestScore));
                            }
                            this.levelIdx  = 0;
                            this.carryOver = 0;
                            this.state = STATE.TITLE;
                        } else {
                            this.carryOver = score - pointsNeeded;
                            this.levelIdx++;
                            this._startLevel();
                        }
                    } else {
                        // Failed — back to title, no high score update
                        this.levelIdx  = 0;
                        this.carryOver = 0;
                        this.state = STATE.TITLE;
                    }
                }
                break;
        }
    }

    // ── Dev cheat ─────────────────────────────────────────────────────────────

    _devKeydown(e) {
        if (this.state === STATE.TITLE) {
            if (e.code === 'KeyA') {
                this.devKeyCount++;
                if (this.devKeyCount >= 4) {
                    this.devKeyCount = 0;
                    this.state = STATE.DEV_SELECT;
                }
            } else {
                this.devKeyCount = 0;
            }
        } else if (this.state === STATE.DEV_SELECT) {
            if (e.code === 'Escape') {
                this.state = STATE.TITLE;
            } else {
                const n = parseInt(e.key, 10);
                if (n >= 1 && n <= LEVEL_COUNT) {
                    this.levelIdx   = n - 1;
                    this.carryOver  = 0;
                    this.totalScore = 0;
                    this._startLevel();
                }
            }
        }
    }

    _startLevel() {
        const cfg = this.levelData;
        this.plane.reset();
        this.world.reset(cfg, this.carryOver);
        this.battery      = BATTERY_MAX;
        this.batteryTimer = 0;
        this.elapsed      = 0;
        this.explodeDone  = false;
        this.trickFlash   = null;
        stopEngine();
        this.state = STATE.TAKEOFF;
    }

    _updateFlying(dt) {
        this.elapsed      += dt;
        this.batteryTimer += dt;

        if (this.batteryTimer >= BATTERY_DRAIN_SEC) {
            this.batteryTimer -= BATTERY_DRAIN_SEC;
            this.battery = Math.max(0, this.battery - 1);
            if (this.battery <= 2) playBatteryBeep();
        }

        this.plane.updateFlying(dt, { UP, DOWN, LEFT, RIGHT });

        // Turbulence (level 4+)
        const turb = this.levelData.turbulence;
        if (turb > 0) {
            this.plane.vy += (Math.random() - 0.5) * 2 * turb * dt;
        }

        // Trick detection
        updateTricks(dt, true, this.plane.y, UP, LEFT, RIGHT);

        // Tick world entities with actual dt
        this.world.tick(dt);
        this.world.update(this.plane.worldX, this.battery);

        setEnginePitch(this.plane.vx);

        // Trick flash timer
        if (this.trickFlash) {
            this.trickFlash.timer -= dt;
            if (this.trickFlash.timer <= 0) this.trickFlash = null;
        }

        // Ceiling clamp
        if (this.plane.top < HUD_H + 2) {
            this.plane.y  = HUD_H + 2 + PLANE_H / 2;
            this.plane.vy = Math.max(0, this.plane.vy);
        }

        // Ground contact
        if (this.plane.bottom >= GROUND_Y) {
            this.plane.y  = GROUND_Y - PLANE_H / 2;
            this.plane.vy = 0;

            const onRunway  = this.world.isOnRunway(this.plane);
            const safeSpeed = this.plane.vx <= LAND_VX_MAX;

            stopEngine();
            if (onRunway && safeSpeed) {
                this.state = STATE.LANDED;
            } else {
                playCrash();
                this.crashReason = '';
                this.state = STATE.CRASHED;
            }
            return;
        }

        // Obstacle / NPC collision
        if (this.world.checkObstacleCollision(this.plane) ||
            this.world.checkNpcCollision(this.plane)) {
            stopEngine();
            playCrash();
            this.crashReason = '';
            this.state = STATE.CRASHED;
            return;
        }

        // Bird collision — distinct BIRDSTRIKE message
        if (this.world.checkBirdCollision(this.plane)) {
            stopEngine();
            playCrash();
            this.crashReason = 'bird';
            this.state = STATE.CRASHED;
            return;
        }

        // Battery dead
        if (this.battery <= 0) {
            stopEngine();
            playCrash();
            this.crashReason = '';
            this.state = STATE.CRASHED;
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────

    _render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        if (this.state === STATE.TITLE) {
            this.hud.drawTitle(ctx, this.bestScore);
            return;
        }

        if (this.state === STATE.DEV_SELECT) {
            this.hud.drawTitle(ctx, this.bestScore);
            this.hud.drawDevSelect(ctx);
            return;
        }

        if (this.state === STATE.INSTRUCTIONS) {
            this.hud.drawInstructions(ctx);
            return;
        }

        this.world.draw(ctx, this.cameraX);

        if (this.state === STATE.CRASHED) {
            this.plane.drawExplosion(ctx);
            if (this.explodeDone) this.hud.drawCrashed(ctx, this.world.score, this.crashReason === 'bird');
        } else {
            this.plane.draw(ctx);

            if (this.state === STATE.LANDED) {
                const isLast      = this.levelIdx >= LEVEL_COUNT - 1;
                const pointsNeeded = this.levelData.challenge
                    ? POINTS_TO_LAND_CHALLENGE
                    : POINTS_TO_LAND;
                this.hud.drawLanded(ctx, this.world.score, this.levelData.num, isLast, pointsNeeded);
            }
        }

        // HUD bar
        const showSpeed = this.state === STATE.FLYING  ||
                          this.state === STATE.LANDED   ||
                          this.state === STATE.PAUSED;
        this.hud.draw(ctx, {
            battery:   this.battery,
            score:     this.world.score,
            elapsed:   this.elapsed,
            vx:        showSpeed ? this.plane.vx : null,
            levelNum:  this.levelData.num,
            levelName: this.levelData.name,
        });

        // Flying-only overlays
        if (this.state === STATE.FLYING) {
            this.hud.drawBatteryWarning(ctx, this.battery);

            if (this.trickFlash) {
                const t = 1 - this.trickFlash.timer / TRICK_FLASH_DUR;
                this.hud.drawTrickFlash(ctx, this.trickFlash.name, this.trickFlash.pts, t);
            }

            // Glide slope when runway is near or on screen
            if (this.world.runway) {
                const runwayScreenX = this.world.runway.worldX - this.cameraX;
                if (runwayScreenX < CANVAS_W + 50) {
                    this.hud.drawGlideSlope(ctx, runwayScreenX);
                }
            }
        }

        if (this.state === STATE.TAKEOFF) {
            this.hud.drawTakeoffGuide(ctx, this.plane.vx, LIFTOFF_VX);
        }

        if (this.state === STATE.PAUSED) {
            this.hud.drawPaused(ctx);
        }
    }
}

// ── Entry point ───────────────────────────────────────────────────────────────

window.addEventListener('load', async () => {
    const canvas  = document.getElementById('gameCanvas');
    canvas.width  = CANVAS_W;
    canvas.height = CANVAS_H;
    const game = new Game(canvas);
    await game.start();
});
