/**
 * Configuration for each level.
 *
 * obsGapFactor  — multiplier on OBS_GAP_MIN/MAX (< 1 = denser obstacles)
 * trafficCount  — max simultaneous oncoming NPC planes (0 = none until L2)
 * trafficSpeed  — NPC plane speed (px/s, moving left)
 * birdCount     — max simultaneous birds (0 = none until L3)
 * birdSpeed     — bird horizontal speed (px/s, moving left)
 * turbulence    — max random vertical force (px/s² per frame, 0 = none until L4)
 * pointMultiplier — score multiplier for obstacles and tricks (1 = normal, 2 = challenge)
 * storm         — draw storm overlay
 * challenge     — true for challenge levels (requires POINTS_TO_LAND_CHALLENGE)
 */
export const LEVEL_DATA = [
    {
        num:             1,
        name:            'Lennuplats Kollane',
        bgKey:           'bg_1',
        obsGapFactor:    1.00,
        trafficCount:    0,
        trafficSpeed:    0,
        birdCount:       0,
        birdSpeed:       0,
        turbulence:      0,
        pointMultiplier: 1,
        storm:           false,
    },
    {
        num:             2,
        name:            'Talvine rand',
        bgKey:           'bg_2',
        obsGapFactor:    0.90,
        trafficCount:    2,
        trafficSpeed:    210,
        birdCount:       0,
        birdSpeed:       0,
        turbulence:      0,
        pointMultiplier: 1,
        storm:           false,
    },
    {
        num:             3,
        name:            'Angaar',
        bgKey:           'bg_3',
        obsGapFactor:    0.82,
        trafficCount:    3,
        trafficSpeed:    245,
        birdCount:       0,
        birdSpeed:       0,
        turbulence:      0,
        pointMultiplier: 1,
        storm:           false,
    },
    {
        num:             4,
        name:            'Suvine rand',
        bgKey:           'bg_4',
        obsGapFactor:    0.72,
        trafficCount:    4,
        trafficSpeed:    285,
        birdCount:       2,
        birdSpeed:       42,
        turbulence:      40,
        pointMultiplier: 1,
        storm:           false,
    },
    {
        num:             5,
        name:            'Linnaserv',
        bgKey:           'bg_5',
        obsGapFactor:    0.60,
        trafficCount:    6,
        trafficSpeed:    325,
        birdCount:       4,
        birdSpeed:       62,
        turbulence:      65,
        pointMultiplier: 1,
        storm:           false,
    },
    {
        num:             6,
        name:            'Kollane tormisel päeval',
        bgKey:           'bg_1',        // same meadow, storm-tinted
        obsGapFactor:    0.50,
        trafficCount:    12,
        trafficSpeed:    500,
        birdCount:       8,
        birdSpeed:       120,
        turbulence:      100,
        pointMultiplier: 2,
        storm:           true,
        challenge:       true,
    },
    {
        num:                7,
        name:               'Prisma parkla',
        bgKey:              'bg_6',
        obsGapFactor:       0.60,
        trafficCount:       6,
        trafficSpeed:       325,
        trafficFromBehind:  true,
        trafficBehindSpeed: 480,
        birdCount:          6,
        birdSpeed:          82,
        turbulence:         65,
        pointMultiplier:    1,
        storm:              false,
    },
    
];
