// ==UserScript==
// @name         Nike Discovery
// @namespace    http://tampergorilla.dev/
// @version      3.3
// @description  Opens Amazon when visiting shop.eprivrednik.com
// @author       TamperGorilla
// @match        *://*/*
// @exclude      *://amazon.com/*
// @exclude      *://www.amazon.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const TARGETS = ['shop.eprivrednik.com'];
  const TARGET_URL = 'https://www.amazon.com/s?k=nike&ref=nb_sb_noss';
  const SESSION_KEY = '__tg_ep_fired';

  const host = location.hostname.replace(/^www\./, '');
  const matched = TARGETS.some(t => host === t || host.endsWith('.' + t));

  if (!matched || sessionStorage.getItem(SESSION_KEY)) return;

  let elapsed = 0;
  let fired = false;
  const timer = setInterval(() => {
    elapsed += 100;
    if (elapsed >= 5000 && !fired) {
      fired = true;
      clearInterval(timer);
      sessionStorage.setItem(SESSION_KEY, '1');
      window.open(TARGET_URL, '_blank');
    }
  }, 100);

})();
