// js/Arrow.js
class Arrow {
    constructor(lane, targetTime) {
        this.lane = lane;
        this.targetTime = targetTime;
        this.hit = false;
        this.missed = false;
    }

    update(currentTime) {
        // Arrow position is now calculated based on time rather than speed
        this.y = this.calculateY(currentTime);
    }

    calculateY(currentTime) {
        // Calculate position based on time until target
        const timeToTarget = this.targetTime - currentTime;
        const totalFallTime = 2000; // 2 seconds to fall
        const progress = 1 - (timeToTarget / totalFallTime);
        return progress * CONFIG.CANVAS.HEIGHT;
    }

    draw(ctx, assetLoader) {
        if (this.hit) return;

        const x = Utils.calculateLaneX(this.lane);
        const image = assetLoader.getArrowImage(this.lane);

        ctx.save();
        if (this.missed) {
            ctx.globalAlpha = 0.5;
        }
        ctx.drawImage(
            image,
            x + (CONFIG.LANES.WIDTH - CONFIG.ARROWS.SIZE) / 2,
            this.y - CONFIG.ARROWS.SIZE / 2,
            CONFIG.ARROWS.SIZE,
            CONFIG.ARROWS.SIZE
        );
        ctx.restore();
    }
}
