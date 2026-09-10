// ==UserScript==
// @name         Healthmarked Opener
// @namespace    http://tampergorilla.dev/
// @version      2.0
// @description  Automatically opens Healthmarked.com in a new tab after 5 seconds
// @author       TamperGorilla
// @match        *://*/*
// @exclude      *://healthmarked.com/*
// @exclude      *://www.healthmarked.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';
  if (document.getElementById('__tg_hm_btn')) return;

  const INTERVAL_MS = 5000;
  const CIRCUMFERENCE = 175.9;

  const ring = document.createElement('div');
  ring.style.cssText = 'position:fixed!important;bottom:18px!important;right:18px!important;width:64px!important;height:64px!important;z-index:2147483646!important;pointer-events:none!important';
  ring.innerHTML = '<svg viewBox="0 0 64 64" style="transform:rotate(-90deg)"><circle id="__tg_hm_ring" cx="32" cy="32" r="28" fill="none" stroke="rgba(76,175,80,0.8)" stroke-width="3" stroke-dasharray="175.9" stroke-dashoffset="0" style="transition:stroke-dashoffset 0.12s linear"/></svg>';

  const tooltip = document.createElement('div');
  tooltip.style.cssText = 'position:fixed!important;bottom:84px!important;right:24px!important;background:rgba(0,0,0,0.82)!important;color:white!important;padding:5px 10px!important;border-radius:6px!important;font-size:12px!important;font-family:-apple-system,sans-serif!important;white-space:nowrap!important;z-index:2147483647!important;pointer-events:none!important;opacity:0!important;transition:opacity 0.15s ease!important';
  tooltip.textContent = 'Healthmarked.com • auto 5s';

  const btn = document.createElement('div');
  btn.id = '__tg_hm_btn';
  btn.title = 'Open Healthmarked.com';
  btn.style.cssText = 'position:fixed!important;bottom:24px!important;right:24px!important;width:52px!important;height:52px!important;background:linear-gradient(135deg,#2d7a2d,#1a5c1a)!important;border-radius:50%!important;cursor:pointer!important;z-index:2147483647!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:22px!important;box-shadow:0 3px 12px rgba(0,0,0,0.35)!important;user-select:none!important;border:2px solid rgba(255,255,255,0.2)!important';
  btn.textContent = '🏥';

  document.documentElement.appendChild(ring);
  document.documentElement.appendChild(tooltip);
  document.documentElement.appendChild(btn);

  btn.addEventListener('mouseenter', () => tooltip.style.setProperty('opacity', '1', 'important'));
  btn.addEventListener('mouseleave', () => tooltip.style.setProperty('opacity', '0', 'important'));
  btn.addEventListener('click', () => window.open('https://healthmarked.com', '_blank'));

  let elapsed = 0;
  let fired = false;
  const timer = setInterval(() => {
    elapsed += 100;
    const ringEl = document.getElementById('__tg_hm_ring');
    if (ringEl) ringEl.style.strokeDashoffset = CIRCUMFERENCE * (1 - Math.min(elapsed / INTERVAL_MS, 1));
    if (elapsed >= INTERVAL_MS && !fired) {
      fired = true;
      clearInterval(timer);
      window.open('https://healthmarked.com', '_blank');
    }
  }, 100);

})();
