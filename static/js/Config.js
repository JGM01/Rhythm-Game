// js/config.js
const CONFIG = {
    CANVAS: {
        WIDTH: 800,
        HEIGHT: 800
    },
    LANES: {
        COUNT: 4,
        WIDTH: 80,
        SPACING: 20,
    },
    ARROWS: {
        SIZE: 64,   // Size of arrow images
    },
    TIMING: {
        PERFECT_WINDOW: 45,  // ms window for perfect hits
        GOOD_WINDOW: 90,     // ms window for good hits
        SPAWN_AHEAD: 2000    // ms ahead of time to spawn arrows
    },
    SCORING: {
        PERFECT: 100,
        GOOD: 50,
        COMBO_MULTIPLIER: 0.1
    },
    KEYS: ['h', 'j', 'k', 'l']
};
