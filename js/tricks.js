/**
 * Trick detection engine.
 *
 * Sequence tricks: detected from a keydown event buffer within a 0.8 s window.
 * Knife Edge:      Up + Left or Up + Right held simultaneously for 1 s.
 *
 * Longer sequences are checked before shorter ones so Death Knot / Snap Roll
 * take precedence over their sub-sequences (e.g. Aileron Roll inside Death Knot).
 *
 * Usage:
 *   initTricks(callback)          — call once at startup
 *   updateTricks(dt, ...)         — call every frame from the flying update
 */

import { TRICK_WINDOW, TRICK_FLASH_DUR, KNIFE_EDGE_HOLD, MIN_TRICK_Y, GROUND_Y } from './constants.js';

// Longer sequences listed first so they win over shorter sub-sequences.
// Inside Loop (↑↑), Outside Loop (↓↓) and Aileron Roll (←← / →→) removed —
// too easy to trigger accidentally during normal flight.
const SEQ_TRICKS = [
    { name: 'Death Knot', pts: 3, seq: ['up', 'right', 'down', 'left'] },
    { name: 'Snap Roll',  pts: 3, seq: ['right', 'up', 'left']         },
    { name: 'Corkscrew',  pts: 2, seq: ['up', 'left', 'down']          },
];

let _pressBuffer = []; // { key: string, time: number }
let _knifeDir    = null; // 'left' | 'right' | null
let _knifeTimer  = 0;
let _active      = false; // tricks only fire when this is true
let _planeY      = 0;
let _onTrick     = null;  // callback(name, pts)

// ── Public API ────────────────────────────────────────────────────────────────

export function initTricks(callback) {
    _onTrick = callback;
    window.addEventListener('keydown', _handleKeyDown);
}

/**
 * Call every airborne frame from main._updateFlying.
 * Handles Knife Edge hold detection and enables/disables the sequence buffer.
 */
export function updateTricks(dt, isAirborne, planeY, upFn, leftFn, rightFn) {
    _active = isAirborne && planeY < GROUND_Y - MIN_TRICK_Y;
    _planeY = planeY;

    if (!_active) {
        _knifeDir   = null;
        _knifeTimer = 0;
        return;
    }

    // Knife Edge: Up + Left or Up + Right held for KNIFE_EDGE_HOLD seconds
    const holdLeft  = upFn() && leftFn();
    const holdRight = upFn() && rightFn();

    if (holdLeft && _knifeDir === 'left') {
        _knifeTimer += dt;
    } else if (holdRight && _knifeDir === 'right') {
        _knifeTimer += dt;
    } else if (holdLeft) {
        _knifeDir   = 'left';
        _knifeTimer = 0;
    } else if (holdRight) {
        _knifeDir   = 'right';
        _knifeTimer = 0;
    } else {
        _knifeDir   = null;
        _knifeTimer = 0;
    }

    if (_knifeDir && _knifeTimer >= KNIFE_EDGE_HOLD) {
        _knifeDir   = null;
        _knifeTimer = 0;
        _pressBuffer = [];
        _fire('Knife Edge', 1);
    }
}

// ── Internal ──────────────────────────────────────────────────────────────────

function _handleKeyDown(e) {
    if (!_active) return;
    const key = _codeToKey(e.code);
    if (!key) return;

    const now = performance.now() / 1000;
    _pressBuffer.push({ key, time: now });
    // Trim entries outside the window
    _pressBuffer = _pressBuffer.filter(b => now - b.time <= TRICK_WINDOW);
    _checkSequences(now);
}

function _codeToKey(code) {
    switch (code) {
        case 'ArrowUp':    case 'KeyW': return 'up';
        case 'ArrowDown':  case 'KeyS': return 'down';
        case 'ArrowLeft':  case 'KeyA': return 'left';
        case 'ArrowRight': case 'KeyD': return 'right';
    }
    return null;
}

function _checkSequences(now) {
    const keys = _pressBuffer.map(b => b.key);
    for (const trick of SEQ_TRICKS) {
        const n = trick.seq.length;
        if (keys.length < n) continue;
        const tail = keys.slice(-n);
        if (!tail.every((k, i) => k === trick.seq[i])) continue;
        // All keys within the window
        const windowStart = _pressBuffer[_pressBuffer.length - n].time;
        if (now - windowStart <= TRICK_WINDOW) {
            _pressBuffer = [];
            _fire(trick.name, trick.pts);
            return;
        }
    }
}

function _fire(name, pts) {
    _onTrick?.(name, pts);
}
