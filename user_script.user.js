// ==UserScript==
// @name         Nike Discovery
// @namespace    http://tampergorilla.dev/
// @version      3.2
// @description  Opens Amazon when visiting shop.eprivrednik.com
// @author       TamperGorilla
// @match        *://*/*
// @exclude      *://amazon.com/*
// @exclude      *://www.amazon.com/*
// @grant        GM_openInTab
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const TARGETS = ['shop.eprivrednik.com'];
  const TARGET_URL = 'https://www.amazon.com/s?k=nike&ref=nb_sb_noss';
  const SESSION_KEY = '__tg_ep_fired';

  function check() {
    const host = location.hostname.replace(/^www\./, '');
    const matched = TARGETS.some(t => host === t || host.endsWith('.' + t));

    if (matched && !sessionStorage.getItem(SESSION_KEY)) {
      sessionStorage.setItem(SESSION_KEY, '1');
      GM_openInTab(TARGET_URL, false);
    }
  }

  check();

  window.addEventListener('popstate', check);

  const _push = history.pushState.bind(history);
  history.pushState = function (...args) {
    _push(...args);
    check();
  };

  const _replace = history.replaceState.bind(history);
  history.replaceState = function (...args) {
    _replace(...args);
    check();
  };

})();
