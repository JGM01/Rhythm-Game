// js/MenuSystem.js
class MenuSystem {
  constructor(game) {
    this.game = game;
    this.currentMenu = 'main';
    this.songList = [];
    this.selectedSongIndex = 0;
  }

  draw(ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    if (this.currentMenu === 'main') {
      this.drawMainMenu(ctx);
    } else if (this.currentMenu === 'songSelect') {
      this.drawSongSelect(ctx);
    }
  }

  drawMainMenu(ctx) {
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText('Rhythm Game', ctx.canvas.width / 2, 150);

    ctx.font = '32px Arial';
    ctx.fillStyle = '#ff0';
    ctx.fillText('Press Enter to Start', ctx.canvas.width / 2, 300);
  }

  drawSongSelect(ctx) {
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText('Song Select', ctx.canvas.width / 2, 100);

    this.songList.forEach((song, index) => {
      const y = 250 + index * 80;
      const isSelected = index === this.selectedSongIndex;

      // Song container
      ctx.fillStyle = isSelected ? '#333' : '#222';
      ctx.fillRect(100, y - 30, ctx.canvas.width - 200, 60);

      // Song info
      ctx.textAlign = 'left';
      ctx.font = '24px Arial';
      ctx.fillStyle = isSelected ? '#ff0' : '#fff';
      ctx.fillText(song.title, 120, y);

      ctx.font = '16px Arial';
      ctx.fillStyle = '#888';
      ctx.fillText(`${song.artist} - ${song.bpm} BPM - ${song.difficulty}★`, 120, y + 20);
    });
  }

  handleInput(key) {
    if (this.currentMenu === 'main' && key === 'Enter') {
      this.currentMenu = 'songSelect';
    } else if (this.currentMenu === 'songSelect') {
      if (key === 'ArrowUp') {
        this.selectedSongIndex = Math.max(0, this.selectedSongIndex - 1);
      } else if (key === 'ArrowDown') {
        this.selectedSongIndex = Math.min(this.songList.length - 1, this.selectedSongIndex + 1);
      } else if (key === 'Enter') {
        const selectedSong = this.songList[this.selectedSongIndex];
        this.game.startSong(selectedSong);
      } else if (key === 'Escape') {
        this.currentMenu = 'main';
      }
    }
  }

  async initialize(songLoader) {
    this.songList = await songLoader.loadAllSongs();
  }
}
