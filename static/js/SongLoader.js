class SongLoader {
  constructor() {
    this.songs = new Map();
  }

  async loadAllSongs() {
    try {
      // Fetch the list of directories in the songs folder
      const response = await fetch('/songs/');
      if (!response.ok) throw new Error('Failed to scan songs directory');
      const songDirs = await response.json();

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
        const convertedArrows = [];

        // Process each arrow data, now handling multiple keys
        songData.arrows.forEach(arrow => {
          // Split the key string into individual keys if it's a multi-key beat
          const keys = arrow.key.split('');

          // Create an arrow for each key, but maintain their relationship
          keys.forEach(key => {
            if (CONFIG.KEYS.includes(key)) {
              convertedArrows.push({
                lane: CONFIG.KEYS.indexOf(key),
                time: arrow.beat * msPerBeat,
                groupId: arrow.beat  // Use beat as group identifier
              });
            }
          });
        });

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
