import { CANVAS_W, CANVAS_H, HUD_H, BATTERY_MAX, GROUND_Y, VX_MIN, VX_MAX } from './constants.js';
import { img } from './assets.js';

const CELL_COLOURS = ['#ff2020', '#ff6600', '#ffaa00', '#ccee00', '#88ee00', '#44ee00'];
const CELL_W   = 22;
const CELL_H   = 18;
const CELL_GAP = 3;
const LIPO_X   = 285;

export class HUD {
    // ── In-game HUD strip ─────────────────────────────────────────────────────
    draw(ctx, { battery, score, elapsed, vx = null, levelNum = 1, levelName = '' }) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
        ctx.fillRect(0, 0, CANVAS_W, HUD_H);

        ctx.textBaseline = 'middle';
        const midY = HUD_H / 2;

        // Level label (replaces static title during play)
        ctx.fillStyle = '#e8c840';
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`Lv.${levelNum}`, 10, midY - 6);
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '11px monospace';
        ctx.fillText(levelName, 10, midY + 7);

        // LIPO label
        ctx.fillStyle = '#888888';
        ctx.font = '11px monospace';
        ctx.fillText('LIPO', LIPO_X - 40, midY);

        // Battery cells
        for (let i = 0; i < BATTERY_MAX; i++) {
            const active = i < battery;
            const cx = LIPO_X + i * (CELL_W + CELL_GAP);
            const cy = (HUD_H - CELL_H) / 2;
            ctx.fillStyle = active ? CELL_COLOURS[i] : '#2a2a2a';
            ctx.fillRect(cx, cy, CELL_W, CELL_H);
            if (active) {
                ctx.fillStyle = 'rgba(255,255,255,0.18)';
                ctx.fillRect(cx + 2, cy + 2, CELL_W - 4, CELL_H / 2 - 2);
            }
            ctx.strokeStyle = active ? 'rgba(255,255,255,0.25)' : '#444';
            ctx.lineWidth = 1;
            ctx.strokeRect(cx + 0.5, cy + 0.5, CELL_W - 1, CELL_H - 1);
        }

        // Speed indicator (airborne only) — mapped to km/h (15 km/h stall … 150 km/h full throttle)
        if (vx !== null) {
            const kmh = Math.round(15 + (vx - VX_MIN) / (VX_MAX - VX_MIN) * (150 - 15));
            ctx.fillStyle = kmh <= 66 ? '#44ee00' : kmh <= 99 ? '#ffcc00' : '#ff4444';
            ctx.font = 'bold 14px monospace';
            ctx.fillText(`SPD: ${String(kmh).padStart(3, ' ')} km/h`, 445, midY);
        }

        // Score
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px monospace';
        ctx.fillText(`SCORE: ${String(score).padStart(3, '0')}`, 580, midY);

        // Timer
        const mins = Math.floor(elapsed / 60);
        const secs = Math.floor(elapsed % 60);
        ctx.fillText(`TIME: ${mins}:${String(secs).padStart(2, '0')}`, 760, midY);
    }

    // ── Trick flash ───────────────────────────────────────────────────────────
    /**
     * @param {string} name   trick name
     * @param {number} pts    points awarded
     * @param {number} t      progress 0 (just appeared) → 1 (faded out)
     */
    drawTrickFlash(ctx, name, pts, t) {
        const alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4; // hold then fade
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Glow behind text
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(CANVAS_W / 2 - 200, 70, 400, 72);

        ctx.fillStyle = '#ffdd44';
        ctx.font = 'bold 32px monospace';
        ctx.fillText(name, CANVAS_W / 2, 96);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(`+${pts} pt${pts !== 1 ? 's' : ''}`, CANVAS_W / 2, 124);

        ctx.textAlign = 'left';
        ctx.restore();
    }

    // ── State-specific guides ─────────────────────────────────────────────────

    drawTakeoffGuide(ctx, vx, liftoffVx) {
        const t  = Math.min(1, vx / liftoffVx);
        const bx = (CANVAS_W - 220) / 2;
        const by = CANVAS_H - 44;

        ctx.fillStyle = '#ffffff';
        ctx.font = '13px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(t >= 1 ? '↑  PULL UP!  ↑' : 'Hold  →  to accelerate', CANVAS_W / 2, by - 4);
        ctx.textAlign = 'left';

        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(bx - 2, by - 2, 224, 18);
        ctx.fillStyle = t >= 1 ? '#44ff44' : '#ffaa22';
        ctx.fillRect(bx, by, 220 * t, 14);
    }

    drawBatteryWarning(ctx, battery) {
        if (battery > 2) return;
        const pulse = 0.3 + 0.25 * Math.sin(Date.now() / 130);
        ctx.fillStyle = `rgba(255, 30, 30, ${pulse})`;
        ctx.fillRect(0, HUD_H, CANVAS_W, 3);
        if (battery === 1) {
            ctx.fillStyle = `rgba(255, 60, 60, ${pulse + 0.1})`;
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText('BATTERY CRITICAL — LAND NOW!  (A / ← to slow)', CANVAS_W / 2, CANVAS_H - 10);
            ctx.textAlign = 'left';
        }
    }

    /**
     * Green approach cone drawn when the runway is approaching or on screen.
     * @param {number} runwayScreenX  screen X of the runway start
     */
    drawGlideSlope(ctx, runwayScreenX) {
        const landY = GROUND_Y - 3;
        ctx.save();
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = '#00ff55';
        ctx.beginPath();
        ctx.moveTo(runwayScreenX, landY);
        ctx.lineTo(runwayScreenX - 300, landY - 120);
        ctx.lineTo(runwayScreenX - 300, landY);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = '#00ff55';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText('LAND', runwayScreenX + 4, landY - 4);
        ctx.restore();
    }

    // ── Full-screen overlay screens ───────────────────────────────────────────

    /**
     * @param {number} bestScore  all-time best run score (0 = never completed)
     */
    drawTitle(ctx, bestScore = 0) {
        const bgImg = img('opening');
        if (bgImg) {
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(bgImg, 0, 0, CANVAS_W, CANVAS_H);
            // Semi-transparent overlay so text stays readable over any photo
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        } else {
            // Fallback: starry night gradient
            const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
            grad.addColorStop(0, '#0a0a1a');
            grad.addColorStop(1, '#1a2a4a');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

            ctx.fillStyle = '#ffffff';
            for (const [sx, sy, r] of _getTitleStars()) {
                ctx.beginPath();
                ctx.arc(sx, sy, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = '#f0c030';
        ctx.font = 'bold 52px monospace';
        ctx.fillText('LARC CloudWalker', CANVAS_W / 2, CANVAS_H / 2 - 70);

        ctx.fillStyle = '#88bbdd';
        ctx.font = '20px monospace';
        ctx.fillText('Retro RC Plane Side-Scroller', CANVAS_W / 2, CANVAS_H / 2 - 10);

        if (bestScore > 0) {
            ctx.fillStyle = '#aaddff';
            ctx.font = '16px monospace';
            ctx.fillText(`BEST: ${bestScore}`, CANVAS_W / 2, CANVAS_H / 2 + 22);
        }

        const alpha = 0.6 + 0.4 * Math.sin(Date.now() / 500);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.font = '18px monospace';
        ctx.fillText('Press  SPACE  to fly', CANVAS_W / 2, CANVAS_H / 2 + 55);

        ctx.fillStyle = '#aaaaaa';
        ctx.font = '13px monospace';
        ctx.fillText('← slow · → fast · ↑ climb · ↓ descend · tricks: double-tap / combos', CANVAS_W / 2, CANVAS_H / 2 + 100);

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.font = '14px monospace';
        ctx.fillText('Press  I  for instructions', CANVAS_W / 2 + 1, CANVAS_H / 2 + 127);
        ctx.fillStyle = '#aaccee';
        ctx.fillText('Press  I  for instructions', CANVAS_W / 2, CANVAS_H / 2 + 126);

        ctx.textAlign = 'left';
    }

    drawDevSelect(ctx) {
        const W = 400, H = 120;
        const bx = (CANVAS_W - W) / 2, by = (CANVAS_H - H) / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
        ctx.fillRect(bx, by, W, H);
        ctx.strokeStyle = '#f0c030';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx + 1, by + 1, W - 2, H - 2);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = '#f0c030';
        ctx.font = 'bold 16px monospace';
        ctx.fillText('DEV — JUMP TO LEVEL', CANVAS_W / 2, by + 32);

        ctx.fillStyle = '#cccccc';
        ctx.font = '15px monospace';
        ctx.fillText('Press  1 – 6  to start that level', CANVAS_W / 2, by + 62);

        ctx.fillStyle = '#777788';
        ctx.font = '13px monospace';
        ctx.fillText('ESC to cancel', CANVAS_W / 2, by + 90);

        ctx.textAlign = 'left';
    }

    drawInstructions(ctx) {
        // Background — reuse opening image with heavy overlay, or plain dark
        const bgImg = img('opening');
        if (bgImg) {
            ctx.imageSmoothingEnabled = true;
            ctx.drawImage(bgImg, 0, 0, CANVAS_W, CANVAS_H);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        } else {
            ctx.fillStyle = '#0a0a12';
            ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }

        // Page title
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#f0c030';
        ctx.font = 'bold 28px monospace';
        ctx.fillText('HOW TO PLAY', CANVAS_W / 2, 12);

        // Thin rule beneath title
        ctx.fillStyle = 'rgba(240,192,48,0.3)';
        ctx.fillRect(60, 48, CANVAS_W - 120, 1);

        const col1 = 32, col2 = 500;
        const LH   = 19;  // line height px

        const hdr = (text, x, y) => {
            ctx.textAlign = 'left';
            ctx.fillStyle = '#f0c030';
            ctx.font = 'bold 13px monospace';
            ctx.fillText(text, x, y);
        };
        const txt = (text, x, y, dim = false) => {
            ctx.textAlign = 'left';
            ctx.fillStyle = dim ? '#666677' : '#cccccc';
            ctx.font = '13px monospace';
            ctx.fillText(text, x, y);
        };

        // ── LEFT COLUMN ───────────────────────────────────────────────────────
        let y = 58;

        hdr('CONTROLS', col1, y); y += LH + 3;
        txt('To take off, throttle up, then climb.', col1, y); y += LH;
        txt('↑ / W   climb',         col1, y); y += LH;
        txt('↓ / S   descend',        col1, y); y += LH;
        txt('→ / D   throttle up',    col1, y); y += LH;
        txt('← / A   throttle down',  col1, y); y += LH;
        txt('P         pause / resume', col1, y); y += LH;
        txt('Psst! Try in-flight combos to discover tricks...', col1, y, true); y += LH;

        y += 14; // section gap

        hdr('GAMEPLAY', col1, y); y += LH + 3;
        txt('Avoid everything.',                           col1, y); y += LH;
        txt('Avoiding obstacles gives game points.',       col1, y); y += LH;
        txt('No damage points with RC aircraft.',          col1, y); y += LH;
        txt('One hit = crash.',                            col1, y); y += LH;
        txt('At the end of the level, throttle down',     col1, y); y += LH;
        txt('and land gently on the runway.',              col1, y); y += LH;

        // ── RIGHT COLUMN ──────────────────────────────────────────────────────
        y = 58;

        hdr('BATTERY (LiPo)', col2, y); y += LH + 3;
        txt('With RC aircraft, always watch your LiPo.', col2, y); y += LH;
        txt('You start with 6 cells.',                   col2, y); y += LH;
        txt('One drains every 30 seconds.',              col2, y); y += LH;
        txt('When you get down to 1, a warning flashes.', col2, y); y += LH;
        txt('Look for the runway!',                      col2, y); y += LH;
        txt('Land before it hits zero.',                 col2, y); y += LH;
        txt('Recharge costs 60 points,',                 col2, y); y += LH;
        txt('taken from your game points.',              col2, y); y += LH;
        txt('No recharge = no next mission.',             col2, y); y += LH;

        // ── Return prompt ─────────────────────────────────────────────────────
        const alpha = 0.6 + 0.4 * Math.sin(Date.now() / 500);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.font = '16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Press  SPACE  or  I  to return', CANVAS_W / 2, CANVAS_H - 26);

        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
    }

    drawCrashed(ctx, score, isBirdstrike = false) {
        ctx.fillStyle = isBirdstrike ? 'rgba(10, 40, 0, 0.78)' : 'rgba(60, 0, 0, 0.78)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = isBirdstrike ? '#aaff22' : '#ff4444';
        ctx.font = 'bold 64px monospace';
        ctx.fillText(isBirdstrike ? 'BIRDSTRIKE!' : 'CRASHED!', CANVAS_W / 2, CANVAS_H / 2 - 55);

        ctx.fillStyle = '#ffffff';
        ctx.font = '24px monospace';
        ctx.fillText(`Score: ${score}`, CANVAS_W / 2, CANVAS_H / 2 + 15);

        ctx.fillStyle = '#888888';
        ctx.font = '17px monospace';
        ctx.fillText('Press SPACE to try again', CANVAS_W / 2, CANVAS_H / 2 + 68);

        ctx.textAlign = 'left';
    }

    /**
     * @param {number}  score        final score this level
     * @param {number}  levelNum     current level number (1-6)
     * @param {boolean} lastLevel    true if this was the last level
     * @param {number}  pointsNeeded gate threshold for this level
     */
    drawLanded(ctx, score, levelNum, lastLevel, pointsNeeded) {
        const success   = score >= pointsNeeded;
        const carryOver = success ? score - pointsNeeded : 0;

        ctx.fillStyle = success ? 'rgba(0,40,0,0.78)' : 'rgba(40,20,0,0.78)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Title
        if (success && lastLevel) {
            ctx.fillStyle = '#ffdd44';
            ctx.font = 'bold 52px monospace';
            ctx.fillText('GAME COMPLETE!', CANVAS_W / 2, CANVAS_H / 2 - 90);
        } else {
            ctx.fillStyle = success ? '#66ff44' : '#ffaa44';
            ctx.font = 'bold 60px monospace';
            ctx.fillText('LANDED!', CANVAS_W / 2, CANVAS_H / 2 - 90);
        }

        // Score line
        ctx.fillStyle = '#ffffff';
        ctx.font = '22px monospace';
        ctx.fillText(`Score: ${score}  (need ${pointsNeeded})`, CANVAS_W / 2, CANVAS_H / 2 - 28);

        // Result
        ctx.font = '20px monospace';
        if (success && lastLevel) {
            ctx.fillStyle = '#ffdd44';
            ctx.fillText('All levels complete! Congratulations!', CANVAS_W / 2, CANVAS_H / 2 + 18);
        } else if (success) {
            ctx.fillStyle = '#66ff44';
            ctx.fillText(
                `Level ${levelNum} complete! → Level ${levelNum + 1}` +
                (carryOver > 0 ? `   (+${carryOver} pts carry-over)` : ''),
                CANVAS_W / 2, CANVAS_H / 2 + 18,
            );
        } else {
            ctx.fillStyle = '#ffaa44';
            ctx.font = '18px monospace';
            ctx.fillText('Not enough points to recharge the battery.', CANVAS_W / 2, CANVAS_H / 2 + 14);
            ctx.fillStyle = '#ccaaaa';
            ctx.font = '15px monospace';
            ctx.fillText('Fly faster to clear more obstacles.', CANVAS_W / 2, CANVAS_H / 2 + 38);
        }

        ctx.fillStyle = '#888888';
        ctx.font = '17px monospace';
        ctx.fillText(
            success ? 'Press SPACE to continue' : 'Press SPACE to try again',
            CANVAS_W / 2, CANVAS_H / 2 + 68,
        );

        ctx.textAlign = 'left';
    }

    drawPaused(ctx) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = '#ffee00';
        ctx.font = 'bold 64px monospace';
        ctx.fillText('PAUSED', CANVAS_W / 2, CANVAS_H / 2 - 20);

        ctx.fillStyle = '#aaaaaa';
        ctx.font = '20px monospace';
        ctx.fillText('Press  P  to resume', CANVAS_W / 2, CANVAS_H / 2 + 40);

        ctx.textAlign = 'left';
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

let _stars = null;
function _getTitleStars() {
    if (!_stars) {
        _stars = Array.from({ length: 60 }, () => [
            Math.random() * CANVAS_W,
            Math.random() * CANVAS_H,
            Math.random() * 1.2 + 0.3,
        ]);
    }
    return _stars;
}
