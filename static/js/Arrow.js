class Arrow {
  constructor(lane, targetTime, groupId) {
    this.lane = lane;
    this.targetTime = targetTime;
    this.groupId = groupId;  // New property to track arrow groups
    this.hit = false;
    this.missed = false;
    this.y = 0;  // Will be calculated during update
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

    // Fade out missed arrows
    if (this.missed) {
      ctx.globalAlpha = 0.5;
    }

    // Draw arrows that are part of a group with a subtle highlight
    if (this.groupId !== undefined) {
      // Optional: Add visual indication for grouped arrows
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 10;
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
