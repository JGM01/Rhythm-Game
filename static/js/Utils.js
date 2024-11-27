// js/utils.js
const Utils = {
    calculateLaneX(laneIndex) {
        const totalWidth = CONFIG.LANES.WIDTH * CONFIG.LANES.COUNT +
            CONFIG.LANES.SPACING * (CONFIG.LANES.COUNT - 1);
        const startX = (CONFIG.CANVAS.WIDTH - totalWidth) / 2;
        return startX + (CONFIG.LANES.WIDTH + CONFIG.LANES.SPACING) * laneIndex;
    },

    updateUIElement(id, value) {
        document.getElementById(id).textContent = value;
    }
};
