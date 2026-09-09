// ==UserScript==
// @name         Healthmarked Opener
// @namespace    http://tampergorilla.dev/
// @version      2.0
// @description  Automatski otvara Healthmarked.com u novom tabu svakih 5 sekundi + floating dugme
// @author       TamperGorilla
// @match        *://*/*
// @exclude      *://healthmarked.com/*
// @exclude      *://www.healthmarked.com/*
// @grant        GM_openInTab
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';
  if (document.getElementById('__tg_hm_btn')) return;

  const INTERVAL_MS = 5000;
  const TARGET = 'https://healthmarked.com';

  const btn = document.createElement('div');
  btn.id = '__tg_hm_btn';
  btn.title = 'Otvori Healthmarked.com';
  btn.setAttribute('role', 'button');
  btn.style.cssText = `
    position: fixed !important; bottom: 24px !important; right: 24px !important;
    width: 52px !important; height: 52px !important;
    background: linear-gradient(135deg, #2d7a2d, #1a5c1a) !important;
    border-radius: 50% !important; cursor: pointer !important;
    z-index: 2147483647 !important; display: flex !important;
    align-items: center !important; justify-content: center !important;
    font-size: 22px !important; box-shadow: 0 3px 12px rgba(0,0,0,0.35) !important;
    transition: transform 0.18s ease, box-shadow 0.18s ease !important;
    user-select: none !important; border: 2px solid rgba(255,255,255,0.2) !important;
  `;
  btn.textContent = '🏥';

  const ring = document.createElement('div');
  ring.style.cssText = `
    position: fixed !important; bottom: 18px !important; right: 18px !important;
    width: 64px !important; height: 64px !important;
    z-index: 2147483646 !important; pointer-events: none !important;
  `;
  ring.innerHTML = `<svg viewBox="0 0 64 64" style="transform:rotate(-90deg)">
    <circle id="__tg_hm_ring" cx="32" cy="32" r="28"
      fill="none" stroke="rgba(76,175,80,0.8)" stroke-width="3"
      stroke-dasharray="175.9" stroke-dashoffset="0"
      style="transition: stroke-dashoffset 0.25s linear"/>
  </svg>`;

  const tooltip = document.createElement('div');
  tooltip.id = '__tg_hm_tooltip';
  tooltip.style.cssText = `
    position: fixed !important; bottom: 84px !important; right: 24px !important;
    background: rgba(0,0,0,0.82) !important; color: white !important;
    padding: 5px 10px !important; border-radius: 6px !important;
    font-size: 12px !important; font-family: -apple-system, sans-serif !important;
    white-space: nowrap !important; z-index: 2147483647 !important;
    pointer-events: none !important; opacity: 0 !important;
    transition: opacity 0.15s ease !important;
  `;
  tooltip.textContent = 'Healthmarked.com • auto 5s';

  document.documentElement.appendChild(ring);
  document.documentElement.appendChild(tooltip);
  document.documentElement.appendChild(btn);

  btn.addEventListener('mouseenter', () => {
    btn.style.setProperty('transform', 'scale(1.12)', 'important');
    tooltip.style.setProperty('opacity', '1', 'important');
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.setProperty('transform', 'scale(1)', 'important');
    tooltip.style.setProperty('opacity', '0', 'important');
  });
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    GM_openInTab(TARGET, { active: true, insert: true });
    resetTimer();
  });

  const CIRCUMFERENCE = 175.9;
  let elapsed = 0;

  function resetTimer() {
    elapsed = 0;
    updateRing(0);
  }

  function updateRing(fraction) {
    const ringEl = document.getElementById('__tg_hm_ring');
    if (ringEl) ringEl.style.strokeDashoffset = CIRCUMFERENCE * (1 - fraction);
  }

  setInterval(() => {
    elapsed += 100;
    updateRing(Math.min(elapsed / INTERVAL_MS, 1));
    if (elapsed >= INTERVAL_MS) {
      GM_openInTab(TARGET, { active: false, insert: false });
      elapsed = 0;
    }
  }, 100);

})();
