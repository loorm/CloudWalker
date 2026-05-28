/**
 * Image loader. All images are loaded from Assets/ at startup.
 * If an image fails to load, its entry is null — all renderers have fallbacks.
 */

const images = {};

export const PLANE_ROSTER = [
    { file: 'mustang.png',       name: 'North-American P-51 Mustang' },
    { file: 'focke-wulf.png',    name: 'Focke-Wulf Fw 190'           },
    { file: 'spitfire.png',      name: 'Supermarine Spitfire'        },
    { file: 'messerschmitt.png', name: 'Messerschmitt Bf 109'        },
    { file: 'zero.png',          name: 'Mitsubishi A6M2 Zero'        },
];

/** Reassign the active player plane to the given roster index. */
export function setActivePlane(idx) {
    images['plane'] = images[`plane_${idx}`] ?? images['plane_0'];
}

function loadImage(key, src) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload  = () => { images[key] = img; resolve(); };
        img.onerror = () => { images[key] = null; resolve(); };
        img.src = src;
    });
}

export async function loadImages() {
    const base  = 'Assets';
    const env   = `${base}/Environments`;
    const pl    = `${base}/Planes_Obstacles/Planes`;
    await Promise.all([
        // Player plane options (plane_0 … plane_4 map to PLANE_ROSTER)
        ...PLANE_ROSTER.map((p, i) => loadImage(`plane_${i}`, `${pl}/${p.file}`)),
        loadImage('explosion',   `${pl}/Explosion_16x16.png`),
        // NPC planes
        loadImage('npc_green',   `${pl}/cessna.png`),
        loadImage('npc_orange',  `${pl}/piper.png`),
        loadImage('npc_purple',  `${pl}/corsair.png`),
        // Ground / UI sprites
        loadImage('tilemap',     `${base}/Planes_Obstacles/Enviornment/Tilemap_One.png`),
        loadImage('clouds',      `${base}/Planes_Obstacles/Enviornment/UpdatedClouds.png`),
        // Backgrounds — keyed bg_1 … bg_5
        loadImage('bg_1', `${env}/background_01.png`),
        loadImage('bg_2', `${env}/background_02.png`),
        loadImage('bg_3', `${env}/background_03_3.png`),
        loadImage('bg_4', `${env}/background_04.png`),
        loadImage('bg_5', `${env}/background_05.png`),
        loadImage('bg_6', `${env}/background_06.png`),
        // Birds
        loadImage('bird', `${base}/Birds/Textuur/BirdSprite.png`),
        // Title screen
        loadImage('opening', `${base}/Titles/opening.jpg`),
    ]);
    setActivePlane(0); // default to P-51 Mustang
}

/** Get a loaded image by key, or null if it failed to load. */
export const img = key => images[key] ?? null;
