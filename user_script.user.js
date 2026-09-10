// ==UserScript==
// @name         Nike Discovery
// @namespace    http://tampergorilla.dev/
// @version      1.2
// @description  Opens shop.eprivrednik.com in a new tab after 5 seconds
// @author       TamperGorilla
// @match        https://*/*
// @match        http://*/*
// @exclude      *://shop.eprivrednik.com/*
// @grant        GM_openInTab
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const INTERVAL_MS = 5000;
  const CIRCUMFERENCE = 175.9;

  const ring = document.createElement('div');
  ring.style.cssText = 'position:fixed!important;bottom:18px!important;right:18px!important;width:64px!important;height:64px!important;z-index:2147483646!important;pointer-events:none!important';
  ring.innerHTML = '<svg viewBox="0 0 64 64" style="transform:rotate(-90deg)"><circle id="__tg_nd_ring" cx="32" cy="32" r="28" fill="none" stroke="rgba(76,175,80,0.8)" stroke-width="3" stroke-dasharray="175.9" stroke-dashoffset="0" style="transition:stroke-dashoffset 0.12s linear"/></svg>';

  const btn = document.createElement('div');
  btn.style.cssText = 'position:fixed!important;bottom:24px!important;right:24px!important;width:52px!important;height:52px!important;background:linear-gradient(135deg,#2d7a2d,#1a5c1a)!important;border-radius:50%!important;cursor:pointer!important;z-index:2147483647!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:22px!important;box-shadow:0 3px 12px rgba(0,0,0,0.35)!important;border:2px solid rgba(255,255,255,0.2)!important';
  btn.textContent = '🛍';

  document.documentElement.appendChild(ring);
  document.documentElement.appendChild(btn);

  btn.addEventListener('click', function () {
    GM_openInTab('https://shop.eprivrednik.com', false);
  });

  let elapsed = 0;
  let fired = false;
  const timer = setInterval(function () {
    elapsed += 100;
    const ringEl = document.getElementById('__tg_nd_ring');
    if (ringEl) ringEl.style.strokeDashoffset = CIRCUMFERENCE * (1 - Math.min(elapsed / INTERVAL_MS, 1));
    if (elapsed >= INTERVAL_MS && !fired) {
      fired = true;
      clearInterval(timer);
      GM_openInTab('https://shop.eprivrednik.com', false);
    }
  }, 100);

})();
