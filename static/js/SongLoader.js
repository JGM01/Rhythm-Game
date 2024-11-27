class SongLoader {
  constructor() {
    this.songs = new Map();
  }

  async loadAllSongs() {
    try {
      // First, fetch the songlist.json
      const response = await fetch('/songlist.json');
      if (!response.ok) throw new Error('Failed to load song list');
      const songList = await response.json();

      // Load each song's .purin file
      const loadPromises = songList.songs.map(async (songInfo) => {
        const songResponse = await fetch(`/${songInfo.path}`);
        if (!songResponse.ok) throw new Error(`Failed to load song: ${songInfo.id}`);
        const songData = await songResponse.json();

        // Create and load the audio
        const audio = new Audio(`/songs/${songInfo.id}/song.mp3`);
        await new Promise((resolve, reject) => {
          audio.addEventListener('canplaythrough', resolve);
          audio.addEventListener('error', reject);
          audio.load();
        });

        // Convert arrow timings to milliseconds based on BPM
        const msPerBeat = (60000 / songData.bpm);
        const convertedArrows = songData.arrows.map(arrow => ({
          lane: CONFIG.KEYS.indexOf(arrow.key),
          time: arrow.beat * msPerBeat
        }));

        // Create the processed song data
        const processedSong = {
          id: songInfo.id,
          title: songData.title,
          artist: songData.artist,
          bpm: songData.bpm,
          audio: audio,
          arrows: convertedArrows.sort((a, b) => a.time - b.time),
          difficulty: songData.difficulty
        };

        this.songs.set(songInfo.id, processedSong);
        return processedSong;
      });

      const loadedSongs = await Promise.all(loadPromises);
      console.log('Loaded songs:', loadedSongs);
      return loadedSongs;
    } catch (error) {
      console.error('Failed to load songs:', error);
      throw error;
    }
  }
}
