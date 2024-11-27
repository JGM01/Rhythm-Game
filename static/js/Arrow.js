class Arrow {
  constructor(lane, targetTime) {
    this.lane = lane;
    this.targetTime = targetTime;
    this.hit = false;
    this.missed = false;
  }

  update(currentTime) {
    this.y = this.calculateY(currentTime);
  }

  calculateY(currentTime) {
    const timeToTarget = this.targetTime - currentTime;
    const progress = 1 - (timeToTarget / CONFIG.TIMING.SPAWN_AHEAD);

    // Make arrows appear from top and move to target line
    const targetY = CONFIG.CANVAS.HEIGHT - 150;
    return progress * targetY;
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
