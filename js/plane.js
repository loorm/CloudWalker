import {
    GROUND_Y, PLANE_W, PLANE_H, PLANE_SCREEN_X,
    GRAVITY, VX_MIN, VX_MAX, VX_ACCEL, VX_GROUND_ACCEL,
    VY_LIFT_ACCEL, VY_DESCEND_EXTRA, VY_MAX,
    LIFTOFF_VX, EXPLOSION_FRAME_H, EXPLOSION_DURATION,
    DEATH_KNOT_SPIN,
} from './constants.js';
import { img } from './assets.js';

export class Plane {
    constructor() {
        this.reset();
    }

    reset() {
        this.worldX        = 0;
        this.y             = GROUND_Y - PLANE_H / 2; // centre sits on ground
        this.vx            = 0;
        this.vy            = 0;
        this.airborne      = false;
        this.explodeTimer  = 0;
        this.deathKnotTimer = 0;
    }

    startDeathKnot() {
        this.deathKnotTimer = DEATH_KNOT_SPIN;
    }

    // ── Bounding box helpers (world-space horizontal, screen-space vertical) ──
    get top()        { return this.y - PLANE_H / 2; }
    get bottom()     { return this.y + PLANE_H / 2; }
    get worldLeft()  { return this.worldX - PLANE_W / 2; }
    get worldRight() { return this.worldX + PLANE_W / 2; }

    // ── Update: ground roll before liftoff ──────────────────────────────────
    /** Returns true when the player should lift off (correct speed + Up held). */
    updateTakeoff(dt, input) {
        if (input.RIGHT()) {
            this.vx = Math.min(this.vx + VX_GROUND_ACCEL * dt, VX_MAX);
        } else if (input.LEFT()) {
            this.vx = Math.max(this.vx - VX_GROUND_ACCEL * dt, 0);
        } else {
            this.vx = Math.max(this.vx - VX_GROUND_ACCEL * 0.4 * dt, 0); // passive decel
        }
        this.worldX += this.vx * dt;
        return this.vx >= LIFTOFF_VX && input.UP();
    }

    liftoff() {
        this.airborne = true;
        this.vy = -80; // small upward nudge at liftoff
    }

    // ── Update: airborne flight ──────────────────────────────────────────────
    updateFlying(dt, input) {
        // Horizontal
        if (input.RIGHT()) {
            this.vx = Math.min(this.vx + VX_ACCEL * dt, VX_MAX);
        } else if (input.LEFT()) {
            this.vx = Math.max(this.vx - VX_ACCEL * dt, VX_MIN);
        }

        // Vertical: gravity always applies; Up counteracts it and adds climb
        this.vy += GRAVITY * dt;
        if (input.UP())   this.vy -= VY_LIFT_ACCEL * dt;
        if (input.DOWN()) this.vy += VY_DESCEND_EXTRA * dt;
        this.vy = Math.max(-VY_MAX, Math.min(VY_MAX, this.vy));

        this.y      += this.vy * dt;
        this.worldX += this.vx * dt;

        if (this.deathKnotTimer > 0) {
            this.deathKnotTimer = Math.max(0, this.deathKnotTimer - dt);
        }
    }

    // ── Update: explosion animation ──────────────────────────────────────────
    /** Returns true when the explosion animation has finished. */
    updateExplosion(dt) {
        this.explodeTimer += dt;
        return this.explodeTimer >= EXPLOSION_DURATION;
    }

    // ── Rendering ────────────────────────────────────────────────────────────
    draw(ctx) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        const planeImg = img('plane');
        if (planeImg) {
            // mustang.png already faces right — no base rotation needed.
            // During a Death Knot, add a full 360° spin.
            let angle = 0;
            if (this.deathKnotTimer > 0) {
                const progress = 1 - this.deathKnotTimer / DEATH_KNOT_SPIN;
                angle = progress * Math.PI * 2;
            }
            ctx.translate(PLANE_SCREEN_X, this.y);
            ctx.rotate(angle);
            ctx.drawImage(planeImg, 0, 0, planeImg.width, planeImg.height,
                -PLANE_W / 2, -PLANE_H / 2, PLANE_W, PLANE_H);
        } else {
            // Fallback: blue fuselage facing right
            const dx = PLANE_SCREEN_X - PLANE_W / 2;
            const dy = this.y - PLANE_H / 2;
            ctx.fillStyle = '#3a7bd5';
            ctx.fillRect(dx, dy, PLANE_W, PLANE_H);
            ctx.fillStyle = '#aadcff';
            ctx.fillRect(dx + PLANE_W * 0.25, dy - 6, PLANE_W * 0.35, 10); // wing
        }
        ctx.restore();
    }

    drawExplosion(ctx) {
        const exImg = img('explosion');
        const dx = PLANE_SCREEN_X - PLANE_W / 2;
        const dy = this.y - PLANE_H / 2;
        const progress = Math.min(this.explodeTimer / EXPLOSION_DURATION, 1);

        ctx.save();
        ctx.imageSmoothingEnabled = false;

        if (exImg) {
            // Determine frame count from image dimensions (frames are square, laid horizontally)
            const frameH   = exImg.height;
            const numFrames = Math.max(1, Math.floor(exImg.width / frameH));
            const frame    = Math.min(Math.floor(progress * numFrames), numFrames - 1);
            ctx.drawImage(
                exImg,
                frame * frameH, 0, frameH, frameH, // source
                dx - 16, dy - 10, PLANE_W + 32, PLANE_H + 20, // dest (slightly larger)
            );
        } else {
            // Fallback: expanding orange/red burst
            ctx.globalAlpha = 1 - progress;
            const r = 30 + progress * 40;
            const cx = PLANE_SCREEN_X;
            const cy = this.y;
            const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
            grad.addColorStop(0, '#fff700');
            grad.addColorStop(0.4, '#ff6600');
            grad.addColorStop(1, 'rgba(200,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }
}
