// ===== Music45 (JioSaavn integration + localStorage for Recently Played + Music Banner + LrcLib lyrics) =====

// Initialize Lucide icons
function refreshIcons() {
  try {
    lucide.createIcons();
    console.log('Lucide icons initialized');
  } catch (e) {
    console.error('Failed to initialize Lucide icons:', e);
  }
}

// Ensure DOM is loaded before attaching listeners
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM fully loaded');
  refreshIcons();

  // Greeting
  (function setGreeting() {
    const hour = new Date().getHours();
    const greetingEl = document.getElementById('greeting');
    if (greetingEl) {
      greetingEl.textContent =
        hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    } else {
      console.error('Greeting element not found');
    }
  })();

  // DOM refs
  const audio = document.getElementById('audio');
  const imgEl = document.getElementById('current-track-image');
  const titleEl = document.getElementById('current-track-title');
  const artistEl = document.getElementById('current-track-artist');
  const playBtn = document.getElementById('btn-play');
  const playIcon = document.getElementById('play-icon');
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');
  const progressTrack = document.getElementById('progress-track');
  const progressFill = document.getElementById('progress-fill');
  const albumsWrap = document.getElementById('albums');
  const recentlyWrap = document.getElementById('recently');
  const newReleasesWrap = document.getElementById('new-releases');
  const musicBanner = document.getElementById('music-banner');
  const bannerCover = document.getElementById('banner-cover-image');
  const bannerTitle = document.getElementById('banner-song-title');
  const bannerArtist = document.getElementById('banner-artist-name');
  const bannerPlayPauseBtn = document.getElementById('banner-play-pause');
  const bannerPlayIcon = document.getElementById('banner-play-icon');
  const bannerPrev = document.getElementById('banner-prev');
  const bannerNext = document.getElementById('banner-next');
  const shuffleBtn = document.getElementById('shuffle-btn');
  const repeatBtn = document.getElementById('repeat-btn');
  const closeBannerBtn = document.getElementById('close-banner-btn');
  const bannerProgressTrack = document.getElementById('banner-progress-track');
  const bannerProgressFill = document.getElementById('banner-progress-fill');
  const currentTimeEl = document.getElementById('current-time');
  const durationEl = document.getElementById('duration');
  const shufflePopup = document.getElementById('shuffle-popup');
  const shuffleStatus = document.getElementById('shuffle-status');
  const repeatPopup = document.getElementById('repeat-popup');
  const repeatStatus = document.getElementById('repeat-status');
  const openBanner = document.getElementById('open-banner');

  // Lyrics DOM (these may not exist if you forgot to add HTML — code handles that)
  const lyricsContainer = document.getElementById('lyrics-container'); // for synced-lines
  const lyricsText = document.getElementById('lyrics-text'); // for plain lyrics or fallback
  

  // Log DOM elements for debugging
  console.log('closeBannerBtn:', closeBannerBtn);
  console.log('musicBanner:', musicBanner);
  console.log('lyricsContainer:', !!lyricsContainer, 'lyricsText:', !!lyricsText);

  // State
  let queue = [];
  let currentIndex = -1;
  let isPlaying = false;
  let recentlyPlayed = [];
  let shuffleMode = false;
  let repeatMode = false;
  let qualitySetting = localStorage.getItem('qualitySetting') || 'auto';

  // Helpers
  const FALLBACK_COVER = 'https://music45beta.vercel.app/music/music45.webp';
  const escapeHtml = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const getTitle = s => decodeHtmlEntities(s?.name || s?.song || s?.title || 'Unknown Title');
  const getArtist = s => {
    let a =
      s?.primaryArtists ||
      s?.primary_artists ||
      (s?.artists?.primary?.length ? s.artists.primary.map(a => a.name).join(', ') : null) ||
      (s?.artists?.featured?.length ? s.artists.featured.map(a => a.name).join(', ') : null) ||
      s?.singers ||
      s?.artist ||
      'Unknown Artist';
    return decodeHtmlEntities(a);
  };
  const getCover = s => {
    if (!s) return FALLBACK_COVER;
    if (Array.isArray(s.image) && s.image.length) {
      const best = s.image.find(i => i.quality && /500|b|large|high/i.test(i.quality)) || s.image[s.image.length - 1];
      return best.link || best.url || FALLBACK_COVER;
    }
    return s.image_url || s.image || FALLBACK_COVER;
  };

  function decodeHtmlEntities(str) {
    if (!str) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  }

  function formatTime(seconds) {
    if (!isFinite(seconds)) return '00:00';
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  function extractPlayableUrl(details) {
    if (!details) return null;
    const dl = details.downloadUrl || details.download_url;
    if (Array.isArray(dl) && dl.length) {
      if (qualitySetting === 'auto') {
        return dl[dl.length - 1].link || dl[dl.length - 1].url || null;
      }
      if (qualitySetting === 'low') {
        const low = dl.find(x => /96/i.test(x.quality));
        if (low) return low.link || low.url;
      }
      if (qualitySetting === 'medium') {
        const med = dl.find(x => /160/i.test(x.quality));
        if (med) return med.link || med.url;
      }
      if (qualitySetting === 'high') {
        const high = dl.find(x => /320/i.test(x.quality));
        if (high) return high.link || high.url;
      }
      return dl[dl.length - 1].link || dl[dl.length - 1].url || null;
    }
    return details.media_url || details.url || details.audio || null;
  }


// Add to your existing DOM refs
const flipInner = document.getElementById('flip-inner');
const showLyricsBtn = document.getElementById('show-lyrics-btn');
const showCoverBtn = document.getElementById('show-cover-btn');

// Flip functionality
if (showLyricsBtn) {
  showLyricsBtn.addEventListener('click', () => {
    flipInner.classList.add('flipped');
  });
}

if (showCoverBtn) {
  showCoverBtn.addEventListener('click', () => {
    flipInner.classList.remove('flipped');
  });
}

// Update lyrics display function
function renderSyncedLyrics(lrcText) {
  const lyricsContainer = document.getElementById('lyrics-container');
  if (!lyricsContainer) return;
  
  lyricsContainer.innerHTML = '';
  
  if (!lrcText) {
    lyricsContainer.innerHTML = '<p>No lyrics available</p>';
    return;
  }
  
  // Your existing lyrics parsing logic...
  // Add parsed lines to lyricsContainer with 'lyrics-line' class
}
  
  // Lyrics parsing state
  let parsedLyrics = [];

  function clearLyricsDisplay() {
    parsedLyrics = [];
    if (lyricsContainer) lyricsContainer.innerHTML = '';
    if (lyricsText) lyricsText.textContent = '';
  }

  function renderSyncedLyrics(lrcText) {
    clearLyricsDisplay();
    if (!lrcText) return;

    // tolerate different time formats: [mm:ss.xx] or [m:ss] etc.
    const lines = lrcText.split('\n');
    parsedLyrics = lines.map(line => {
      // support multiple timestamps on a single line, handle them separately
      const tsMatches = [...line.matchAll(/\[(\d{1,2}):(\d{2}(?:\.\d+)?)\]/g)];
      const text = line.replace(/\[(\d{1,2}):(\d{2}(?:\.\d+)?)\]/g, '').trim();
      if (!tsMatches.length) return null;
      return tsMatches.map(m => {
        const min = parseInt(m[1], 10);
        const sec = parseFloat(m[2]);
        return { time: min * 60 + sec, text: text || '' };
      });
    }).filter(Boolean).flat().sort((a, b) => a.time - b.time);

    if (!parsedLyrics.length) {
      // fallback: just show raw text
      if (lyricsText) lyricsText.textContent = lrcText;
      else if (lyricsContainer) lyricsContainer.innerHTML = `<p>${escapeHtml(lrcText)}</p>`;
      return;
    }

    if (lyricsContainer) {
      lyricsContainer.innerHTML = '';
      parsedLyrics.forEach((l, i) => {
        const p = document.createElement('p');
        p.textContent = l.text || '...';
        p.dataset.time = l.time;
        p.classList.toggle('lyrics-line', true);
        lyricsContainer.appendChild(p);
      });
    } else if (lyricsText) {
      // if there's no container for synced lines, display them as plain text
      lyricsText.textContent = parsedLyrics.map(p => p.text).join('\n');
    }
  }

  async function fetchLyrics(title, artist) {
    // defensive: require at least a title
    if (!title && !artist) return;
    // show loading
    if (lyricsText) lyricsText.textContent = 'Loading lyrics...';
    if (lyricsContainer) lyricsContainer.innerHTML = '<p>Loading lyrics…</p>';
    parsedLyrics = [];

    try {
      // LrcLib endpoint (as requested). Query by track + artist.
      const url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(title || '')}&artist_name=${encodeURIComponent(artist || '')}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Lyrics API returned ' + res.status);
      const data = await res.json();

      // The exact JSON shape may vary; try several fallbacks.
      // Common possibilities: { syncedLyrics: '...[00:..]...', plainLyrics: '...' } or { lrc: '...' } or array
      let lrc = null;
      if (data?.syncedLyrics) lrc = data.syncedLyrics;
      else if (data?.lrc) lrc = data.lrc;
      else if (data?.plainLyrics) {
        if (lyricsText) lyricsText.textContent = data.plainLyrics;
        if (lyricsContainer) lyricsContainer.innerHTML = `<p>${escapeHtml(data.plainLyrics)}</p>`;
        return;
      } else if (data?.lyrics) {
        // sometimes `.lyrics` holds a plain string or lrc string
        if (typeof data.lyrics === 'string') {
          // try to detect if it's lrc by searching timestamps
          if (/\[\d{1,2}:\d{2}/.test(data.lyrics)) lrc = data.lyrics;
          else {
            if (lyricsText) lyricsText.textContent = data.lyrics;
            if (lyricsContainer) lyricsContainer.innerHTML = `<p>${escapeHtml(data.lyrics)}</p>`;
            return;
          }
        }
      } else if (Array.isArray(data) && data.length) {
        // sometimes API returns an array of matches
        const first = data[0];
        if (first?.syncedLyrics) lrc = first.syncedLyrics;
        else if (first?.lrc) lrc = first.lrc;
        else if (first?.lyrics) {
          if (typeof first.lyrics === 'string') {
            if (/\[\d{1,2}:\d{2}/.test(first.lyrics)) lrc = first.lyrics;
            else {
              if (lyricsText) lyricsText.textContent = first.lyrics;
              if (lyricsContainer) lyricsContainer.innerHTML = `<p>${escapeHtml(first.lyrics)}</p>`;
              return;
            }
          }
        }
      }

      if (lrc) {
        renderSyncedLyrics(lrc);
      } else {
        // nothing useful found
        if (lyricsText) lyricsText.textContent = 'No lyrics available.';
        if (lyricsContainer) lyricsContainer.innerHTML = `<p>No lyrics available.</p>`;
      }
    } catch (err) {
      console.error('Lyrics fetch failed', err);
      if (lyricsText) lyricsText.textContent = 'No lyrics found.';
      if (lyricsContainer) lyricsContainer.innerHTML = `<p>No lyrics found.</p>`;
    }
  }

  // UI Updates
  function updateUI(item, playing) {
    const cover = item?.cover || FALLBACK_COVER;
    const title = item?.title || 'No song';
    const artist = item?.artist || '—';
    
    // Update floating player
    if (imgEl) imgEl.src = cover;
    if (titleEl) titleEl.textContent = title;
    if (artistEl) artistEl.textContent = artist;
    if (playBtn) playBtn.innerHTML = playing ? '<i data-lucide="pause"></i>' : '<i data-lucide="play"></i>';
    
    // Update music banner
    if (bannerCover) bannerCover.src = cover;
    if (bannerTitle) bannerTitle.textContent = title;
    if (bannerArtist) bannerArtist.textContent = artist;
    if (bannerPlayPauseBtn) bannerPlayPauseBtn.innerHTML = playing ? '<i data-lucide="pause"></i>' : '<i data-lucide="play"></i>';
    if (document.querySelector('.player-container')) {
      document.querySelector('.player-container').style.setProperty('--banner-cover-url', `url("${cover}")`);
    }
    
    refreshIcons();
  }

  // Recently Played
  function saveRecentlyToStorage() {
    localStorage.setItem('recentSongs', JSON.stringify(recentlyPlayed));
  }

  function loadRecentlyFromStorage() {
    try {
      const data = JSON.parse(localStorage.getItem('recentSongs')) || [];
      recentlyPlayed = data;
    } catch (e) {
      recentlyPlayed = [];
    }
    renderRecently();
  }

  function addToRecently(item) {
    if (!item) return;
    const key = item.id ? 'id:' + item.id : 't:' + item.title;
    recentlyPlayed = recentlyPlayed.filter(x => x._k !== key);
    recentlyPlayed.unshift({ ...item, _k: key });
    recentlyPlayed = recentlyPlayed.slice(0, 12);
    saveRecentlyToStorage();
    renderRecently();
  }

  function renderRecently() {
    if (!recentlyWrap) return;
    recentlyWrap.innerHTML = '';
    recentlyPlayed.forEach(item => {
      const card = document.createElement('div');
      card.className = 'music-card';
      card.innerHTML = `
        <img src="${escapeHtml(item.cover || FALLBACK_COVER)}" alt="${escapeHtml(item.title)}">
        <span>${escapeHtml(item.title)}</span>
      `;
      card.addEventListener('click', () => {
        queue = [item];
        currentIndex = 0;
        playIndex(0);
      });
      recentlyWrap.appendChild(card);
    });
  }

  // Search and Queue
  async function searchAndQueue(query, autoplay = true) {
    if (!query) return;
    try {
      const res = await fetch(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      const results = data?.data?.results || [];
      queue = results.map(r => ({
        id: r.id,
        title: getTitle(r),
        artist: getArtist(r),
        cover: getCover(r),
        url: null,
        raw: r
      }));
      currentIndex = queue.length ? 0 : -1;
      if (autoplay && currentIndex >= 0) await playIndex(currentIndex);
    } catch (e) {
      console.error('Search failed', e);
      alert('Search failed. Try another query.');
    }
  }

  async function ensureUrlFor(index) {
    const item = queue[index];
    if (!item) return null;
    if (item.url) return item.url;
    try {
      const res = await fetch(`https://saavn.dev/api/songs?ids=${encodeURIComponent(item.id)}`);
      const d = await res.json();
      const full = d?.data?.[0] || d?.data || null;
      if (!full) return null;
      item.url = extractPlayableUrl(full);
      item.title = getTitle(full) || item.title;
      item.artist = getArtist(full) || item.artist;
      item.cover = getCover(full) || item.cover;
      return item.url || null;
    } catch (e) {
      console.error('Details failed', e);
      return null;
    }
  }

  async function playIndex(index) {
    if (index < 0 || index >= queue.length) return;
    const item = queue[index];

    // Update UI immediately (cover/title) then load url
    updateUI(item, false);

    const url = await ensureUrlFor(index);
    if (!url) {
      alert('No playable URL found for this track.');
      return;
    }

    // Clear previous lyrics while we fetch new ones
    clearLyricsDisplay();

    audio.src = url;
    try {
      await audio.play();
      isPlaying = true;
    } catch (e) {
      console.error('Play failed', e);
      isPlaying = false;
    }

    currentIndex = index;
    updateUI(item, isPlaying);
    addToRecently(item);
    setMediaSession(item);

    // Fetch lyrics for this track (non-blocking)
    try {
      fetchLyrics(item.title || getTitle(item.raw), item.artist || getArtist(item.raw));
    } catch (e) {
      console.error('fetchLyrics threw', e);
    }
  }

  async function nextSong() {
    if (!queue.length) return;
    let n;
    if (shuffleMode) {
      n = Math.floor(Math.random() * queue.length);
      if (queue.length > 1 && n === currentIndex) n = (n + 1) % queue.length;
    } else {
      n = (currentIndex + 1) % queue.length;
    }
    await playIndex(n);
  }

  async function prevSong() {
    if (!queue.length) return;
    let n;
    if (shuffleMode) {
      n = Math.floor(Math.random() * queue.length);
      if (queue.length > 1 && n === currentIndex) n = (n + 1) % queue.length;
    } else {
      n = (currentIndex - 1 + queue.length) % queue.length;
    }
    await playIndex(n);
  }

  async function togglePlay() {
    if (!audio.src) {
      await searchAndQueue('90s hindi', true);
      return;
    }
    if (audio.paused) {
      try {
        await audio.play();
        isPlaying = true;
      } catch (e) {
        console.error('Play failed', e);
      }
    } else {
      audio.pause();
      isPlaying = false;
    }
    updateUI(queue[currentIndex], isPlaying);
  }

  // Progress and Time (single consolidated handler; also does lyrics sync)
  audio.addEventListener('timeupdate', () => {
    const cur = audio.currentTime || 0;
    const dur = audio.duration || 0;
    const pct = dur > 0 ? (cur / dur) * 100 : 0;
    if (progressFill) progressFill.style.width = pct + '%';
    if (bannerProgressFill) bannerProgressFill.style.width = pct + '%';
    if (currentTimeEl) currentTimeEl.textContent = formatTime(cur);
    if (durationEl) durationEl.textContent = formatTime(dur);

    // === Lyrics sync ===
    if (parsedLyrics && parsedLyrics.length && lyricsContainer) {
      // find current active index
      let activeIndex = parsedLyrics.findIndex((l, i) =>
        cur >= l.time && (!parsedLyrics[i + 1] || cur < parsedLyrics[i + 1].time)
      );

      if (activeIndex >= 0) {
        // toggle active classes & scroll
        const children = [...lyricsContainer.children];
        children.forEach((p, i) => {
          p.classList.toggle('active-line', i === activeIndex);
          if (i === activeIndex) {
            try {
              p.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } catch (e) { /* ignore scroll errors on some devices */ }
          }
        });
      }
    }
  });

  // Click-to-seek handlers
  if (progressTrack) {
    progressTrack.addEventListener('click', e => {
      const rect = progressTrack.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      if (isFinite(audio.duration)) audio.currentTime = Math.max(0, Math.min(1, pct)) * audio.duration;
    });
  }

  if (bannerProgressTrack) {
    bannerProgressTrack.addEventListener('click', e => {
      const rect = bannerProgressTrack.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      if (isFinite(audio.duration)) audio.currentTime = Math.max(0, Math.min(1, pct)) * audio.duration;
    });
  }

  audio.addEventListener('play', () => {
    isPlaying = true;
    updateUI(queue[currentIndex], true);
  });

  audio.addEventListener('pause', () => {
    isPlaying = false;
    updateUI(queue[currentIndex], false);
  });

  audio.addEventListener('ended', () => {
    if (repeatMode) {
      playIndex(currentIndex);
    } else {
      nextSong();
    }
  });

  // Media Session
  function setMediaSession(item) {
    if (!('mediaSession' in navigator) || !item) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: item.title,
        artist: item.artist,
        artwork: [{ src: item.cover || FALLBACK_COVER, sizes: '512x512', type: 'image/png' }]
      });
      navigator.mediaSession.setActionHandler('play', () => audio.play());
      navigator.mediaSession.setActionHandler('pause', () => audio.pause());
      navigator.mediaSession.setActionHandler('previoustrack', prevSong);
      navigator.mediaSession.setActionHandler('nexttrack', nextSong);
      navigator.mediaSession.setActionHandler('seekto', e => {
        if (e.seekTime != null) audio.currentTime = e.seekTime;
      });
    } catch (e) {
      console.warn('Media session setup failed', e);
    }
  }

  // Music Banner Controls
  function isMobileDevice() {
    const isMobile = window.innerWidth <= 768 && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    console.log('isMobileDevice:', isMobile);
    return isMobile;
  }

  const settingsSheet = document.getElementById('settings-sheet');
  const closeSettings = document.getElementById('close-settings');

  function refreshQualityButtons() {
    document.querySelectorAll('.quality-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.quality === qualitySetting);
    });
  }

  document.querySelectorAll('.quality-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      qualitySetting = btn.dataset.quality;
      localStorage.setItem('qualitySetting', qualitySetting);
      refreshQualityButtons();
    });
  });

  if (document.querySelector('.header-icons button:last-child')) {
    document.querySelector('.header-icons button:last-child').addEventListener('click', () => {
      if (settingsSheet) {
        settingsSheet.classList.add('active');
        refreshQualityButtons();
        history.pushState({ settingsView: true }, 'Settings', '#settings');
      }
    });
  }

  if (closeSettings) {
    closeSettings.addEventListener('click', () => {
      if (settingsSheet) settingsSheet.classList.remove('active');
      if (window.history.state && window.history.state.settingsView) {
        history.back();
      }
    });
  }

  window.addEventListener('popstate', () => {
    console.log('popstate triggered, state:', window.history.state);
    if (window.history.state && window.history.state.settingsView) {
      if (settingsSheet) settingsSheet.classList.add('active');
    } else {
      if (settingsSheet) settingsSheet.classList.remove('active');
    }
    if (window.history.state && window.history.state.bannerView && isMobileDevice()) {
      if (musicBanner) {
        musicBanner.style.display = 'flex';
        musicBanner.classList.add('active');
      }
    } else {
      if (musicBanner) {
        musicBanner.style.display = 'none';
        musicBanner.classList.remove('active');
      }
    }
    if (!window.history.state || !window.history.state.albumView) {
      const av = document.getElementById('album-view');
      if (av) av.style.display = 'none';
    }
  });

  // Music banner open/close
  if (openBanner) {
    openBanner.addEventListener('click', () => {
      if (isMobileDevice()) {
        if (musicBanner) {
          musicBanner.style.display = 'flex';
          musicBanner.classList.add('active');
          history.pushState({ bannerView: true }, 'Now Playing', '#now-playing');
        }
      } else {
        console.log('Banner not opened: not a mobile device');
      }
    });
  }

  if (closeBannerBtn) {
    closeBannerBtn.addEventListener('click', () => {
      if (musicBanner) {
        musicBanner.style.display = 'none';
        musicBanner.classList.remove('active');
        if (window.history.state && window.history.state.bannerView) history.back();
      }
    });
    closeBannerBtn.addEventListener('touchstart', () => {
      if (musicBanner) {
        musicBanner.style.display = 'none';
        musicBanner.classList.remove('active');
        if (window.history.state && window.history.state.bannerView) history.back();
      }
    });
  }

  if (bannerPlayPauseBtn) bannerPlayPauseBtn.addEventListener('click', togglePlay);
  if (bannerPrev) bannerPrev.addEventListener('click', prevSong);
  if (bannerNext) bannerNext.addEventListener('click', nextSong);

  if (shuffleBtn) {
    shuffleBtn.addEventListener('click', () => {
      shuffleMode = !shuffleMode;
      if (shuffleStatus) shuffleStatus.textContent = shuffleMode ? 'On' : 'Off';
      if (shufflePopup) {
        shufflePopup.classList.add('active');
        setTimeout(() => shufflePopup.classList.remove('active'), 2000);
      }
    });
  }

  if (repeatBtn) {
    repeatBtn.addEventListener('click', () => {
      repeatMode = !repeatMode;
      if (repeatStatus) repeatStatus.textContent = repeatMode ? 'On' : 'Off';
      if (repeatPopup) {
        repeatPopup.classList.add('active');
        setTimeout(() => repeatPopup.classList.remove('active'), 2000);
      }
    });
  }

  // Footer controls
  if (playBtn) playBtn.addEventListener('click', togglePlay);
  if (prevBtn) prevBtn.addEventListener('click', prevSong);
  if (nextBtn) nextBtn.addEventListener('click', nextSong);

  // Albums
  async function loadAlbums() {
    try {
      const albumQueries = ['Arijit Singh', 'Pritam', 'Shreya Ghoshal', 'kishor kumar', 'A.R. Rahman'];
      const allAlbums = [];
      for (const query of albumQueries) {
        const res = await fetch(`https://saavn.dev/api/search/albums?query=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data?.data?.results) {
          allAlbums.push(...data.data.results.slice(0, 5));
        }
      }
      renderAlbums(allAlbums);
    } catch (e) {
      console.error('Failed to load albums', e);
    }
  }

  function renderAlbums(albums) {
    if (!albumsWrap) return;
    albumsWrap.innerHTML = '';
    albums.forEach(album => {
      const card = document.createElement('div');
      card.className = 'music-card';
      card.innerHTML = `
        <img src="${getCover(album)}" alt="${getTitle(album)}">
        <span>${getTitle(album)}</span>
      `;
      card.addEventListener('click', () => {
        playAlbum(album.id);
      });
      albumsWrap.appendChild(card);
    });
  }

  async function playAlbum(albumId) {
    try {
      const res = await fetch(`https://saavn.dev/api/albums?id=${encodeURIComponent(albumId)}`);
      const data = await res.json();
      const album = data?.data?.[0] || data?.data;
      const songs = album?.songs || [];

      if (!songs.length) {
        alert('No songs found in this album.');
        return;
      }

      const albumCoverEl = document.getElementById('album-cover');
      const albumTitleEl = document.getElementById('album-title');
      const albumArtistEl = document.getElementById('album-artist');
      const albumPlayBtn = document.getElementById('album-play');
      const albumViewEl = document.getElementById('album-view');
      const tracksWrap = document.getElementById('album-tracks');

      if (albumCoverEl) albumCoverEl.src = getCover(album);
      if (albumTitleEl) albumTitleEl.textContent = getTitle(album);
      if (albumArtistEl) albumArtistEl.textContent = getArtist(album);

      if (tracksWrap) {
        tracksWrap.innerHTML = '';
        songs.forEach((s, i) => {
          const div = document.createElement('div');
          div.className = 'album-track';
          div.innerHTML = `<span>${getTitle(s)}</span><small>${getArtist(s)}</small>`;
          div.addEventListener('click', () => {
            queue = songs.map(x => ({
              id: x.id,
              title: getTitle(x),
              artist: getArtist(x),
              cover: getCover(x),
              url: null,
              raw: x
            }));
            currentIndex = i;
            playIndex(i);
          });
          tracksWrap.appendChild(div);
        });
      }

      if (albumPlayBtn) {
        albumPlayBtn.onclick = () => {
          queue = songs.map(x => ({
            id: x.id,
            title: getTitle(x),
            artist: getArtist(x),
            cover: getCover(x),
            url: null,
            raw: x
          }));
          currentIndex = 0;
          playIndex(0);
        };
      }

      if (albumViewEl) albumViewEl.style.display = 'block';
      history.pushState({ albumView: true }, getTitle(album), '#' + encodeURIComponent(getTitle(album).replace(/\s+/g, '')));
    } catch (e) {
      console.error('Failed to fetch album songs', e);
      alert('Failed to load album songs.');
    }
  }

  const albumBackBtn = document.getElementById('album-back');
  if (albumBackBtn) {
    albumBackBtn.addEventListener('click', () => {
      const albumView = document.getElementById('album-view');
      if (albumView) albumView.style.display = 'none';
      if (window.history.state && window.history.state.albumView) {
        history.back();
      }
    });
  }

  // Search
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const searchResultsWrap = document.getElementById('search-results');

  async function handleSearch() {
    const query = (searchInput && searchInput.value || '').trim();
    if (!query) return;
    try {
      const res = await fetch(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      const results = data?.data?.results || [];
      if (searchResultsWrap) searchResultsWrap.innerHTML = '';
      if (!results.length) {
        if (searchResultsWrap) searchResultsWrap.innerHTML = `<p style="color:var(--foreground-muted)">No results found.</p>`;
        return;
      }
      results.forEach((r, i) => {
        const item = {
          id: r.id,
          title: getTitle(r),
          artist: getArtist(r),
          cover: getCover(r),
          url: null,
          raw: r
        };
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.innerHTML = `
          <img src="${item.cover}" alt="${item.title}">
          <div class="search-result-info">
            <h4>${item.title}</h4>
            <p>${item.artist}</p>
          </div>
        `;
        div.addEventListener('click', () => {
          queue = results.map(r2 => ({
            id: r2.id,
            title: getTitle(r2),
            artist: getArtist(r2),
            cover: getCover(r2),
            url: null,
            raw: r2
          }));
          currentIndex = i;
          playIndex(currentIndex);
        });
        if (searchResultsWrap) searchResultsWrap.appendChild(div);
      });
    } catch (e) {
      console.error('Search failed', e);
      if (searchResultsWrap) searchResultsWrap.innerHTML = `<p style="color:red">Error fetching results</p>`;
    }
  }

  if (searchBtn) searchBtn.addEventListener('click', handleSearch);
  if (searchInput) searchInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleSearch();
  });

  // Initial Load
  loadRecentlyFromStorage();
  loadAlbums();
  refreshQualityButtons();
});
