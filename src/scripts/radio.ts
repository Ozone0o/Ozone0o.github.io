import { radioPlaylist, type RadioTrack } from '../components/radio/playlist';

const root = document.querySelector<HTMLElement>('[data-radio-root]');

if (root) {
  const audio = root.querySelector<HTMLAudioElement>('[data-radio-audio]');
  const panel = root.querySelector<HTMLElement>('[data-radio-panel]');
  const panelToggles = root.querySelectorAll<HTMLButtonElement>('[data-radio-toggle-panel]');
  const statusElement = root.querySelector<HTMLElement>('[data-radio-status]');
  const titleElement = root.querySelector<HTMLElement>('[data-radio-title]');
  const artistElement = root.querySelector<HTMLElement>('[data-radio-artist]');
  const progress = root.querySelector<HTMLInputElement>('[data-radio-progress]');
  const volume = root.querySelector<HTMLInputElement>('[data-radio-volume]');
  const currentTimeElement = root.querySelector<HTMLElement>('[data-radio-current-time]');
  const durationElement = root.querySelector<HTMLElement>('[data-radio-duration]');
  const toggleControl = root.querySelector<HTMLButtonElement>('[data-radio-control="toggle"]');
  const previousControl = root.querySelector<HTMLButtonElement>('[data-radio-control="previous"]');
  const nextControl = root.querySelector<HTMLButtonElement>('[data-radio-control="next"]');

  const keys = {
    track: 'ozone-radio-track',
    time: 'ozone-radio-time',
    volume: 'ozone-radio-volume',
    expanded: 'ozone-radio-expanded',
    activated: 'ozone-radio-activated',
    playing: 'ozone-radio-playing',
  } as const;

  const safeGet = (key: string) => {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  };

  const safeSet = (key: string, value: string) => {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Radio remains usable when storage is unavailable.
    }
  };

  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
  const savedIndex = Number.parseInt(safeGet(keys.track) ?? '0', 10);
  let currentIndex = Number.isFinite(savedIndex) ? clamp(savedIndex, 0, Math.max(radioPlaylist.length - 1, 0)) : 0;
  const savedVolume = Number.parseFloat(safeGet(keys.volume) ?? '0.3');
  const initialVolume = Number.isFinite(savedVolume) ? clamp(savedVolume, 0, 1) : 0.3;
  const savedTime = Number.parseFloat(safeGet(keys.time) ?? '0');
  const initialTime = Number.isFinite(savedTime) ? Math.max(savedTime, 0) : 0;
  const initiallyExpanded = safeGet(keys.expanded) === 'true';
  const initiallyActivated = safeGet(keys.activated) === 'true';
  const initiallyPlaying = safeGet(keys.playing) === 'true';
  let restoredTime = initialTime;
  let currentVolume = initialVolume;
  let timeSaveTimer: number | null = null;

  const getLanguage = () => document.documentElement.dataset.lang === 'en' ? 'en' : 'zh';
  const localized = (zh: string, en: string) => getLanguage() === 'en' ? en : zh;

  const statusText = {
    paused: ['已暂停', 'PAUSED'],
    playing: ['播放中', 'PLAYING'],
    loading: ['载入中', 'LOADING'],
    unavailable: ['暂不可播放', 'UNAVAILABLE'],
  } as const;

  const formatTime = (value: number) => {
    if (!Number.isFinite(value) || value < 0) return '0:00';
    const seconds = Math.floor(value);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  };

  const setStatus = (key: keyof typeof statusText) => {
    if (!statusElement) return;
    statusElement.dataset.radioStatusKey = key;
    statusElement.textContent = localized(statusText[key][0], statusText[key][1]);
    root.dataset.radioState = key;
  };

  const updateToggleControl = () => {
    if (!toggleControl) return;
    const playing = Boolean(audio && !audio.paused);
    const zh = playing ? '暂停' : '播放';
    const en = playing ? 'Pause' : 'Play';
    toggleControl.setAttribute('aria-label', localized(zh, en));
    toggleControl.dataset.radioPlaying = playing ? 'true' : 'false';
    root.dataset.radioPlaying = playing ? 'true' : 'false';
  };

  const updateTimeDisplay = () => {
    if (currentTimeElement) currentTimeElement.textContent = formatTime(audio?.currentTime ?? restoredTime);
    if (durationElement) durationElement.textContent = formatTime(audio?.duration ?? 0);
    if (progress && audio && Number.isFinite(audio.duration) && audio.duration > 0) {
      progress.max = String(audio.duration);
      progress.value = String(clamp(audio.currentTime, 0, audio.duration));
    }
  };

  const savePosition = () => {
    const time = audio && Number.isFinite(audio.currentTime) ? audio.currentTime : restoredTime;
    safeSet(keys.track, String(currentIndex));
    safeSet(keys.time, String(Math.max(time, 0)));
    safeSet(keys.volume, String(audio?.volume ?? initialVolume));
    safeSet(keys.playing, audio && !audio.paused ? 'true' : 'false');
  };

  const scheduleSave = () => {
    if (timeSaveTimer !== null) return;
    timeSaveTimer = window.setTimeout(() => {
      timeSaveTimer = null;
      savePosition();
    }, 300);
  };

  const setPanelExpanded = (expanded: boolean, persist = true) => {
    root.dataset.radioExpanded = expanded ? 'true' : 'false';
    panelToggles.forEach((button) => button.setAttribute('aria-expanded', expanded ? 'true' : 'false'));
    if (panel) panel.hidden = !expanded;
    if (persist) safeSet(keys.expanded, expanded ? 'true' : 'false');
  };

  const currentTrack = () => radioPlaylist[currentIndex] as RadioTrack | undefined;

  const loadTrack = (index: number, preserveTime = false) => {
    if (radioPlaylist.length === 0) return;
    currentIndex = (index + radioPlaylist.length) % radioPlaylist.length;
    const track = currentTrack();
    if (!track) return;
    safeSet(keys.track, String(currentIndex));
    if (titleElement) titleElement.textContent = track.title;
    if (artistElement) artistElement.textContent = track.artist;
    restoredTime = preserveTime ? restoredTime : 0;

    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      if (track.src && !track.disabled) {
        audio.src = track.src;
        audio.volume = currentVolume;
        if (preserveTime) {
          const restore = () => {
            if (!audio.duration || !Number.isFinite(audio.duration)) return;
            audio.currentTime = clamp(restoredTime, 0, audio.duration);
            restoredTime = audio.currentTime;
            updateTimeDisplay();
            audio.removeEventListener('loadedmetadata', restore);
          };
          audio.addEventListener('loadedmetadata', restore);
        }
        setStatus('paused');
      } else {
        setStatus('unavailable');
      }
    }
    if (progress) {
      progress.max = '0';
      progress.value = '0';
    }
    updateTimeDisplay();
    updateToggleControl();
  };

  const play = () => {
    const track = currentTrack();
    safeSet(keys.activated, 'true');
    if (!audio || !track?.src || track.disabled) {
      setStatus('unavailable');
      updateToggleControl();
      return;
    }

    setStatus('loading');
    void audio.play().then(() => {
      setStatus('playing');
      updateToggleControl();
      savePosition();
    }).catch(() => {
      audio.pause();
      setStatus('paused');
      updateToggleControl();
    });
  };

  const pause = () => {
    audio?.pause();
    savePosition();
    setStatus('paused');
    updateToggleControl();
  };

  const togglePlayback = () => {
    if (audio && !audio.paused) pause();
    else play();
  };

  panelToggles.forEach((button) => button.addEventListener('click', () => {
    setPanelExpanded(root.dataset.radioExpanded !== 'true');
  }));
  toggleControl?.addEventListener('click', togglePlayback);
  previousControl?.addEventListener('click', () => loadTrack(currentIndex - 1));
  nextControl?.addEventListener('click', () => loadTrack(currentIndex + 1));
  progress?.addEventListener('input', () => {
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = Number(progress.value);
    restoredTime = audio.currentTime;
    updateTimeDisplay();
    scheduleSave();
  });
  volume?.addEventListener('input', () => {
    const nextVolume = clamp(Number(volume.value), 0, 1);
    currentVolume = nextVolume;
    if (audio) audio.volume = nextVolume;
    safeSet(keys.volume, String(nextVolume));
  });

  audio?.addEventListener('play', () => {
    setStatus('playing');
    updateToggleControl();
  });
  audio?.addEventListener('pause', () => {
    if (root.dataset.radioState !== 'unavailable') setStatus('paused');
    updateToggleControl();
    scheduleSave();
  });
  audio?.addEventListener('timeupdate', () => {
    restoredTime = audio.currentTime;
    updateTimeDisplay();
    scheduleSave();
  });
  audio?.addEventListener('loadedmetadata', updateTimeDisplay);
  audio?.addEventListener('error', () => {
    audio.pause();
    setStatus('unavailable');
    updateToggleControl();
    scheduleSave();
  });

  window.addEventListener('ozone:radio-toggle', togglePlayback);
  window.addEventListener('ozone:language-change', () => {
    const key = statusElement?.dataset.radioStatusKey as keyof typeof statusText | undefined;
    if (key) setStatus(key);
    updateToggleControl();
  });
  window.addEventListener('pagehide', savePosition);
  window.addEventListener('beforeunload', savePosition);

  if (audio) audio.volume = currentVolume;
  if (volume) volume.value = String(currentVolume);
  loadTrack(currentIndex, Number.isFinite(savedTime));
  setPanelExpanded(initiallyExpanded, false);
  updateToggleControl();

  if (initiallyActivated && initiallyPlaying && audio && currentTrack()?.src && !currentTrack()?.disabled) {
    const restorePlayback = () => play();
    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) restorePlayback();
    else audio.addEventListener('loadedmetadata', restorePlayback, { once: true });
  }
}
