// js/AssetLoader.js
class AssetLoader {
  constructor() {
    this.images = {};
    this.loaded = false;
    this.totalAssets = 0;
    this.loadedAssets = 0;
  }

  async loadAssets() {
    console.log('Starting asset loading...');
    const arrowTypes = ['left', 'down', 'up', 'right'];
    this.totalAssets = arrowTypes.length;

    try {
      const loadPromises = arrowTypes.map(type => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.src = `./assets/arrow_${type}.png`;
          console.log(`Loading ${img.src}...`);

          img.onload = () => {
            console.log(`Loaded ${type} arrow successfully`);
            this.images[type] = img;
            this.loadedAssets++;
            resolve();
          };

          img.onerror = (e) => {
            console.error(`Failed to load ${type} arrow:`, e);
            reject(new Error(`Failed to load ${type} arrow`));
          };
        });
      });

      await Promise.all(loadPromises);
      console.log('All assets loaded successfully');
      this.loaded = true;
      return this.images;
    } catch (error) {
      console.error('Asset loading failed:', error);
      this.loaded = true;
      return this.images;
    }
  }

  getArrowImage(lane) {
    const types = ['left', 'down', 'up', 'right'];
    return this.images[types[lane]];
  }
}
