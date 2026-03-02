/**
 * Web Audio API wrapper.
 *
 * Strategy:
 *  - prefetchAudio()  starts fetching raw bytes immediately (no AudioContext needed).
 *  - initAudio()      must be called after the first user gesture; creates AudioContext
 *                     and decodes the pre-fetched bytes, then starts background music.
 *  - Engine loop starts/stops when the plane becomes airborne / crashes.
 *  - Engine pitch is modulated by horizontal speed.
 */

const PATHS = {
    engine:      'Assets/Sounds/L\u00FChike/607776__therandomsoundbyte2637__75-hz-flying-plane-sound-loop.flac',
    music:       'Assets/Sounds/Pikk/579505__timbre__ep-remix-of-nomiqbomis-freesound579270.flac',
    crash:       'Assets/Sounds/crash.wav',
    birdFlutter: 'Assets/Birds/Helid/mixkit-medium-size-bird-flutter-63.wav',
};

let ctx            = null;
let engineBuf      = null;
let musicBuf       = null;
let crashBuf       = null;
let birdFlutterBuf = null;
let engineNode   = null;
let musicNode    = null;
let engineGain   = null;
let musicGain    = null;
let masterGain   = null;
let initialized  = false;

// Raw ArrayBuffer promises — fetched before AudioContext exists
const fetched = {};

export function prefetchAudio() {
    for (const [key, url] of Object.entries(PATHS)) {
        fetched[key] = fetch(url)
            .then(r => r.ok ? r.arrayBuffer() : null)
            .catch(() => null);
    }
}

export async function initAudio() {
    if (initialized) return;
    initialized = true;

    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.8;
    masterGain.connect(ctx.destination);

    const [engineAB, musicAB, crashAB, birdAB] = await Promise.all([
        fetched.engine, fetched.music, fetched.crash, fetched.birdFlutter,
    ]);

    if (engineAB) engineBuf      = await ctx.decodeAudioData(engineAB).catch(() => null);
    if (musicAB)  musicBuf       = await ctx.decodeAudioData(musicAB).catch(() => null);
    if (crashAB)  crashBuf       = await ctx.decodeAudioData(crashAB).catch(() => null);
    if (birdAB)   birdFlutterBuf = await ctx.decodeAudioData(birdAB).catch(() => null);

    startMusic();
}

function makeSource(buffer, loop) {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop   = loop;
    return src;
}

export function startMusic() {
    if (!ctx || !musicBuf || musicNode) return;
    musicNode = makeSource(musicBuf, true);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.45;
    musicNode.connect(musicGain);
    musicGain.connect(masterGain);
    musicNode.start(0);
}

export function fadeOutMusic(seconds) {
    if (!ctx || !musicNode || !musicGain) return;
    const now = ctx.currentTime;
    musicGain.gain.setValueAtTime(musicGain.gain.value, now);
    musicGain.gain.linearRampToValueAtTime(0, now + seconds);
    musicNode.stop(now + seconds);
    musicNode = null;
    musicGain = null;
}

export function startEngine() {
    if (!ctx || !engineBuf || engineNode) return;
    engineNode = makeSource(engineBuf, true);
    engineGain = ctx.createGain();
    engineGain.gain.value = 0.6;
    engineNode.connect(engineGain);
    engineGain.connect(masterGain);
    engineNode.start(0);
}

export function stopEngine() {
    if (!engineNode) return;
    try { engineNode.stop(); } catch { /* already stopped */ }
    engineNode = null;
    engineGain = null;
}

export function playBirdFlutter() {
    if (!ctx || !birdFlutterBuf) return;
    const src = makeSource(birdFlutterBuf, false);
    const g = ctx.createGain();
    g.gain.value = 0.5;
    src.connect(g);
    g.connect(masterGain);
    src.start(0);
}

export function playCrash() {
    if (!ctx || !crashBuf) return;
    const src = makeSource(crashBuf, false);
    src.connect(masterGain);
    src.start(0);
}

/** Ascending 3-note arpeggio (C5, E5, G5) played on trick completion. */
export function playTrickFanfare() {
    if (!ctx) return;
    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
        const t    = ctx.currentTime + i * 0.08;
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.28, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.12);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + 0.13);
    });
}

/** Low sawtooth buzz played on each battery drain event when battery ≤ 2. */
export function playBatteryBeep() {
    if (!ctx) return;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 220;
    gain.gain.setValueAtTime(0.22, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.31);
}

export function suspendAudio() {
    if (ctx && ctx.state === 'running') ctx.suspend();
}

export function resumeAudio() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
}

/**
 * Modulate engine pitch based on horizontal speed.
 * vx range [60, 380] maps to playbackRate [0.75, 1.4].
 */
export function setEnginePitch(vx) {
    if (!engineNode) return;
    const t = Math.max(0, Math.min(1, (vx - 60) / (380 - 60)));
    engineNode.playbackRate.value = 0.75 + t * 0.65;
}
