// ===== Music45 (JioSaavn integration + localStorage for Recently Played + Music Banner) =====

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
  // Additional DOM refs for Mini-Player
const miniImgEl = document.getElementById('mini-track-image');
const miniTitleEl = document.getElementById('mini-track-title');
const miniArtistEl = document.getElementById('mini-track-artist');
const miniPlayBtn = document.getElementById('mini-play');
const miniPrevBtn = document.getElementById('mini-prev');
const miniNextBtn = document.getElementById('mini-next');
const globalProgressTrack = document.getElementById('global-progress-track');
const globalProgressFill = document.getElementById('global-progress-fill');

  // Log DOM elements for debugging
  console.log('closeBannerBtn:', closeBannerBtn);
  console.log('musicBanner:', musicBanner);

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

  // Check if device is mobile
  function isMobileDevice() {
    const isMobile = window.innerWidth <= 768 && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    console.log('isMobileDevice:', isMobile);
    return isMobile;
  }

  // Settings
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
      settingsSheet.classList.add('active');
      refreshQualityButtons();
      history.pushState({ settingsView: true }, 'Settings', '#settings');
    });
  }

  if (closeSettings) {
    closeSettings.addEventListener('click', () => {
      settingsSheet.classList.remove('active');
      if (window.history.state && window.history.state.settingsView) {
        history.back();
      }
    });
  }

  window.addEventListener('popstate', () => {
    console.log('popstate triggered, state:', window.history.state);
    if (window.history.state && window.history.state.settingsView) {
      settingsSheet.classList.add('active');
    } else {
      settingsSheet.classList.remove('active');
    }
    if (window.history.state && window.history.state.bannerView && isMobileDevice()) {
      if (musicBanner) {
        console.log('Restoring music banner');
        musicBanner.style.display = 'flex';
        musicBanner.classList.add('active');
      } else {
        console.error('Music banner element not found during popstate');
      }
    } else {
      if (musicBanner) {
        console.log('Hiding music banner');
        musicBanner.style.display = 'none';
        musicBanner.classList.remove('active');
      }
    }
    if (!window.history.state || !window.history.state.albumView) {
      document.getElementById('album-view').style.display = 'none';
    }
  });

  // Local Storage
  function saveRecentlyToStorage() {
    localStorage.setItem('recentSongs', JSON.stringify(recentlyPlayed));
  }

  function loadRecentlyFromStorage() {
    const data = JSON.parse(localStorage.getItem('recentSongs')) || [];
    recentlyPlayed = data;
    renderRecently();
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
    updateUI(item, false);
    const url = await ensureUrlFor(index);
    if (!url) {
      alert('No playable URL found for this track.');
      return;
    }
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

  // Progress and Time
  audio.addEventListener('timeupdate', () => {
    const cur = audio.currentTime || 0;
    const dur = audio.duration || 0;
    const pct = dur > 0 ? (cur / dur) * 100 : 0;
    if (progressFill) progressFill.style.width = pct + '%';
    if (bannerProgressFill) bannerProgressFill.style.width = pct + '%';
    if (currentTimeEl) currentTimeEl.textContent = formatTime(cur);
    if (durationEl) durationEl.textContent = formatTime(dur);
  });

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
    } catch (e) {}
  }

  // Music Banner Controls
  if (openBanner) {
    openBanner.addEventListener('click', () => {
      if (isMobileDevice()) {
        if (musicBanner) {
          console.log('Opening music banner');
          musicBanner.style.display = 'flex';
          musicBanner.classList.add('active');
          history.pushState({ bannerView: true }, 'Now Playing', '#now-playing');
        } else {
          console.error('Music banner element not found');
        }
      } else {
        console.log('Banner not opened: not a mobile device');
      }
    });
  }

  if (closeBannerBtn) {
    closeBannerBtn.addEventListener('click', (e) => {
      console.log('Close button clicked', e);
      if (musicBanner) {
        musicBanner.style.display = 'none';
        musicBanner.classList.remove('active');
        console.log('Music banner closed');
        if (window.history.state && window.history.state.bannerView) {
          console.log('Navigating back from banner view');
          history.back();
        }
      } else {
        console.error('Music banner element not found');
      }
    });
    // Add touch event for mobile
    closeBannerBtn.addEventListener('touchstart', (e) => {
      console.log('Close button touched', e);
      if (musicBanner) {
        musicBanner.style.display = 'none';
        musicBanner.classList.remove('active');
        console.log('Music banner closed via touch');
        if (window.history.state && window.history.state.bannerView) {
          console.log('Navigating back from banner view via touch');
          history.back();
        }
      } else {
        console.error('Music banner element not found');
      }
    });
  } else {
    console.error('Close banner button not found');
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

  // Ensure footer controls are wired
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

  async function renderAlbums(albums) {
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

      document.getElementById('album-cover').src = getCover(album);
      document.getElementById('album-title').textContent = getTitle(album);
      document.getElementById('album-artist').textContent = getArtist(album);

      const tracksWrap = document.getElementById('album-tracks');
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

      document.getElementById('album-play').onclick = () => {
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

      document.getElementById('album-view').style.display = 'block';
      history.pushState({ albumView: true }, getTitle(album), '#' + encodeURIComponent(getTitle(album).replace(/\s+/g, '')));
    } catch (e) {
      console.error('Failed to fetch album songs', e);
      alert('Failed to load album songs.');
    }
  }

  if (document.getElementById('album-back')) {
    document.getElementById('album-back').addEventListener('click', () => {
      document.getElementById('album-view').style.display = 'none';
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
    const query = searchInput.value.trim();
    if (!query) return;
    try {
      const res = await fetch(`https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      const results = data?.data?.results || [];
      searchResultsWrap.innerHTML = '';
      if (!results.length) {
        searchResultsWrap.innerHTML = `<p style="color:var(--foreground-muted)">No results found.</p>`;
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
        searchResultsWrap.appendChild(div);
      });
    } catch (e) {
      console.error('Search failed', e);
      searchResultsWrap.innerHTML = `<p style="color:red">Error fetching results</p>`;
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
