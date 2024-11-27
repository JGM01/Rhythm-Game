class SongLoader {
  constructor() {
    this.songs = new Map();
  }

  async loadAllSongs() {
    try {
      // Fetch the list of directories in the songs folder
      const response = await fetch('/songs/');
      if (!response.ok) throw new Error('Failed to scan songs directory');
      const songDirs = await response.json();  // The server will return a list of directories

      // For each song directory, load its .purin file
      const loadPromises = songDirs.map(async (songId) => {
        // Load and parse the .purin file
        const purinResponse = await fetch(`/songs/${songId}/${songId}.purin`);
        if (!purinResponse.ok) throw new Error(`Failed to load song: ${songId}`);
        const songData = await purinResponse.json();

        // Load the audio
        const audio = new Audio(`/songs/${songId}/song.mp3`);
        await new Promise((resolve, reject) => {
          audio.addEventListener('canplaythrough', resolve);
          audio.addEventListener('error', reject);
          audio.load();
        });

        // Process the timing data
        const msPerBeat = (60000 / songData.bpm);
        const convertedArrows = songData.arrows.map(arrow => ({
          lane: CONFIG.KEYS.indexOf(arrow.key),
          time: arrow.beat * msPerBeat
        }));

        // Create the processed song data
        const processedSong = {
          id: songId,
          title: songData.title,
          artist: songData.artist,
          bpm: songData.bpm,
          audio: audio,
          arrows: convertedArrows.sort((a, b) => a.time - b.time),
          difficulty: songData.difficulty
        };

        this.songs.set(songId, processedSong);
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
