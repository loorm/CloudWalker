import {
    GROUND_Y, PLANE_W, PLANE_H, PLANE_SCREEN_X,
    GRAVITY, GLIDE_GRAVITY, GLIDE_VY_MAX,
    VX_MIN, VX_MAX, VX_ACCEL, VX_GROUND_ACCEL,
    VY_LIFT_ACCEL, VY_DESCEND_EXTRA, VY_MAX,
    LIFTOFF_VX, EXPLOSION_FRAME_H, EXPLOSION_DURATION,
    INVERT_ENTRY_SPIN,
    DEATH_KNOT_SPIN, DEATH_KNOT_ARC_H,
    CORKSCREW_SPIN, CORKSCREW_ARC_H,
    SNAP_ROLL_SPIN, SNAP_ROLL_ARC_H,
    HIGH_ALPHA_TILT_ANGLE, HIGH_ALPHA_WOBBLE_AMP, HIGH_ALPHA_WOBBLE_RATE, HIGH_ALPHA_TILT_SPEED,
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
        this.explodeTimer   = 0;
        this.deathKnotTimer = 0;
        this.corkscrewTimer = 0;
        this.snapRollTimer  = 0;
        this._highAlphaActive   = false;
        this.highAlphaTilt      = 0;
        this.highAlphaTime      = 0;
        this.inverted           = false;
        this.invertSpinTimer    = 0;
        this.invertSpinEntering = true; // true = entering (1→-1), false = exiting (-1→1)
    }

    startInvertedFlight() {
        this.inverted           = true;
        this.invertSpinTimer    = INVERT_ENTRY_SPIN;
        this.invertSpinEntering = true;
    }

    endInvertedFlight() {
        // Keep inverted=true so controls stay swapped during the exit animation;
        // the timer tick in updateFlying will clear it once the spin completes.
        this.invertSpinTimer    = INVERT_ENTRY_SPIN;
        this.invertSpinEntering = false;
    }

    startDeathKnot() {
        this.deathKnotTimer = DEATH_KNOT_SPIN;
    }

    startCorkscrew() {
        this.corkscrewTimer = CORKSCREW_SPIN;
    }

    startSnapRoll() {
        this.snapRollTimer = SNAP_ROLL_SPIN;
    }

    setHighAlpha(active) {
        this._highAlphaActive = active;
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

        // Vertical: UP/DOWN are swapped while inverted
        const doUp   = this.inverted ? input.DOWN() : input.UP();
        const doDown = this.inverted ? input.UP()   : input.DOWN();
        if (doDown) {
            this.vy += (GRAVITY + VY_DESCEND_EXTRA) * dt;
        } else if (doUp) {
            this.vy += (GRAVITY - VY_LIFT_ACCEL) * dt;
        } else {
            this.vy += GLIDE_GRAVITY * dt;
            if (this.vy > GLIDE_VY_MAX) this.vy = GLIDE_VY_MAX;
        }
        this.vy = Math.max(-VY_MAX, Math.min(VY_MAX, this.vy));

        this.y      += this.vy * dt;
        this.worldX += this.vx * dt;

        if (this.invertSpinTimer > 0) {
            this.invertSpinTimer = Math.max(0, this.invertSpinTimer - dt);
            if (this.invertSpinTimer === 0 && !this.invertSpinEntering) this.inverted = false;
        }
        if (this.deathKnotTimer  > 0) this.deathKnotTimer  = Math.max(0, this.deathKnotTimer  - dt);
        if (this.corkscrewTimer  > 0) this.corkscrewTimer  = Math.max(0, this.corkscrewTimer  - dt);
        if (this.snapRollTimer   > 0) this.snapRollTimer   = Math.max(0, this.snapRollTimer   - dt);

        // High Alpha tilt — smoothly lerp in/out
        const knifeTarget = this._highAlphaActive ? 1 : 0;
        this.highAlphaTilt += (knifeTarget - this.highAlphaTilt) * Math.min(1, HIGH_ALPHA_TILT_SPEED * dt);
        if (this._highAlphaActive) this.highAlphaTime += dt;
        else                   this.highAlphaTime  = 0;
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
            let angle  = 0;
            let yOff   = 0;
            let scaleY = 1;

            if (this.invertSpinTimer > 0) {
                // Entry: scaleY 1 → -1  |  Exit: scaleY -1 → 1
                const p = 1 - this.invertSpinTimer / INVERT_ENTRY_SPIN;
                scaleY = this.invertSpinEntering ? Math.cos(p * Math.PI) : -Math.cos(p * Math.PI);
            } else if (this.deathKnotTimer > 0) {
                // Inside loop: CCW spin (nose up first) + half-sine vertical arc
                const p = 1 - this.deathKnotTimer / DEATH_KNOT_SPIN;
                angle  = -p * Math.PI * 2;
                yOff   = -DEATH_KNOT_ARC_H * Math.sin(p * Math.PI);
                scaleY = this.inverted ? -1 : 1;
            } else if (this.corkscrewTimer > 0) {
                // Corkscrew: two roll cycles, arcs UP
                const p = 1 - this.corkscrewTimer / CORKSCREW_SPIN;
                scaleY = Math.cos(p * Math.PI * 4) * (this.inverted ? -1 : 1);
                yOff   = -CORKSCREW_ARC_H * Math.sin(p * Math.PI);
            } else if (this.snapRollTimer > 0) {
                // Snap Roll: one roll cycle (slower), arcs DOWN
                const p = 1 - this.snapRollTimer / SNAP_ROLL_SPIN;
                scaleY = Math.cos(p * Math.PI * 2) * (this.inverted ? -1 : 1);
                yOff   = +SNAP_ROLL_ARC_H * Math.sin(p * Math.PI);
            } else if (this.highAlphaTilt > 0.01) {
                // High Alpha: tilt to ~77° CCW (nose up) with gentle wobble while held
                const wobble = HIGH_ALPHA_WOBBLE_AMP * Math.sin(this.highAlphaTime * HIGH_ALPHA_WOBBLE_RATE);
                angle  = -(HIGH_ALPHA_TILT_ANGLE + wobble) * this.highAlphaTilt;
                scaleY = this.inverted ? -1 : 1;
            } else {
                scaleY = this.inverted ? -1 : 1;
            }

            ctx.translate(PLANE_SCREEN_X, this.y + yOff);
            ctx.rotate(angle);
            ctx.scale(1, scaleY);
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
