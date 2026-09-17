// ==UserScript==
// @name         YT Downloader
// @namespace    https://github.com/Miroslav-savic/tampergorilla
// @version      1.0.0
// @description  Download YouTube videos directly from the video page
// @author       TamperGorilla
// @match        https://www.youtube.com/watch*
// @match        https://youtube.com/watch*
// @grant        GM_download
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';
  console.log('[TG-YT] script loaded, path:', location.pathname, 'pr:', !!window.ytInitialPlayerResponse);

  const PANEL_ID  = 'tg-yt-dl-panel';
  const STYLE_ID  = 'tg-yt-dl-style';
  const RETRY_MS  = 800;
  const MAX_TRIES = 20;

  // ── Inject CSS once ──────────────────────────────────────────────────────
  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      #tg-yt-dl-panel {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        padding: 10px 14px;
        margin-top: 8px;
        background: var(--yt-spec-base-background, #fff);
        border: 1px solid var(--yt-spec-10-percent-layer, rgba(0,0,0,.1));
        border-radius: 10px;
        font-family: 'Roboto', sans-serif;
        font-size: 13px;
        color: var(--yt-spec-text-primary, #0f0f0f);
      }
      #tg-yt-dl-panel .tg-label {
        font-weight: 600;
        font-size: 12px;
        letter-spacing: .04em;
        text-transform: uppercase;
        color: var(--yt-spec-text-secondary, #606060);
        white-space: nowrap;
      }
      #tg-yt-dl-panel .tg-chips {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        flex: 1;
      }
      #tg-yt-dl-panel .tg-chip {
        padding: 4px 12px;
        border-radius: 6px;
        border: 1px solid var(--yt-spec-10-percent-layer, rgba(0,0,0,.12));
        background: transparent;
        color: var(--yt-spec-text-primary, #0f0f0f);
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: background .12s, color .12s;
        font-family: 'Roboto Mono', monospace;
      }
      #tg-yt-dl-panel .tg-chip:hover {
        background: var(--yt-spec-10-percent-layer, rgba(0,0,0,.08));
      }
      #tg-yt-dl-panel .tg-chip.tg-active {
        background: #C0392B;
        border-color: #C0392B;
        color: #fff;
      }
      #tg-yt-dl-panel .tg-dl-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 16px;
        border-radius: 8px;
        background: #C0392B;
        color: #fff;
        font-size: 13px;
        font-weight: 600;
        border: none;
        cursor: pointer;
        font-family: 'Roboto', sans-serif;
        transition: background .12s;
        white-space: nowrap;
      }
      #tg-yt-dl-panel .tg-dl-btn:hover { background: #E74C3C; }
      #tg-yt-dl-panel .tg-dl-btn:disabled {
        background: var(--yt-spec-10-percent-layer, #ccc);
        color: var(--yt-spec-text-secondary, #666);
        cursor: default;
      }
      #tg-yt-dl-panel .tg-status {
        font-size: 12px;
        color: var(--yt-spec-text-secondary, #606060);
        width: 100%;
        margin-top: 2px;
        display: none;
      }
      #tg-yt-dl-panel .tg-status.visible { display: block; }
    `;
    document.head.appendChild(s);
  }

  // ── Parse ytInitialPlayerResponse from page ──────────────────────────────
  function getPlayerResponse() {
    try {
      // Check the global variable first
      if (window.ytInitialPlayerResponse) return window.ytInitialPlayerResponse;

      // Fallback: search inline scripts
      const scripts = document.querySelectorAll('script:not([src])');
      for (const sc of scripts) {
        const m = sc.textContent.match(/ytInitialPlayerResponse\s*=\s*(\{.+?\});/s);
        if (m) {
          try { return JSON.parse(m[1]); } catch (_) { /* continue */ }
        }
      }
    } catch (_) {}
    return null;
  }

  // ── Extract usable formats ───────────────────────────────────────────────
  function getFormats(pr) {
    const sd = pr?.streamingData;
    if (!sd) return [];

    const combined = (sd.formats || []).filter(f => f.url && f.mimeType?.startsWith('video'));
    const audioOnly = (sd.adaptiveFormats || []).filter(f => f.url && f.mimeType?.startsWith('audio/mp4'));

    const results = [];

    // Combined video+audio formats (sorted best quality first)
    const qualityOrder = ['hd1080', 'hd720', 'large', 'medium', 'small'];
    const seen = new Set();

    for (const q of qualityOrder) {
      const f = combined.find(x => x.quality === q);
      if (f && !seen.has(f.quality)) {
        seen.add(f.quality);
        results.push({
          label: f.qualityLabel || f.quality,
          url:   f.url,
          mime:  f.mimeType.split(';')[0],
          type:  'video',
          itag:  f.itag,
        });
      }
    }

    // Best audio-only (MP4/AAC)
    const bestAudio = audioOnly.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
    if (bestAudio) {
      results.push({
        label: 'MP3',
        url:   bestAudio.url,
        mime:  'audio/mp4',
        type:  'audio',
        itag:  bestAudio.itag,
      });
    }

    return results;
  }

  // ── Fallback: cobalt.tools panel (for cipher-protected videos) ────────────
  function buildCobaltPanel() {
    const panel = document.createElement('div');
    panel.id = PANEL_ID;

    const label = document.createElement('span');
    label.className = 'tg-label';
    label.textContent = 'Download';
    panel.appendChild(label);

    const note = document.createElement('span');
    note.style.cssText = 'font-size:12px;color:var(--yt-spec-text-secondary,#606060);flex:1';
    note.textContent = 'Protected video — opens in external downloader';
    panel.appendChild(note);

    const btn = document.createElement('button');
    btn.className = 'tg-dl-btn';
    btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Save`;
    btn.addEventListener('click', () => {
      window.open('https://cobalt.tools/#url=' + encodeURIComponent(location.href), '_blank');
    });
    panel.appendChild(btn);

    return panel;
  }

  // ── Get video title ──────────────────────────────────────────────────────
  function getTitle(pr) {
    return pr?.videoDetails?.title
      || document.title.replace(' - YouTube', '').trim()
      || 'video';
  }

  function safeFilename(str) {
    return str.replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
  }

  // ── Build / update panel ─────────────────────────────────────────────────
  function buildPanel(formats, title) {
    let panel = document.getElementById(PANEL_ID);
    if (panel) panel.remove();

    panel = document.createElement('div');
    panel.id = PANEL_ID;

    let selected = formats[0];

    // Label
    const label = document.createElement('span');
    label.className = 'tg-label';
    label.textContent = 'Download';
    panel.appendChild(label);

    // Quality chips
    const chips = document.createElement('div');
    chips.className = 'tg-chips';

    formats.forEach((fmt, i) => {
      const chip = document.createElement('button');
      chip.className = 'tg-chip' + (i === 0 ? ' tg-active' : '');
      chip.textContent = fmt.label;
      chip.addEventListener('click', () => {
        selected = fmt;
        chips.querySelectorAll('.tg-chip').forEach(c => c.classList.remove('tg-active'));
        chip.classList.add('tg-active');
        status.classList.remove('visible');
      });
      chips.appendChild(chip);
    });
    panel.appendChild(chips);

    // Download button
    const btn = document.createElement('button');
    btn.className = 'tg-dl-btn';
    btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Save`;
    panel.appendChild(btn);

    // Status line
    const status = document.createElement('div');
    status.className = 'tg-status';
    panel.appendChild(status);

    btn.addEventListener('click', () => {
      if (!selected) return;

      const ext      = selected.type === 'audio' ? 'm4a' : 'mp4';
      const filename = safeFilename(title) + '.' + ext;

      status.textContent = 'Starting download…';
      status.classList.add('visible');
      btn.disabled = true;

      GM_download({
        url:      selected.url,
        name:     filename,
        onload:   () => {
          status.textContent = 'Saved: ' + filename;
          btn.disabled = false;
        },
        onerror:  () => {
          // GM_download can fail due to CORS on some formats — fall back to anchor
          status.textContent = 'Opening download link…';
          btn.disabled = false;
          const a = document.createElement('a');
          a.href     = selected.url;
          a.download = filename;
          a.click();
        },
      });
    });

    return panel;
  }

  // ── Insert panel into page ───────────────────────────────────────────────
  function insertPanel(panel) {
    // Try inserting before ytd-watch-metadata inside #primary-inner
    const meta = document.querySelector('ytd-watch-metadata');
    if (meta?.parentNode) { meta.parentNode.insertBefore(panel, meta); return true; }

    // Fallback: append to #primary-inner
    const primary = document.querySelector('#primary-inner');
    if (primary) { primary.insertBefore(panel, primary.firstChild); return true; }

    return false;
  }

  // ── Main: try to mount the panel ─────────────────────────────────────────
  let tries = 0;
  let observer = null;

  function mount() {
    tries++;
    console.log('[TG-YT] mount() try', tries, 'pr:', !!getPlayerResponse(), 'meta:', !!document.querySelector('ytd-watch-metadata'));

    const pr = getPlayerResponse();
    if (!pr && tries < MAX_TRIES) { setTimeout(mount, RETRY_MS); return; }

    const formats = pr ? getFormats(pr) : [];
    const isCipher = pr && formats.length === 0;
    console.log('[TG-YT] formats:', formats.length, 'isCipher:', isCipher);

    injectStyle();
    const panel = isCipher ? buildCobaltPanel() : (pr ? buildPanel(formats, getTitle(pr)) : null);
    if (!panel) { if (tries < MAX_TRIES) { setTimeout(mount, RETRY_MS); return; } return; }

    const ok = insertPanel(panel);
    if (!ok && tries < MAX_TRIES) { setTimeout(mount, RETRY_MS); return; }

    // Watch for YouTube removing our panel and re-insert it
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => {
      if (!document.getElementById(PANEL_ID)) {
        observer.disconnect();
        observer = null;
        setTimeout(() => {
          if (!document.getElementById(PANEL_ID)) insertPanel(panel);
        }, 200);
      }
    });
    const watchTarget = panel.parentNode || document.querySelector('#primary-inner');
    if (watchTarget) observer.observe(watchTarget, { childList: true });
  }

  // ── Re-mount on YouTube SPA navigation ───────────────────────────────────
  function onNavigate() {
    tries = 0;
    if (observer) { observer.disconnect(); observer = null; }
    const existing = document.getElementById(PANEL_ID);
    if (existing) existing.remove();
    if (location.pathname === '/watch') {
      setTimeout(mount, 600);
    }
  }

  // YouTube uses History API for navigation
  const _pushState = history.pushState.bind(history);
  history.pushState = function (...args) {
    _pushState(...args);
    onNavigate();
  };

  window.addEventListener('popstate', onNavigate);

  // Initial load
  if (location.pathname === '/watch') mount();

})();
