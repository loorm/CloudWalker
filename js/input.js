const held = new Set();

export function initInput() {
    window.addEventListener('keydown', e => {
        held.add(e.code);
        e.preventDefault(); // prevent arrow keys from scrolling the page
    });
    window.addEventListener('keyup', e => held.delete(e.code));
}

export const UP    = () => held.has('ArrowUp')    || held.has('KeyW');
export const DOWN  = () => held.has('ArrowDown')  || held.has('KeyS');
export const LEFT  = () => held.has('ArrowLeft')  || held.has('KeyA');
export const RIGHT = () => held.has('ArrowRight') || held.has('KeyD');
export const SPACE     = () => held.has('Space');
export const PAUSE_KEY = () => held.has('KeyP');
export const KEY_HELP  = () => held.has('KeyI');

/** Returns true if any key in the set is currently held. */
export const anyKey = () => held.size > 0;
