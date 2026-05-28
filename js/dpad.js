import { pressVirtual, releaseVirtual } from './input.js';

const BTN_MAP = {
    'dpad-up':    'ArrowUp',
    'dpad-down':  'ArrowDown',
    'dpad-left':  'ArrowLeft',
    'dpad-right': 'ArrowRight',
};

export function initDpad(canvas) {
    const buttons = document.querySelectorAll('.dpad-btn');

    for (const btn of buttons) {
        const code = BTN_MAP[btn.id];
        if (!code) continue;

        btn.addEventListener('touchstart',  e => { e.preventDefault(); pressVirtual(code); },   { passive: false });
        btn.addEventListener('touchend',    e => { e.preventDefault(); releaseVirtual(code); }, { passive: false });
        btn.addEventListener('touchcancel', e => { e.preventDefault(); releaseVirtual(code); }, { passive: false });

        btn.addEventListener('mousedown',  () => pressVirtual(code));
        btn.addEventListener('mouseup',    () => releaseVirtual(code));
        btn.addEventListener('mouseleave', () => releaseVirtual(code));
    }

    // Tap anywhere on the canvas (not on a dpad button) → Space, for title/crashed/landed screens
    const wrap = canvas.parentElement;
    wrap.addEventListener('touchstart', e => {
        if (e.target.classList.contains('dpad-btn')) return;
        e.preventDefault();
        pressVirtual('Space');
    }, { passive: false });
    wrap.addEventListener('touchend',    () => releaseVirtual('Space'), { passive: false });
    wrap.addEventListener('touchcancel', () => releaseVirtual('Space'), { passive: false });

    wrap.addEventListener('mousedown', e => {
        if (e.target.classList.contains('dpad-btn')) return;
        pressVirtual('Space');
    });
    wrap.addEventListener('mouseup', () => releaseVirtual('Space'));
}
