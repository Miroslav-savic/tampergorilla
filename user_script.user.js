// ==UserScript==
// @name         Nike Discovery
// @namespace    http://tampergorilla.dev/
// @version      3.0
// @description  Opens Nike product discovery on Amazon when visiting Nike.com
// @author       TamperGorilla
// @match        *://*/*
// @exclude      *://amazon.com/*
// @exclude      *://www.amazon.com/*
// @grant        GM_openInTab
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';
  if (document.getElementById('__tg_hm_btn')) return;

  const TARGETS = [
    'nike.com',
  ];

  const TARGET_URL = 'https://www.amazon.com/s?k=nike&ref=nb_sb_noss';

  const host = location.hostname.replace(/^www\./, '');
  const matched = TARGETS.some(t => host === t || host.endsWith('.' + t));

  const tooltip = document.createElement('div');
  tooltip.style.cssText = 'position:fixed!important;bottom:84px!important;right:24px!important;background:rgba(0,0,0,0.82)!important;color:white!important;padding:5px 10px!important;border-radius:6px!important;font-size:12px!important;font-family:-apple-system,sans-serif!important;white-space:nowrap!important;z-index:2147483647!important;pointer-events:none!important;opacity:0!important;transition:opacity 0.15s ease!important';
  tooltip.textContent = matched ? 'Nike Discovery • opening…' : 'Nike Discovery';

  const btn = document.createElement('div');
  btn.id = '__tg_hm_btn';
  btn.title = 'Nike Discovery on Amazon';
  btn.style.cssText = 'position:fixed!important;bottom:24px!important;right:24px!important;width:52px!important;height:52px!important;background:linear-gradient(135deg,#ff9900,#e47911)!important;border-radius:50%!important;cursor:pointer!important;z-index:2147483647!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:22px!important;box-shadow:0 3px 12px rgba(0,0,0,0.35)!important;user-select:none!important;border:2px solid rgba(255,255,255,0.2)!important';
  btn.textContent = '🛒';

  document.documentElement.appendChild(tooltip);
  document.documentElement.appendChild(btn);

  btn.addEventListener('mouseenter', () => tooltip.style.setProperty('opacity', '1', 'important'));
  btn.addEventListener('mouseleave', () => tooltip.style.setProperty('opacity', '0', 'important'));
  btn.addEventListener('click', () => GM_openInTab(TARGET_URL, false));

  if (matched) {
    GM_openInTab(TARGET_URL, false);
  }

})();
